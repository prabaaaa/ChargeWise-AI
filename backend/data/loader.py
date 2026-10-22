"""ACN-Data loader and parser for EV charging research datasets."""

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

from models.session import ChargingSession


def _parse_datetime(val: Any) -> Optional[datetime]:
    """Safely parse various datetime representations into naive datetime objects."""
    if val is None or pd.isna(val):
        return None
    try:
        dt = pd.to_datetime(val)
        if dt is pd.NaT:
            return None
        # Convert to tz-naive UTC
        if dt.tz is not None:
            dt = dt.tz_convert(None)
        return dt.to_pydatetime()
    except Exception:
        return None


def _extract_user_inputs(raw_inputs: Any) -> Tuple[Optional[float], Optional[datetime]]:
    """Parse userInputs field which may contain kWhRequested and departureTime."""
    if raw_inputs is None or pd.isna(raw_inputs):
        return None, None

    data = None
    if isinstance(raw_inputs, dict):
        data = raw_inputs
    elif isinstance(raw_inputs, str):
        cleaned = raw_inputs.strip()
        if cleaned.startswith("{") and cleaned.endswith("}"):
            try:
                data = json.loads(cleaned)
            except Exception:
                pass
        elif cleaned.startswith("[") and cleaned.endswith("]"):
            try:
                parsed_list = json.loads(cleaned)
                if parsed_list and isinstance(parsed_list[0], dict):
                    data = parsed_list[0]
            except Exception:
                pass

    if not data or not isinstance(data, dict):
        return None, None

    kwh_req = data.get("kWhRequested")
    if kwh_req is not None:
        try:
            kwh_req = float(kwh_req)
        except (ValueError, TypeError):
            kwh_req = None

    dep_val = data.get("departureTime") or data.get("requestedDeparture")
    dep_time = _parse_datetime(dep_val) if dep_val else None

    return kwh_req, dep_time


def load_acn_data(
    file_path: str,
    site: str = "caltech",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Tuple[List[ChargingSession], Dict[str, Any]]:
    """Loads and standardizes ACN-Data format CSV records into ChargingSession objects.

    Returns:
        (sessions, metadata_dict)
    """
    metadata: Dict[str, Any] = {
        "site": site,
        "date_range": {"start": start_date, "end": end_date},
        "total_records": 0,
        "valid_records": 0,
        "missing_energy_count": 0,
        "missing_departure_count": 0,
        "warnings": [],
    }

    if not os.path.exists(file_path):
        metadata["warnings"].append(f"File not found at path: {file_path}")
        return [], metadata

    try:
        df = pd.read_csv(file_path)
    except Exception as exc:
        metadata["warnings"].append(f"Failed to read CSV: {str(exc)}")
        return [], metadata

    metadata["total_records"] = len(df)
    if df.empty:
        metadata["warnings"].append("Provided CSV file is empty.")
        return [], metadata

    # Find relevant column names (flexible mapping)
    col_map = {c.lower(): c for c in df.columns}

    id_col = col_map.get("sessionid") or col_map.get("session_id") or col_map.get("id") or col_map.get("_id")
    site_col = col_map.get("siteid") or col_map.get("site_id") or col_map.get("site")
    station_col = col_map.get("stationid") or col_map.get("station_id") or col_map.get("spaceid") or col_map.get("charger_id")
    conn_col = col_map.get("connectiontime") or col_map.get("arrival_time") or col_map.get("connection_time")
    disc_col = col_map.get("disconnecttime") or col_map.get("departure_time") or col_map.get("disconnect_time")
    kwh_col = col_map.get("kwhdelivered") or col_map.get("kwh_delivered") or col_map.get("energy_delivered")
    inputs_col = col_map.get("userinputs") or col_map.get("user_inputs")

    if not conn_col or not disc_col:
        metadata["warnings"].append("CSV missing mandatory connection/disconnection time columns.")
        return [], metadata

    parsed_start = _parse_datetime(start_date) if start_date else None
    parsed_end = _parse_datetime(end_date) if end_date else None

    sessions: List[ChargingSession] = []
    seen_ids = set()

    for idx, row in df.iterrows():
        # Site filter
        row_site = str(row[site_col]).lower() if site_col and pd.notna(row[site_col]) else "caltech"
        if site and row_site != site.lower():
            continue

        raw_id = row[id_col] if id_col and pd.notna(row[id_col]) else f"ACN-{idx:05d}"
        session_id = str(raw_id).strip()

        # Deduplicate
        if session_id in seen_ids:
            continue

        conn_time = _parse_datetime(row[conn_col])
        disc_time = _parse_datetime(row[disc_col])

        if conn_time is None:
            continue

        departure_source = "observed"
        if disc_time is None:
            metadata["missing_departure_count"] += 1
            # Fallback departure: 4 hours after arrival
            disc_time = conn_time + pd.Timedelta(hours=4)
            departure_source = "estimated"

        if disc_time <= conn_time:
            disc_time = conn_time + pd.Timedelta(hours=1)
            departure_source = "estimated"

        # Date window filtering
        if parsed_start and conn_time < parsed_start:
            continue
        if parsed_end and conn_time > parsed_end:
            continue

        # Energy delivered
        obs_kwh = None
        if kwh_col and pd.notna(row[kwh_col]):
            try:
                obs_kwh = float(row[kwh_col])
                if obs_kwh <= 0:
                    obs_kwh = None
            except (ValueError, TypeError):
                obs_kwh = None

        req_kwh = None
        declared_dep = None
        if inputs_col and pd.notna(row[inputs_col]):
            req_kwh, declared_dep = _extract_user_inputs(row[inputs_col])

        if declared_dep and declared_dep > conn_time:
            disc_time = declared_dep
            departure_source = "declared"

        if req_kwh is not None and req_kwh > 0:
            energy_source = "requested"
        elif obs_kwh is not None:
            energy_source = "observed"
        else:
            energy_source = "proxy"
            metadata["missing_energy_count"] += 1
            obs_kwh = 15.0  # Safe default proxy

        charger_id = str(row[station_col]) if station_col and pd.notna(row[station_col]) else f"CP-{idx % 20 + 1:02d}"

        session = ChargingSession(
            session_id=session_id,
            site=row_site,
            arrival_time=conn_time,
            departure_time=disc_time,
            requested_energy_kwh=req_kwh,
            observed_energy_kwh=obs_kwh,
            charger_id=charger_id,
            charger_max_power_kw=6.6,
            energy_source=energy_source,
            departure_source=departure_source,
            is_synthetic=False,
            is_emergency=False,
        )

        sessions.append(session)
        seen_ids.add(session_id)

    # Sort chronologically
    sessions.sort(key=lambda s: s.arrival_time)
    metadata["valid_records"] = len(sessions)

    if sessions:
        metadata["date_range"] = {
            "start": sessions[0].arrival_time.isoformat(),
            "end": sessions[-1].departure_time.isoformat(),
        }

    return sessions, metadata
