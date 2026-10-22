"""Robust CSV/dataset parsing, schema mapping, and validation pipeline for ChargeWise AI."""

import csv
import io
import json
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
import pandas as pd

from models.session import ChargingSession


# Standard canonical fields required or supported by the simulation
CANONICAL_FIELDS = {
    "session_id": {"required": True, "type": "str", "label": "Session / Vehicle ID"},
    "arrival_time": {"required": True, "type": "datetime", "label": "Arrival / Plug-in Time"},
    "departure_time": {"required": True, "type": "datetime", "label": "Departure / Deadline Time"},
    "requested_energy_kwh": {"required": False, "type": "float", "label": "Requested Energy (kWh)"},
    "observed_energy_kwh": {"required": False, "type": "float", "label": "Observed / Delivered Energy (kWh)"},
    "charger_id": {"required": False, "type": "str", "label": "Charger / Bay ID"},
    "charger_max_power_kw": {"required": False, "type": "float", "label": "Max Power (kW)"},
    "battery_capacity_kwh": {"required": False, "type": "float", "label": "Battery Capacity (kWh)"},
    "initial_soc_percent": {"required": False, "type": "float", "label": "Arrival SOC (%)"},
    "target_soc_percent": {"required": False, "type": "float", "label": "Target SOC (%)"},
    "connector_type": {"required": False, "type": "str", "label": "Connector Type"},
    "site": {"required": False, "type": "str", "label": "Site / Facility Name"},
}

# Alias dictionary for automated fuzzy column matching
COLUMN_ALIASES: Dict[str, List[str]] = {
    "session_id": [
        "driverid", "driver_id", "driver", "user_id", "userid",
        "session_id", "sessionid", "id", "_id", "vehicle_id", "vehicleid",
        "session_number", "ev_id", "car_id", "transaction_id", "record_id"
    ],
    "arrival_time": [
        "request_entry_time", "start_date_time", "start_charge", "request_entry",
        "entry_time", "arrival_time", "arrival", "connectiontime", "connection_time",
        "connect_time", "start_time", "plug_in_time", "plug_in", "start",
        "connected", "arr_time", "arrival_timestamp", "time_in"
    ],
    "departure_time": [
        "expected_departure", "end_date_time", "termin_charge", "target_departure",
        "departure_time", "departure", "disconnecttime", "disconnect_time",
        "disconnect", "end_time", "plug_out_time", "plug_out", "end",
        "disconnected", "dep_time", "departure_timestamp", "time_out"
    ],
    "requested_energy_kwh": [
        "kwh_requested", "miles_requested", "requested_energy_kwh", "requested_energy",
        "kwhrequested", "target_energy_kwh", "target_energy", "energy_requested",
        "energy_needed_kwh", "needed_kwh", "requested_kwh", "demand_kwh", "energy_request"
    ],
    "observed_energy_kwh": [
        "energy_charged", "observed_energy_kwh", "observed_energy", "kwhdelivered",
        "kwh_delivered", "energy_delivered", "delivered_kwh", "actual_kwh",
        "total_energy_kwh", "meter_kwh", "energy_kwh", "charged_kwh"
    ],
    "charger_id": [
        "station", "station_name", "charger_station", "charger_id", "stationid",
        "station_id", "spaceid", "space_id", "charger", "bay_id", "bay", "spot",
        "port_id", "terminal_id", "cp_id", "evse_id"
    ],
    "charger_max_power_kw": [
        "max_charge_power", "charge_power", "charger_max_power_kw", "max_power_kw",
        "max_power", "charger_power", "power_limit_kw", "power_kw", "kw_limit",
        "max_kw", "rating_kw", "charging_rate_kw"
    ],
    "battery_capacity_kwh": [
        "battery_capacity_kwh", "battery_capacity", "battery_kwh", "capacity_kwh",
        "battery_size_kwh", "battery_size", "pack_kwh", "battery_cap"
    ],
    "initial_soc_percent": [
        "initial_soc_percent", "initial_soc", "start_soc", "arrival_soc",
        "current_soc", "soc_initial", "soc_start", "soc_in", "soc_arrival"
    ],
    "target_soc_percent": [
        "target_soc_percent", "target_soc", "end_soc", "desired_soc",
        "soc_target", "soc_desired", "final_soc", "soc_out", "soc_end"
    ],
    "connector_type": [
        "connector_type", "connector", "plug_type", "standard", "plug", "socket"
    ],
    "site": [
        "site", "siteid", "site_id", "location", "facility", "depot"
    ],
}


