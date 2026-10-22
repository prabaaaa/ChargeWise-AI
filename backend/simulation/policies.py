"""Charging dispatch policies: Uncontrolled baseline and ChargeWise Least-Laxity-First."""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from simulation.fairness import compute_fairness_adjustment


def uncontrolled_allocation(
    connected_sessions: List[Dict[str, Any]],
    site_cap_kw: float,
    interval_minutes: int = 15,
    enforce_cap: bool = False,
) -> Tuple[Dict[str, float], float]:
    """Policy A: Uncontrolled Baseline Charging.
    
    Each vehicle attempts to draw at full charger capability (or the power needed
    to satisfy remaining demand in this interval, whichever is smaller).
    Records total unconstrained demand.
    When enforce_cap=False (default for unmanaged baseline), vehicles draw unconstrained power
    even if aggregate demand exceeds the site cap, demonstrating the true morning demand spike
    and resulting transformer overloads.
    When enforce_cap=True, clips proportionally to site capacity limit.

    Args:
        connected_sessions: List of dictionaries with session attributes:
            - session_id: str
            - remaining_kwh: float
            - charger_max_power_kw: float
        site_cap_kw: Maximum total aggregate power allowed at the site.
        interval_minutes: Duration of simulation step in minutes.
        enforce_cap: If True, clips aggregate power to site_cap_kw. Default is False.

    Returns:
        tuple (allocations_dict, total_requested_demand_kw)
    """
    allocations: Dict[str, float] = {}
    requested_powers: Dict[str, float] = {}
    total_requested_kw = 0.0

    interval_hours = max(0.001, interval_minutes / 60.0)

    for session in connected_sessions:
        sid = session["session_id"]
        rem_kwh = max(0.0, float(session.get("remaining_kwh", 0.0)))
        max_p = max(0.0, float(session.get("charger_max_power_kw", 6.6)))
        is_manually_stopped = bool(session.get("is_manually_stopped", False))

        if rem_kwh <= 0.0001 or is_manually_stopped:
            requested_powers[sid] = 0.0
            continue

        # Power needed to finish in this interval
        power_needed = rem_kwh / interval_hours
        desired_kw = min(max_p, power_needed)
        requested_powers[sid] = desired_kw
        total_requested_kw += desired_kw

    # If enforce_cap is True and total exceeds cap, clip proportionally
    if enforce_cap and site_cap_kw > 0.0 and total_requested_kw > site_cap_kw:
        scale = site_cap_kw / total_requested_kw
        for sid, p_req in requested_powers.items():
            allocations[sid] = round(p_req * scale, 4)
    elif enforce_cap and site_cap_kw <= 0.0:
        for sid in requested_powers:
            allocations[sid] = 0.0
    else:
        # Unconstrained baseline: cars draw their desired charging power directly
        for sid, p_req in requested_powers.items():
            allocations[sid] = round(p_req, 4)

    return allocations, round(total_requested_kw, 4)


def chargewise_allocation(
    connected_sessions: List[Dict[str, Any]],
    site_cap_kw: float,
    current_time: datetime,
    interval_minutes: int = 15,
    fairness_enabled: bool = False,
    fairness_history: Optional[Dict[str, Dict[str, float]]] = None,
) -> Dict[str, float]:
    """Policy B: ChargeWise Least-Laxity-First (LLF) Intelligent Dispatch.
    
    Evaluates vehicle laxity (slack time before deadline) and energy deficits.
    Greedily allocates available site power budget to high-urgency vehicles first,
    strictly respecting site capacity and vehicle connector physical limits.

    Args:
        connected_sessions: List of dictionaries with session attributes:
            - session_id: str
            - departure_time: datetime
            - remaining_kwh: float
            - charger_max_power_kw: float
            - is_emergency: bool
        site_cap_kw: Maximum total aggregate power allowed at the site.
        current_time: Timestamp of current simulation interval.
        interval_minutes: Duration of simulation step in minutes.
        fairness_enabled: If True, applies fairness weight multiplier.
        fairness_history: Optional historical tracking for fairness adjustments.

    Returns:
        Dict mapping session_id -> allocated power in kW
    """
    allocations: Dict[str, float] = {s["session_id"]: 0.0 for s in connected_sessions}

    if site_cap_kw <= 0.0 or not connected_sessions:
        return allocations

    interval_hours = max(0.001, interval_minutes / 60.0)
    scored_sessions = []

    for session in connected_sessions:
        sid = session["session_id"]
        is_manually_stopped = bool(session.get("is_manually_stopped", False))
        rem_kwh = max(0.0, float(session.get("remaining_kwh", 0.0)))
        max_p = max(0.1, float(session.get("charger_max_power_kw", 6.6)))
        dep_time: datetime = session["departure_time"]
        is_emergency = bool(session.get("is_emergency", False))

        if rem_kwh <= 0.0001 or is_manually_stopped:
            continue

        time_remaining_hours = (dep_time - current_time).total_seconds() / 3600.0
        if time_remaining_hours <= 0.0:
            # Vehicle has departed or has 0 time remaining
            continue

        # Laxity = Slack time before charging must occur continuously to meet target
        min_charge_time = rem_kwh / max_p
        laxity = time_remaining_hours - min_charge_time

        # Urgency: lower laxity -> higher score. Avoid division by zero with minimum threshold 0.01
        urgency_score = 1.0 / max(laxity, 0.01)

        # Emergency override: additive boost ensures emergency always outranks non-emergency
        if is_emergency:
            urgency_score += 1_000_000.0

        # Optional fairness adjustment
        if fairness_enabled and fairness_history:
            adjustment = compute_fairness_adjustment(sid, fairness_history)
            urgency_score *= adjustment

        scored_sessions.append({
            "session_id": sid,
            "urgency_score": urgency_score,
            "rem_kwh": rem_kwh,
            "max_p": max_p,
            "dep_time": dep_time,
        })

    # Sort primarily by urgency descending, secondary by earliest departure
    scored_sessions.sort(key=lambda x: (x["urgency_score"], -x["dep_time"].timestamp()), reverse=True)

    # Greedily allocate site power budget
    remaining_budget = site_cap_kw

    for item in scored_sessions:
        if remaining_budget <= 0.0001:
            break

        sid = item["session_id"]
        rem_kwh = item["rem_kwh"]
        max_p = item["max_p"]

        # Max power that can actually be absorbed within this interval
        power_for_step = rem_kwh / interval_hours
        desired_kw = min(max_p, power_for_step)
        desired_kw = max(0.0, desired_kw)

        allocated_kw = min(desired_kw, remaining_budget)
        allocations[sid] = round(allocated_kw, 4)
        remaining_budget = max(0.0, remaining_budget - allocated_kw)

    return allocations
