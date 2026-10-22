"""Charging dispatch policy tests."""

from datetime import datetime, timedelta
import pytest

from models.session import ChargingSession
from simulation.policies import uncontrolled_allocation, chargewise_allocation
from simulation.engine import SimulationEngine
from simulation.fairness import calculate_jains_fairness_index, compute_fairness_adjustment


def test_emergency_priority():
    """Verify that a session marked with emergency status receives top priority under tight capacity."""
    now = datetime(2024, 10, 14, 10, 0, 0)
    # 2 vehicles competing for 7.0 kW site capacity:
    # Vehicle 1: Regular session, 20 kWh needed over 2 hours, 6.6 kW charger
    # Vehicle 2: Emergency session, 10 kWh needed over 2 hours, 6.6 kW charger
    connected = [
        {
            "session_id": "REGULAR",
            "departure_time": now + timedelta(hours=2),
            "remaining_kwh": 20.0,
            "charger_max_power_kw": 6.6,
            "is_emergency": False,
        },
        {
            "session_id": "EMERGENCY",
            "departure_time": now + timedelta(hours=2),
            "remaining_kwh": 10.0,
            "charger_max_power_kw": 6.6,
            "is_emergency": True,
        },
    ]

    # With 7.0 kW site cap, both cannot charge at 6.6 kW simultaneously
    allocations = chargewise_allocation(
        connected_sessions=connected,
        site_cap_kw=7.0,
        current_time=now,
        interval_minutes=15,
    )

    # Emergency vehicle must get its full requested power 6.6 kW
    assert allocations["EMERGENCY"] == 6.6
    # Regular vehicle gets only remaining 0.4 kW
    assert abs(allocations["REGULAR"] - 0.4) < 1e-3


def test_unknown_departure_handled():
    """Verify sessions with estimated or unobserved departures are safely scheduled."""
    now = datetime(2024, 10, 14, 9, 0, 0)
    sess = ChargingSession(
        session_id="SESS-UNKNOWN-DEP",
        site="caltech",
        arrival_time=now,
        departure_time=now + timedelta(hours=4),
        requested_energy_kwh=20.0,
        charger_id="CP-01",
        charger_max_power_kw=6.6,
        departure_source="estimated",
        is_synthetic=False,
    )

    engine = SimulationEngine(sessions=[sess], site_cap_kw=15.0)
    result = engine.run(policy="chargewise")

    assert result.sessions_count == 1
    assert result.total_energy_delivered_kwh > 0.0
    assert result.outcomes[0].departure_source == "estimated"


def test_zero_time_no_division_error():
    """Verify that when time remaining is 0 or negative, no ZeroDivisionError occurs."""
    now = datetime(2024, 10, 14, 12, 0, 0)
    connected = [
        {
            "session_id": "EXPIRED",
            "departure_time": now,  # zero time remaining
            "remaining_kwh": 15.0,
            "charger_max_power_kw": 6.6,
            "is_emergency": False,
        },
        {
            "session_id": "OVERDUE",
            "departure_time": now - timedelta(minutes=15),  # negative time remaining
            "remaining_kwh": 15.0,
            "charger_max_power_kw": 6.6,
            "is_emergency": False,
        },
    ]

    # Should execute without ZeroDivisionError
    allocations = chargewise_allocation(
        connected_sessions=connected,
        site_cap_kw=15.0,
        current_time=now,
        interval_minutes=15,
    )

    assert allocations["EXPIRED"] == 0.0
    assert allocations["OVERDUE"] == 0.0


def test_missing_energy_not_treated_as_request():
    """Verify sessions with missing requested energy are tracked with proper proxy source."""
    now = datetime(2024, 10, 14, 9, 0, 0)
    sess = ChargingSession(
        session_id="SESS-PROXY",
        site="caltech",
        arrival_time=now,
        departure_time=now + timedelta(hours=4),
        requested_energy_kwh=None,  # Missing
        observed_energy_kwh=18.0,
        charger_id="CP-01",
        charger_max_power_kw=6.6,
        energy_source="proxy",
    )

    engine = SimulationEngine(sessions=[sess], site_cap_kw=15.0)
    result = engine.run(policy="chargewise")

    outcome = result.outcomes[0]
    assert outcome.energy_source == "proxy"
    assert outcome.energy_requested_kwh is None
    # Engine delivered energy according to proxy, never fabricated a declared request
    assert outcome.energy_delivered_kwh > 0.0


def test_uncontrolled_clipping():
    """Verify uncontrolled policy clips proportionally when enforce_cap is True."""
    connected = [
        {"session_id": "V1", "remaining_kwh": 30.0, "charger_max_power_kw": 6.6},
        {"session_id": "V2", "remaining_kwh": 30.0, "charger_max_power_kw": 6.6},
        {"session_id": "V3", "remaining_kwh": 30.0, "charger_max_power_kw": 6.6},
    ]
    # Total requested: 3 * 6.6 = 19.8 kW
    site_cap = 10.0  # Cap is lower than 19.8 kW

    allocations, total_requested = uncontrolled_allocation(
        connected_sessions=connected,
        site_cap_kw=site_cap,
        interval_minutes=15,
        enforce_cap=True,
    )

    assert abs(total_requested - 19.8) < 1e-2
    # Sum of clipped allocations must not exceed site cap
    total_clipped = sum(allocations.values())
    assert abs(total_clipped - site_cap) < 1e-2
    # Each vehicle should receive proportional share: 10.0 / 3 ~= 3.333 kW
    for v in ["V1", "V2", "V3"]:
        assert abs(allocations[v] - (10.0 / 3.0)) < 0.05


def test_uncontrolled_can_exceed_cap():
    """Verify unmanaged baseline charging exceeds site cap when simultaneous demand requires it."""
    connected = [
        {"session_id": "V1", "remaining_kwh": 30.0, "charger_max_power_kw": 6.6},
        {"session_id": "V2", "remaining_kwh": 30.0, "charger_max_power_kw": 6.6},
        {"session_id": "V3", "remaining_kwh": 30.0, "charger_max_power_kw": 6.6},
    ]
    site_cap = 10.0

    allocations, total_requested = uncontrolled_allocation(
        connected_sessions=connected,
        site_cap_kw=site_cap,
        interval_minutes=15,
        enforce_cap=False,
    )

    # In unmanaged baseline, cars draw full power (19.8 kW), exceeding the 10 kW cap
    assert abs(total_requested - 19.8) < 1e-2
    total_allocated = sum(allocations.values())
    assert abs(total_allocated - 19.8) < 1e-2
    assert total_allocated > site_cap
    for v in ["V1", "V2", "V3"]:
        assert abs(allocations[v] - 6.6) < 1e-2


def test_jains_fairness_index():
    """Verify calculation of Jain's Fairness Index."""
    # Completely equal fulfillment -> JFI = 1.0
    assert calculate_jains_fairness_index([1.0, 1.0, 1.0]) == 1.0

    # Unequal fulfillment
    jfi = calculate_jains_fairness_index([1.0, 0.0])
    # (1)^2 / (2 * 1) = 0.5
    assert abs(jfi - 0.5) < 1e-4

    # Empty list
    assert calculate_jains_fairness_index([]) == 1.0
