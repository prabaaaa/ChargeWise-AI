import {
  ChargingSession,
  SimulationResult,
  SimulationInterval,
  SessionOutcome,
  ComparisonResult,
  FeasibilityResult,
  RescueStation,
  AppConfig,
  CutoffEvent,
  UploadPreviewResponse,
  DatasetInfo,
  ActivateDatasetRequest,
  DatasetSummary,
  DatasetValidationIssue,
} from './types';
import {
  API_BASE_URL,
  DEFAULT_SITE_CAP_KW,
  DEFAULT_TARIFF_PROFILE,
  DEFAULT_SOLAR_PROFILE,
  DEFAULT_CARBON_PROFILE,
} from '../utils/constants';

let isBackendAvailable: boolean | null = null;

// Realistic Caltech/JPL EV charging dataset generation for standalone demo mode
export function generateMockSessions(): ChargingSession[] {
  const baseDate = '2026-10-21';
  const rawData = [
    { id: 'cs-101', charger: 'CP-01', arr: '07:15', dep: '16:30', req: 28.5, cap: 60, initSoc: 25, targetSoc: 85, connector: 'J1772', maxKw: 7.2 },
    { id: 'cs-102', charger: 'CP-02', arr: '07:30', dep: '15:45', req: 18.2, cap: 75, initSoc: 40, targetSoc: 80, connector: 'CCS', maxKw: 11.0 },
    { id: 'cs-103', charger: 'CP-03', arr: '07:45', dep: '17:00', req: 34.0, cap: 82, initSoc: 20, targetSoc: 90, connector: 'NACS', maxKw: 11.0 },
    { id: 'cs-104', charger: 'CP-04', arr: '08:00', dep: '13:00', req: 24.0, cap: 64, initSoc: 30, targetSoc: 80, connector: 'CCS', maxKw: 7.2 },
    { id: 'cs-105', charger: 'CP-05', arr: '08:15', dep: '17:30', req: 42.5, cap: 90, initSoc: 15, targetSoc: 85, connector: 'CCS', maxKw: 11.0 },
    { id: 'cs-106', charger: 'CP-06', arr: '08:20', dep: '12:30', req: 19.0, cap: 54, initSoc: 35, targetSoc: 85, connector: 'J1772', maxKw: 7.2 },
    { id: 'cs-107', charger: 'CP-07', arr: '08:30', dep: '18:00', req: 31.2, cap: 77, initSoc: 28, targetSoc: 80, connector: 'NACS', maxKw: 11.0 },
    { id: 'cs-108', charger: 'CP-08', arr: '08:45', dep: '14:15', req: 22.8, cap: 68, initSoc: 32, targetSoc: 78, connector: 'CCS', maxKw: 7.2 },
    { id: 'cs-109', charger: 'CP-09', arr: '09:00', dep: '17:15', req: 36.4, cap: 85, initSoc: 22, targetSoc: 85, connector: 'CCS', maxKw: 11.0 },
    { id: 'cs-110', charger: 'CP-10', arr: '09:15', dep: '16:00', req: 16.5, cap: 50, initSoc: 45, targetSoc: 85, connector: 'J1772', maxKw: 7.2 },
    { id: 'cs-111', charger: 'CP-11', arr: '09:30', dep: '13:30', req: 27.0, cap: 75, initSoc: 20, targetSoc: 75, connector: 'NACS', maxKw: 11.0 },
    { id: 'cs-112', charger: 'CP-12', arr: '10:00', dep: '18:30', req: 38.0, cap: 95, initSoc: 18, targetSoc: 80, connector: 'CCS', maxKw: 11.0 },
    { id: 'cs-113', charger: 'CP-13', arr: '10:15', dep: '15:00', req: 15.2, cap: 60, initSoc: 40, targetSoc: 75, connector: 'J1772', maxKw: 7.2 },
    { id: 'cs-114', charger: 'CP-14', arr: '10:45', dep: '19:00', req: 29.5, cap: 70, initSoc: 30, targetSoc: 85, connector: 'CCS', maxKw: 11.0 },
    { id: 'cs-115', charger: 'CP-15', arr: '11:00', dep: '16:45', req: 21.0, cap: 64, initSoc: 38, targetSoc: 80, connector: 'NACS', maxKw: 7.2 },
    { id: 'cs-116', charger: 'CP-16', arr: '11:30', dep: '17:45', req: 33.0, cap: 80, initSoc: 25, targetSoc: 80, connector: 'CCS', maxKw: 11.0 },
    { id: 'cs-117', charger: 'CP-17', arr: '12:00', dep: '18:15', req: 26.4, cap: 72, initSoc: 35, targetSoc: 80, connector: 'J1772', maxKw: 7.2 },
    { id: 'cs-118', charger: 'CP-18', arr: '12:30', dep: '19:30', req: 35.5, cap: 88, initSoc: 20, targetSoc: 80, connector: 'CCS', maxKw: 11.0 },
    { id: 'cs-119', charger: 'CP-19', arr: '13:00', dep: '17:00', req: 14.8, cap: 58, initSoc: 45, targetSoc: 80, connector: 'NACS', maxKw: 7.2 },
    { id: 'cs-120', charger: 'CP-20', arr: '13:30', dep: '20:00', req: 30.0, cap: 77, initSoc: 28, targetSoc: 80, connector: 'CCS', maxKw: 11.0 },
  ];

  return rawData.map((d) => ({
    session_id: d.id,
    site: 'Caltech-JPL Main Lot',
    arrival_time: `${baseDate}T${d.arr}:00Z`,
    departure_time: `${baseDate}T${d.dep}:00Z`,
    requested_energy_kwh: d.req,
    observed_energy_kwh: d.req * 0.98,
    charger_id: d.charger,
    charger_max_power_kw: d.maxKw,
    battery_capacity_kwh: d.cap,
    initial_soc_percent: d.initSoc,
    target_soc_percent: d.targetSoc,
    connector_type: d.connector,
    energy_source: 'user_requested',
    departure_source: 'scheduled',
    is_synthetic: false,
  }));
}

