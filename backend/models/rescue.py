"""Pydantic data models for charging rescue recommendations."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class RescueStation(BaseModel):
    """Nearby charging facility recommended for stranded or underserved vehicles."""

    station_id: str = Field(..., description="Unique station or charger identifier")
    name: str = Field(..., description="Public station or provider name")
    latitude: float = Field(..., description="Station latitude")
    longitude: float = Field(..., description="Station longitude")
    distance_km: float = Field(..., description="Distance from origin in kilometers")
    driving_time_minutes: Optional[float] = Field(
        default=None,
        description="Estimated travel time in minutes"
    )
    connectors: List[str] = Field(default_factory=list, description="Supported plug standards (CCS, J1772, NACS, etc.)")
    max_power_kw: float = Field(..., description="Maximum charging rate available in kW")
    availability: str = Field(
        default="available",
        description="'available', 'unknown', 'provider_reported', or 'demo'"
    )
    is_demo: bool = Field(default=False, description="Flag indicating synthetic/demonstration station")
    recommendation_reason: str = Field(..., description="Reason for selection (e.g. fastest charging, closest)")
    energy_needed_to_reach_kwh: Optional[float] = Field(
        default=None,
        description="Estimated energy consumed driving to this station in kWh"
    )
    is_reachable: Optional[bool] = Field(
        default=None,
        description="Whether vehicle's current state of charge is sufficient to reach the station safely"
    )


class RescueRecommendation(BaseModel):
    """Complete rescue analysis and ranked nearby alternatives for an underserved session."""

    session_id: str = Field(..., description="Session identifier requiring rescue")
    current_energy_kwh: float = Field(..., description="Estimated energy in vehicle battery currently in kWh")
    energy_needed_kwh: float = Field(..., description="Remaining energy requirement needed by driver in kWh")
    departure_deadline: datetime = Field(..., description="Driver's scheduled or estimated departure time")
    vehicle_connector: Optional[str] = Field(default=None, description="Vehicle charging port connector type")
    origin_lat: float = Field(..., description="Current vehicle latitude")
    origin_lng: float = Field(..., description="Current vehicle longitude")
    recommended_stations: List[RescueStation] = Field(
        default_factory=list,
        description="Ranked list of feasible rescue stations"
    )
    warnings: List[str] = Field(default_factory=list, description="Actionable alerts or caveats for the driver")
