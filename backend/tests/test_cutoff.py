"""Tests for Automatic Charging Cutoff, Battery Limits, and Power Reallocation."""

from datetime import datetime, timedelta
import pytest

from models.session import ChargingSession
from simulation.engine import SimulationEngine


def test_cutoff_when_target_energy_reached():
    """Verify charging automatically cuts off (0 kW) when vehicle reaches requested target energy."""
    base_date = datetime(2024, 10, 14, 9, 0)
    sess = ChargingSession(
        session_id="CUTOFF-01",
        site="caltech",
        arrival_time=base_date,
        departure_time=base_date + timedelta(hours=4),
        requested_energy_kwh=3.3,  # Exactly 3.3 kWh needed
        charger_id="CP-01",
        charger_max_power_kw=6.6,  # 6.6 kW charger delivers 1.65 kWh per 15-min interval
    )
    engine = SimulationEngine(sessions=[sess], site_cap_kw=20.0, interval_minutes=15)
    
    # Step 1: 09:00 -> 09:15. Needs 3.3 kWh. Max for 15 min = 1.65 kWh. Allocated: 6.6 kW.
    iv1 = engine.step(policy="chargewise")
    assert iv1 is not None
    assert iv1.allocations["CUTOFF-01"] == 6.6
    assert engine.delivered_so_far["CUTOFF-01"] == 1.65
    assert iv1.session_statuses["CUTOFF-01"] == "CHARGING"

    # Step 2: 09:15 -> 09:30. Needs 1.65 kWh remaining. Max for 15 min = 1.65 kWh. Allocated: 6.6 kW.
    iv2 = engine.step(policy="chargewise")
    assert iv2 is not None
    assert iv2.allocations["CUTOFF-01"] == 6.6
    assert abs(engine.delivered_so_far["CUTOFF-01"] - 3.3) < 1e-4
    # Target was reached at the end of this step!
    assert iv2.session_statuses["CUTOFF-01"] == "TARGET REACHED"

    # Step 3: 09:30 -> 09:45. Target is satisfied! Power MUST immediately be 0.0 kW (automatic cutoff).
    iv3 = engine.step(policy="chargewise")
    assert iv3 is not None
    assert iv3.allocations["CUTOFF-01"] == 0.0
    assert iv3.session_statuses["CUTOFF-01"] == "TARGET REACHED"
    assert engine.delivered_so_far["CUTOFF-01"] == 3.3  # No extra energy delivered

    # Check cutoff event was logged
    cutoff_events = [e for e in engine.cutoff_events if e.session_id == "CUTOFF-01"]
    assert len(cutoff_events) >= 1
    assert cutoff_events[0].reason in ("TARGET_REACHED", "BATTERY_CAPACITY_LIMIT")
    assert cutoff_events[0].target_achieved is True
    assert abs(cutoff_events[0].final_energy_delivered_kwh - 3.3) < 1e-4


def test_battery_capacity_limit_enforced():
    """Verify vehicle never receives more energy than physical battery headroom to 100% capacity."""
    base_date = datetime(2024, 10, 14, 9, 0)
    # Battery: 50 kWh, arrival SOC: 80% -> headroom to 100% is only 10 kWh!
    # User requests 40 kWh (which would exceed 100% capacity).
    sess = ChargingSession(
        session_id="BATT-SAFETY",
        site="caltech",
        arrival_time=base_date,
        departure_time=base_date + timedelta(hours=6),
        requested_energy_kwh=40.0,
        battery_capacity_kwh=50.0,
        initial_soc_percent=80.0,
        target_soc_percent=100.0,
        charger_id="CP-02",
        charger_max_power_kw=10.0,
    )
    # The session's effective target must be clamped to max_battery_capacity_kwh (10 kWh)
    assert sess.effective_energy_target_kwh == 10.0
    assert sess.max_battery_capacity_kwh == 10.0

    engine = SimulationEngine(sessions=[sess], site_cap_kw=20.0, interval_minutes=15)
    res = engine.run(policy="chargewise")

    # Final energy must not exceed 10 kWh
    outcome = next(o for o in res.outcomes if o.session_id == "BATT-SAFETY")
    assert outcome.energy_delivered_kwh <= 10.0 + 1e-4
    assert outcome.is_fully_served is True


def test_target_soc_cutoff():
    """Verify cutoff stops at target SOC even when 100% battery capacity has more headroom."""
    base_date = datetime(2024, 10, 14, 9, 0)
    # Battery 100 kWh, initial SOC 50%, target SOC 70% -> needs exactly 20 kWh
    sess = ChargingSession(
        session_id="SOC-TARGET",
        site="caltech",
        arrival_time=base_date,
        departure_time=base_date + timedelta(hours=8),
        requested_energy_kwh=None,  # Not declared; relying on SOC targets
        battery_capacity_kwh=100.0,
        initial_soc_percent=50.0,
        target_soc_percent=70.0,
        charger_id="CP-03",
        charger_max_power_kw=10.0,
    )
    assert sess.target_soc_energy_kwh == 20.0
    assert sess.effective_energy_target_kwh == 20.0

    engine = SimulationEngine(sessions=[sess], site_cap_kw=30.0, interval_minutes=15)
    res = engine.run(policy="chargewise")

    outcome = next(o for o in res.outcomes if o.session_id == "SOC-TARGET")
    assert abs(outcome.energy_delivered_kwh - 20.0) < 1e-4
    assert outcome.is_fully_served is True


