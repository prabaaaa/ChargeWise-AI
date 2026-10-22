import os
import tempfile
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, Field

from config import app_config, AppConfig
from data.demo_sessions import generate_demo_sessions, generate_interactive_demo_sessions
from data.loader import load_acn_data
from data.dataset_validator import DatasetValidator
from data.sample_dataset import generate_sample_workplace_csv
from models.rescue import RescueRecommendation
from models.session import ChargingSession
from rescue.station_finder import find_rescue_stations
from simulation.engine import SimulationEngine
from simulation.feasibility import check_feasibility


router = APIRouter(prefix="/api", tags=["chargewise"])


class GlobalState:
    """Singleton container holding runtime simulation and session state."""
    sessions: List[ChargingSession] = []
    engine: Optional[SimulationEngine] = None
    last_comparison: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}
    pending_uploads: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def initialize_with_demo(cls, interactive: bool = False):
        if interactive:
            cls.sessions = generate_interactive_demo_sessions()
        else:
            cls.sessions = generate_demo_sessions()

        cls.engine = SimulationEngine(
            sessions=cls.sessions,
            site_cap_kw=app_config.site_cap_kw,
            interval_minutes=app_config.interval_minutes,
            solar_profile=app_config.solar_profile,
            tariff_profile=app_config.tariff_profile,
            carbon_profile=app_config.carbon_profile,
            fairness_enabled=app_config.fairness_enabled,
            solar_enabled=app_config.solar_enabled,
        )
        cls.last_comparison = None
        cls.metadata = {
            "name": "Caltech-JPL Research Facility Benchmark" if not interactive else "Interactive Showcase Dataset",
            "source": "benchmark",
            "activation_time": datetime.now().isoformat(),
            "valid_records": len(cls.sessions),
            "rejected_records": 0,
            "session_count": len(cls.sessions),
        }


# Request Models
class ConfigUpdateRequest(BaseModel):
    site_cap_kw: Optional[float] = None
    interval_minutes: Optional[int] = None
    default_charger_max_kw: Optional[float] = None
    solar_enabled: Optional[bool] = None
    fairness_enabled: Optional[bool] = None
    underserved_tolerance_kwh: Optional[float] = None
    open_charge_map_api_key: Optional[str] = None


class ActivateDatasetRequest(BaseModel):
    upload_id: str
    custom_mapping: Optional[Dict[str, str]] = None
    dataset_name: Optional[str] = None
    site_cap_kw: Optional[float] = None


class SimulationRunRequest(BaseModel):
    policy: str = Field(default="both", description="'both', 'uncontrolled', or 'chargewise'")
    site_cap_kw: Optional[float] = None
    solar_enabled: Optional[bool] = None
    fairness_enabled: Optional[bool] = None


class CapUpdateRequest(BaseModel):
    site_cap_kw: float = Field(..., gt=0, description="New site capacity in kW")
    at_time: Optional[datetime] = None


class EarlyDepartureRequest(BaseModel):
    session_id: str
    departure_time: datetime


class EmergencyRequest(BaseModel):
    session_id: str


class StopChargingRequest(BaseModel):
    session_id: str


class StartChargingRequest(BaseModel):
    session_id: str


class RescueRequest(BaseModel):
    session_id: Optional[str] = "RESCUE-EV"
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    energy_needed_kwh: float = Field(..., gt=0)
    connector_type: Optional[str] = None
    vehicle_range_km: Optional[float] = None
    vehicle_efficiency_kwh_per_km: float = 0.18
    current_energy_kwh: Optional[float] = None
    departure_deadline: Optional[datetime] = None


class DriverDepartureRequest(BaseModel):
    departure_time: datetime


class DriverTargetRequest(BaseModel):
    requested_energy_kwh: float = Field(..., gt=0)


# ---------------------------
# Health & Configuration
# ---------------------------
@router.get("/health")
def get_health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ChargeWise AI Backend",
        "timestamp": datetime.now().isoformat(),
        "sessions_loaded": len(GlobalState.sessions),
        "engine_ready": GlobalState.engine is not None,
    }


