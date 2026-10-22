"""Sample EV charging dataset generator and CSV provider for testing."""

import csv
import io
from datetime import datetime, timedelta


def generate_sample_workplace_csv() -> str:
    """Generates a clean, realistic workplace EV charging session CSV dataset."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "session_id",
        "charger_id",
        "arrival_time",
        "departure_time",
        "requested_energy_kwh",
        "battery_capacity_kwh",
        "initial_soc_percent",
        "target_soc_percent",
        "charger_max_power_kw",
        "connector_type",
        "site"
    ])

    base_date = datetime(2026, 10, 26, 7, 30, 0)  # Monday morning
    sample_records = [
        # session_id, bay, arr_offset_min, duration_hrs, req_kwh, batt_cap, init_soc, target_soc, power_kw, connector
        ("FLEET-001", "CP-01", 0, 8.5, 28.5, 75.0, 32.0, 85.0, 7.2, "J1772"),
        ("FLEET-002", "CP-02", 15, 7.0, 38.0, 82.0, 20.0, 80.0, 11.0, "CCS"),
        ("FLEET-003", "CP-03", 25, 9.0, 44.0, 90.0, 15.0, 85.0, 11.0, "NACS"),
        ("FLEET-004", "CP-04", 30, 5.0, 22.0, 64.0, 40.0, 80.0, 7.2, "J1772"),
        ("FLEET-005", "CP-05", 45, 8.0, 32.5, 70.0, 25.0, 85.0, 7.2, "CCS"),
        ("FLEET-006", "CP-06", 50, 4.5, 18.0, 58.0, 38.0, 75.0, 7.2, "J1772"),
        ("FLEET-007", "CP-07", 60, 8.5, 41.0, 85.0, 22.0, 85.0, 11.0, "NACS"),
        ("FLEET-008", "CP-08", 75, 7.5, 29.0, 68.0, 35.0, 85.0, 7.2, "CCS"),
        ("FLEET-009", "CP-09", 90, 8.0, 35.0, 77.0, 28.0, 85.0, 11.0, "CCS"),
        ("FLEET-010", "CP-10", 100, 6.0, 19.5, 54.0, 45.0, 85.0, 7.2, "J1772"),
        ("FLEET-011", "CP-11", 110, 8.0, 48.0, 95.0, 18.0, 80.0, 11.0, "NACS"),
        ("FLEET-012", "CP-12", 120, 7.0, 26.0, 65.0, 30.0, 80.0, 7.2, "CCS"),
        ("FLEET-013", "CP-13", 135, 6.5, 24.5, 60.0, 42.0, 85.0, 7.2, "J1772"),
        ("FLEET-014", "CP-14", 150, 8.0, 37.0, 80.0, 24.0, 85.0, 11.0, "CCS"),
        ("FLEET-015", "CP-15", 160, 5.5, 21.0, 64.0, 35.0, 80.0, 7.2, "J1772"),
        ("FLEET-016", "CP-16", 180, 8.5, 45.0, 88.0, 20.0, 85.0, 11.0, "NACS"),
        ("FLEET-017", "CP-17", 195, 7.5, 30.0, 72.0, 32.0, 85.0, 7.2, "CCS"),
        ("FLEET-018", "CP-18", 210, 6.0, 17.5, 50.0, 50.0, 85.0, 7.2, "J1772"),
        ("FLEET-019", "CP-19", 225, 7.0, 33.0, 75.0, 25.0, 80.0, 11.0, "CCS"),
        ("FLEET-020", "CP-20", 240, 6.5, 27.0, 70.0, 30.0, 80.0, 7.2, "NACS"),
        # Additional afternoon arrivals (testing queue & bay turnover)
        ("FLEET-021", "CP-04", 360, 4.5, 20.0, 60.0, 35.0, 80.0, 7.2, "J1772"),
        ("FLEET-022", "CP-06", 380, 4.0, 16.0, 54.0, 40.0, 80.0, 7.2, "CCS"),
        ("FLEET-023", "CP-15", 420, 4.0, 18.5, 64.0, 38.0, 80.0, 7.2, "J1772"),
        ("FLEET-024", "CP-10", 450, 3.5, 15.0, 50.0, 45.0, 80.0, 7.2, "NACS"),
    ]

    for sid, bay, offset_min, dur_hrs, req_kwh, cap, init_soc, tgt_soc, pwr, conn in sample_records:
        arr = base_date + timedelta(minutes=offset_min)
        dep = arr + timedelta(hours=dur_hrs)
        writer.writerow([
            sid,
            bay,
            arr.strftime("%Y-%m-%d %H:%M:%S"),
            dep.strftime("%Y-%m-%d %H:%M:%S"),
            req_kwh,
            cap,
            init_soc,
            tgt_soc,
            pwr,
            conn,
            "Tech-Campus-Lot"
        ])

    return output.getvalue()
