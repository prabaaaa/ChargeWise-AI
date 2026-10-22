"""Pydantic data models for EV charging sessions."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, model_validator


class ChargingSession(BaseModel):
    """Represents an electric vehicle charging session."""

    session_id: str = Field(..., description="Unique session identifier")
    site: str = Field(default="caltech", description="Charging site identifier")
    arrival_time: datetime = Field(..., description="Vehicle connection/arrival timestamp")
    departure_time: datetime = Field(..., description="Vehicle disconnection/departure timestamp")
    requested_energy_kwh: Optional[float] = Field(
        default=None,
        description="Declared or requested energy demand in kWh; None if unknown"
    )
    observed_energy_kwh: Optional[float] = Field(
        default=None,
        description="Historical or meter-reported delivered energy in kWh"
    )
    charger_id: str = Field(..., description="Assigned charger identifier")
    charger_max_power_kw: float = Field(
        default=6.6,
        description="Maximum charging power rating in kW (typically 6.6 to 11 kW for L2)"
    )
    battery_capacity_kwh: Optional[float] = Field(
        default=None,
        description="Vehicle battery total capacity in kWh"
    )
    initial_soc_percent: Optional[float] = Field(
        default=None,
        description="State of Charge (SOC) at arrival, 0-100%"
    )
    target_soc_percent: Optional[float] = Field(
        default=None,
        description="Target State of Charge (SOC) at departure, 0-100%"
    )
    connector_type: Optional[str] = Field(
        default="J1772",
        description="Connector standard (e.g. J1772, CCS, NACS, CHAdeMO)"
    )
    energy_source: Literal["requested", "observed", "proxy", "simulated"] = Field(
        default="observed",
        description="Data provenance for the energy requirement target"
    )
    departure_source: Literal["declared", "observed", "estimated", "assumed"] = Field(
        default="observed",
        description="Data provenance for the departure time deadline"
    )
    is_synthetic: bool = Field(
        default=False,
        description="Whether this session was synthetically generated"
    )
    is_emergency: bool = Field(
        default=False,
        description="Flag indicating immediate critical charging priority"
    )
    is_manually_stopped: bool = Field(
        default=False,
        description="Flag indicating an operator or user manually stopped charging"
    )

    @property
    def duration_hours(self) -> float:
        """Total duration of connection in hours."""
        delta = (self.departure_time - self.arrival_time).total_seconds()
        return max(0.0, delta / 3600.0)

    @property
    def max_battery_capacity_kwh(self) -> Optional[float]:
        """Physical battery capacity headroom from arrival SOC to 100% capacity."""
        if self.battery_capacity_kwh is not None and self.initial_soc_percent is not None:
            pct_room = max(0.0, 100.0 - self.initial_soc_percent)
            return round(self.battery_capacity_kwh * (pct_room / 100.0), 3)
        return self.battery_capacity_kwh

    @property
    def target_soc_energy_kwh(self) -> Optional[float]:
        """Energy in kWh required to charge from initial_soc_percent to target_soc_percent."""
        if (
            self.battery_capacity_kwh is not None
            and self.initial_soc_percent is not None
            and self.target_soc_percent is not None
        ):
            needed_pct = max(0.0, self.target_soc_percent - self.initial_soc_percent)
            return round(self.battery_capacity_kwh * (needed_pct / 100.0), 3)
        return None

    @property
    def effective_energy_target_kwh(self) -> Optional[float]:
        """Returns the primary target energy in kWh, respecting target SOC and physical battery capacity limits."""
        target: Optional[float] = None
        if self.requested_energy_kwh is not None:
            target = self.requested_energy_kwh
        elif self.target_soc_energy_kwh is not None:
            target = self.target_soc_energy_kwh
        elif self.observed_energy_kwh is not None:
            target = self.observed_energy_kwh

        if target is None:
            return None

        # Battery safety limits: never exceed target SOC energy or 100% battery capacity
        if self.target_soc_energy_kwh is not None:
            target = min(target, self.target_soc_energy_kwh)
        if self.max_battery_capacity_kwh is not None:
            target = min(target, self.max_battery_capacity_kwh)

        return round(max(0.0, target), 3)