@router.get("/config")
def get_configuration():
    """Returns current active configuration."""
    return app_config.model_dump()


@router.post("/config")
def update_configuration(req: ConfigUpdateRequest):
    """Updates runtime configuration settings."""
    if req.site_cap_kw is not None:
        app_config.site_cap_kw = req.site_cap_kw
        if GlobalState.engine:
            GlobalState.engine.update_site_cap(req.site_cap_kw)
    if req.interval_minutes is not None:
        app_config.interval_minutes = req.interval_minutes
    if req.default_charger_max_kw is not None:
        app_config.default_charger_max_kw = req.default_charger_max_kw
    if req.solar_enabled is not None:
        app_config.solar_enabled = req.solar_enabled
        if GlobalState.engine:
            GlobalState.engine.solar_enabled = req.solar_enabled
    if req.fairness_enabled is not None:
        app_config.fairness_enabled = req.fairness_enabled
        if GlobalState.engine:
            GlobalState.engine.fairness_enabled = req.fairness_enabled
    if req.underserved_tolerance_kwh is not None:
        app_config.underserved_tolerance_kwh = req.underserved_tolerance_kwh
    if req.open_charge_map_api_key is not None:
        app_config.open_charge_map_api_key = req.open_charge_map_api_key

    return {"message": "Configuration updated successfully", "config": app_config.model_dump()}


# ---------------------------
# Sessions & Dataset Endpoints
# ---------------------------
@router.get("/sessions")
def get_sessions():
    """Retrieves all currently active or loaded charging sessions."""
    return {
        "count": len(GlobalState.sessions),
        "metadata": GlobalState.metadata,
        "sessions": [s.model_dump() for s in GlobalState.sessions],
    }


@router.get("/sessions/dataset-info")
def get_dataset_info():
    """Returns metadata and provenance for the currently active dataset."""
    date_range = None
    total_energy = 0.0
    if GlobalState.sessions:
        date_range = {
            "start": GlobalState.sessions[0].arrival_time.isoformat(),
            "end": GlobalState.sessions[-1].departure_time.isoformat(),
        }
        total_energy = sum(s.requested_energy_kwh or 0 for s in GlobalState.sessions)

    return {
        "metadata": GlobalState.metadata,
        "session_count": len(GlobalState.sessions),
        "date_range": date_range,
        "total_requested_kwh": round(total_energy, 2),
        "is_custom": GlobalState.metadata.get("source") == "uploaded",
    }


@router.get("/sessions/sample-csv")
def download_sample_csv():
    """Generates and serves a clean, realistic sample CSV for user testing."""
    csv_text = generate_sample_workplace_csv()
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="chargewise_sample_fleet.csv"'}
    )


@router.post("/sessions/load-demo")
def load_demo_sessions_route(interactive: bool = False):
    """Loads demo sessions (7-day workplace or 3-car interactive showcase)."""
    GlobalState.initialize_with_demo(interactive=interactive)
    return {
        "message": f"Loaded {len(GlobalState.sessions)} demo sessions",
        "mode": "interactive" if interactive else "7day",
        "count": len(GlobalState.sessions),
    }


@router.post("/sessions/reset-benchmark")
def reset_to_benchmark():
    """Resets the simulation to the default Caltech-JPL Research Facility benchmark dataset."""
    GlobalState.initialize_with_demo(interactive=False)
    return {
        "success": True,
        "message": "Reset to Caltech-JPL Research Facility Benchmark dataset (51 sessions).",
        "metadata": GlobalState.metadata,
        "sessions_count": len(GlobalState.sessions),
    }