def detect_column_mappings(columns: List[str]) -> Dict[str, str]:
    """Auto-detects canonical mapping from uploaded dataset header names."""
    mapping: Dict[str, str] = {}
    cleaned_cols = {re.sub(r"[^a-zA-Z0-9_]", "", c.strip().lower().lstrip("\ufeff")): c for c in columns}

    for canonical, aliases in COLUMN_ALIASES.items():
        matched = False
        # Exact alias match first
        for alias in aliases:
            cleaned_alias = re.sub(r"[^a-zA-Z0-9_]", "", alias.lower())
            if cleaned_alias in cleaned_cols:
                mapping[canonical] = cleaned_cols[cleaned_alias]
                matched = True
                break
        if not matched:
            # Substring matching with safety guards
            for cleaned_c, orig_c in cleaned_cols.items():
                # Avoid false positives like cost_for_session mapping to session_id
                if canonical == "session_id" and any(bad in cleaned_c for bad in ("cost", "price", "fee", "rate", "after")):
                    continue
                if any(alias in cleaned_c for alias in aliases if len(alias) >= 4):
                    mapping[canonical] = orig_c
                    matched = True
                    break
    return mapping


def parse_float_safe(val: Any, min_val: Optional[float] = None, max_val: Optional[float] = None) -> Optional[float]:
    """Parses a float value with optional range validation."""
    if val is None or pd.isna(val):
        return None
    try:
        if isinstance(val, str):
            cleaned = re.sub(r"[^0-9.-]", "", val.strip())
            if not cleaned:
                return None
            num = float(cleaned)
        else:
            num = float(val)

        if min_val is not None and num < min_val:
            return None
        if max_val is not None and num > max_val:
            return None
        return num
    except (ValueError, TypeError):
        return None


