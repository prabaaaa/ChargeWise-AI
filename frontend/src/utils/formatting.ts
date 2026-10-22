import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPower(kw: number | null | undefined): string {
  if (kw === null || kw === undefined || isNaN(kw)) return '0.0 kW';
  return `${kw.toFixed(1)} kW`;
}

export function formatEnergy(kwh: number | null | undefined): string {
  if (kwh === null || kwh === undefined || isNaN(kwh)) return '0.0 kWh';
  return `${kwh.toFixed(1)} kWh`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
}

export function formatCurrency(dollars: number | null | undefined): string {
  if (dollars === null || dollars === undefined || isNaN(dollars)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function formatCarbon(gramsOrKg: number | null | undefined): string {
  if (gramsOrKg === null || gramsOrKg === undefined || isNaN(gramsOrKg)) return '0 kg CO₂';
  if (gramsOrKg >= 1000) {
    return `${(gramsOrKg / 1000).toFixed(2)} t CO₂`;
  }
  return `${gramsOrKg.toFixed(1)} kg CO₂`;
}

export function formatTime(isoOrDateString: string | null | undefined): string {
  if (!isoOrDateString) return '--:--';
  try {
    const date = new Date(isoOrDateString);
    if (isNaN(date.getTime())) {
      // If it's already HH:MM or similar
      return isoOrDateString.slice(11, 16) || isoOrDateString;
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return isoOrDateString;
  }
}

export function formatDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