@router.post("/sessions/upload/preview")
async def preview_and_validate_dataset(
    file: UploadFile = File(...),
    custom_mapping: Optional[str] = Form(None),
):
    """Parses and validates an uploaded CSV file without replacing the active dataset.

    Returns column detection, validation report, preview tables, and an upload_id.
    """
    if not file.filename.lower().endswith(".csv") and not file.filename.lower().endswith(".txt"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV file (.csv)",
        )

    content_bytes = await file.read()
    if len(content_bytes) > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 25 MB upload limit",
        )

    # Decode safely with UTF-8 / Latin-1 fallback
    csv_text = ""
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            csv_text = content_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if not csv_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to decode file text. Please ensure it is saved in UTF-8 or standard CSV format.",
        )

    parsed_custom_mapping = None
    if custom_mapping:
        try:
            parsed_custom_mapping = json.loads(custom_mapping)
        except Exception:
            pass

    validation_result = DatasetValidator.validate_and_parse(
        csv_content=csv_text,
        custom_mapping=parsed_custom_mapping,
        default_site=os.path.splitext(file.filename)[0] or "custom-site",
    )

    upload_id = str(uuid.uuid4())
    # Cache pending upload for transactional confirmation
    GlobalState.pending_uploads[upload_id] = {
        "file_name": file.filename,
        "file_size": len(content_bytes),
        "csv_content": csv_text,
        "validation_result": validation_result,
        "timestamp": datetime.now().isoformat(),
    }

    return {
        "upload_id": upload_id,
        "file_name": file.filename,
        "file_size_bytes": len(content_bytes),
        "is_valid": validation_result["is_valid"],
        "total_rows": validation_result["total_rows"],
        "valid_rows": validation_result["valid_rows"],
        "rejected_rows": validation_result["rejected_rows"],
        "columns": validation_result["columns"],
        "suggested_mapping": validation_result["mapping"],
        "issues": validation_result["issues"][:50],  # Return up to 50 diagnostics
        "raw_preview": validation_result["raw_preview"],
        "normalized_preview": validation_result["normalized_preview"],
        "summary": validation_result["summary"],
        "can_activate": validation_result["is_valid"] and validation_result["valid_rows"] > 0,
    }


@router.post("/sessions/upload/activate")
def activate_uploaded_dataset(req: ActivateDatasetRequest):
    """Confirms and activates a previously validated dataset, replacing active simulation state."""
    pending = GlobalState.pending_uploads.get(req.upload_id)
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending upload session not found or expired. Please upload the file again.",
        )

    validation_result = pending["validation_result"]

    # Re-validate if custom mapping was supplied upon confirmation
    if req.custom_mapping:
        validation_result = DatasetValidator.validate_and_parse(
            csv_content=pending["csv_content"],
            custom_mapping=req.custom_mapping,
            default_site=os.path.splitext(pending["file_name"])[0],
        )

    sessions: List[ChargingSession] = validation_result.get("sessions", [])
    if not sessions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot activate dataset with 0 valid records.",
        )

    dataset_name = req.dataset_name or pending["file_name"]
    active_cap = req.site_cap_kw if req.site_cap_kw is not None else app_config.site_cap_kw

    # Transactionally replace active state
    GlobalState.sessions = sessions
    GlobalState.metadata = {
        "name": dataset_name,
        "file_name": pending["file_name"],
        "source": "uploaded",
        "activation_time": datetime.now().isoformat(),
        "valid_records": len(sessions),
        "rejected_records": validation_result.get("rejected_rows", 0),
        "session_count": len(sessions),
        "summary": validation_result.get("summary", {}),
    }

    # Initialize a clean simulation engine with the uploaded dataset
    GlobalState.engine = SimulationEngine(
        sessions=sessions,
        site_cap_kw=active_cap,
        interval_minutes=app_config.interval_minutes,
        solar_profile=app_config.solar_profile,
        tariff_profile=app_config.tariff_profile,
        carbon_profile=app_config.carbon_profile,
        fairness_enabled=app_config.fairness_enabled,
        solar_enabled=app_config.solar_enabled,
    )
    GlobalState.last_comparison = None

    # Clean up pending upload cache
    del GlobalState.pending_uploads[req.upload_id]

    return {
        "success": True,
        "message": f"Successfully activated dataset '{dataset_name}' with {len(sessions)} sessions.",
        "active_dataset": GlobalState.metadata,
        "sessions_count": len(sessions),
        "timeline_start": GlobalState.engine.start_time.isoformat() if GlobalState.engine else None,
        "timeline_end": GlobalState.engine.end_time.isoformat() if GlobalState.engine else None,
    }


