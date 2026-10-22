"""Rescue station finder and routing engine for stranded or underserved EVs."""

import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import httpx

from models.rescue import RescueStation, RescueRecommendation


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    radius_earth_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(radius_earth_km * c, 2)


def get_demo_stations(origin_lat: float, origin_lng: float) -> List[RescueStation]:
    """Returns clearly-labeled demonstration charging stations near Caltech / Pasadena area."""
    raw_demo_data = [
        {
            "station_id": "DEMO-ST-01",
            "name": "Pasadena Supercharger & EVgo Hub",
            "lat": 34.1450,
            "lng": -118.1380,
            "connectors": ["CCS", "NACS", "J1772"],
            "max_power_kw": 150.0,
            "availability": "available",
            "recommendation_reason": "High-speed 150 kW DC fast charging within 5 minutes driving distance.",
        },
        {
            "station_id": "DEMO-ST-02",
            "name": "Lake Avenue Fast Charging Plaza",
            "lat": 34.1320,
            "lng": -118.1320,
            "connectors": ["CCS", "CHAdeMO", "J1772"],
            "max_power_kw": 50.0,
            "availability": "available",
            "recommendation_reason": "Closest station with guaranteed connector availability.",
        },
        {
            "station_id": "DEMO-ST-03",
            "name": "Rose Bowl Green Charging Pavilion",
            "lat": 34.1610,
            "lng": -118.1670,
            "connectors": ["CCS", "J1772"],
            "max_power_kw": 62.5,
            "availability": "provider_reported",
            "recommendation_reason": "Multi-bay facility with low wait times.",
        },
        {
            "station_id": "DEMO-ST-04",
            "name": "Old Pasadena Transit Center",
            "lat": 34.1480,
            "lng": -118.1510,
            "connectors": ["J1772"],
            "max_power_kw": 11.0,
            "availability": "available",
            "recommendation_reason": "Cost-effective Level 2 curbside charging for medium stays.",
        },
        {
            "station_id": "DEMO-ST-05",
            "name": "Glendale Galleria Ultra-Fast Hub",
            "lat": 34.1460,
            "lng": -118.2580,
            "connectors": ["CCS", "NACS"],
            "max_power_kw": 250.0,
            "availability": "available",
            "recommendation_reason": "Ultra-fast 250 kW charging for rapid battery recovery.",
        },
        {
            "station_id": "DEMO-ST-06",
            "name": "San Gabriel Valley EV Center",
            "lat": 34.0950,
            "lng": -118.0980,
            "connectors": ["CCS", "J1772"],
            "max_power_kw": 100.0,
            "availability": "unknown",
            "recommendation_reason": "High power 100 kW charging along major transit corridor.",
        },
    ]

    stations: List[RescueStation] = []
    for item in raw_demo_data:
        dist_km = haversine_distance_km(origin_lat, origin_lng, item["lat"], item["lng"])
        # Urban route road distance factor 1.3
        road_distance_km = dist_km * 1.3
        drive_time = round((road_distance_km / 35.0) * 60.0, 1)

        stations.append(
            RescueStation(
                station_id=item["station_id"],
                name=item["name"],
                latitude=item["lat"],
                longitude=item["lng"],
                distance_km=dist_km,
                driving_time_minutes=drive_time,
                connectors=item["connectors"],
                max_power_kw=item["max_power_kw"],
                availability=item["availability"],
                is_demo=True,
                recommendation_reason=item["recommendation_reason"],
            )
        )

    return stations


