"""Configuration and constants for ChargeWise AI backend."""

from typing import Dict, Optional
from pydantic import BaseModel, Field


def get_default_solar_profile() -> Dict[int, float]:
    """Default solar generation profile by hour (kW peak ~12kW at noon)."""
    return {
        0: 0.0, 1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0,
        6: 0.5, 7: 1.5, 8: 3.5, 9: 6.0, 10: 9.0, 11: 11.5,
        12: 12.0, 13: 11.5, 14: 9.0, 15: 6.0, 16: 3.5, 17: 1.5,
        18: 0.5, 19: 0.0, 20: 0.0, 21: 0.0, 22: 0.0, 23: 0.0
    }


def get_default_tariff_profile() -> Dict[int, float]:
    """Default Time-Of-Use electricity tariff profile ($/kWh).
    
    Off-peak: $0.08 (22:00-06:00)
    Mid-peak: $0.15 (06:00-10:00, 18:00-22:00)
    On-peak: $0.25 (10:00-18:00)
    """
    tariff: Dict[int, float] = {}
    for hour in range(24):
        if hour < 6 or hour >= 22:
            tariff[hour] = 0.08
        elif 10 <= hour < 18:
            tariff[hour] = 0.25
        else:
            tariff[hour] = 0.15
    return tariff


def get_default_carbon_profile() -> Dict[int, float]:
    """Default carbon intensity profile (gCO2/kWh).
    
    Baseline 400 gCO2/kWh, dropping to ~220 gCO2/kWh during peak solar hours (10:00-16:00).
    """
    carbon: Dict[int, float] = {}
    for hour in range(24):
        if 10 <= hour < 16:
            carbon[hour] = 220.0
        elif 8 <= hour < 10 or 16 <= hour < 19:
            carbon[hour] = 310.0
        else:
            carbon[hour] = 400.0
    return carbon


class AppConfig(BaseModel):
    """Application and simulation runtime configuration."""
    site_cap_kw: float = Field(default=45.0, description="Site maximum electrical power capacity in kW")
    interval_minutes: int = Field(default=15, description="Simulation discrete time step in minutes")
    default_charger_max_kw: float = Field(default=6.6, description="Default Level 2 charging power in kW")
    solar_enabled: bool = Field(default=False, description="Whether to include solar in power balancing")
    solar_profile: Dict[int, float] = Field(default_factory=get_default_solar_profile, description="Hour -> kW solar generation")
    fairness_enabled: bool = Field(default=False, description="Enable fairness-weighted scheduling")
    tariff_profile: Dict[int, float] = Field(default_factory=get_default_tariff_profile, description="Hour -> $/kWh tariff")
    carbon_profile: Dict[int, float] = Field(default_factory=get_default_carbon_profile, description="Hour -> gCO2/kWh carbon intensity")
    underserved_tolerance_kwh: float = Field(default=1.0, description="Shortfall tolerance threshold in kWh")
    charging_efficiency: float = Field(default=1.0, ge=0.5, le=1.0, description="Charging efficiency factor (default 1.0)")
    demo_site_lat: float = Field(default=34.1377, description="Caltech site latitude")
    demo_site_lng: float = Field(default=-118.1253, description="Caltech site longitude")
    open_charge_map_api_key: Optional[str] = Field(default=None, description="Optional Open Charge Map API Key")


# Global active settings instance
app_config = AppConfig()