@router.post("/sessions/upload")
async def upload_dataset_direct(file: UploadFile = File(...)):
    """Direct one-step upload and activation (maintains backward compatibility with ACN and general CSVs)."""
    if not file.filename.lower().endswith(".csv") and not file.filename.lower().endswith(".txt"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV file (.csv)",
        )

    content_bytes = await file.read()
    csv_text = ""
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            csv_text = content_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if not csv_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to decode file text.",
        )

    validation_result = DatasetValidator.validate_and_parse(
        csv_content=csv_text,
        default_site=os.path.splitext(file.filename)[0],
    )

    sessions = validation_result.get("sessions", [])
    if not sessions:
        err_msg = "No valid sessions found in CSV."
        if validation_result.get("issues"):
            err_msg += " " + "; ".join(i["message"] for i in validation_result["issues"][:3])
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=err_msg,
        )

    # Activate
    GlobalState.sessions = sessions
    GlobalState.metadata = {
        "name": file.filename,
        "file_name": file.filename,
        "source": "uploaded",
        "activation_time": datetime.now().isoformat(),
        "valid_records": len(sessions),
        "rejected_records": validation_result.get("rejected_rows", 0),
        "session_count": len(sessions),
        "summary": validation_result.get("summary", {}),
    }

    GlobalState.engine = SimulationEngine(
        sessions=sessions,
        site_cap_kw=app_config.site_cap_kw,
        interval_minutes=app_config.interval_minutes,
        solar_profile=app_config.solar_profile,
        tariff_profile=app_config.tariff_profile,
        carbon_profile=app_config.carbon_profile,
        fairness_enabled=app_config.fairness_enabled,
        solar_enabled=app_config.solar_enabled,
    )
    GlobalState.last_comparison = None

    return {
        "success": True,
        "message": f"Successfully parsed and activated {len(sessions)} records from '{file.filename}'.",
        "metadata": GlobalState.metadata,
        "sessions_count": len(sessions),
    }


@router.get("/sessions/{session_id}")
def get_session_by_id(session_id: str):
    """Retrieves detailed info for a single session."""
    for s in GlobalState.sessions:
        if s.session_id == session_id:
            # Also calculate current feasibility
            feasibility = check_feasibility(
                session=s,
                site_available_kw=app_config.site_cap_kw,
                competing_sessions=len(GlobalState.sessions),
            )
            return {"session": s.model_dump(), "feasibility": feasibility}

    raise HTTPException(status_code=404, detail=f"Session {session_id} not found")


# ---------------------------
# Simulation Endpoints
# ---------------------------
@router.post("/simulation/run")
def run_simulation(req: SimulationRunRequest):
    """Runs full batch simulation with requested policy or comparison mode."""
    if not GlobalState.sessions:
        GlobalState.initialize_with_demo()

    engine = GlobalState.engine
    if engine is None:
        GlobalState.initialize_with_demo()
        engine = GlobalState.engine

    # Apply temporary parameter overrides if requested
    if req.site_cap_kw is not None:
        engine.site_cap_kw = req.site_cap_kw
    if req.solar_enabled is not None:
        engine.solar_enabled = req.solar_enabled
    if req.fairness_enabled is not None:
        engine.fairness_enabled = req.fairness_enabled

    if req.policy == "both":
        comparison = engine.run_comparison()
        GlobalState.last_comparison = comparison
        return comparison
    elif req.policy in ("uncontrolled", "chargewise"):
        res = engine.run(policy=req.policy)
        return res.model_dump()
    else:
        raise HTTPException(
            status_code=400,
            detail="Policy must be 'both', 'uncontrolled', or 'chargewise'",
        )


