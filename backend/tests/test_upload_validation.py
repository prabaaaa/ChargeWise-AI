"""Comprehensive tests for dataset upload, validation, mapping, and activation."""

import json
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from main import app
from api.routes import GlobalState
from data.dataset_validator import DatasetValidator
from data.sample_dataset import generate_sample_workplace_csv


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_global_state():
    """Ensure every test starts with clean benchmark baseline state."""
    GlobalState.initialize_with_demo(interactive=False)
    GlobalState.pending_uploads.clear()
    yield
    GlobalState.initialize_with_demo(interactive=False)
    GlobalState.pending_uploads.clear()


def test_validator_with_valid_csv():
    """Valid CSV should parse cleanly with 100% valid rows and zero fatal errors."""
    csv_text = generate_sample_workplace_csv()
    result = DatasetValidator.validate_and_parse(csv_text)

    assert result["is_valid"] is True
    assert result["total_rows"] == 24
    assert result["valid_rows"] == 24
    assert result["rejected_rows"] == 0
    assert len(result["sessions"]) == 24
    assert result["summary"]["total_energy_requested_kwh"] > 0
    assert result["mapping"]["arrival_time"] == "arrival_time"
    assert result["mapping"]["departure_time"] == "departure_time"


def test_validator_with_aliases():
    """Column aliases like vehicle_id, plug_in, disconnect should be automatically detected."""
    custom_csv = (
        "vehicle_id,plug_in,disconnect,demand_kwh,battery_kwh,start_soc,desired_soc,kw_limit\n"
        "EV-ALPHA,2026-10-26 08:00:00,2026-10-26 16:00:00,30.0,75.0,25.0,85.0,11.0\n"
        "EV-BETA,2026-10-26 08:30:00,2026-10-26 17:30:00,45.0,82.0,15.0,80.0,7.2\n"
    )
    result = DatasetValidator.validate_and_parse(custom_csv)

    assert result["is_valid"] is True
    assert result["valid_rows"] == 2
    assert result["mapping"]["session_id"] == "vehicle_id"
    assert result["mapping"]["arrival_time"] == "plug_in"
    assert result["mapping"]["departure_time"] == "disconnect"
    assert result["mapping"]["requested_energy_kwh"] == "demand_kwh"
    assert result["sessions"][0].session_id == "EV-ALPHA"
    assert result["sessions"][0].charger_max_power_kw == 11.0


def test_validator_with_custom_mapping():
    """Custom explicit mapping should override auto-detection."""
    non_standard_csv = (
        "code,t_start,t_end,kwh\n"
        "S1,2026-10-26 09:00:00,2026-10-26 15:00:00,25.0\n"
        "S2,2026-10-26 09:30:00,2026-10-26 16:30:00,35.0\n"
    )
    custom_map = {
        "session_id": "code",
        "arrival_time": "t_start",
        "departure_time": "t_end",
        "requested_energy_kwh": "kwh",
    }
    result = DatasetValidator.validate_and_parse(non_standard_csv, custom_mapping=custom_map)

    assert result["is_valid"] is True
    assert result["valid_rows"] == 2
    assert result["sessions"][0].session_id == "S1"
    assert result["sessions"][0].requested_energy_kwh == 25.0


def test_validator_rejects_missing_required_columns():
    """Missing arrival or departure timestamps must fail validation and return clear diagnostic."""
    missing_csv = (
        "session_id,requested_energy_kwh\n"
        "EV-101,25.0\n"
        "EV-102,30.0\n"
    )
    result = DatasetValidator.validate_and_parse(missing_csv)

    assert result["is_valid"] is False
    assert result["valid_rows"] == 0
    assert any("timestamp" in i["message"].lower() for i in result["issues"])


def test_validator_handles_empty_and_malformed():
    """Empty files and unparseable contents must not crash."""
    res_empty = DatasetValidator.validate_and_parse("")
    assert res_empty["is_valid"] is False
    assert res_empty["total_rows"] == 0

    res_spaces = DatasetValidator.validate_and_parse("   \n\t  ")
    assert res_spaces["is_valid"] is False


