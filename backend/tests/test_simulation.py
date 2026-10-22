"""Core simulation engine tests."""

from datetime import datetime, timedelta
import pytest

from models.session import ChargingSession
from simulation.engine import SimulationEngine


def create_standard_test_scenario():
    """Builds the canonical 3-session scenario:
    - Session A: arrives 09:00, departs 17:00, needs 20 kWh, 6.6 kW charger
    - Session B: arrives 09:30, departs 12:00, needs 15 kWh, 7.2 kW charger
    - Session C: arrives 10:00, departs 10:30, needs 40 kWh, 6.6 kW charger (infeasible)
    - Site cap: 15 kW
    """
    base_date = datetime(2024, 10, 14)
    sess_a = ChargingSession(
        session_id="SESS-A",
        site="caltech",
        arrival_time=base_date.replace(hour=9, minute=0),
        departure_time=base_date.replace(hour=17, minute=0),
        requested_energy_kwh=20.0,
        observed_energy_kwh=20.0,
        charger_id="CP-01",
        charger_max_power_kw=6.6,
        energy_source="requested",
        departure_source="declared",
    )
    sess_b = ChargingSession(
        session_id="SESS-B",
        site="caltech",
        arrival_time=base_date.replace(hour=9, minute=30),
        departure_time=base_date.replace(hour=12, minute=0),
        requested_energy_kwh=15.0,
        observed_energy_kwh=15.0,
        charger_id="CP-02",
        charger_max_power_kw=7.2,
        energy_source="requested",
        departure_source="declared",
    )
    sess_c = ChargingSession(
        session_id="SESS-C",
        site="caltech",
        arrival_time=base_date.replace(hour=10, minute=0),
        departure_time=base_date.replace(hour=10, minute=30),
        requested_energy_kwh=40.0,
        observed_energy_kwh=40.0,
        charger_id="CP-03",
        charger_max_power_kw=6.6,
        energy_source="requested",
        departure_source="declared",
    )
    return [sess_a, sess_b, sess_c]


def test_no_charging_before_arrival():
    """Verify vehicles are never allocated power before their recorded arrival time."""
    sessions = create_standard_test_scenario()
    engine = SimulationEngine(sessions=sessions, site_cap_kw=15.0)
    result = engine.run(policy="chargewise")

    # Session B arrives at 09:30. In intervals before 09:30, Session B must not receive power
    for iv in result.intervals:
        if iv.timestamp < datetime(2024, 10, 14, 9, 30):
            assert "SESS-B" not in iv.connected_vehicles
            assert iv.allocations.get("SESS-B", 0.0) == 0.0

    # Session C arrives at 10:00. In intervals before 10:00, Session C must not receive power
    for iv in result.intervals:
        if iv.timestamp < datetime(2024, 10, 14, 10, 0):
            assert "SESS-C" not in iv.connected_vehicles
            assert iv.allocations.get("SESS-C", 0.0) == 0.0


def test_no_charging_after_departure():
    """Verify vehicles are never allocated power after their scheduled departure time."""
    sessions = create_standard_test_scenario()
    engine = SimulationEngine(sessions=sessions, site_cap_kw=15.0)
    result = engine.run(policy="chargewise")

    # Session B departs at 12:00. In intervals at or after 12:00, Session B must not receive power
    for iv in result.intervals:
        if iv.timestamp >= datetime(2024, 10, 14, 12, 0):
            assert "SESS-B" not in iv.connected_vehicles
            assert iv.allocations.get("SESS-B", 0.0) == 0.0

    # Session C departs at 10:30. In intervals at or after 10:30, Session C must not receive power
    for iv in result.intervals:
        if iv.timestamp >= datetime(2024, 10, 14, 10, 30):
            assert "SESS-C" not in iv.connected_vehicles
            assert iv.allocations.get("SESS-C", 0.0) == 0.0


def test_optimized_never_exceeds_cap():
    """Verify ChargeWise smart policy never exceeds the site power capacity constraint."""
    sessions = create_standard_test_scenario()
    site_cap = 15.0
    engine = SimulationEngine(sessions=sessions, site_cap_kw=site_cap)
    result = engine.run(policy="chargewise")

    assert result.peak_demand_kw <= site_cap + 1e-4
    assert result.cap_violations == 0

    for iv in result.intervals:
        assert iv.site_total_power_kw <= site_cap + 1e-4
        assert sum(iv.allocations.values()) <= site_cap + 1e-4


