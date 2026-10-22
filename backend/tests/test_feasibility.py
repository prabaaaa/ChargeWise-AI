"""Feasibility oracle and rescue station finder tests."""

from datetime import datetime, timedelta
import pytest

from simulation.feasibility import check_feasibility
from rescue.station_finder import find_rescue_stations, get_demo_stations, haversine_distance_km


def test_impossible_request_identified():
    """Verify that an infeasible request is accurately flagged as 'likely_infeasible' with expected shortfall."""
    # Session C from standard scenario:
    # 40 kWh requested in 30 minutes (0.5 hours) on 6.6 kW charger
    # Max deliverable energy = 6.6 kW * 0.5 h = 3.3 kWh
    session_data = {
        "session_id": "SESS-C",
        "remaining_kwh": 40.0,
        "time_remaining_hours": 0.5,
        "charger_max_kw": 6.6,
        "requested_energy_kwh": 40.0,
    }

    result = check_feasibility(session=session_data, site_available_kw=15.0)

    assert result["status"] == "likely_infeasible"
    assert result["expected_shortfall_kwh"] > 35.0  # 40 - 3.3 = 36.7 kWh shortfall
    assert len(result["corrective_options"]) > 0
    assert "DC Fast Charger" in " ".join(result["corrective_options"]) or "Extend" in " ".join(result["corrective_options"])


def test_feasible_request():
    """Verify an easily achievable request is assessed as 'feasible'."""
    # 15 kWh requested in 6 hours on 6.6 kW charger (max possible = 39.6 kWh)
    session_data = {
        "session_id": "SESS-FEASIBLE",
        "remaining_kwh": 15.0,
        "time_remaining_hours": 6.0,
        "charger_max_kw": 6.6,
        "requested_energy_kwh": 15.0,
    }

    result = check_feasibility(session=session_data, site_available_kw=15.0)

    assert result["status"] == "feasible"
    assert result["expected_shortfall_kwh"] == 0.0


def test_at_risk_request():
    """Verify a tight request (close to physical ceiling) is classified as 'at_risk'."""
    # 6.2 kWh in 1 hour on 6.6 kW charger -> 6.2 / 6.6 = 94% of maximum capability
    session_data = {
        "session_id": "SESS-AT-RISK",
        "remaining_kwh": 6.2,
        "time_remaining_hours": 1.0,
        "charger_max_kw": 6.6,
        "requested_energy_kwh": 6.2,
    }

    result = check_feasibility(session=session_data, site_available_kw=15.0)

    assert result["status"] == "at_risk"


def test_zero_time_no_division_error_feasibility():
    """Verify checking feasibility with 0 or negative time remaining avoids ZeroDivisionError."""
    session_data = {
        "session_id": "SESS-ZERO-TIME",
        "remaining_kwh": 10.0,
        "time_remaining_hours": 0.0,
        "charger_max_kw": 6.6,
        "requested_energy_kwh": 10.0,
    }

    result = check_feasibility(session=session_data, site_available_kw=15.0)
    assert result["status"] == "likely_infeasible"
    assert result["expected_shortfall_kwh"] == 10.0


def test_missing_energy_feasibility():
    """Verify session with missing energy target returns 'insufficient_info'."""
    session_data = {
        "session_id": "SESS-NO-INFO",
        "time_remaining_hours": 4.0,
        "charger_max_kw": 6.6,
    }

    result = check_feasibility(session=session_data, site_available_kw=15.0)
    assert result["status"] == "insufficient_info"


@pytest.mark.asyncio
async def test_unreachable_station_not_recommended():
    """Verify that rescue station finder excludes stations that cannot be reached with vehicle's current energy."""
    caltech_lat = 34.1377
    caltech_lng = -118.1253

    # Vehicle has critically low battery: 0.1 kWh and 1 km range
    # Stations require at least ~0.3 - 2.5 kWh to reach safely
    recommendation = await find_rescue_stations(
        origin_lat=caltech_lat,
        origin_lng=caltech_lng,
        energy_needed_kwh=25.0,
        current_energy_kwh=0.05,
        vehicle_range_km=0.2,
    )

    # Any station requiring more energy/range than available must NOT be recommended
    for st in recommendation.recommended_stations:
        assert st.is_reachable is True

    # Far stations (like Glendale Galleria at 12 km) must be excluded
    recommended_ids = [st.station_id for st in recommendation.recommended_stations]
    assert "DEMO-ST-05" not in recommended_ids
    assert len(recommendation.warnings) > 0


@pytest.mark.asyncio
async def test_rescue_stations_ranking():
    """Verify reachable rescue stations are ranked by highest charging speed first."""
    caltech_lat = 34.1377
    caltech_lng = -118.1253

    # Ample energy to reach all demo stations
    recommendation = await find_rescue_stations(
        origin_lat=caltech_lat,
        origin_lng=caltech_lng,
        energy_needed_kwh=30.0,
        current_energy_kwh=40.0,
        vehicle_range_km=200.0,
    )

    assert len(recommendation.recommended_stations) > 0
    # Top station should be the highest power available (e.g. 250 kW or 150 kW)
    top_station = recommendation.recommended_stations[0]
    assert top_station.max_power_kw >= 100.0


def test_haversine_distance():
    """Verify Haversine GPS distance calculation."""
    # Caltech to Pasadena City Hall (~1.8 km)
    dist = haversine_distance_km(34.1377, -118.1253, 34.1450, -118.1380)
    assert 1.0 < dist < 3.0