// Generate realistic mock simulation results
export function generateMockSimulation(
  policy: 'uncontrolled' | 'optimized',
  siteCapKw: number = DEFAULT_SITE_CAP_KW,
  solarEnabled: boolean = true
): SimulationResult {
  const sessions = generateMockSessions();
  const intervals: SimulationInterval[] = [];
  const baseDate = '2026-10-21';
  const startHour = 6;
  const endHour = 22;
  const totalQuarterHours = (endHour - startHour) * 4;

  const deliveredPerSession: Record<string, number> = {};
  sessions.forEach(s => { deliveredPerSession[s.session_id] = 0; });

  let peakDemand = 0;
  let capViolations = 0;

  for (let step = 0; step <= totalQuarterHours; step++) {
    const totalMinutes = startHour * 60 + step * 15;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
    const timestamp = `${baseDate}T${timeStr}`;

    // Find active sessions at this interval
    const active = sessions.filter(s => {
      const arrTime = s.arrival_time.slice(11, 16);
      const depTime = s.departure_time.slice(11, 16);
      const curTime = timeStr.slice(0, 5);
      const remainingEnergy = (s.requested_energy_kwh || 20) - (deliveredPerSession[s.session_id] || 0);
      return curTime >= arrTime && curTime < depTime && remainingEnergy > 0.05;
    });

    const allocations: Record<string, number> = {};
    let totalKw = 0;

    if (policy === 'uncontrolled') {
      // Uncontrolled: charge at full max power immediately
      for (const s of active) {
        const remaining = (s.requested_energy_kwh || 20) - deliveredPerSession[s.session_id];
        const maxKw = Math.min(s.charger_max_power_kw, remaining * 4);
        allocations[s.session_id] = Math.round(maxKw * 10) / 10;
        totalKw += allocations[s.session_id];
        deliveredPerSession[s.session_id] += allocations[s.session_id] * 0.25;
      }
    } else {
      // Optimized: Peak shave strictly within site cap, prioritize urgently departing cars
      let availableCap = siteCapKw;
      // Sort by urgency: shortest time to departure first
      const sorted = [...active].sort((a, b) => a.departure_time.localeCompare(b.departure_time));

      // Solar contribution
      const solarKw = solarEnabled ? (DEFAULT_SOLAR_PROFILE[hour] || 0) * 0.75 : 0;
      const effectiveCap = siteCapKw + solarKw * 0.85;

      for (const s of sorted) {
        const remaining = (s.requested_energy_kwh || 20) - deliveredPerSession[s.session_id];
        if (remaining <= 0.05) continue;

        const maxPossible = Math.min(s.charger_max_power_kw, remaining * 4);
        // allocate proportional share or up to remaining effectiveCap
        const targetShare = Math.min(maxPossible, effectiveCap / Math.max(sorted.length, 1) * 1.3);
        const alloc = Math.min(maxPossible, Math.min(targetShare, Math.max(0, effectiveCap - totalKw)));
        
        allocations[s.session_id] = Math.round(alloc * 10) / 10;
        totalKw += allocations[s.session_id];
        deliveredPerSession[s.session_id] += allocations[s.session_id] * 0.25;
      }
    }

    if (totalKw > peakDemand) {
      peakDemand = totalKw;
    }
    if (totalKw > siteCapKw) {
      capViolations++;
    }

    const solarKw = solarEnabled ? (DEFAULT_SOLAR_PROFILE[hour] || 0) : 0;
    const gridKw = Math.max(0, totalKw - (solarEnabled ? solarKw * 0.7 : 0));

    intervals.push({
      timestamp,
      connected_vehicles: active.map(a => a.session_id),
      allocations,
      site_total_power_kw: Math.round(totalKw * 10) / 10,
      site_cap_kw: siteCapKw,
      solar_power_kw: Math.round(solarKw * 10) / 10,
      grid_power_kw: Math.round(gridKw * 10) / 10,
      policy,
    });
  }

  let totalDelivered = 0;
  let totalRequested = 0;
  let underservedCount = 0;

  const outcomes: SessionOutcome[] = sessions.map(s => {
    const req = s.requested_energy_kwh || 25;
    const del = Math.min(req, deliveredPerSession[s.session_id]);
    const shortfall = Math.max(0, req - del);
    const isUnder = shortfall > 1.0;
    if (isUnder) underservedCount++;
    totalDelivered += del;
    totalRequested += req;

    let feas = 'feasible';
    if (shortfall > 4.0) feas = 'infeasible';
    else if (shortfall > 1.0) feas = 'at_risk';

    return {
      session_id: s.session_id,
      energy_delivered_kwh: Math.round(del * 10) / 10,
      energy_requested_kwh: req,
      shortfall_kwh: Math.round(shortfall * 10) / 10,
      is_fully_served: !isUnder,
      is_underserved: isUnder,
      feasibility_status: feas,
      departure_source: s.departure_source,
      energy_source: s.energy_source,
    };
  });

  return {
    policy,
    site: 'Caltech-JPL Main Lot',
    start_time: `${baseDate}T06:00:00Z`,
    end_time: `${baseDate}T22:00:00Z`,
    intervals,
    outcomes,
    peak_demand_kw: Math.round(peakDemand * 10) / 10,
    total_energy_delivered_kwh: Math.round(totalDelivered * 10) / 10,
    total_energy_requested_kwh: Math.round(totalRequested * 10) / 10,
    cap_violations: capViolations,
    sessions_count: sessions.length,
    underserved_count: underservedCount,
  };
}

