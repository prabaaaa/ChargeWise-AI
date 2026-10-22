"""Generator for realistic demo charging sessions."""

import random
from datetime import datetime, timedelta
from typing import List, Optional
from models.session import ChargingSession


def generate_demo_sessions(
    seed: int = 42,
    base_date: Optional[datetime] = None
) -> List[ChargingSession]:
    """Generates 40-60 realistic workplace charging sessions spanning a 7-day period.
    
    Default period: Monday 2024-10-14 through Sunday 2024-10-20.
    Sessions simulate realistic workplace patterns:
    - Weekdays: 8-11 sessions/day arriving 07:00-10:00, departing 15:00-19:00
    - Weekends: 2-3 sessions/day arriving with wider schedules
    - Charger mix: 6.6 kW, 7.2 kW, 11 kW
    - Energy range: 10 - 50 kWh
    - Selected sessions marked with proxy energy or estimated departure
    """
    rng = random.Random(seed)
    if base_date is None:
        start_day = datetime(2024, 10, 14, 0, 0, 0)
    else:
        start_day = datetime(base_date.year, base_date.month, base_date.day, 0, 0, 0)

    sessions: List[ChargingSession] = []
    session_counter = 1

    charger_power_options = [6.6, 6.6, 6.6, 7.2, 7.2, 11.0]
    connector_options = ["J1772", "J1772", "J1772", "CCS", "NACS"]

    # 7 days: 0 (Mon) to 6 (Sun)
    for day_offset in range(7):
        current_date = start_day + timedelta(days=day_offset)
        is_weekend = (day_offset >= 5)  # Sat (5), Sun (6)

        num_sessions = rng.randint(2, 4) if is_weekend else rng.randint(8, 11)
        used_chargers_today = set()

        for _ in range(num_sessions):
            # Pick unique charger for the day or allow reuse after departure
            cid_num = rng.randint(1, 20)
            charger_id = f"CP-{cid_num:02d}"

            if not is_weekend:
                # Weekday arrival between 07:00 and 10:15
                arrival_hour = rng.randint(7, 9)
                arrival_minute = rng.choice([0, 15, 30, 45])
                arrival_time = current_date + timedelta(hours=arrival_hour, minutes=arrival_minute)

                # Weekday departure between 15:00 and 19:00
                departure_hour = rng.randint(15, 18)
                departure_minute = rng.choice([0, 15, 30, 45])
                departure_time = current_date + timedelta(hours=departure_hour, minutes=departure_minute)
            else:
                # Weekend arrivals between 09:00 and 13:00
                arrival_hour = rng.randint(9, 13)
                arrival_minute = rng.choice([0, 15, 30])
                arrival_time = current_date + timedelta(hours=arrival_hour, minutes=arrival_minute)

                # Stay 2 to 5 hours
                duration_hours = rng.uniform(2.0, 5.0)
                departure_time = arrival_time + timedelta(hours=duration_hours)

            # Ensure departure > arrival
            if departure_time <= arrival_time:
                departure_time = arrival_time + timedelta(hours=4)

            # Charger specifications
            charger_power = rng.choice(charger_power_options)
            connector = rng.choice(connector_options)

            # Battery specs
            battery_cap = rng.choice([50.0, 60.0, 64.0, 75.0, 77.0, 82.0, 100.0])
            init_soc = round(rng.uniform(10.0, 45.0), 1)
            target_soc = round(rng.uniform(80.0, 100.0), 1)

            # Energy calculation
            calculated_energy = round(battery_cap * ((target_soc - init_soc) / 100.0), 2)
            calculated_energy = max(10.0, min(50.0, calculated_energy))

            # Distribute data provenance
            provenance_roll = rng.random()
            if provenance_roll < 0.12:
                # Missing requested energy -> proxy
                req_energy = None
                obs_energy = calculated_energy
                energy_source = "proxy"
            elif provenance_roll < 0.35:
                req_energy = calculated_energy
                obs_energy = round(calculated_energy * rng.uniform(0.92, 1.05), 2)
                energy_source = "requested"
            else:
                req_energy = calculated_energy
                obs_energy = calculated_energy
                energy_source = "observed"

            # Departure source provenance
            dep_roll = rng.random()
            if dep_roll < 0.15:
                departure_source = "estimated"
            else:
                departure_source = "observed"

            session = ChargingSession(
                session_id=f"SESS-{session_counter:04d}",
                site="caltech",
                arrival_time=arrival_time,
                departure_time=departure_time,
                requested_energy_kwh=req_energy,
                observed_energy_kwh=obs_energy,
                charger_id=charger_id,
                charger_max_power_kw=charger_power,
                battery_capacity_kwh=battery_cap,
                initial_soc_percent=init_soc,
                target_soc_percent=target_soc,
                connector_type=connector,
                energy_source=energy_source,
                departure_source=departure_source,
                is_synthetic=False,
                is_emergency=False,
            )
            sessions.append(session)
            session_counter += 1

    # Sort deterministically by arrival time
    sessions.sort(key=lambda s: s.arrival_time)
    return sessions


