# ChargeWise AI — Intelligent EV Charging & Energy Orchestration Platform
**NexAI Hack 2026 | Problem Statement 3.2 — Workplace EV Charging Scheduler**

ChargeWise AI is a complete full-stack workplace electric vehicle charging orchestration platform and interactive 3D digital twin. It intelligently distributes limited site electrical capacity among connected vehicles, enforces hard power limits, prevents peak demand charges, implements real-time automatic charging cutoffs, and provides charging rescue recommendations.

---

## Architecture Overview

- **Backend:** Python 3.10+ / FastAPI, Pydantic v2, NumPy, Pandas, Pytest
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Leaflet
- **3D Digital Twin:** Three.js, React Three Fiber (R3F), @react-three/drei
- **Simulation Engine:** 15-minute discrete-event simulation replaying 7 continuous days of EV charging sessions
- **Scheduling Algorithms:**
  - **Uncontrolled Policy:** Baseline FIFO / max-draw charging with proportional clipping
  - **ChargeWise Policy:** Least-Laxity-First (LLF) urgency prioritization with Jain's fairness index and battery headroom safety limits
- **Automatic Charging Cutoff:** Charger-level cutoff at target kWh, target SOC, physical battery capacity headroom, departure deadline, and manual operator override
- **Charging Rescue Module:** Open Charge Map integration with Haversine reachability analysis and offline fallback recommendations

---

## Project Structure

```text
chargewise-ai/
├── README.md
├── start-app.bat                   # 1-click startup script for Windows
├── backend/
│   ├── main.py                     # FastAPI entry point & lifespan
│   ├── config.py                   # AppConfig, TOU tariffs, solar & carbon profiles
│   ├── pytest.ini                  # Pytest configuration
│   ├── requirements.txt            # Python dependencies
│   ├── api/
│   │   └── routes.py               # REST API endpoints (simulation, config, cutoff, rescue)
│   ├── data/
│   │   ├── demo_sessions.py        # 7-day realistic demo sessions & emergency vehicles
│   │   └── loader.py               # ACN-Data CSV dataset parser
│   ├── models/
│   │   ├── session.py              # Pydantic ChargingSession model with battery headroom
│   │   ├── simulation.py           # SimulationInterval, SessionOutcome, CutoffEvent models
│   │   └── rescue.py               # RescueStation & RescueRecommendation models
│   ├── rescue/
│   │   └── station_finder.py       # Nearby EV station locator & reachability oracle
│   ├── simulation/
│   │   ├── engine.py               # Deterministic 15-min interval simulation engine
│   │   ├── policies.py             # Uncontrolled vs. ChargeWise LLF scheduling policies
│   │   ├── feasibility.py          # Feasibility oracle (feasible, at-risk, infeasible)
│   │   └── fairness.py             # Jain's fairness index calculator
│   └── tests/
│       ├── test_cutoff.py          # Automatic charging cutoff & safety unit tests
│       ├── test_simulation.py      # Core simulation & cap enforcement tests
│       ├── test_policies.py        # Policy comparison & priority tests
│       └── test_feasibility.py     # Feasibility & rescue station tests
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── index.css
        ├── api/
        │   ├── client.ts           # Axios/Fetch API client with mock fallback
        │   └── types.ts            # TypeScript interfaces matching backend models
        ├── components/
        │   ├── layout/             # AppShell, Sidebar, Header
        │   ├── ui/                 # Cards, Buttons, Badges, KPI cards
        │   ├── simulation/         # SimulationControls, PowerCapControl
        │   ├── charts/             # PowerDemandChart, EnergyDeliveryChart, SolarChart, CostChart
        │   ├── rescue/             # RescueMap, StationCard, RescuePanel
        │   └── twin/               # 2D ParkingLayout, VehicleSlot, VehicleDetail, GridStatus
        │       └── three/          # 3D Digital Twin (Three.js & React Three Fiber)
        │           ├── TwinCanvas.tsx           # R3F Canvas host with error boundary
        │           ├── FacilityScene.tsx        # Scene coordinating 20 bays & lighting
        │           ├── FacilityEnvironment3D.tsx# Pavement, markings, solar canopies
        │           ├── ParkingBay3D.tsx         # Interactive 3D bay with tooltips
        │           ├── ProceduralVehicle.tsx    # Low-poly realistic EV 3D model
        │           ├── ChargerPedestal3D.tsx    # Dual-port pedestal with LED status ring
        │           ├── ChargingCable3D.tsx      # Catenary cable with animated energy flow
        │           ├── Substation3D.tsx         # 480V transformer hub & telemetry
        │           ├── PowerConduits3D.tsx      # Power busways with live energy pulses
        │           ├── CameraController.tsx     # Smooth orbit & camera presets
        │           └── FacilityHUD.tsx          # 3D/2D switcher & telemetry overlay
        └── pages/
            ├── OverviewPage.tsx        # Main executive dashboard & KPI cards
            ├── DigitalTwinPage.tsx     # 3D & 2D Interactive Digital Twin
            ├── SchedulerPage.tsx       # Live allocations, feasibility, & priority queue
            ├── ComparisonPage.tsx      # Uncontrolled vs. ChargeWise comparative analytics
            ├── RescuePage.tsx          # Emergency charging rescue finder & map
            ├── SustainabilityPage.tsx  # Solar integration, TOU tariffs, & carbon metrics
            └── SettingsPage.tsx        # ACN-Data CSV upload & power cap configuration
```

---

## Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Start Backend Server
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Backend API will be live at: `http://localhost:8000`  
Swagger Documentation: `http://localhost:8000/docs`

### 2. Run Backend Unit Tests
```bash
cd backend
pytest tests/ -v
# 29 passed in ~0.6s
```

### 3. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
Frontend web application will be live at: `http://localhost:5173`

---

## Key Features

1. **Deterministic 7-Day Simulation Engine:** 672 discrete 15-minute simulation intervals running across Caltech/JPL workplace charging data.
2. **Hard Power Cap Enforcement:** The site power cap (configurable 5–100 kW) is strictly respected under ChargeWise scheduling, eliminating demand charges.
3. **Automatic Charging Cutoff System:**
   - Cutoff when vehicle hits requested kWh or target SOC
   - Physical battery capacity headroom limit enforcement ($SOC \le 100\%$)
   - Departure-based cutoff with completion / shortfall accounting
   - Immediate charger-level power clamp to 0.0 kW
   - Dynamic capacity reallocation releasing power budget to queued vehicles
   - Manual operator Start / Stop override controls
   - Real-time Safety and Cutoff Event Log
4. **Interactive 3D Digital Twin:**
   - 20 realistic bi-directional charging bays in two rows
   - Procedural electric vehicles with dynamic charge port indicators
   - Animated light pulses flowing along charging cables proportional to power draw
   - Cable flow halts instantly upon cutoff or target reached
   - 480V grid substation and solar canopies
   - Camera presets: Overview, North Row, South Row, Substation, Top-Down, and Focus Bay
   - Seamless 3D / 2D view toggle
5. **Driver Feasibility Oracle & Charging Rescue:**
   - Real-time classification: `feasible`, `at_risk`, or `likely_infeasible`
   - Nearby Level 2 and DC Fast station recommendations with distance and driving time
6. **Sustainability & Carbon Analytics:**
   - Solar co-optimization with on-site solar generation
   - Time-of-use (TOU) tariff cost savings calculation
   - Real-time grid vs. clean solar emissions tracking

---

## License
MIT License - NexAI Hackathon 2026.