def test_validator_filters_invalid_rows():
    """Rows with departure <= arrival or invalid timestamps should be rejected while preserving valid rows."""
    mixed_csv = (
        "session_id,arrival_time,departure_time,requested_energy_kwh\n"
        "GOOD-01,2026-10-26 08:00:00,2026-10-26 16:00:00,25.0\n"
        "BAD-TIME,2026-10-26 09:00:00,2026-10-26 07:00:00,20.0\n"  # Departure before arrival
        "GOOD-02,2026-10-26 08:30:00,2026-10-26 14:00:00,18.0\n"
        "BAD-FORMAT,not-a-date,2026-10-26 15:00:00,30.0\n"        # Invalid timestamp format
    )
    result = DatasetValidator.validate_and_parse(mixed_csv)

    assert result["is_valid"] is True
    assert result["total_rows"] == 4
    assert result["valid_rows"] == 2
    assert result["rejected_rows"] == 2
    assert len(result["sessions"]) == 2
    assert [s.session_id for s in result["sessions"]] == ["GOOD-01", "GOOD-02"]


def test_preview_endpoint_does_not_mutate_active_state():
    """POST /api/sessions/upload/preview must return validation report without altering running simulation."""
    initial_count = len(GlobalState.sessions)
    initial_name = GlobalState.metadata.get("name")

    csv_text = generate_sample_workplace_csv()
    files = {"file": ("fleet_upload.csv", csv_text, "text/csv")}

    response = client.post("/api/sessions/upload/preview", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["can_activate"] is True
    assert data["valid_rows"] == 24
    assert "upload_id" in data
    assert len(data["raw_preview"]) > 0
    assert len(data["normalized_preview"]) > 0

    # Ensure running state was NOT modified yet (transactional isolation)
    assert len(GlobalState.sessions) == initial_count
    assert GlobalState.metadata.get("name") == initial_name


def test_activation_endpoint_replaces_state_and_resets_simulation():
    """POST /api/sessions/upload/activate replaces running sessions, resets timeline, and recalculates simulation."""
    csv_text = generate_sample_workplace_csv()
    files = {"file": ("my_fleet.csv", csv_text, "text/csv")}

    preview_res = client.post("/api/sessions/upload/preview", files=files)
    assert preview_res.status_code == 200
    upload_id = preview_res.json()["upload_id"]

    # Now activate
    activate_res = client.post(
        "/api/sessions/upload/activate",
        json={"upload_id": upload_id, "dataset_name": "Acme Fleet Shift A"}
    )
    assert activate_res.status_code == 200
    act_data = activate_res.json()

    assert act_data["success"] is True
    assert act_data["sessions_count"] == 24
    assert GlobalState.metadata["name"] == "Acme Fleet Shift A"
    assert GlobalState.metadata["source"] == "uploaded"
    assert len(GlobalState.sessions) == 24
    assert GlobalState.engine.current_step_index == 0
    assert len(GlobalState.engine.cutoff_events) == 0

    # Verify GET /api/sessions returns the newly activated dataset
    sess_res = client.get("/api/sessions")
    assert sess_res.status_code == 200
    assert sess_res.json()["count"] == 24
    assert sess_res.json()["sessions"][0]["session_id"].startswith("FLEET-")


def test_reset_benchmark_endpoint():
    """POST /api/sessions/reset-benchmark restores Caltech benchmark dataset."""
    # First upload custom
    csv_text = generate_sample_workplace_csv()
    client.post("/api/sessions/upload", files={"file": ("test.csv", csv_text, "text/csv")})
    assert len(GlobalState.sessions) == 24

    # Reset
    reset_res = client.post("/api/sessions/reset-benchmark")
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True
    assert len(GlobalState.sessions) == 51
    assert GlobalState.metadata["source"] == "benchmark"


def test_sample_csv_download_endpoint():
    """GET /api/sessions/sample-csv serves downloadable CSV content."""
    res = client.get("/api/sessions/sample-csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "session_id" in res.text
    assert "FLEET-001" in res.text


def test_simulation_runs_on_activated_dataset():
    """Simulation run and comparison endpoints must compute accurately against uploaded data."""
    csv_text = generate_sample_workplace_csv()
    client.post("/api/sessions/upload", files={"file": ("uploaded_fleet.csv", csv_text, "text/csv")})

    run_res = client.post("/api/simulation/run", json={"policy": "chargewise", "site_cap_kw": 45.0})
    assert run_res.status_code == 200
    data = run_res.json()

    assert "intervals" in data
    assert data["sessions_count"] == 24
    assert data["peak_demand_kw"] <= 45.0  # Cap strictly respected
