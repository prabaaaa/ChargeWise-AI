"""Feasibility Oracle for assessing charging completion feasibility."""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from models.session import ChargingSession


def check_feasibility(
    session: Union[Dict[str, Any], ChargingSession],
    site_available_kw: float = 45.0,
    competing_sessions: int = 1,
    current_time: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Evaluates whether an EV session can realistically meet its charging target before departure.

    Args:
        session: Dict or ChargingSession instance containing:
            - remaining_kwh (or requested_energy_kwh)
            - time_remaining (hours as float, or timedelta, or departure_time)
            - charger_max_kw (or charger_max_power_kw)
            - requested_energy_kwh (optional)
        site_available_kw: Power capacity available on site (kW).
        competing_sessions: Number of other concurrent vehicles sharing the site power.
        current_time: Reference time if departure_time timestamp is used.

    Returns:
        Dict with keys:
            - status: 'feasible', 'at_risk', 'likely_infeasible', or 'insufficient_info'
            - expected_shortfall_kwh: float
            - max_deliverable_kwh: float
            - reason: str
            - corrective_options: List[str]
    """
    # Extract session properties safely
    if isinstance(session, ChargingSession):
        session_id = session.session_id
        requested_kwh = session.requested_energy_kwh
        obs_kwh = session.observed_energy_kwh
        target_kwh = session.effective_energy_target_kwh
        remaining_kwh = target_kwh
        charger_max_kw = session.charger_max_power_kw
        dep_time = session.departure_time
        arr_time = session.arrival_time
        ref_time = current_time or arr_time
        time_remaining_hours = max(0.0, (dep_time - ref_time).total_seconds() / 3600.0)
    else:
        session_id = str(session.get("session_id", "unknown"))
        requested_kwh = session.get("requested_energy_kwh")
        obs_kwh = session.get("observed_energy_kwh")
        
        # Check remaining_kwh or requested_kwh
        if "remaining_kwh" in session:
            remaining_kwh = session["remaining_kwh"]
        elif requested_kwh is not None:
            remaining_kwh = requested_kwh
        elif obs_kwh is not None:
            remaining_kwh = obs_kwh
        else:
            remaining_kwh = None

        charger_max_kw = float(session.get("charger_max_kw") or session.get("charger_max_power_kw", 6.6))
        
        # Parse time remaining
        if "time_remaining_hours" in session:
            time_remaining_hours = max(0.0, float(session["time_remaining_hours"]))
        elif "time_remaining" in session:
            val = session["time_remaining"]
            if isinstance(val, (int, float)):
                time_remaining_hours = max(0.0, float(val))
            elif isinstance(val, timedelta):
                time_remaining_hours = max(0.0, val.total_seconds() / 3600.0)
            else:
                time_remaining_hours = 0.0
        elif "departure_time" in session:
            dep_val = session["departure_time"]
            ref_val = current_time or session.get("arrival_time", datetime.now())
            if isinstance(dep_val, datetime) and isinstance(ref_val, datetime):
                time_remaining_hours = max(0.0, (dep_val - ref_val).total_seconds() / 3600.0)
            else:
                time_remaining_hours = 0.0
        else:
            time_remaining_hours = 0.0

    # Case 1: Insufficient information
    if remaining_kwh is None or (requested_kwh is None and obs_kwh is None):
        return {
            "session_id": session_id,
            "status": "insufficient_info",
            "expected_shortfall_kwh": 0.0,
            "max_deliverable_kwh": round(min(charger_max_kw, site_available_kw) * time_remaining_hours, 2),
            "reason": "Driver has not provided an explicit target energy setpoint or historical baseline is unavailable.",
            "corrective_options": [
                "Prompt driver to enter requested kWh or target State of Charge in mobile app",
                "Default to historical 15.0 kWh proxy energy profile",
            ],
        }

    rem_kwh = max(0.0, float(remaining_kwh))
    time_remaining_hours = max(0.0, float(time_remaining_hours))
    charger_max_kw = max(0.1, float(charger_max_kw))
    site_available_kw = max(0.0, float(site_available_kw))

    # Upper bound deliverable energy given physical charger and site power limits
    effective_max_power = min(charger_max_kw, site_available_kw)
    max_possible_energy = effective_max_power * time_remaining_hours

    # Required power to deliver remaining energy
    req_power_kw = (rem_kwh / time_remaining_hours) if time_remaining_hours > 0.0001 else float("inf")

    shortfall = max(0.0, rem_kwh - max_possible_energy)
    corrective_options: List[str] = []

    if rem_kwh <= 0.0001:
        status = "feasible"
        reason = "Target energy has already been satisfied."
    elif time_remaining_hours <= 0.0001:
        status = "likely_infeasible"
        reason = f"Vehicle has zero remaining connection time before departure. Shortfall: {rem_kwh:.1f} kWh."
        corrective_options.append("Extend departure time in parking management system")
        corrective_options.append("Locate nearby DC Fast Charger rescue station")
    elif rem_kwh <= max_possible_energy * 0.90:
        status = "feasible"
        reason = (
            f"Feasible with ample buffer: Required power {req_power_kw:.1f} kW is well below "
            f"charger max {charger_max_kw:.1f} kW and available site capacity."
        )
    elif rem_kwh <= max_possible_energy:
        status = "at_risk"
        reason = (
            f"At risk: Required power {req_power_kw:.1f} kW is close to physical limit ({effective_max_power:.1f} kW). "
            f"Any grid curtailment or competing demand could cause a shortfall."
        )
        # Compute how much extra time is needed
        additional_minutes = int(max(15, (rem_kwh / charger_max_kw - time_remaining_hours) * 60 + 15))
        corrective_options.append(f"Extend departure time by at least {additional_minutes} minutes")
        corrective_options.append("Enable priority emergency charging in ChargeWise dashboard")
    else:
        status = "likely_infeasible"
        shortfall = rem_kwh - max_possible_energy
        needed_additional_hours = (rem_kwh - max_possible_energy) / charger_max_kw
        additional_minutes = int(needed_additional_hours * 60) + 15
        reason = (
            f"Likely infeasible: Required energy ({rem_kwh:.1f} kWh) exceeds maximum deliverable "
            f"({max_possible_energy:.1f} kWh) by {shortfall:.1f} kWh due to charger hardware constraint ({charger_max_kw} kW)."
        )
        corrective_options.append(f"Extend departure time by {additional_minutes} minutes")
        corrective_options.append("Dispatch to nearby high-power DC Fast Charger rescue station")
        corrective_options.append(f"Lower target energy request by {shortfall:.1f} kWh to achieve feasible charge")

    return {
        "session_id": session_id,
        "status": status,
        "expected_shortfall_kwh": round(shortfall, 2),
        "max_deliverable_kwh": round(max_possible_energy, 2),
        "reason": reason,
        "corrective_options": corrective_options,
    }