@router.get("/simulation/state")
def get_simulation_state():
    """Returns current interactive stepper simulation state."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()
    return GlobalState.engine.get_current_state()


@router.post("/simulation/step")
def step_simulation(policy: Optional[str] = None):
    """Steps forward one 15-minute interval in the simulation timeline."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()

    step_interval = GlobalState.engine.step(policy=policy)
    if step_interval is None:
        return {
            "message": "Simulation reached end of timeline",
            "is_complete": True,
            "interval": None,
            "state": GlobalState.engine.get_current_state(),
        }

    return {
        "message": "Stepped forward 1 interval",
        "is_complete": False,
        "interval": step_interval.model_dump(),
        "state": GlobalState.engine.get_current_state(),
    }


@router.post("/simulation/play")
def play_simulation():
    """Sets simulation state to running/playing."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()
    GlobalState.engine.is_playing = True
    return {"message": "Simulation playback started", "state": GlobalState.engine.get_current_state()}


@router.post("/simulation/pause")
def pause_simulation():
    """Pauses interactive simulation playback."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()
    GlobalState.engine.is_playing = False
    return {"message": "Simulation playback paused", "state": GlobalState.engine.get_current_state()}


@router.post("/simulation/reset")
def reset_simulation(policy: Optional[str] = None):
    """Resets the simulation clock back to start."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()
    GlobalState.engine.reset(policy=policy)
    return {"message": "Simulation reset to start", "state": GlobalState.engine.get_current_state()}


@router.post("/simulation/cap")
def update_cap(req: CapUpdateRequest):
    """Dynamically modifies the site power cap limit."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()

    GlobalState.engine.update_site_cap(req.site_cap_kw, at_time=req.at_time)
    app_config.site_cap_kw = req.site_cap_kw
    return {
        "message": f"Site power cap updated to {req.site_cap_kw:.1f} kW",
        "new_cap_kw": req.site_cap_kw,
        "at_time": req.at_time.isoformat() if req.at_time else "immediate",
    }


@router.post("/simulation/early-departure")
def trigger_early_departure_route(req: EarlyDepartureRequest):
    """Updates a vehicle's scheduled departure time to simulate an early exit."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()

    found = False
    for s in GlobalState.sessions:
        if s.session_id == req.session_id:
            s.departure_time = req.departure_time
            s.departure_source = "declared"
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Session {req.session_id} not found")

    GlobalState.engine.trigger_early_departure(req.session_id, req.departure_time)
    return {
        "message": f"Updated departure for session {req.session_id} to {req.departure_time.isoformat()}",
        "session_id": req.session_id,
        "new_departure": req.departure_time.isoformat(),
    }


@router.post("/simulation/emergency")
def flag_emergency_session_route(req: EmergencyRequest):
    """Flags an active vehicle for emergency priority charging."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()

    found = False
    for s in GlobalState.sessions:
        if s.session_id == req.session_id:
            s.is_emergency = True
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Session {req.session_id} not found")

    GlobalState.engine.set_emergency(req.session_id)
    return {
        "message": f"Session {req.session_id} flagged for emergency charging priority",
        "session_id": req.session_id,
        "is_emergency": True,
    }