def test_departure_based_cutoff():
    """Verify charging stops when vehicle reaches departure time, even if target was not met."""
    base_date = datetime(2024, 10, 14, 9, 0)
    # Session leaves at 09:30 (only 30 min = 2 intervals) but needs 30 kWh (impossible with 6.6 kW charger)
    sess = ChargingSession(
        session_id="DEP-CUTOFF",
        site="caltech",
        arrival_time=base_date,
        departure_time=base_date + timedelta(minutes=30),
        requested_energy_kwh=30.0,
        charger_id="CP-04",
        charger_max_power_kw=6.6,
    )
    engine = SimulationEngine(sessions=[sess], site_cap_kw=20.0, interval_minutes=15)

    # Interval 1: 09:00 -> 09:15
    iv1 = engine.step(policy="chargewise")
    assert iv1.allocations["DEP-CUTOFF"] == 6.6

    # Interval 2: 09:15 -> 09:30
    iv2 = engine.step(policy="chargewise")
    assert iv2.allocations["DEP-CUTOFF"] == 6.6

    # Interval 3: 09:30 onwards (departed!)
    iv3 = engine.step(policy="chargewise")
    assert "DEP-CUTOFF" not in iv3.connected_vehicles
    assert iv3.allocations.get("DEP-CUTOFF", 0.0) == 0.0

    # Total delivered should be 2 intervals * 1.65 = 3.3 kWh
    assert abs(engine.delivered_so_far["DEP-CUTOFF"] - 3.3) < 1e-4


def test_manual_stop_and_resume():
    """Verify operator manual stop sets power to 0 kW immediately and releases capacity."""
    base_date = datetime(2024, 10, 14, 9, 0)
    sess = ChargingSession(
        session_id="MANUAL-01",
        site="caltech",
        arrival_time=base_date,
        departure_time=base_date + timedelta(hours=4),
        requested_energy_kwh=25.0,
        charger_id="CP-05",
        charger_max_power_kw=7.2,
    )
    engine = SimulationEngine(sessions=[sess], site_cap_kw=20.0, interval_minutes=15)

    # Interval 1: charging normally
    iv1 = engine.step(policy="chargewise")
    assert iv1.allocations["MANUAL-01"] == 7.2
    assert iv1.session_statuses["MANUAL-01"] == "CHARGING"

    # Operator triggers manual stop!
    cutoff_event = engine.stop_charging("MANUAL-01")
    assert cutoff_event is not None
    assert cutoff_event.reason == "MANUAL_STOP"
    assert "MANUAL-01" in engine.stopped_sessions

    # Interval 2: must immediately draw 0.0 kW
    iv2 = engine.step(policy="chargewise")
    assert iv2.allocations["MANUAL-01"] == 0.0
    assert iv2.session_statuses["MANUAL-01"] == "AUTO CUTOFF"

    # Operator resumes charging!
    resumed = engine.start_charging("MANUAL-01")
    assert resumed is True
    assert "MANUAL-01" not in engine.stopped_sessions

    # Interval 3: resumes charging normally
    iv3 = engine.step(policy="chargewise")
    assert iv3.allocations["MANUAL-01"] == 7.2
    assert iv3.session_statuses["MANUAL-01"] == "CHARGING"


def test_power_reallocation_on_cutoff():
    """Verify that when a vehicle reaches target and cuts off, released power is reallocated to another vehicle under site cap."""
    base_date = datetime(2024, 10, 14, 9, 0)
    # Site cap: 7.2 kW total.
    # Car A needs only 1.8 kWh (finishes in 1 interval at 7.2 kW: 7.2 * 0.25 = 1.8 kWh).
    # Car B needs 20.0 kWh (longer deadline).
    sess_a = ChargingSession(
        session_id="CAR-A",
        site="caltech",
        arrival_time=base_date,
        departure_time=base_date + timedelta(hours=1),
        requested_energy_kwh=1.8,
        charger_id="CP-06",
        charger_max_power_kw=7.2,
    )
    sess_b = ChargingSession(
        session_id="CAR-B",
        site="caltech",
        arrival_time=base_date,
        departure_time=base_date + timedelta(hours=4),
        requested_energy_kwh=20.0,
        charger_id="CP-07",
        charger_max_power_kw=7.2,
    )
    # With site cap = 7.2 kW and Car A having urgent 1-hour departure vs Car B 4-hour departure:
    # Interval 1: Car A takes full 7.2 kW budget, Car B gets 0.0 kW.
    engine = SimulationEngine(sessions=[sess_a, sess_b], site_cap_kw=7.2, interval_minutes=15)

    iv1 = engine.step(policy="chargewise")
    assert iv1.allocations["CAR-A"] == 7.2
    assert iv1.allocations["CAR-B"] == 0.0
    assert engine.delivered_so_far["CAR-A"] == 1.8  # Car A target met!

    # Interval 2: Car A automatically cuts off (0 kW). The entire 7.2 kW budget is reallocated to Car B!
    iv2 = engine.step(policy="chargewise")
    assert iv2.allocations["CAR-A"] == 0.0
    assert iv2.session_statuses["CAR-A"] == "TARGET REACHED"
    assert iv2.allocations["CAR-B"] == 7.2
    assert iv2.session_statuses["CAR-B"] == "CHARGING"
    assert iv2.site_total_power_kw <= 7.2  # Cap respected!
