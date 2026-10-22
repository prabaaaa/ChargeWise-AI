export interface ChargingSession {
  session_id: string;
  site: string;
  arrival_time: string;
  departure_time: string;
  requested_energy_kwh: number | null;
  observed_energy_kwh: number | null;
  charger_id: string;
  charger_max_power_kw: number;
  battery_capacity_kwh: number | null;
  initial_soc_percent: number | null;
  target_soc_percent: number | null;
  connector_type: string | null;
  energy_source: string;
  departure_source: string;
  is_synthetic: boolean;
  effective_energy_target_kwh?: number | null;
  is_emergency?: boolean;
  is_manually_stopped?: boolean;
}

export interface CutoffEvent {
  session_id: string;
  charger_id: string;
  timestamp: string;
  reason: string;
  final_energy_delivered_kwh: number;
  target_energy_kwh: number | null;
  target_achieved: boolean;
  final_soc_percent: number | null;
  message: string;
}

export interface SimulationInterval {
  timestamp: string;
  connected_vehicles: string[];
  allocations: Record<string, number>;
  session_statuses?: Record<string, string>;
  cutoff_events?: CutoffEvent[];
  site_total_power_kw: number;
  site_cap_kw: number;
  solar_power_kw: number;
  grid_power_kw: number;
  policy: string;
}

export interface SessionOutcome {
  session_id: string;
  energy_delivered_kwh: number;
  energy_requested_kwh: number | null;
  shortfall_kwh: number | null;
  is_fully_served: boolean | null;
  is_underserved: boolean | null;
  feasibility_status: string;
  departure_source: string;
  energy_source: string;
  cutoff_reason?: string | null;
  cutoff_timestamp?: string | null;
  target_achieved?: boolean | null;
  status_label?: string;
}

export interface SimulationResult {
  policy: string;
  site: string;
  start_time: string;
  end_time: string;
  intervals: SimulationInterval[];
  outcomes: SessionOutcome[];
  cutoff_events?: CutoffEvent[];
  peak_demand_kw: number;
  total_energy_delivered_kwh: number;
  total_energy_requested_kwh: number | null;
  cap_violations: number;
  sessions_count: number;
  underserved_count: number;
}

export interface ComparisonResult {
  uncontrolled: SimulationResult;
  optimized: SimulationResult;
  peak_reduction_percent: number;
  energy_served_percent: number | null;
  cost_savings: number | null;
  carbon_savings: number | null;
  cost_uncontrolled: number | null;
  cost_optimized: number | null;
  carbon_uncontrolled: number | null;
  carbon_optimized: number | null;
}

export interface FeasibilityResult {
  session_id: string;
  status: string;
  shortfall_kwh: number | null;
  reason: string;
  corrective_options: string[];
}

export interface RescueStation {
  station_id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  driving_time_minutes: number | null;
  connectors: string[];
  max_power_kw: number;
  availability: string;
  is_demo: boolean;
  recommendation_reason: string;
  energy_needed_to_reach_kwh: number | null;
  is_reachable: boolean | null;
}

export interface SimulationState {
  is_running: boolean;
  current_time: string;
  current_interval: number;
  total_intervals: number;
  site_cap_kw: number;
  policy: string;
  connected_count: number;
  active_sessions: ActiveSession[];
  cutoff_events?: CutoffEvent[];
  stopped_sessions?: string[];
}

export interface ActiveSession {
  session_id: string;
  charger_id: string;
  arrival_time: string;
  departure_time: string;
  energy_delivered_kwh: number;
  energy_requested_kwh: number | null;
  allocated_power_kw: number;
  priority_score: number | null;
  feasibility_status: string;
  remaining_energy_kwh: number | null;
  departure_source: string;
  is_emergency: boolean;
  is_manually_stopped?: boolean;
  cutoff_status?: string; // 'CHARGING' | 'TARGET REACHED' | 'AUTO CUTOFF' | 'COMPLETED' | 'INCOMPLETE' | 'QUEUED'
  cutoff_reason?: string | null;
  target_soc_percent?: number | null;
  effective_energy_target_kwh?: number | null;
  initial_soc_percent: number | null;
  battery_capacity_kwh: number | null;
  laxity_hours?: number | null;
  urgency_score?: number | null;
  charger_max_power_kw?: number;
}

export interface AppConfig {
  site_cap_kw: number;
  solar_enabled: boolean;
  fairness_enabled: boolean;
  solar_profile: Record<number, number>;
  tariff_profile: Record<number, number>;
  carbon_profile: Record<number, number>;
}

export interface DatasetValidationIssue {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DatasetSummary {
  total_energy_requested_kwh: number;
  average_energy_kwh: number;
  average_dwell_hours: number;
  date_range: {
    start: string | null;
    end: string | null;
  };
  unique_chargers_used: number;
}

export interface UploadPreviewResponse {
  upload_id: string;
  file_name: string;
  file_size_bytes: number;
  is_valid: boolean;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  columns: string[];
  suggested_mapping: Record<string, string>;
  issues: DatasetValidationIssue[];
  raw_preview: Record<string, any>[];
  normalized_preview: ChargingSession[];
  summary: DatasetSummary;
  can_activate: boolean;
}

export interface DatasetInfo {
  metadata: {
    name?: string;
    file_name?: string;
    source?: string;
    activation_time?: string;
    valid_records?: number;
    rejected_records?: number;
    session_count?: number;
    summary?: DatasetSummary;
    [key: string]: any;
  };
  session_count: number;
  date_range: {
    start: string;
    end: string;
  } | null;
  total_requested_kwh: number;
  is_custom: boolean;
}

export interface ActivateDatasetRequest {
  upload_id: string;
  custom_mapping?: Record<string, string>;
  dataset_name?: string;
  site_cap_kw?: number;
}
