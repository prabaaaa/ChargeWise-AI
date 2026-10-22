export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export const SIMULATION_SPEEDS = [1, 2, 5, 10] as const;

export const DEFAULT_SITE_CAP_KW = 45;

export const SITE_CAP_PRESETS = [20, 30, 45, 60] as const;

export const VEHICLE_COLORS: Record<string, string> = {
  active: '#20E3FF',       // electric cyan
  waiting: '#00D6B3',      // voltage teal
  completed: '#7CFF6B',    // energy green
  emergency: '#EF4444',    // controlled red
  empty: '#253441',        // metallic slate
  underserved: '#F59E0B',  // warm amber
};

export const STATUS_COLORS = {
  feasible: {
    bg: 'bg-[#7CFF6B]/15',
    border: 'border-[#7CFF6B]/40',
    text: 'text-[#7CFF6B]',
    dot: 'bg-[#7CFF6B]',
    label: 'Feasible',
  },
  at_risk: {
    bg: 'bg-[#F59E0B]/15',
    border: 'border-[#F59E0B]/40',
    text: 'text-[#F59E0B]',
    dot: 'bg-[#F59E0B]',
    label: 'At Risk',
  },
  infeasible: {
    bg: 'bg-[#EF4444]/15',
    border: 'border-[#EF4444]/40',
    text: 'text-[#EF4444]',
    dot: 'bg-[#EF4444]',
    label: 'Infeasible',
  },
  completed: {
    bg: 'bg-[#00D6B3]/15',
    border: 'border-[#00D6B3]/40',
    text: 'text-[#00D6B3]',
    dot: 'bg-[#00D6B3]',
    label: 'Completed',
  },
} as const;

export const DEFAULT_TARIFF_PROFILE: Record<number, number> = {
  0: 0.12, 1: 0.12, 2: 0.12, 3: 0.12, 4: 0.12, 5: 0.14,
  6: 0.18, 7: 0.24, 8: 0.28, 9: 0.32, 10: 0.32, 11: 0.30,
  12: 0.28, 13: 0.28, 14: 0.30, 15: 0.34, 16: 0.42, 17: 0.48,
  18: 0.46, 19: 0.38, 20: 0.28, 21: 0.22, 22: 0.16, 23: 0.14
};

export const DEFAULT_SOLAR_PROFILE: Record<number, number> = {
  0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  6: 2.1, 7: 6.8, 8: 14.5, 9: 22.0, 10: 28.5, 11: 32.4,
  12: 34.0, 13: 33.2, 14: 29.8, 15: 23.4, 16: 15.2, 17: 7.1,
  18: 1.5, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0
};

export const DEFAULT_CARBON_PROFILE: Record<number, number> = {
  0: 220, 1: 215, 2: 210, 3: 208, 4: 215, 5: 235,
  6: 270, 7: 310, 8: 340, 9: 300, 10: 260, 11: 220,
  12: 190, 13: 185, 14: 200, 15: 240, 16: 310, 17: 380,
  18: 410, 19: 390, 20: 340, 21: 290, 22: 260, 23: 240
};