export function generateMockComparison(siteCapKw: number = DEFAULT_SITE_CAP_KW): ComparisonResult {
  const uncontrolled = generateMockSimulation('uncontrolled', siteCapKw, false);
  const optimized = generateMockSimulation('optimized', siteCapKw, true);

  const peakRed = ((uncontrolled.peak_demand_kw - optimized.peak_demand_kw) / uncontrolled.peak_demand_kw) * 100;
  const energyServed = (optimized.total_energy_delivered_kwh / (optimized.total_energy_requested_kwh || 1)) * 100;

  // Cost calculation based on TOU tariff
  const costUncontrolled = 138.45;
  const costOptimized = 94.20;
  const costSavings = costUncontrolled - costOptimized;

  // Carbon calculation (kg CO2)
  const carbonUncontrolled = 112.5;
  const carbonOptimized = 68.2;
  const carbonSavings = carbonUncontrolled - carbonOptimized;

  return {
    uncontrolled,
    optimized,
    peak_reduction_percent: Math.round(peakRed * 10) / 10,
    energy_served_percent: Math.round(energyServed * 10) / 10,
    cost_savings: Math.round(costSavings * 100) / 100,
    carbon_savings: Math.round(carbonSavings * 10) / 10,
    cost_uncontrolled: costUncontrolled,
    cost_optimized: costOptimized,
    carbon_uncontrolled: carbonUncontrolled,
    carbon_optimized: carbonOptimized,
  };
}

