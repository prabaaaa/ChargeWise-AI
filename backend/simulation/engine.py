"""Core deterministic simulation engine for ChargeWise AI."""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from models.session import ChargingSession
from models.simulation import SimulationInterval, SessionOutcome, SimulationResult, CutoffEvent
from simulation.policies import uncontrolled_allocation, chargewise_allocation
from simulation.feasibility import check_feasibility
from config import app_config


class SimulationEngine:
    """Deterministic discrete-time EV charging simulation engine."""

    def __init__(
        self,
        sessions: List[ChargingSession],
        site_cap_kw: float = 45.0,
        interval_minutes: int = 15,
        solar_profile: Optional[Dict[int, float]] = None,
        tariff_profile: Optional[Dict[int, float]] = None,
        carbon_profile: Optional[Dict[int, float]] = None,
        fairness_enabled: bool = False,
        solar_enabled: bool = False,
        site: str = "caltech",
    ):
        self.original_sessions: List[ChargingSession] = [s.model_copy(deep=True) for s in sessions]
        self.sessions: List[ChargingSession] = [s.model_copy(deep=True) for s in sessions]
        self.site_cap_kw: float = float(site_cap_kw)
        self.interval_minutes: int = int(interval_minutes)
        self.solar_profile: Dict[int, float] = solar_profile if solar_profile is not None else app_config.solar_profile
        self.tariff_profile: Dict[int, float] = tariff_profile if tariff_profile is not None else app_config.tariff_profile
        self.carbon_profile: Dict[int, float] = carbon_profile if carbon_profile is not None else app_config.carbon_profile
        self.fairness_enabled: bool = fairness_enabled
        self.solar_enabled: bool = solar_enabled
        self.site: str = site

        self.charging_efficiency: float = getattr(app_config, "charging_efficiency", 1.0)
        self.stopped_sessions: set = set()
        self.cutoff_events: List[CutoffEvent] = []
        self.session_cutoff_info: Dict[str, Dict[str, Any]] = {}
        self.scheduled_cap_changes: Dict[datetime, float] = {}
        self.active_policy: str = "chargewise"
        self.current_step_index: int = 0
        self.is_playing: bool = False
        self.timeline: List[datetime] = []
        self.delivered_so_far: Dict[str, float] = {}
        self.recorded_intervals: List[SimulationInterval] = []
        self._initialize_timeline()

    def _initialize_timeline(self):
        """Constructs discrete intervals from earliest arrival to latest departure."""
        if not self.sessions:
            now = datetime(2024, 10, 14, 8, 0, 0)
            self.start_time = now
            self.end_time = now + timedelta(hours=8)
            self.timeline = [now + timedelta(minutes=self.interval_minutes * i) for i in range(32)]
            return

        min_arr = min(s.arrival_time for s in self.sessions)
        max_dep = max(s.departure_time for s in self.sessions)

        start_min = (min_arr.minute // self.interval_minutes) * self.interval_minutes
        self.start_time = min_arr.replace(minute=start_min, second=0, microsecond=0)

        end_min = ((max_dep.minute // self.interval_minutes) + 1) * self.interval_minutes
        if end_min >= 60:
            self.end_time = (max_dep + timedelta(hours=1)).replace(minute=end_min % 60, second=0, microsecond=0)
        else:
            self.end_time = max_dep.replace(minute=end_min, second=0, microsecond=0)

        self.timeline = []
        curr = self.start_time
        while curr <= self.end_time:
            self.timeline.append(curr)
            curr += timedelta(minutes=self.interval_minutes)

        self.delivered_so_far = {s.session_id: 0.0 for s in self.sessions}
        self.recorded_intervals = []
        self.current_step_index = 0

    def update_site_cap(self, new_cap_kw: float, at_time: Optional[datetime] = None):
        """Updates site power capacity immediately or scheduled at a specific timestamp."""
        if at_time is not None:
            self.scheduled_cap_changes[at_time] = float(new_cap_kw)
        else:
            self.site_cap_kw = float(new_cap_kw)

    def trigger_early_departure(self, session_id: str, new_departure: datetime):
        """Modifies departure deadline for an active or scheduled session."""
        for s in self.sessions:
            if s.session_id == session_id:
                s.departure_time = new_departure
                s.departure_source = "declared"
        for s in self.original_sessions:
            if s.session_id == session_id:
                s.departure_time = new_departure
                s.departure_source = "declared"

    def set_emergency(self, session_id: str):
        """Flags a session as emergency priority."""
        for s in self.sessions:
            if s.session_id == session_id:
                s.is_emergency = True
        for s in self.original_sessions:
            if s.session_id == session_id:
                s.is_emergency = True

    def stop_charging(self, session_id: str, at_time: Optional[datetime] = None) -> Optional[CutoffEvent]:
        """Manually forces immediate charger cutoff for a specific session (sets power to 0 kW)."""
        self.stopped_sessions.add(session_id)
        for s in self.sessions:
            if s.session_id == session_id:
                s.is_manually_stopped = True
                cur_time = at_time or (
                    self.timeline[self.current_step_index]
                    if self.current_step_index < len(self.timeline)
                    else s.departure_time
                )
                deliv = self.delivered_so_far.get(session_id, 0.0)
                target = s.effective_energy_target_kwh
                achieved = bool(target is not None and deliv >= target - app_config.underserved_tolerance_kwh)
                event = CutoffEvent(
                    session_id=session_id,
                    charger_id=s.charger_id,
                    timestamp=cur_time,
                    reason="MANUAL_STOP",
                    final_energy_delivered_kwh=round(deliv, 3),
                    target_energy_kwh=target,
                    target_achieved=achieved,
                    final_soc_percent=self._estimate_soc(s, deliv),
                    message=f"Manual charging cutoff triggered by operator for {s.charger_id} ({session_id}). Power set to 0.0 kW.",
                )
                self.cutoff_events.append(event)
                self.session_cutoff_info[session_id] = {
                    "reason": "MANUAL_STOP",
                    "timestamp": cur_time,
                    "target_achieved": achieved,
                    "final_energy": deliv,
                }
                return event
        return None

    def start_charging(self, session_id: str) -> bool:
        """Resumes / starts charging for a session by removing manual cutoff."""
        if session_id in self.stopped_sessions:
            self.stopped_sessions.remove(session_id)
        if session_id in self.session_cutoff_info and self.session_cutoff_info[session_id].get("reason") == "MANUAL_STOP":
            del self.session_cutoff_info[session_id]
        for s in self.sessions:
            if s.session_id == session_id:
                s.is_manually_stopped = False
                return True
        return False

    def _estimate_soc(self, session: ChargingSession, deliv_kwh: float) -> Optional[float]:
        """Estimates vehicle battery SOC (%) given delivered energy."""
        if session.initial_soc_percent is not None and session.battery_capacity_kwh:
            soc = session.initial_soc_percent + (deliv_kwh / session.battery_capacity_kwh) * 100.0
            return round(min(100.0, max(0.0, soc)), 1)
        return None

    def reset(self, policy: Optional[str] = None):
        """Resets interactive simulation state to beginning."""
        if policy is not None:
            self.active_policy = policy
        self.sessions = [s.model_copy(deep=True) for s in self.original_sessions]
        self.delivered_so_far = {s.session_id: 0.0 for s in self.sessions}
        self.stopped_sessions.clear()
        self.cutoff_events.clear()
        self.session_cutoff_info.clear()
        self.recorded_intervals = []
        self.current_step_index = 0
        self.is_playing = False

    def step(self, policy: Optional[str] = None) -> Optional[SimulationInterval]:
        """Executes a single interval step in interactive simulation mode."""
        if self.current_step_index >= len(self.timeline):
            return None

        pol = policy or self.active_policy
        t = self.timeline[self.current_step_index]

        if t in self.scheduled_cap_changes:
            self.site_cap_kw = self.scheduled_cap_changes[t]

        interval = self._simulate_interval(t, pol, self.delivered_so_far, self.sessions)
        self.recorded_intervals.append(interval)
        self.current_step_index += 1
        return interval

    def _simulate_interval(
        self,
        current_time: datetime,
        policy: str,
        delivered_map: Dict[str, float],
        sessions_list: List[ChargingSession],
        cutoff_events_collector: Optional[List[CutoffEvent]] = None,
        session_cutoff_map: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> SimulationInterval:
        """Simulates charging behavior for one discrete interval with automatic cutoff enforcement."""
        interval_hours = self.interval_minutes / 60.0
        target_collector = cutoff_events_collector if cutoff_events_collector is not None else self.cutoff_events
        cutoff_map = session_cutoff_map if session_cutoff_map is not None else self.session_cutoff_info
        interval_cutoff_events: List[CutoffEvent] = []

        # 1. Departure-based cutoff: detect sessions that have reached departure deadline
        for s in sessions_list:
            sid = s.session_id
            if s.arrival_time <= current_time and current_time >= s.departure_time:
                if sid not in cutoff_map:
                    deliv = delivered_map.get(sid, 0.0)
                    target = s.effective_energy_target_kwh
                    tol = app_config.underserved_tolerance_kwh
                    achieved = bool(target is not None and deliv >= (target - tol))
                    soc_est = self._estimate_soc(s, deliv)
                    evt = CutoffEvent(
                        session_id=sid,
                        charger_id=s.charger_id,
                        timestamp=current_time,
                        reason="DEPARTURE_REACHED",
                        final_energy_delivered_kwh=round(deliv, 3),
                        target_energy_kwh=target,
                        target_achieved=achieved,
                        final_soc_percent=soc_est,
                        message=(
                            f"Vehicle reached scheduled departure ({s.departure_time.strftime('%H:%M')}) at {s.charger_id}. "
                            f"Final energy: {deliv:.2f} kWh ({'Target Achieved' if achieved else 'Incomplete'}). Charger power cut to 0.0 kW."
                        ),
                    )
                    target_collector.append(evt)
                    interval_cutoff_events.append(evt)
                    cutoff_map[sid] = {
                        "reason": "DEPARTURE_REACHED",
                        "timestamp": current_time,
                        "target_achieved": achieved,
                        "final_energy": deliv,
                    }

        # 2. Filter currently connected vehicles
        connected: List[ChargingSession] = [
            s for s in sessions_list
            if s.arrival_time <= current_time < s.departure_time
        ]

        connected_data: List[Dict[str, Any]] = []
        fairness_history: Dict[str, Dict[str, float]] = {}

        for s in connected:
            sid = s.session_id
            target = s.effective_energy_target_kwh
            max_cap = s.max_battery_capacity_kwh
            already_delivered = delivered_map.get(sid, 0.0)
            is_stopped = (sid in self.stopped_sessions) or s.is_manually_stopped

            if target is not None:
                rem_kwh = max(0.0, target - already_delivered)
            else:
                rem_kwh = 15.0

            if max_cap is not None:
                rem_kwh = min(rem_kwh, max(0.0, max_cap - already_delivered))

            # Auto cutoff check prior to dispatch
            if is_stopped:
                rem_kwh = 0.0
            elif rem_kwh <= 0.0001:
                rem_kwh = 0.0
                if sid not in cutoff_map:
                    is_battery_limit = (max_cap is not None and already_delivered >= max_cap - 1e-4)
                    reason = "BATTERY_CAPACITY_LIMIT" if is_battery_limit else "TARGET_REACHED"
                    soc_est = self._estimate_soc(s, already_delivered)
                    evt = CutoffEvent(
                        session_id=sid,
                        charger_id=s.charger_id,
                        timestamp=current_time,
                        reason=reason,
                        final_energy_delivered_kwh=round(already_delivered, 3),
                        target_energy_kwh=target,
                        target_achieved=True,
                        final_soc_percent=soc_est,
                        message=f"Automatic cutoff: {reason.replace('_', ' ').title()} achieved ({already_delivered:.2f} kWh). Power set to 0.0 kW.",
                    )
                    target_collector.append(evt)
                    interval_cutoff_events.append(evt)
                    cutoff_map[sid] = {
                        "reason": reason,
                        "timestamp": current_time,
                        "target_achieved": True,
                        "final_energy": already_delivered,
                    }

            connected_data.append({
                "session_id": sid,
                "remaining_kwh": rem_kwh,
                "charger_max_power_kw": s.charger_max_power_kw,
                "departure_time": s.departure_time,
                "is_emergency": s.is_emergency,
                "is_manually_stopped": is_stopped,
            })

            fairness_history[sid] = {
                "delivered_kwh": already_delivered,
                "target_kwh": target if target is not None else 15.0,
            }

        total_requested_kw = None
        if policy == "uncontrolled":
            allocations, total_requested_kw = uncontrolled_allocation(
                connected_sessions=connected_data,
                site_cap_kw=self.site_cap_kw,
                interval_minutes=self.interval_minutes,
            )
        else:
            allocations = chargewise_allocation(
                connected_sessions=connected_data,
                site_cap_kw=self.site_cap_kw,
                current_time=current_time,
                interval_minutes=self.interval_minutes,
                fairness_enabled=self.fairness_enabled,
                fairness_history=fairness_history,
            )

        actual_allocations: Dict[str, float] = {}
        session_statuses: Dict[str, str] = {}

        for s in connected:
            sid = s.session_id
            target = s.effective_energy_target_kwh
            max_cap = s.max_battery_capacity_kwh
            already_deliv = delivered_map.get(sid, 0.0)
            is_stopped = (sid in self.stopped_sessions) or s.is_manually_stopped

            if is_stopped:
                actual_allocations[sid] = 0.0
                session_statuses[sid] = "AUTO CUTOFF"
                continue

            rem_to_target = max(0.0, target - already_deliv) if target is not None else 999.0
            if max_cap is not None:
                rem_to_target = min(rem_to_target, max(0.0, max_cap - already_deliv))

            if rem_to_target <= 1e-4:
                actual_allocations[sid] = 0.0
                session_statuses[sid] = "TARGET REACHED"
                continue

            allocated_power = allocations.get(sid, 0.0)
            allocated_power = min(allocated_power, s.charger_max_power_kw)

            # Prevent overshooting remaining target / battery capacity within this interval
            max_power_needed = rem_to_target / (interval_hours * self.charging_efficiency)
            allocated_power = min(allocated_power, max_power_needed)
            allocated_power = max(0.0, allocated_power)
            actual_allocations[sid] = round(allocated_power, 4)

            energy_step = allocated_power * interval_hours * self.charging_efficiency
            new_deliv = round(already_deliv + energy_step, 6)
            delivered_map[sid] = new_deliv

            # Check if this exact simulation step triggered target cutoff
            if target is not None and new_deliv >= target - 1e-4:
                session_statuses[sid] = "TARGET REACHED"
                if sid not in cutoff_map:
                    is_battery_limit = (max_cap is not None and new_deliv >= max_cap - 1e-4)
                    reason = "BATTERY_CAPACITY_LIMIT" if is_battery_limit else "TARGET_REACHED"
                    soc_est = self._estimate_soc(s, new_deliv)
                    evt = CutoffEvent(
                        session_id=sid,
                        charger_id=s.charger_id,
                        timestamp=current_time,
                        reason=reason,
                        final_energy_delivered_kwh=round(new_deliv, 3),
                        target_energy_kwh=target,
                        target_achieved=True,
                        final_soc_percent=soc_est,
                        message=f"Automatic cutoff: {reason.replace('_', ' ').title()} satisfied ({new_deliv:.2f} kWh). Power set to 0.0 kW.",
                    )
                    target_collector.append(evt)
                    interval_cutoff_events.append(evt)
                    cutoff_map[sid] = {
                        "reason": reason,
                        "timestamp": current_time,
                        "target_achieved": True,
                        "final_energy": new_deliv,
                    }
            elif actual_allocations[sid] > 0.05:
                session_statuses[sid] = "CHARGING"
            else:
                session_statuses[sid] = "QUEUED"

        site_total_power_kw = round(sum(actual_allocations.values()), 4)

        solar_kw = 0.0
        if self.solar_enabled:
            solar_kw = round(self.solar_profile.get(current_time.hour, 0.0), 2)

        grid_kw = round(max(0.0, site_total_power_kw - solar_kw), 4)
        grid_kwh = grid_kw * interval_hours
        tariff_rate = self.tariff_profile.get(current_time.hour, 0.15)
        cost_usd = round(grid_kwh * tariff_rate, 4)

        carbon_rate = self.carbon_profile.get(current_time.hour, 350.0)
        carbon_g = round(grid_kwh * carbon_rate, 2)

        return SimulationInterval(
            timestamp=current_time,
            interval_minutes=self.interval_minutes,
            connected_vehicles=[s.session_id for s in connected],
            allocations=actual_allocations,
            session_statuses=session_statuses,
            cutoff_events=interval_cutoff_events,
            site_total_power_kw=site_total_power_kw,
            site_cap_kw=self.site_cap_kw,
            solar_power_kw=solar_kw,
            grid_power_kw=grid_kw,
            policy=policy,
            total_requested_power_kw=total_requested_kw,
            cost_usd=cost_usd,
            carbon_emissions_gco2=carbon_g,
        )

    def run(self, policy: str = "uncontrolled") -> SimulationResult:
        """Executes a complete reproducible simulation with the designated policy."""
        sim_sessions = [s.model_copy(deep=True) for s in self.sessions]
        delivered_map: Dict[str, float] = {s.session_id: 0.0 for s in sim_sessions}
        sim_cutoff_events: List[CutoffEvent] = []
        sim_cutoff_map: Dict[str, Dict[str, Any]] = {}
        intervals: List[SimulationInterval] = []

        current_cap = self.site_cap_kw

        for t in self.timeline:
            if t in self.scheduled_cap_changes:
                current_cap = self.scheduled_cap_changes[t]

            saved_cap = self.site_cap_kw
            self.site_cap_kw = current_cap

            interval = self._simulate_interval(
                t, policy, delivered_map, sim_sessions,
                cutoff_events_collector=sim_cutoff_events,
                session_cutoff_map=sim_cutoff_map
            )
            intervals.append(interval)

            self.site_cap_kw = saved_cap

        outcomes: List[SessionOutcome] = []
        underserved_count = 0
        total_delivered_kwh = 0.0
        total_requested_kwh = 0.0
        has_any_requested = False
        tolerance = app_config.underserved_tolerance_kwh

        for s in sim_sessions:
            sid = s.session_id
            deliv = round(delivered_map.get(sid, 0.0), 3)

            effective_target = s.effective_energy_target_kwh
            real_requested = s.requested_energy_kwh

            eval_target: Optional[float] = None
            if real_requested is not None:
                has_any_requested = True
                # Evaluate fulfillment against effective safe target
                eval_target = effective_target if effective_target is not None else real_requested
                shortfall = max(0.0, round(eval_target - deliv, 3))
                is_fully_served = (shortfall <= tolerance)
                is_underserved = (shortfall > tolerance)
                total_requested_kwh += real_requested
                if is_underserved:
                    underserved_count += 1
            elif s.target_soc_energy_kwh is not None:
                eval_target = effective_target if effective_target is not None else s.target_soc_energy_kwh
                shortfall = max(0.0, round(eval_target - deliv, 3))
                is_fully_served = (shortfall <= tolerance)
                is_underserved = (shortfall > tolerance)
                if is_underserved:
                    underserved_count += 1
            elif s.observed_energy_kwh is not None:
                # Proxy / observed baseline without explicit user request
                eval_target = s.observed_energy_kwh
                shortfall = max(0.0, round(s.observed_energy_kwh - deliv, 3))
                is_fully_served = (shortfall <= tolerance)
                is_underserved = (shortfall > tolerance)
                if is_underserved:
                    underserved_count += 1
            else:
                eval_target = None
                shortfall = None
                is_fully_served = None
                is_underserved = None

            total_delivered_kwh += deliv

            feasibility_res = check_feasibility(
                session=s,
                site_available_kw=self.site_cap_kw,
                competing_sessions=len(sim_sessions),
            )

            # Cutoff details
            c_info = sim_cutoff_map.get(sid, {})
            c_reason = c_info.get("reason")
            c_time = c_info.get("timestamp")
            if not c_reason and s.departure_time <= self.end_time:
                c_reason = "DEPARTURE_REACHED"
                c_time = s.departure_time

            target_achieved = bool(is_fully_served) if is_fully_served is not None else (deliv > 0)
            if target_achieved:
                status_label = "TARGET REACHED"
            elif c_reason == "MANUAL_STOP":
                status_label = "AUTO CUTOFF"
            else:
                status_label = "INCOMPLETE"

            outcome = SessionOutcome(
                session_id=sid,
                energy_delivered_kwh=deliv,
                energy_requested_kwh=real_requested,
                effective_target_kwh=eval_target,
                shortfall_kwh=shortfall,
                is_fully_served=is_fully_served,
                is_underserved=is_underserved,
                feasibility_status=feasibility_res["status"],
                departure_source=s.departure_source,
                energy_source=s.energy_source,
                cutoff_reason=c_reason,
                cutoff_timestamp=c_time,
                target_achieved=target_achieved,
                status_label=status_label,
            )
            outcomes.append(outcome)

        peak_demand_kw = max((iv.site_total_power_kw for iv in intervals), default=0.0)

        # For uncontrolled policy, also track the unconstrained demand peak (before cap clipping)
        peak_unconstrained_kw = peak_demand_kw
        if policy == "uncontrolled":
            unconstrained_peaks = [
                iv.total_requested_power_kw for iv in intervals
                if iv.total_requested_power_kw is not None
            ]
            if unconstrained_peaks:
                peak_unconstrained_kw = max(max(unconstrained_peaks), peak_demand_kw)

        cap_violations = sum(
            1 for iv in intervals
            if (iv.site_total_power_kw > iv.site_cap_kw + 1e-4) or
               (iv.total_requested_power_kw is not None and iv.total_requested_power_kw > iv.site_cap_kw + 1e-4)
        )

        total_cost_usd = round(sum(iv.cost_usd for iv in intervals if iv.cost_usd is not None), 2)
        total_carbon_kg = round(sum(iv.carbon_emissions_gco2 for iv in intervals if iv.carbon_emissions_gco2 is not None) / 1000.0, 2)

        return SimulationResult(
            policy=policy,
            site=self.site,
            start_time=self.start_time,
            end_time=self.end_time,
            intervals=intervals,
            outcomes=outcomes,
            cutoff_events=sim_cutoff_events,
            peak_demand_kw=round(peak_demand_kw, 2),
            peak_unconstrained_demand_kw=round(peak_unconstrained_kw, 2),
            total_energy_delivered_kwh=round(total_delivered_kwh, 2),
            total_energy_requested_kwh=round(total_requested_kwh, 2) if has_any_requested else None,
            cap_violations=cap_violations,
            sessions_count=len(sim_sessions),
            underserved_count=underserved_count,
            total_cost_usd=total_cost_usd,
            total_carbon_kg=total_carbon_kg,
        )

    def run_comparison(self) -> Dict[str, Any]:
        """Runs both policies and evaluates comparative performance metrics."""
        res_uncontrolled = self.run(policy="uncontrolled")
        res_chargewise = self.run(policy="chargewise")

        # Use unconstrained demand peak for meaningful comparison:
        # uncontrolled would draw peak_unconstrained_demand_kw if no cap existed
        unc_peak = res_uncontrolled.peak_unconstrained_demand_kw
        opt_peak = res_chargewise.peak_demand_kw
        peak_diff = unc_peak - opt_peak
        peak_reduction_pct = (peak_diff / unc_peak * 100.0) if unc_peak > 0 else 0.0

        violations_avoided = res_uncontrolled.cap_violations - res_chargewise.cap_violations
        underserved_reduction = res_uncontrolled.underserved_count - res_chargewise.underserved_count

        cost_unc = res_uncontrolled.total_cost_usd or 0.0
        cost_opt = res_chargewise.total_cost_usd or 0.0
        cost_savings = round(cost_unc - cost_opt, 2)

        carbon_unc = res_uncontrolled.total_carbon_kg or 0.0
        carbon_opt = res_chargewise.total_carbon_kg or 0.0
        carbon_reduction = round(carbon_unc - carbon_opt, 2)

        return {
            "uncontrolled": res_uncontrolled.model_dump(),
            "chargewise": res_chargewise.model_dump(),
            "metrics": {
                "peak_reduction_kw": round(peak_diff, 2),
                "peak_reduction_percent": round(peak_reduction_pct, 1),
                "cap_violations_avoided": violations_avoided,
                "underserved_reduction": underserved_reduction,
                "cost_savings_usd": cost_savings,
                "carbon_reduction_kg": carbon_reduction,
                "uncontrolled_peak_kw": unc_peak,
                "chargewise_peak_kw": opt_peak,
                "uncontrolled_delivered_peak_kw": res_uncontrolled.peak_demand_kw,
                "uncontrolled_underserved": res_uncontrolled.underserved_count,
                "chargewise_underserved": res_chargewise.underserved_count,
            },
            "summary": (
                f"ChargeWise eliminated {violations_avoided} transformer capacity violations and reduced "
                f"underserved vehicles by {underserved_reduction} while saving ${cost_savings:.2f}."
            ),
        }

    def get_current_state(self) -> Dict[str, Any]:
        """Returns the current step, active interval, cumulative metrics, and cutoff events."""
        step_idx = self.current_step_index
        total_steps = len(self.timeline)
        current_time = self.timeline[min(step_idx, total_steps - 1)] if total_steps > 0 else self.start_time

        last_interval = self.recorded_intervals[-1] if self.recorded_intervals else None

        return {
            "step_index": step_idx,
            "total_steps": total_steps,
            "current_time": current_time.isoformat(),
            "is_complete": step_idx >= total_steps,
            "is_playing": self.is_playing,
            "active_policy": self.active_policy,
            "site_cap_kw": self.site_cap_kw,
            "last_interval": last_interval.model_dump() if last_interval else None,
            "cumulative_delivered_kwh": round(sum(self.delivered_so_far.values()), 3),
            "sessions_count": len(self.sessions),
            "cutoff_events": [e.model_dump() for e in self.cutoff_events],
            "stopped_sessions": list(self.stopped_sessions),
        }
