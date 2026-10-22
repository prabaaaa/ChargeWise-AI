import React from 'react';
import { ActiveSession } from '../../api/types';
import { Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../utils/formatting';

export interface VehicleSlotProps {
  chargerId: string;
  spotNumber: number;
  session?: ActiveSession | null;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const VehicleSlot: React.FC<VehicleSlotProps> = ({
  chargerId,
  spotNumber,
  session,
  isSelected,
  onSelect,
}) => {
  const isOccupied = !!session;
  const isEmergency = session?.is_emergency;
  const isCharging = (session?.allocated_power_kw || 0) > 0.1;
  const isTargetReached = session?.cutoff_status === 'TARGET REACHED' || (session && (session.remaining_energy_kwh ?? 10) <= 0.05);
  const isAutoCutoff = session?.cutoff_status === 'AUTO CUTOFF' || session?.is_manually_stopped;
  const isCompleted = session?.cutoff_status === 'COMPLETED';
  const isIncomplete = session?.cutoff_status === 'INCOMPLETE';
  const isWaiting = isOccupied && !isCharging && !isTargetReached && !isAutoCutoff && !isCompleted && !isIncomplete;

  let statusColor = 'border-[#253441] bg-[#080D12]/40 text-[#91A5B3]';
  let badgeColor = 'bg-[#172330] text-[#91A5B3]';
  let statusText = 'AVAILABLE';

  if (!isOccupied) {
    statusColor = 'border-[#253441]/60 bg-[#080D12]/30 text-[#91A5B3]';
    badgeColor = 'bg-[#172330]/70 text-[#91A5B3]';
    statusText = 'AVAILABLE';
  } else if (isEmergency) {
    statusColor = 'border-[#EF4444] bg-[#EF4444]/15 text-[#EF4444] animate-pulse';
    badgeColor = 'bg-[#EF4444] text-[#EAF5FA] font-bold';
    statusText = 'EMERGENCY';
  } else if (isAutoCutoff) {
    statusColor = 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]';
    badgeColor = 'bg-[#F59E0B] text-[#080D12] font-bold';
    statusText = 'AUTO CUTOFF';
  } else if (isTargetReached) {
    statusColor = 'border-[#7CFF6B] bg-[#7CFF6B]/10 text-[#7CFF6B] shadow-[0_0_12px_rgba(124,255,107,0.15)]';
    badgeColor = 'bg-[#7CFF6B] text-[#080D12] font-bold';
    statusText = 'TARGET REACHED';
  } else if (isCompleted) {
    statusColor = 'border-[#7CFF6B]/60 bg-[#7CFF6B]/10 text-[#7CFF6B]';
    badgeColor = 'bg-[#7CFF6B] text-[#080D12] font-bold';
    statusText = 'COMPLETED';
  } else if (isIncomplete) {
    statusColor = 'border-[#EF4444]/60 bg-[#EF4444]/10 text-[#EF4444]';
    badgeColor = 'bg-[#EF4444] text-[#EAF5FA] font-bold';
    statusText = 'INCOMPLETE';
  } else if (isCharging && session) {
    statusColor = 'border-[#20E3FF] bg-[#20E3FF]/10 text-[#20E3FF] shadow-[0_0_15px_rgba(32,227,255,0.2)]';
    badgeColor = 'bg-[#20E3FF] text-[#080D12] font-bold';
    statusText = `${session.allocated_power_kw.toFixed(1)} kW`;
  } else if (isWaiting) {
    statusColor = 'border-[#00D6B3]/40 bg-[#0B1724] text-[#00D6B3]';
    badgeColor = 'bg-[#080D12] text-[#00D6B3] border border-[#00D6B3]/40';
    statusText = 'QUEUED';
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative flex flex-col justify-between p-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none group',
        statusColor,
        isSelected && 'ring-2 ring-[#20E3FF] ring-offset-2 ring-offset-[#080D12] scale-105 z-10 shadow-xl'
      )}
    >
      {/* Top Header: Charger ID & Spot Number */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="font-bold text-gray-200">{chargerId}</span>
        <span className="text-[10px] text-gray-400">#{spotNumber}</span>
      </div>

      {/* Center: Vehicle Visual or Empty Indicator */}
      <div className="py-2 flex flex-col items-center justify-center min-h-[58px]">
        {isOccupied ? (
          <div className="relative flex flex-col items-center">
            {/* Minimalist EV SVG silhouette */}
            <svg
              className={cn(
                'w-10 h-7 transition-transform group-hover:scale-110',
                isEmergency
                  ? 'text-red-400'
                  : isAutoCutoff
                  ? 'text-amber-400'
                  : isTargetReached || isCompleted
                  ? 'text-emerald-400'
                  : isIncomplete
                  ? 'text-red-400'
                  : isCharging
                  ? 'text-teal-400'
                  : 'text-cyan-400'
              )}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>

            {/* Status indicator badge */}
            {isCharging && (
              <div className="absolute -top-1.5 -right-2 p-0.5 rounded-full bg-teal-400 text-navy-900 animate-bounce" title="Charging Active">
                <Zap className="w-2.5 h-2.5 fill-current" />
              </div>
            )}
            {isEmergency && (
              <div className="absolute -top-1.5 -right-2 p-0.5 rounded-full bg-red-500 text-white animate-pulse" title="Emergency Priority">
                <AlertTriangle className="w-2.5 h-2.5" />
              </div>
            )}
            {(isTargetReached || isCompleted) && (
              <div className="absolute -top-1.5 -right-2 p-0.5 rounded-full bg-emerald-500 text-navy-900" title="Target Energy Met - Cutoff">
                <CheckCircle className="w-2.5 h-2.5" />
              </div>
            )}
            {isAutoCutoff && (
              <div className="absolute -top-1.5 -right-2 p-0.5 rounded-full bg-amber-500 text-navy-900" title="Cutoff - Power 0.0 kW">
                <Clock className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 font-mono tracking-wider flex items-center gap-1">
            <span>EMPTY</span>
          </div>
        )}
      </div>

      {/* Bottom Status / Power Tag */}
      <div className="flex items-center justify-center">
        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono font-medium truncate max-w-full', badgeColor)}>
          {statusText}
        </span>
      </div>
    </div>
  );
};