class DatasetValidator:
    """High-performance CSV validator, schema mapper, and simulation session builder."""

    @classmethod
    def validate_and_parse(
        cls,
        csv_content: str,
        custom_mapping: Optional[Dict[str, str]] = None,
        default_site: str = "custom-upload",
    ) -> Dict[str, Any]:
        issues: List[Dict[str, Any]] = []

        if not csv_content or not csv_content.strip():
            return {
                "is_valid": False,
                "total_rows": 0,
                "valid_rows": 0,
                "rejected_rows": 0,
                "columns": [],
                "mapping": {},
                "issues": [{"row": 0, "field": "file", "message": "Uploaded file is empty.", "severity": "error"}],
                "raw_preview": [],
                "normalized_preview": [],
                "sessions": [],
                "summary": {},
            }

        # Strip UTF-8 BOM
        csv_text = csv_content.lstrip("\ufeff")

        # Detect delimiters
        sample = csv_text[:4096]
        delimiter = ","
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
            delimiter = dialect.delimiter
        except Exception:
            if "\t" in sample and sample.count("\t") > sample.count(","):
                delimiter = "\t"
            elif ";" in sample and sample.count(";") > sample.count(","):
                delimiter = ";"

        try:
            df = pd.read_csv(io.StringIO(csv_text), delimiter=delimiter, dtype=str)
        except Exception as exc:
            return {
                "is_valid": False,
                "total_rows": 0,
                "valid_rows": 0,
                "rejected_rows": 0,
                "columns": [],
                "mapping": {},
                "issues": [{"row": 0, "field": "csv_format", "message": f"CSV parse error: {str(exc)}", "severity": "error"}],
                "raw_preview": [],
                "normalized_preview": [],
                "sessions": [],
                "summary": {},
            }

        if df.empty:
            return {
                "is_valid": False,
                "total_rows": 0,
                "valid_rows": 0,
                "rejected_rows": 0,
                "columns": list(df.columns),
                "mapping": {},
                "issues": [{"row": 0, "field": "dataset", "message": "CSV header found but no data rows exist.", "severity": "error"}],
                "raw_preview": [],
                "normalized_preview": [],
                "sessions": [],
                "summary": {},
            }

        # Clean column names (strip quotes and BOM)
        columns = [str(c).strip().lstrip("\ufeff") for c in df.columns]
        df.columns = columns
        raw_preview = df.head(5).fillna("").to_dict(orient="records")

        # Auto-detect or apply custom mapping
        auto_mapping = detect_column_mappings(columns)
        mapping = dict(auto_mapping)
        if custom_mapping:
            for canon, col in custom_mapping.items():
                if col in columns:
                    mapping[canon] = col

        # Check required fields
        missing_required = []
        if "arrival_time" not in mapping:
            missing_required.append("Arrival / Plug-in Time")
        if "departure_time" not in mapping:
            missing_required.append("Departure / Disconnect Time")

        if missing_required:
            issues.append({
                "row": 0,
                "field": "required_columns",
                "message": f"Missing required timestamp column(s): {', '.join(missing_required)}. Please map these fields.",
                "severity": "error",
            })
            return {
                "is_valid": False,
                "total_rows": len(df),
                "valid_rows": 0,
                "rejected_rows": len(df),
                "columns": columns,
                "mapping": mapping,
                "issues": issues,
                "raw_preview": raw_preview,
                "normalized_preview": [],
                "sessions": [],
                "summary": {},
            }

        id_col = mapping.get("session_id")
        arr_col = mapping["arrival_time"]
        dep_col = mapping["departure_time"]
        req_col = mapping.get("requested_energy_kwh")
        obs_col = mapping.get("observed_energy_kwh")
        charger_col = mapping.get("charger_id")
        pwr_col = mapping.get("charger_max_power_kw")
        cap_col = mapping.get("battery_capacity_kwh")
        init_soc_col = mapping.get("initial_soc_percent")
        tgt_soc_col = mapping.get("target_soc_percent")
        conn_col = mapping.get("connector_type")
        site_col = mapping.get("site")

        # High-speed vectorized timestamp parsing and validation
        arr_series = pd.to_datetime(df[arr_col], errors="coerce", utc=True)
        dep_series = pd.to_datetime(df[dep_col], errors="coerce", utc=True)

        # Convert to naive UTC datetimes
        arr_naive = arr_series.dt.tz_convert(None) if hasattr(arr_series.dt, "tz_convert") else arr_series
        dep_naive = dep_series.dt.tz_convert(None) if hasattr(dep_series.dt, "tz_convert") else dep_series

        valid_time_mask = arr_naive.notna() & dep_naive.notna() & (dep_naive > arr_naive)
        total_rows = len(df)
        valid_count = int(valid_time_mask.sum())
        rejected_count = total_rows - valid_count

        # Identify sample rejected rows for diagnostic feedback (up to 15 items)
        invalid_indices = df[~valid_time_mask].index[:15]
        for idx in invalid_indices:
            row_num = int(idx) + 2
            raw_a = df.loc[idx, arr_col]
            raw_d = df.loc[idx, dep_col]
            if pd.isna(arr_naive.loc[idx]):
                issues.append({"row": row_num, "field": "arrival_time", "message": f"Invalid or unparseable arrival timestamp: '{raw_a}'", "severity": "error"})
            elif pd.isna(dep_naive.loc[idx]):
                issues.append({"row": row_num, "field": "departure_time", "message": f"Invalid or unparseable departure timestamp: '{raw_d}'", "severity": "error"})
            elif dep_naive.loc[idx] <= arr_naive.loc[idx]:
                issues.append({"row": row_num, "field": "departure_time", "message": f"Departure time is before or equal to arrival time ({raw_d} <= {raw_a})", "severity": "error"})

        if valid_count == 0:
            issues.append({"row": 0, "field": "data", "message": "No valid session records could be parsed. Check timestamp formats and chronological ordering.", "severity": "error"})
            return {
                "is_valid": False,
                "total_rows": total_rows,
                "valid_rows": 0,
                "rejected_rows": rejected_count,
                "columns": columns,
                "mapping": mapping,
                "issues": issues,
                "raw_preview": raw_preview,
                "normalized_preview": [],
                "sessions": [],
                "summary": {},
            }

        # Filter valid rows into working DataFrame
        df_valid = df[valid_time_mask].copy()
        df_valid["_arr_dt"] = arr_naive[valid_time_mask]
        df_valid["_dep_dt"] = dep_naive[valid_time_mask]
        df_valid.sort_values("_arr_dt", inplace=True)

        # Global dataset statistics
        full_date_min = df_valid["_arr_dt"].min()
        full_date_max = df_valid["_dep_dt"].max()
        span_days = (full_date_max - full_date_min).total_seconds() / 86400.0

        # Calculate fleet-wide total energy
        if req_col:
            req_numeric = pd.to_numeric(df_valid[req_col], errors="coerce").fillna(24.0)
            total_energy_kwh = float(req_numeric.sum())
        elif obs_col:
            obs_numeric = pd.to_numeric(df_valid[obs_col], errors="coerce").fillna(24.0)
            total_energy_kwh = float(obs_numeric.sum())
        else:
            total_energy_kwh = float(valid_count * 24.0)

        dwell_seconds = (df_valid["_dep_dt"] - df_valid["_arr_dt"]).dt.total_seconds()
        avg_dwell_hrs = float(dwell_seconds.mean() / 3600.0)

        # Active simulation window selection:
        # If dataset spans multiple weeks/years with large volume, focus the active simulation
        # on the latest representative 7-day workplace charging cycle (or up to 100 sessions)
        # to ensure peak real-time simulation performance across 20 bays while maintaining full provenance.
        if valid_count > 200 and span_days > 14.0:
            window_start = full_date_max - timedelta(days=7)
            sim_df = df_valid[df_valid["_arr_dt"] >= window_start]
            if len(sim_df) < 20:
                sim_df = df_valid.tail(80)
            issues.insert(0, {
                "row": 0,
                "field": "simulation_scope",
                "message": f"Historical fleet trace spans {span_days:.0f} days ({valid_count:,} valid sessions). Active simulation initialized with the latest representative workplace charging cycle ({len(sim_df)} sessions across 20 bays).",
                "severity": "info",
            })
        else:
            sim_df = df_valid

        # Physical 20-bay allocation across CP-01 through CP-20
        campus_bays = [f"CP-{i:02d}" for i in range(1, 21)]
        bay_occupancy = {b: datetime.min for b in campus_bays}

        valid_sessions: List[ChargingSession] = []
        seen_ids: Set[str] = set()

        for idx, (_, row) in enumerate(sim_df.iterrows()):
            row_num = int(idx) + 2
            arr_t = row["_arr_dt"].to_pydatetime()
            dep_t = row["_dep_dt"].to_pydatetime()

            # Session ID
            raw_id = str(row[id_col]).strip() if id_col and pd.notna(row.get(id_col)) else ""
            if raw_id and raw_id.lower() not in ("nan", "null", "none"):
                sid = raw_id
            else:
                sid = f"EV-{idx + 1:03d}"

            if sid in seen_ids:
                sid = f"{sid}-s{idx + 1}"
            seen_ids.add(sid)

            # Charger Bay allocation
            raw_charger = str(row[charger_col]).strip() if charger_col and pd.notna(row.get(charger_col)) else ""
            if raw_charger and re.match(r"^CP-\d{2}$", raw_charger):
                charger_id = raw_charger
            else:
                assigned = None
                for b in campus_bays:
                    if bay_occupancy[b] <= arr_t:
                        assigned = b
                        break
                if not assigned:
                    assigned = campus_bays[idx % 20]
                bay_occupancy[assigned] = dep_t
                charger_id = assigned

            # Charger max power
            max_power = parse_float_safe(row.get(pwr_col), min_val=1.4, max_val=350.0) if pwr_col else None
            if max_power is None:
                max_power = 7.2  # Default Level 2 standard

            # Energy requirements
            req_kwh = parse_float_safe(row.get(req_col), min_val=0.5, max_val=200.0) if req_col else None
            obs_kwh = parse_float_safe(row.get(obs_col), min_val=0.5, max_val=200.0) if obs_col else None
            batt_cap = parse_float_safe(row.get(cap_col), min_val=15.0, max_val=250.0) if cap_col else 75.0
            init_soc = parse_float_safe(row.get(init_soc_col), min_val=0.0, max_val=100.0) if init_soc_col else 25.0
            tgt_soc = parse_float_safe(row.get(tgt_soc_col), min_val=0.0, max_val=100.0) if tgt_soc_col else 85.0

            if req_kwh is None and obs_kwh is not None:
                req_kwh = obs_kwh
            elif req_kwh is None:
                req_kwh = round((batt_cap * max(0.0, tgt_soc - init_soc)) / 100.0, 2)
                if req_kwh <= 0.1:
                    req_kwh = 24.0

            connector = str(row[conn_col]).strip() if conn_col and pd.notna(row.get(conn_col)) else "CCS"
            site_name = str(row[site_col]).strip() if site_col and pd.notna(row.get(site_col)) else default_site

            session = ChargingSession(
                session_id=sid,
                site=site_name,
                arrival_time=arr_t,
                departure_time=dep_t,
                requested_energy_kwh=round(req_kwh, 2),
                observed_energy_kwh=round(obs_kwh or req_kwh, 2),
                charger_id=charger_id,
                charger_max_power_kw=round(max_power, 1),
                battery_capacity_kwh=round(batt_cap, 1),
                initial_soc_percent=round(init_soc, 1),
                target_soc_percent=round(tgt_soc, 1),
                connector_type=connector,
                energy_source="requested" if req_col else "observed",
                departure_source="observed",
                is_synthetic=False,
                is_emergency=False,
            )
            valid_sessions.append(session)

        normalized_preview = [s.model_dump() for s in valid_sessions[:5]]

        return {
            "is_valid": len(valid_sessions) > 0,
            "total_rows": total_rows,
            "valid_rows": valid_count,
            "rejected_rows": rejected_count,
            "columns": columns,
            "mapping": mapping,
            "issues": issues[:50],
            "raw_preview": raw_preview,
            "normalized_preview": normalized_preview,
            "sessions": valid_sessions,
            "summary": {
                "total_energy_requested_kwh": round(total_energy_kwh, 2),
                "average_energy_kwh": round(total_energy_kwh / max(1, valid_count), 2),
                "average_dwell_hours": round(avg_dwell_hrs, 2),
                "date_range": {
                    "start": full_date_min.isoformat() if pd.notna(full_date_min) else None,
                    "end": full_date_max.isoformat() if pd.notna(full_date_max) else None,
                },
                "unique_chargers_used": len(set(s.charger_id for s in valid_sessions)),
            },
        }