@router.post("/simulation/stop-charging")
def stop_charging_route(req: StopChargingRequest):
    """Manually cuts off charging for a session, setting power to 0 kW immediately and releasing capacity."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()

    event = GlobalState.engine.stop_charging(req.session_id)
    for s in GlobalState.sessions:
        if s.session_id == req.session_id:
            s.is_manually_stopped = True
            break

    return {
        "message": f"Charging cutoff executed for session {req.session_id}. Power set to 0.0 kW.",
        "session_id": req.session_id,
        "event": event.model_dump() if event else None,
        "status": "AUTO CUTOFF",
    }


@router.post("/simulation/session/{session_id}/stop")
def stop_charging_path_route(session_id: str):
    """Path-parameter alias for manual charging cutoff."""
    return stop_charging_route(StopChargingRequest(session_id=session_id))


@router.post("/simulation/start-charging")
def start_charging_route(req: StartChargingRequest):
    """Resumes or starts charging eligibility for a previously stopped session."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()

    success = GlobalState.engine.start_charging(req.session_id)
    for s in GlobalState.sessions:
        if s.session_id == req.session_id:
            s.is_manually_stopped = False
            break

    return {
        "message": f"Charging resumed for session {req.session_id}",
        "session_id": req.session_id,
        "success": success,
        "status": "QUEUED",
    }


@router.post("/simulation/session/{session_id}/start")
def start_charging_path_route(session_id: str):
    """Path-parameter alias for starting/resuming charging."""
    return start_charging_route(StartChargingRequest(session_id=session_id))


@router.get("/simulation/cutoff-events")
def get_cutoff_events_route():
    """Returns all recorded cutoff events in the current simulation session."""
    if not GlobalState.engine:
        GlobalState.initialize_with_demo()

    events = [e.model_dump() for e in GlobalState.engine.cutoff_events]
    return {
        "count": len(events),
        "events": events,
    }


# ---------------------------
# Comparison & Metrics
# ---------------------------
@router.get("/comparison")
def get_comparison():
    """Retrieves or calculates comparison metrics between Uncontrolled and ChargeWise."""
    if GlobalState.last_comparison is not None:
        return GlobalState.last_comparison

    if not GlobalState.engine:
        GlobalState.initialize_with_demo()

    comparison = GlobalState.engine.run_comparison()
    GlobalState.last_comparison = comparison
    return comparison


@router.get("/metrics")
def get_metrics():
    """Summarizes overall KPI performance metrics."""
    if GlobalState.last_comparison is None:
        if not GlobalState.engine:
            GlobalState.initialize_with_demo()
        GlobalState.last_comparison = GlobalState.engine.run_comparison()

    return GlobalState.last_comparison.get("metrics", {})


# ---------------------------
# Feasibility Oracle
# ---------------------------
@router.get("/feasibility")
def get_all_feasibility():
    """Calculates feasibility for all loaded sessions."""
    if not GlobalState.sessions:
        GlobalState.initialize_with_demo()

    results = []
    for s in GlobalState.sessions:
        f = check_feasibility(
            session=s,
            site_available_kw=app_config.site_cap_kw,
            competing_sessions=len(GlobalState.sessions),
        )
        results.append({
            "session_id": s.session_id,
            "charger_id": s.charger_id,
            "arrival_time": s.arrival_time.isoformat(),
            "departure_time": s.departure_time.isoformat(),
            "target_kwh": s.effective_energy_target_kwh,
            "feasibility": f,
        })
    return {"count": len(results), "feasibility_reports": results}


@router.get("/feasibility/{session_id}")
def get_session_feasibility(session_id: str):
    """Calculates feasibility assessment for a specific session."""
    for s in GlobalState.sessions:
        if s.session_id == session_id:
            return check_feasibility(
                session=s,
                site_available_kw=app_config.site_cap_kw,
                competing_sessions=len(GlobalState.sessions),
            )
    raise HTTPException(status_code=404, detail=f"Session {session_id} not found")


# ---------------------------
# Rescue Station Recommendation
# ---------------------------
@router.post("/rescue/find", response_model=RescueRecommendation)
async def find_rescue_route(req: RescueRequest):
    """Recommends and routes driver to nearby reachable public charging stations."""
    lat = req.origin_lat if req.origin_lat is not None else app_config.demo_site_lat
    lng = req.origin_lng if req.origin_lng is not None else app_config.demo_site_lng

    recommendation = await find_rescue_stations(
        origin_lat=lat,
        origin_lng=lng,
        energy_needed_kwh=req.energy_needed_kwh,
        session_id=req.session_id or "RESCUE-EV",
        connector_type=req.connector_type,
        vehicle_range_km=req.vehicle_range_km,
        vehicle_efficiency_kwh_per_km=req.vehicle_efficiency_kwh_per_km,
        current_energy_kwh=req.current_energy_kwh,
        departure_deadline=req.departure_deadline,
        api_key=app_config.open_charge_map_api_key,
    )
    return recommendation