def generate_interactive_demo_sessions(
    base_date: Optional[datetime] = None
) -> List[ChargingSession]:
    """Generates the 3 special vehicles for the interactive showcase scenario:
    
    - Vehicle DEMO-A: arrives at 75% SOC, 60 kWh battery, flexible departure (8 hours), charger 7.2 kW
    - Vehicle DEMO-B: arrives at 15% SOC, 75 kWh battery, short deadline (3 hours), charger 11 kW
    - Vehicle DEMO-C: arrives at 5% SOC, 50 kWh battery, emergency (leaves in 30 min), charger 7.2 kW
    
    All marked with is_synthetic=True.
    """
    if base_date is None:
        t0 = datetime(2024, 10, 14, 9, 0, 0)
    else:
        t0 = base_date

    # Vehicle DEMO-A (Flexible, high initial SOC)
    # Energy needed: 60 kWh * (100% - 75%) = 15.0 kWh over 8 hours
    sess_a = ChargingSession(
        session_id="DEMO-A",
        site="caltech",
        arrival_time=t0,
        departure_time=t0 + timedelta(hours=8),  # 17:00
        requested_energy_kwh=15.0,
        observed_energy_kwh=15.0,
        charger_id="CP-DEMO-01",
        charger_max_power_kw=7.2,
        battery_capacity_kwh=60.0,
        initial_soc_percent=75.0,
        target_soc_percent=100.0,
        connector_type="J1772",
        energy_source="requested",
        departure_source="declared",
        is_synthetic=True,
        is_emergency=False,
    )

    # Vehicle DEMO-B (Tight deadline, low SOC)
    # Energy needed: 75 kWh * (90% - 15%) = 56.25 kWh over 3 hours
    sess_b = ChargingSession(
        session_id="DEMO-B",
        site="caltech",
        arrival_time=t0,
        departure_time=t0 + timedelta(hours=3),  # 12:00
        requested_energy_kwh=48.0,
        observed_energy_kwh=48.0,
        charger_id="CP-DEMO-02",
        charger_max_power_kw=11.0,
        battery_capacity_kwh=75.0,
        initial_soc_percent=15.0,
        target_soc_percent=90.0,
        connector_type="CCS",
        energy_source="requested",
        departure_source="declared",
        is_synthetic=True,
        is_emergency=False,
    )

    # Vehicle DEMO-C (Emergency, extremely low SOC, leaves in 30 minutes)
    # Energy needed: 50 kWh * (80% - 5%) = 37.5 kWh over 0.5 hours (charger max 7.2 kW, will deliver up to ~3.6 kWh)
    sess_c = ChargingSession(
        session_id="DEMO-C",
        site="caltech",
        arrival_time=t0,
        departure_time=t0 + timedelta(minutes=30),  # 09:30
        requested_energy_kwh=35.0,
        observed_energy_kwh=35.0,
        charger_id="CP-DEMO-03",
        charger_max_power_kw=7.2,
        battery_capacity_kwh=50.0,
        initial_soc_percent=5.0,
        target_soc_percent=80.0,
        connector_type="J1772",
        energy_source="requested",
        departure_source="declared",
        is_synthetic=True,
        is_emergency=True,
    )

    return [sess_a, sess_b, sess_c]