def test_charger_limit_respected():
    """Verify power allocated to any session never exceeds that charger's rated max power."""
    sessions = create_standard_test_scenario()
    engine = SimulationEngine(sessions=sessions, site_cap_kw=15.0)

    for pol in ["uncontrolled", "chargewise"]:
        result = engine.run(policy=pol)
        for iv in result.intervals:
            for s in sessions:
                alloc = iv.allocations.get(s.session_id, 0.0)
                assert alloc <= s.charger_max_power_kw + 1e-4, (
                    f"Session {s.session_id} allocated {alloc} kW which exceeds max {s.charger_max_power_kw} kW"
                )


def test_energy_never_exceeds_request():
    """Verify energy delivered to any vehicle never exceeds the declared requested energy target."""
    sessions = create_standard_test_scenario()
    engine = SimulationEngine(sessions=sessions, site_cap_kw=25.0)  # Generous cap

    for pol in ["uncontrolled", "chargewise"]:
        result = engine.run(policy=pol)
        for outcome in result.outcomes:
            assert outcome.energy_delivered_kwh <= outcome.energy_requested_kwh + 1e-3, (
                f"Delivered {outcome.energy_delivered_kwh} exceeds target {outcome.energy_requested_kwh}"
            )


def test_cap_change_affects_allocation():
    """Verify dynamically updating the site capacity alters power allocations accordingly."""
    sessions = create_standard_test_scenario()
    engine = SimulationEngine(sessions=sessions, site_cap_kw=15.0)
    res_high = engine.run(policy="chargewise")

    # Lower cap to 5.0 kW
    engine.site_cap_kw = 5.0
    res_low = engine.run(policy="chargewise")

    assert res_low.peak_demand_kw <= 5.0 + 1e-4
    assert res_low.peak_demand_kw < res_high.peak_demand_kw


def test_reproducible_results():
    """Verify that simulation runs are 100% deterministic and reproducible."""
    sessions = create_standard_test_scenario()
    engine1 = SimulationEngine(sessions=sessions, site_cap_kw=15.0)
    engine2 = SimulationEngine(sessions=sessions, site_cap_kw=15.0)

    res1 = engine1.run(policy="chargewise")
    res2 = engine2.run(policy="chargewise")

    assert res1.peak_demand_kw == res2.peak_demand_kw
    assert res1.total_energy_delivered_kwh == res2.total_energy_delivered_kwh
    assert len(res1.intervals) == len(res2.intervals)
    for i in range(len(res1.intervals)):
        assert res1.intervals[i].allocations == res2.intervals[i].allocations


def test_units_consistent():
    """Verify strict dimensional consistency: Power (kW) * Time (hours) == Energy (kWh)."""
    sessions = create_standard_test_scenario()
    engine = SimulationEngine(sessions=sessions, site_cap_kw=15.0, interval_minutes=15)
    result = engine.run(policy="chargewise")

    interval_hours = 15.0 / 60.0  # 0.25 h
    # Sum of energy across intervals
    sum_interval_energy = sum(iv.site_total_power_kw * interval_hours for iv in result.intervals)
    sum_outcome_energy = sum(o.energy_delivered_kwh for o in result.outcomes)

    assert abs(sum_interval_energy - sum_outcome_energy) < 0.1
    assert abs(result.total_energy_delivered_kwh - sum_outcome_energy) < 0.1


def test_metrics_match_simulation():
    """Verify aggregate summary metrics match interval time series data exactly."""
    sessions = create_standard_test_scenario()
    engine = SimulationEngine(sessions=sessions, site_cap_kw=15.0)
    result = engine.run(policy="chargewise")

    # Peak demand matches highest interval power
    expected_peak = max(iv.site_total_power_kw for iv in result.intervals)
    assert abs(result.peak_demand_kw - expected_peak) < 1e-2

    # Session count matches
    assert result.sessions_count == len(sessions)
    assert len(result.outcomes) == len(sessions)

    # Underserved count matches outcomes
    expected_underserved = sum(1 for o in result.outcomes if o.is_underserved)
    assert result.underserved_count == expected_underserved