# ---------------------------
# Driver Readiness Views
# ---------------------------
@router.get("/driver/{session_id}")
def get_driver_readiness(session_id: str):
    """Driver-facing view displaying real-time charging status, readiness, and advice."""
    target_session: Optional[ChargingSession] = None
    for s in GlobalState.sessions:
        if s.session_id == session_id:
            target_session = s
            break

    if not target_session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    delivered_kwh = 0.0
    if GlobalState.engine:
        delivered_kwh = GlobalState.engine.delivered_so_far.get(session_id, 0.0)

    target_kwh = target_session.effective_energy_target_kwh or 15.0
    progress_pct = min(100.0, round((delivered_kwh / target_kwh) * 100.0, 1)) if target_kwh > 0 else 100.0

    now = datetime.now()
    time_remaining_minutes = max(0.0, (target_session.departure_time - target_session.arrival_time).total_seconds() / 60.0)

    feasibility = check_feasibility(
        session=target_session,
        site_available_kw=app_config.site_cap_kw,
        competing_sessions=len(GlobalState.sessions),
    )

    is_ready = delivered_kwh >= (target_kwh - app_config.underserved_tolerance_kwh)

    return {
        "session_id": session_id,
        "site": target_session.site,
        "charger_id": target_session.charger_id,
        "arrival_time": target_session.arrival_time.isoformat(),
        "departure_time": target_session.departure_time.isoformat(),
        "delivered_kwh": round(delivered_kwh, 2),
        "target_kwh": round(target_kwh, 2),
        "progress_percent": progress_pct,
        "is_ready": is_ready,
        "is_emergency": target_session.is_emergency,
        "feasibility": feasibility,
    }


@router.post("/driver/{session_id}/departure")
def update_driver_departure(session_id: str, req: DriverDepartureRequest):
    """Allows driver to update departure deadline from mobile app."""
    for s in GlobalState.sessions:
        if s.session_id == session_id:
            s.departure_time = req.departure_time
            s.departure_source = "declared"
            if GlobalState.engine:
                GlobalState.engine.trigger_early_departure(session_id, req.departure_time)
            return {
                "message": f"Departure deadline updated to {req.departure_time.isoformat()}",
                "session_id": session_id,
                "departure_time": req.departure_time.isoformat(),
            }
    raise HTTPException(status_code=404, detail=f"Session {session_id} not found")


@router.post("/driver/{session_id}/target")
def update_driver_target(session_id: str, req: DriverTargetRequest):
    """Allows driver to update requested energy setpoint from mobile app."""
    for s in GlobalState.sessions:
        if s.session_id == session_id:
            s.requested_energy_kwh = req.requested_energy_kwh
            s.energy_source = "requested"
            return {
                "message": f"Target energy updated to {req.requested_energy_kwh:.1f} kWh",
                "session_id": session_id,
                "requested_energy_kwh": req.requested_energy_kwh,
            }
    raise HTTPException(status_code=404, detail=f"Session {session_id} not found")


@router.get("/download-zip")
def download_project_zip():
    """Serves the complete ChargeWise AI project archive as a downloadable ZIP file."""
    # Look for chargewise-ai.zip in the parent directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_root = os.path.dirname(backend_dir)
    zip_path = os.path.join(project_root, "chargewise-ai.zip")

    if not os.path.exists(zip_path):
        raise HTTPException(
            status_code=404,
            detail="Project ZIP file not found. Please generate the archive first."
        )

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename="chargewise-ai.zip",
    )

