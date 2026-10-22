# ChargeWise AI — Intelligent EV Charging & Energy Orchestration Platform
**Frontend Web Application (React 18 + TypeScript + Vite + Tailwind CSS v4)**

ChargeWise AI is a complete frontend for EV charging site optimization, grid constraint management, dynamic load shifting, and charging rescue.

---

## 🚀 Features & Architecture

### 1. **Executive Dashboard (`OverviewPage.tsx`)**
- Real-time KPI banner: Peak Demand (kW), Peak Reduction (%), Total Energy Delivered (kWh), EVs Served, TOU Cost Savings ($), and Carbon Offset (kg CO₂).
- Interactive full-width **Power Demand Area Chart** comparing uncontrolled charging spikes against ChargeWise AI peak-shaved load.
- Quick session status table with priority, feasibility, and active power metrics.
- Simulation playback toolbar with speed control, step-forward, and scrub bar.

### 2. **Live Digital Twin (`DigitalTwinPage.tsx`)**
- SVG-based interactive 20-bay parking facility layout (North & South parking rows with drive lane).
- Dynamic visual state per bay: Active Charging (teal pulse glow), Queued/Waiting (amber), Completed (emerald), Emergency Priority (red pulse), and Available.
- Real-time Substation Transformer Telemetry: Site load vs transformer cap, solar generation, grid draw, and capacity utilization bar.
- Selected vehicle telemetry panel: Current SOC bar, kWh delivered, scheduled departure, and interactive operator controls (**Emergency Priority**, **Leaving Soon**, and **Charging Rescue Dispatch**).

### 3. **Dynamic Charging Scheduler (`SchedulerPage.tsx`)**
- Vehicle Departure Gantt timeline tracking arrival, charging, and departure windows.
- Weighted earliest-deadline-first (EDF) priority ranking table with instant emergency override.
- Optimization engine solver logs displaying mathematical convergence, fairness distribution, and solar curve absorption.

### 4. **Policy Performance Comparison (`ComparisonPage.tsx`)**
- Side-by-side empirical benchmark of Uncontrolled Charging vs ChargeWise AI Orchestration.
- 4 comparative metric cards: Peak Demand reduction, Cap Overload intervals avoided (100% compliance), Electricity TOU savings, and Carbon emissions reduction.
- Dual-policy power profile area chart and per-vehicle energy fulfillment comparison chart.

### 5. **Charging Rescue Network (`RescuePage.tsx`)**
- Integrated React Leaflet map displaying regional DC fast charging hubs within a 5 km radius.
- Intelligent station cards with live availability, power levels (up to 350 kW), connector standards (CCS, NACS, CHAdeMO, J1772), transit energy calculation, and one-click Google Maps directions.
- EV reachability check warning if remaining battery capacity cannot safely reach a distant hub.

### 6. **Energy & Sustainability (`SustainabilityPage.tsx`)**
- Rooftop Solar PV generation tracking and clean-hour load shifting toggles.
- Stacked area power chart showing solar self-consumption vs grid import.
- Time-of-Use (TOU) tariff cost chart demonstrating peak-period electricity cost avoidance.

### 7. **System Settings & Data Provenance (`SettingsPage.tsx`)**
- Caltech ACN benchmark dataset configuration with CSV/JSON upload support.
- Transformer electrical limit slider with presets and -50% stress test simulation.
- Proportional alpha-fairness toggle and solver time budget controls.
- Automatic backend health check with instant offline browser fallback mode.

---

## 🛠️ Technology Stack
- **Framework:** React 18 with TypeScript
- **Bundler:** Vite 6 with `@tailwindcss/vite`
- **Styling:** Tailwind CSS v4 with custom dark navy (`#0a0f1e`) + teal/electric green design system
- **UI Primitives:** `@radix-ui` (Tabs, Slider, Switch, Select, Dialog, Tooltip, Progress, Toast)
- **Charts:** Recharts
- **Mapping:** React Leaflet & Leaflet
- **Icons:** Lucide React

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will start at `http://localhost:5173/`.

### 3. Build for Production
```bash
npm run build
```

---

## 🌐 Standalone Demo / Mock Mode
The frontend includes a built-in browser simulation engine in `src/api/client.ts`. If the FastAPI backend (`http://localhost:8000`) is offline, the app seamlessly runs full real-time simulations, telemetry, and rescue calculations directly in the browser with authentic Caltech/JPL EV data.
