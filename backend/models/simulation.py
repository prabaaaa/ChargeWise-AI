"""Pydantic data models for simulation states, intervals, and outcomes."""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class CutoffEvent(BaseModel):
    """Details of an automatic or manual charging cutoff event."""
    session_id: str = Field(..., description="Identifier of the session that was cut off")
    charger_id: str = Field(..., description="Charger bay where cutoff occurred")
    timestamp: datetime = Field(..., description="Timestamp when cutoff event was triggered")
    reason: str = Field(
        ...,
        description="Reason for cutoff: 'TARGET_REACHED', 'BATTERY_CAPACITY_LIMIT', 'DEPARTURE_REACHED', or 'MANUAL_STOP'"
    )
    final_energy_delivered_kwh: float = Field(..., description="Total energy delivered prior to cutoff in kWh")
    target_energy_kwh: Optional[float] = Field(default=None, description="Requested or target energy in kWh")
    target_achieved: bool = Field(default=False, description="Whether target energy or SOC was successfully satisfied")
    final_soc_percent: Optional[float] = Field(default=None, description="Calculated final SOC percentage at cutoff")
    message: str = Field(..., description="Human-readable event description")


class SimulationInterval(BaseModel):
    """Snapshot of site power allocations and state during a single discrete time interval."""

    timestamp: datetime = Field(..., description="Start timestamp of the simulation interval")
    interval_minutes: int = Field(default=15, description="Interval step size in minutes")
    connected_vehicles: List[str] = Field(default_factory=list, description="IDs of sessions currently plugged in")
    allocations: Dict[str, float] = Field(default_factory=dict, description="session_id -> allocated power in kW")
    session_statuses: Dict[str, str] = Field(
        default_factory=dict,
        description="session_id -> status: 'CHARGING', 'TARGET REACHED', 'AUTO CUTOFF', 'COMPLETED', 'INCOMPLETE', 'QUEUED'"
    )
    cutoff_events: List[CutoffEvent] = Field(default_factory=list, description="Cutoff events occurring in this interval")
    site_total_power_kw: float = Field(..., description="Actual aggregate charging power dispatched across all vehicles in kW")
    site_cap_kw: float = Field(..., description="Site power capacity limit in kW for this interval")
    solar_power_kw: float = Field(default=0.0, description="Local solar generation output in kW")
    grid_power_kw: float = Field(..., description="Net power drawn from the utility grid in kW")
    policy: str = Field(..., description="Policy active for this interval: 'uncontrolled' or 'chargewise'")
    total_requested_power_kw: Optional[float] = Field(
        default=None,
        description="Total unrestricted power requested by vehicles before cap clipping in kW"
    )
    cost_usd: Optional[float] = Field(
        default=None,
        description="Electricity cost accrued in this interval in USD"
    )
    carbon_emissions_gco2: Optional[float] = Field(
        default=None,
        description="Carbon emissions generated in this interval in grams of CO2"
    )


class SessionOutcome(BaseModel):
    """Performance evaluation and final service status for an individual charging session."""

    session_id: str = Field(..., description="Session identifier")
    energy_delivered_kwh: float = Field(..., description="Cumulative energy delivered in kWh")
    energy_requested_kwh: Optional[float] = Field(
        default=None,
        description="Declared or target energy required in kWh"
    )
    effective_target_kwh: Optional[float] = Field(
        default=None,
        description="Effective target energy evaluated against in kWh"
    )
    shortfall_kwh: Optional[float] = Field(
        default=None,
        description="Difference between target and delivered energy (max(0, target - delivered)) in kWh"
    )
    is_fully_served: Optional[bool] = Field(
        default=None,
        description="True if delivered energy meets target within tolerance"
    )
    is_underserved: Optional[bool] = Field(
        default=None,
        description="True if energy shortfall exceeds tolerance threshold"
    )
    feasibility_status: str = Field(
        ...,
        description="'feasible', 'at_risk', 'likely_infeasible', or 'insufficient_info'"
    )
    departure_source: str = Field(..., description="Origin of departure deadline")
    energy_source: str = Field(..., description="Origin of energy target value")
    cutoff_reason: Optional[str] = Field(
        default=None,
        description="Reason charging was terminated: 'TARGET_REACHED', 'DEPARTURE_REACHED', 'BATTERY_CAPACITY_LIMIT', 'MANUAL_STOP'"
    )
    cutoff_timestamp: Optional[datetime] = Field(
        default=None,
        description="Timestamp when charging was stopped"
    )
    target_achieved: Optional[bool] = Field(
        default=None,
        description="Whether target requirement was fully satisfied at cutoff"
    )
    status_label: str = Field(
        default="COMPLETED",
        description="Final session status: 'TARGET REACHED', 'AUTO CUTOFF', 'COMPLETED', 'INCOMPLETE'"
    )


class SimulationResult(BaseModel):
    """Full time-series and aggregate outcomes for a complete simulation run."""

    policy: str = Field(..., description="'uncontrolled' or 'chargewise'")
    site: str = Field(default="caltech", description="Charging site identifier")
    start_time: datetime = Field(..., description="Simulation start timestamp")
    end_time: datetime = Field(..., description="Simulation end timestamp")
    intervals: List[SimulationInterval] = Field(default_factory=list, description="Time series intervals")
    outcomes: List[SessionOutcome] = Field(default_factory=list, description="Per-session outcomes")
    cutoff_events: List[CutoffEvent] = Field(default_factory=list, description="All cutoff events recorded during simulation")
    peak_demand_kw: float = Field(..., description="Maximum site power observed in any interval in kW")
    peak_unconstrained_demand_kw: float = Field(default=0.0, description="Maximum unconstrained demand before cap clipping in kW")
    total_energy_delivered_kwh: float = Field(..., description="Sum of all energy delivered across sessions in kWh")
    total_energy_requested_kwh: Optional[float] = Field(
        default=None,
        description="Sum of all target energy requested in kWh"
    )
    cap_violations: int = Field(default=0, description="Count of intervals where total power exceeded site cap")
    sessions_count: int = Field(default=0, description="Total sessions evaluated")
    underserved_count: int = Field(default=0, description="Total sessions categorized as underserved")
    total_cost_usd: Optional[float] = Field(default=None, description="Total energy cost in USD")
    total_carbon_kg: Optional[float] = Field(default=None, description="Total carbon emissions in kg CO2")