async def _fetch_open_charge_map(
    lat: float,
    lng: float,
    api_key: str,
    distance_km: float = 20.0,
) -> List[RescueStation]:
    """Fetches real-time charging facilities from Open Charge Map API."""
    url = "https://api.openchargemap.io/v3/poi/"
    params = {
        "output": "json",
        "latitude": lat,
        "longitude": lng,
        "distance": distance_km,
        "distanceunit": "KM",
        "maxresults": 15,
        "compact": True,
        "verbose": False,
        "key": api_key,
    }
    headers = {"User-Agent": "ChargeWise-AI/1.0"}

    stations: List[RescueStation] = []
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code != 200:
            return []

        data = resp.json()
        for item in data:
            addr = item.get("AddressInfo", {})
            st_lat = addr.get("Latitude")
            st_lng = addr.get("Longitude")
            if st_lat is None or st_lng is None:
                continue

            dist = haversine_distance_km(lat, lng, st_lat, st_lng)
            road_dist = dist * 1.3
            drive_time = round((road_dist / 35.0) * 60.0, 1)

            # Parse connectors and max power
            connections = item.get("Connections", [])
            connectors = []
            max_kw = 7.2

            for conn in connections:
                conn_type = conn.get("ConnectionType", {}).get("Title", "Standard")
                connectors.append(conn_type)
                p_kw = conn.get("PowerKW")
                if p_kw and float(p_kw) > max_kw:
                    max_kw = float(p_kw)

            status = item.get("StatusType", {}).get("IsOperational", True)
            availability = "provider_reported" if status else "unknown"

            stations.append(
                RescueStation(
                    station_id=f"OCM-{item.get('ID')}",
                    name=addr.get("Title", "Public Charging Station"),
                    latitude=st_lat,
                    longitude=st_lng,
                    distance_km=dist,
                    driving_time_minutes=drive_time,
                    connectors=connectors or ["J1772"],
                    max_power_kw=max_kw,
                    availability=availability,
                    is_demo=False,
                    recommendation_reason=f"Operational public station located {dist:.1f} km away with up to {max_kw:.0f} kW power.",
                )
            )

    return stations


async def find_rescue_stations(
    origin_lat: float,
    origin_lng: float,
    energy_needed_kwh: float,
    session_id: str = "CURRENT-SESSION",
    connector_type: Optional[str] = None,
    vehicle_range_km: Optional[float] = None,
    vehicle_efficiency_kwh_per_km: float = 0.18,
    current_energy_kwh: Optional[float] = None,
    departure_deadline: Optional[datetime] = None,
    api_key: Optional[str] = None,
) -> RescueRecommendation:
    """Finds and evaluates reachable public charging stations for an underserved or stranded vehicle.

    Performs filtering by connector compatibility, computes transit energy consumption,
    verifies vehicle reachability, and returns sorted, actionable rescue alternatives.
    """
    deadline = departure_deadline or (datetime.now() + timedelta(hours=2))
    warnings: List[str] = []

    candidates: List[RescueStation] = []

    # 1. Query Open Charge Map if API key provided
    if api_key:
        try:
            candidates = await _fetch_open_charge_map(origin_lat, origin_lng, api_key)
        except Exception as exc:
            warnings.append(f"Open Charge Map API request failed: {str(exc)}. Falling back to demo data.")

    # Fallback to demo stations if no API key or API returned no results
    if not candidates:
        candidates = get_demo_stations(origin_lat, origin_lng)

    evaluated_stations: List[RescueStation] = []

    for station in candidates:
        # Distance filter (max 20 km)
        if station.distance_km > 20.0:
            continue

        # Connector compatibility filter if vehicle connector is specified
        if connector_type:
            conn_match = any(
                connector_type.lower() in c.lower() or c.lower() in connector_type.lower()
                for c in station.connectors
            )
            # Standard J1772 / CCS adapter compatibility
            if not conn_match:
                continue

        # Transit energy requirement (road distance = straight line * 1.3)
        road_distance_km = station.distance_km * 1.3
        transit_energy_kwh = round(road_distance_km * vehicle_efficiency_kwh_per_km, 2)
        station.energy_needed_to_reach_kwh = transit_energy_kwh

        # Reachability safety verification (20% safety margin)
        safe_energy_needed = transit_energy_kwh * 1.2
        is_reachable = True

        if current_energy_kwh is not None:
            if current_energy_kwh < safe_energy_needed:
                is_reachable = False

        if vehicle_range_km is not None:
            if vehicle_range_km < (road_distance_km * 1.2):
                is_reachable = False

        station.is_reachable = is_reachable

        if not is_reachable:
            warnings.append(
                f"Station '{station.name}' ({station.distance_km:.1f} km) is not reachable with current battery level "
                f"(requires {safe_energy_needed:.1f} kWh with safety reserve, current energy is {current_energy_kwh or 0.0:.1f} kWh)."
            )
        else:
            evaluated_stations.append(station)

    # Rank reachable stations: highest power first, then closest distance
    evaluated_stations.sort(key=lambda s: (-s.max_power_kw, s.distance_km))

    if not evaluated_stations:
        warnings.append("No reachable rescue charging stations found within safe vehicle driving range.")

    return RescueRecommendation(
        session_id=session_id,
        current_energy_kwh=current_energy_kwh or 0.0,
        energy_needed_kwh=energy_needed_kwh,
        departure_deadline=deadline,
        vehicle_connector=connector_type,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        recommended_stations=evaluated_stations,
        warnings=warnings,
    )
