import React from 'react';
import { RescueStation } from '../../api/types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Navigation,
  Zap,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../utils/formatting';

export interface StationCardProps {
  station: RescueStation;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  isSelected,
  onSelect,
  className,
}) => {
  const isAvailable = station.availability.toLowerCase().includes('available');
  const isReachable = station.is_reachable !== false;

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      onClick={onSelect}
      className={cn(
        'cursor-pointer transition-all border-[#253441] bg-[#111A22] hover:border-[#20E3FF]/50 p-4 space-y-3',
        isSelected && 'border-[#20E3FF] bg-[#172330] ring-1 ring-[#20E3FF]/50 shadow-[0_0_15px_rgba(32,227,255,0.15)]',
        !isReachable && 'border-[#EF4444]/40 bg-[#EF4444]/10',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[#EAF5FA] tracking-wide">{station.name}</h4>
            {station.is_demo && (
              <Badge variant="neutral" className="text-[9px] py-0 px-1.5 font-mono">
                DEMO
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#91A5B3]">
            <span className="flex items-center gap-1 font-mono">
              <MapPin className="w-3.5 h-3.5 text-[#20E3FF]" />
              {station.distance_km} km away
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-[#91A5B3]" />
              ~{station.driving_time_minutes ?? 5} min drive
            </span>
          </div>
        </div>

        <Badge
          variant={isAvailable ? 'success' : 'warning'}
          dot
          className="text-[10px] shrink-0 font-mono"
        >
          {station.availability}
        </Badge>
      </div>

      {/* Charging Specs */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#20E3FF]/15 text-[#20E3FF] border border-[#20E3FF]/30 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {station.max_power_kw} kW Max
        </span>

        {station.connectors.map((c) => (
          <span
            key={c}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#080D12] text-[#91A5B3] border border-[#253441]"
          >
            {c}
          </span>
        ))}
      </div>

      {/* Recommendation reason */}
      <div className="p-2.5 rounded-lg bg-[#080D12] border border-[#253441] text-xs text-[#EAF5FA] flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-[#00D6B3] shrink-0 mt-0.5" />
        <p className="leading-snug text-[11px]">{station.recommendation_reason}</p>
      </div>

      {!isReachable && (
        <div className="flex items-center gap-1.5 text-xs text-[#EF4444] bg-[#EF4444]/15 p-2 rounded-lg border border-[#EF4444]/40">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Warning: EV remaining battery may be critically low to guarantee reaching this station.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-[#91A5B3]">
          Transit energy: ~{station.energy_needed_to_reach_kwh?.toFixed(2) ?? '0.50'} kWh
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDirections}
          className="text-xs h-7 px-2.5 gap-1.5 border-[#20E3FF]/40 text-[#20E3FF] hover:bg-[#20E3FF]/10 font-mono"
        >
          <Navigation className="w-3 h-3" />
          Directions
          <ExternalLink className="w-3 h-3 opacity-60" />
        </Button>
      </div>
    </Card>
  );
};