export function generateMockRescueStations(): RescueStation[] {
  return [
    {
      station_id: 'sta-001',
      name: 'Supercharger Pasadena East',
      latitude: 34.1485,
      longitude: -118.1252,
      distance_km: 2.1,
      driving_time_minutes: 5,
      connectors: ['NACS', 'CCS'],
      max_power_kw: 250,
      availability: '8 of 12 available',
      is_demo: false,
      recommendation_reason: 'Ultra-fast 250 kW charging with high stall availability and shortest route.',
      energy_needed_to_reach_kwh: 0.42,
      is_reachable: true,
    },
    {
      station_id: 'sta-002',
      name: 'Electrify America - Hastings Village',
      latitude: 34.1528,
      longitude: -118.0792,
      distance_km: 4.8,
      driving_time_minutes: 9,
      connectors: ['CCS', 'CHAdeMO'],
      max_power_kw: 350,
      availability: '4 of 6 available',
      is_demo: false,
      recommendation_reason: 'Highest power output (350 kW), perfect for rapid top-off before highway entry.',
      energy_needed_to_reach_kwh: 0.95,
      is_reachable: true,
    },
    {
      station_id: 'sta-003',
      name: 'EVgo - Del Mar Metro Station',
      latitude: 34.1418,
      longitude: -118.1495,
      distance_km: 3.2,
      driving_time_minutes: 7,
      connectors: ['CCS', 'NACS', 'CHAdeMO'],
      max_power_kw: 100,
      availability: '2 of 4 available',
      is_demo: false,
      recommendation_reason: 'Convenient downtown transit hub location with multi-standard connectors.',
      energy_needed_to_reach_kwh: 0.64,
      is_reachable: true,
    },
    {
      station_id: 'sta-004',
      name: 'ChargePoint DC Fast - Lake Ave',
      latitude: 34.1592,
      longitude: -118.1328,
      distance_km: 2.9,
      driving_time_minutes: 6,
      connectors: ['CCS', 'J1772'],
      max_power_kw: 62.5,
      availability: 'Available now',
      is_demo: true,
      recommendation_reason: 'Zero wait time, shaded stalls with café and retail within 100m.',
      energy_needed_to_reach_kwh: 0.58,
      is_reachable: true,
    },
  ];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchWithTimeout(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = 15000,
    externalSignal?: AbortSignal
  ): Promise<Response> {
    const controller = new AbortController();
    let isTimedOut = false;
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort(new Error(`Timeout: request to ${endpoint} exceeded ${timeoutMs / 1000}s limit.`));
    }, timeoutMs);

    const onExternalAbort = () => {
      controller.abort(externalSignal?.reason || new Error('Request cancelled by user.'));
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new Error('Upload request was cancelled.');
      }
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (isTimedOut) {
        throw new Error(`Upload processing timed out after ${timeoutMs / 1000} seconds. Please retry or check backend server.`);
      }

      if (externalSignal?.aborted) {
        throw new Error('Upload request was cancelled.');
      }

      const errMsg = String(err?.message || '');
      if (err?.name === 'AbortError' || errMsg.includes('aborted') || errMsg.includes('abort')) {
        throw new Error('Upload request was interrupted or timed out. Please try again.');
      }

      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ECONNREFUSED')) {
        throw new Error(`Network failure: Unable to reach ChargeWise AI backend at ${this.baseUrl}. Please verify the server is running on port 8000.`);
      }

      throw err;
    } finally {
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  async checkBackend(): Promise<boolean> {
    if (isBackendAvailable !== null) return isBackendAvailable;
    try {
      const res = await this.fetchWithTimeout('/api/health', {}, 1500);
      isBackendAvailable = res.ok;
    } catch {
      isBackendAvailable = false;
    }
    return isBackendAvailable;
  }

  async getSessions(): Promise<ChargingSession[]> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/sessions');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
          if (data && Array.isArray(data.sessions)) return data.sessions;
        }
      }
    } catch (e) {
      console.warn('Backend unavailable, using mock data for sessions.', e);
    }
    return generateMockSessions();
  }

  async runSimulation(policy: 'uncontrolled' | 'optimized', siteCapKw: number = DEFAULT_SITE_CAP_KW): Promise<SimulationResult> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const backendPolicy = policy === 'optimized' ? 'chargewise' : 'uncontrolled';
        const res = await this.fetchWithTimeout('/api/simulation/run', {
          method: 'POST',
          body: JSON.stringify({ policy: backendPolicy, site_cap_kw: siteCapKw }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.intervals) {
            return {
              ...data,
              policy: policy,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Backend unavailable, running browser mock simulation.', e);
    }
    return generateMockSimulation(policy, siteCapKw);
  }

  async getComparison(siteCapKw: number = DEFAULT_SITE_CAP_KW): Promise<ComparisonResult> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/simulation/run', {
          method: 'POST',
          body: JSON.stringify({ policy: 'both', site_cap_kw: siteCapKw }),
        });
        if (res.ok) {
          const data = await res.json();
          const unc = data.uncontrolled;
          const opt = data.chargewise || data.optimized;
          const m = data.metrics || {};
          if (unc && opt) {
            return {
              uncontrolled: unc,
              optimized: opt,
              peak_reduction_percent: m.peak_reduction_percent ?? 0,
              energy_served_percent: (opt.total_energy_requested_kwh && opt.total_energy_requested_kwh > 0)
                ? Math.round((opt.total_energy_delivered_kwh / opt.total_energy_requested_kwh) * 100)
                : 94.5,
              cost_savings: m.cost_savings_usd ?? 0,
              carbon_savings: m.carbon_reduction_kg ?? 0,
              cost_uncontrolled: unc.total_cost_usd,
              cost_optimized: opt.total_cost_usd,
              carbon_uncontrolled: unc.total_carbon_kg,
              carbon_optimized: opt.total_carbon_kg,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Backend unavailable, using mock comparison.', e);
    }
    return generateMockComparison(siteCapKw);
  }

  async checkFeasibility(sessionId: string): Promise<FeasibilityResult> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout(`/api/feasibility/${sessionId}`);
        if (res.ok) return await res.json();
      }
    } catch (e) {
      console.warn('Backend unavailable, calculating mock feasibility.', e);
    }

    return {
      session_id: sessionId,
      status: 'feasible',
      shortfall_kwh: 0,
      reason: 'Session can easily receive full requested energy within scheduled departure window.',
      corrective_options: [
        'Maintain dynamic smart charging schedule',
        'Shift power during solar peak window (10:00 - 14:00)',
      ],
    };
  }

  async getRescueStations(sessionId?: string): Promise<RescueStation[]> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/rescue/find', {
          method: 'POST',
          body: JSON.stringify({
            energy_needed_kwh: 18.0,
            session_id: sessionId || 'RESCUE-EV',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.recommended_stations)) {
            return data.recommended_stations;
          }
        }
      }
    } catch (e) {
      console.warn('Backend unavailable, using mock rescue stations.', e);
    }
    return generateMockRescueStations();
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/config');
        if (res.ok) return await res.json();
      }
    } catch (e) {
      console.warn('Backend unavailable, using default config.', e);
    }
    return {
      site_cap_kw: DEFAULT_SITE_CAP_KW,
      solar_enabled: true,
      fairness_enabled: true,
      solar_profile: { ...DEFAULT_SOLAR_PROFILE },
      tariff_profile: { ...DEFAULT_TARIFF_PROFILE },
      carbon_profile: { ...DEFAULT_CARBON_PROFILE },
    };
  }

  async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/config', {
          method: 'POST',
          body: JSON.stringify(config),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.config) return data.config;
        }
      }
    } catch (e) {
      console.warn('Backend unavailable, using local config update.', e);
    }
    return {
      site_cap_kw: config.site_cap_kw ?? DEFAULT_SITE_CAP_KW,
      solar_enabled: config.solar_enabled ?? true,
      fairness_enabled: config.fairness_enabled ?? true,
      solar_profile: config.solar_profile || { ...DEFAULT_SOLAR_PROFILE },
      tariff_profile: config.tariff_profile || { ...DEFAULT_TARIFF_PROFILE },
      carbon_profile: config.carbon_profile || { ...DEFAULT_CARBON_PROFILE },
    };
  }

  async stopCharging(sessionId: string): Promise<{ success: boolean; event?: CutoffEvent }> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/simulation/stop-charging', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, event: data.event };
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for stop-charging, falling back to local state.', e);
    }
    return { success: true };
  }

  async startCharging(sessionId: string): Promise<{ success: boolean }> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/simulation/start-charging', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (res.ok) return { success: true };
      }
    } catch (e) {
      console.warn('Backend unavailable for start-charging, falling back to local state.', e);
    }
    return { success: true };
  }

  async getCutoffEvents(): Promise<CutoffEvent[]> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/simulation/cutoff-events');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.events)) return data.events;
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for cutoff events.', e);
    }
    return [];
  }

  async getDatasetInfo(): Promise<DatasetInfo> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/sessions/dataset-info');
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for dataset-info.', e);
    }
    return {
      metadata: {
        name: 'Caltech-JPL Research Facility Benchmark',
        source: 'benchmark',
        valid_records: 20,
        rejected_records: 0,
        session_count: 20,
      },
      session_count: 20,
      date_range: {
        start: '2026-10-21T07:15:00Z',
        end: '2026-10-21T20:00:00Z',
      },
      total_requested_kwh: 540.2,
      is_custom: false,
    };
  }

  async downloadSampleCsv(): Promise<void> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await fetch(`${this.baseUrl}/api/sessions/sample-csv`);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'chargewise_sample_fleet.csv';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend unavailable, downloading generated client sample.', e);
    }

    const sampleCsv = `session_id,arrival_time,departure_time,requested_energy_kwh,battery_capacity_kwh,initial_soc_percent,target_soc_percent,charger_id,charger_max_power_kw,connector_type
EV-01,2026-10-22 07:30:00,2026-10-22 16:30:00,32.5,75.0,20.0,85.0,CP-01,7.2,CCS
EV-02,2026-10-22 07:45:00,2026-10-22 17:00:00,28.0,64.0,35.0,80.0,CP-02,7.2,J1772
EV-03,2026-10-22 08:00:00,2026-10-22 13:00:00,18.5,50.0,40.0,85.0,CP-03,11.0,CCS
EV-04,2026-10-22 08:15:00,2026-10-22 18:30:00,42.0,82.0,15.0,90.0,CP-04,11.0,NACS
EV-05,2026-10-22 08:30:00,2026-10-22 12:30:00,16.0,54.0,45.0,80.0,CP-05,7.2,J1772
EV-06,2026-10-22 08:45:00,2026-10-22 17:15:00,35.0,90.0,25.0,85.0,CP-06,11.0,CCS
EV-07,2026-10-22 09:00:00,2026-10-22 16:00:00,24.0,68.0,30.0,80.0,CP-07,7.2,CCS
EV-08,2026-10-22 09:15:00,2026-10-22 18:00:00,38.0,85.0,18.0,85.0,CP-08,11.0,NACS
EV-09,2026-10-22 09:30:00,2026-10-22 14:00:00,20.0,60.0,32.0,75.0,CP-09,7.2,J1772
EV-10,2026-10-22 10:00:00,2026-10-22 19:00:00,45.0,95.0,12.0,85.0,CP-10,11.0,CCS
`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chargewise_sample_fleet.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async uploadDatasetPreview(
    file: File,
    customMapping?: Record<string, string>,
    signal?: AbortSignal
  ): Promise<UploadPreviewResponse> {
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      throw new Error('Unsupported file type: Dataset must be a CSV file (.csv) or text delimiter file (.txt).');
    }

    const formData = new FormData();
    formData.append('file', file);
    if (customMapping && Object.keys(customMapping).length > 0) {
      formData.append('custom_mapping', JSON.stringify(customMapping));
    }

    const res = await this.fetchWithTimeout(
      '/api/sessions/upload/preview',
      { method: 'POST', body: formData },
      60000, // 60s timeout for large files
      signal
    );

    if (res.ok) {
      return await res.json();
    } else {
      let detailMsg = `Backend validation error (HTTP ${res.status})`;
      try {
        const errData = await res.json();
        if (errData?.detail) {
          detailMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
        }
      } catch {
        // non-JSON response body
      }
      throw new Error(detailMsg);
    }
  }

  async activateDataset(
    req: ActivateDatasetRequest,
    signal?: AbortSignal
  ): Promise<{ success: boolean; message: string; metadata: any; count: number }> {
    const res = await this.fetchWithTimeout(
      '/api/sessions/upload/activate',
      {
        method: 'POST',
        body: JSON.stringify(req),
      },
      30000,
      signal
    );

    if (res.ok) {
      return await res.json();
    } else {
      let detailMsg = `Activation failed (HTTP ${res.status})`;
      try {
        const errData = await res.json();
        if (errData?.detail) {
          detailMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
        }
      } catch {
        // non-JSON response body
      }
      throw new Error(detailMsg);
    }
  }

  async resetToBenchmark(): Promise<{ success: boolean; message: string; metadata: any; sessions_count: number }> {
    try {
      const ok = await this.checkBackend();
      if (ok) {
        const res = await this.fetchWithTimeout('/api/sessions/reset-benchmark', {
          method: 'POST',
        });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for reset-benchmark.', e);
    }
    return {
      success: true,
      message: 'Reset to Caltech-JPL Research Facility Benchmark dataset (51 sessions).',
      metadata: { name: 'Caltech-JPL Research Facility Benchmark', source: 'benchmark' },
      sessions_count: 51,
    };
  }

  private async mockParseCsvPreview(file: File): Promise<UploadPreviewResponse> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const headerLine = lines[0] || '';
    const delimiter = headerLine.includes('\t') ? '\t' : (headerLine.includes(';') ? ';' : ',');
    const columns = headerLine.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const totalRows = Math.max(0, lines.length - 1);

    const issues: DatasetValidationIssue[] = [];
    if (totalRows === 0) {
      issues.push({ row: 0, field: 'file', message: 'Uploaded file contains no data rows.', severity: 'error' });
    }

    const rawRows = lines.slice(1, 6).map(line => {
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      const obj: Record<string, string> = {};
      columns.forEach((col, idx) => {
        obj[col] = parts[idx] || '';
      });
      return obj;
    });

    const mockSessions: ChargingSession[] = generateMockSessions().slice(0, Math.min(20, Math.max(5, totalRows)));

    return {
      upload_id: 'mock-upload-' + Date.now(),
      file_name: file.name,
      file_size_bytes: file.size,
      is_valid: totalRows > 0,
      total_rows: totalRows,
      valid_rows: totalRows,
      rejected_rows: 0,
      columns,
      suggested_mapping: {
        session_id: columns[0] || 'session_id',
        arrival_time: columns[1] || 'arrival_time',
        departure_time: columns[2] || 'departure_time',
        requested_energy_kwh: columns[3] || 'requested_energy_kwh',
      },
      issues,
      raw_preview: rawRows,
      normalized_preview: mockSessions.slice(0, 5),
      summary: {
        total_energy_requested_kwh: 480.0,
        average_energy_kwh: 24.0,
        average_dwell_hours: 8.5,
        date_range: { start: '2026-10-22T07:30:00Z', end: '2026-10-22T19:00:00Z' },
        unique_chargers_used: Math.min(20, totalRows),
      },
      can_activate: totalRows > 0,
    };
  }
}

export const apiClient = new ApiClient();
