import React from 'react';
import { ActiveSession } from '../../api/types';
import { VehicleSlot } from './VehicleSlot';
import { Zap, Sun, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/formatting';

export interface ParkingLayoutProps {
  activeSessions: ActiveSession[];
  siteCapKw: number;
  totalPowerKw: number;
  solarPowerKw: number;
  selectedSessionId?: string | null;
  onSelectSession: (sessionId: string) => void;
  viewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
  className?: string;
}

export const ParkingLayout: React.FC<ParkingLayoutProps> = ({
  activeSessions,
  siteCapKw,
  totalPowerKw,
  solarPowerKw,
  selectedSessionId,
  onSelectSession,
  viewMode = '2d',
  onViewModeChange,
  className,
}) => {
  // 20 spots: Row 1 (CP-01 to CP-10), Row 2 (CP-11 to CP-20)
  // Backend demo sessions use CP-xx charger IDs
  const row1 = Array.from({ length: 10 }, (_, i) => {
    const chargerId = `CP-${String(i + 1).padStart(2, '0')}`;
    const session = activeSessions.find((s) => s.charger_id === chargerId);
    return { spotNumber: i + 1, chargerId, session };
  });

  const row2 = Array.from({ length: 10 }, (_, i) => {
    const spotNum = i + 11;
    const chargerId = `CP-${String(spotNum).padStart(2, '0')}`;
    const session = activeSessions.find((s) => s.charger_id === chargerId);
    return { spotNumber: spotNum, chargerId, session };
  });

  return (
    <div className={cn('p-5 rounded-2xl bg-[#111A22] border border-[#253441] shadow-xl space-y-4', className)}>
      {/* Top Header Bar inside the parking facility */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#253441]/70">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#EAF5FA] tracking-wide">
              Caltech-JPL Intelligent Charging Facility
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#20E3FF]/10 text-[#20E3FF] border border-[#20E3FF]/30">
              LIVE DIGITAL TWIN
            </span>
            {onViewModeChange && (
              <div className="flex items-center bg-[#080D12] rounded-lg p-0.5 border border-[#253441] text-xs font-medium ml-2 font-mono">
                <button
                  type="button"
                  onClick={() => onViewModeChange('3d')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-all ${
                    viewMode === '3d'
                      ? 'bg-[#20E3FF] text-[#080D12] font-bold shadow-[0_0_10px_rgba(32,227,255,0.3)]'
                      : 'text-[#91A5B3] hover:text-[#EAF5FA]'
                  }`}
                >
                  3D Campus
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('2d')}
                  className={`px-2.5 py-1 rounded text-[11px] transition-all ${
                    viewMode === '2d'
                      ? 'bg-[#20E3FF] text-[#080D12] font-bold shadow-[0_0_10px_rgba(32,227,255,0.3)]'
                      : 'text-[#91A5B3] hover:text-[#EAF5FA]'
                  }`}
                >
                  2D Map
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-[#91A5B3] mt-0.5 font-mono">
            20 Bi-directional Dual-Port Level 2 & Fast DC Terminals
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#20E3FF] animate-pulse" />
            <span className="text-[#EAF5FA]">Charging</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7CFF6B]" />
            <span className="text-[#EAF5FA]">Target Reached</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span className="text-[#EAF5FA]">Auto Cutoff</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D6B3]" />
            <span className="text-[#EAF5FA]">Queued</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <span className="text-[#EAF5FA]">Emergency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#253441]" />
            <span className="text-[#91A5B3]">Available</span>
          </div>
        </div>
      </div>

      {/* Facility Visual Layout: Driving Lane & 2 Rows */}
      <div className="p-4 rounded-xl bg-[#080D12] border border-[#253441] space-y-4">
        {/* Row 1 (North Bays) */}
        <div>
          <div className="text-[10px] font-mono text-[#91A5B3] uppercase tracking-widest mb-1.5 flex items-center justify-between">
            <span>North Parking Bays (CP-01 — CP-10)</span>
            <span className="text-[#20E3FF] font-semibold">6.6–11.0 kW / Port</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {row1.map((item) => (
              <VehicleSlot
                key={item.chargerId}
                chargerId={item.chargerId}
                spotNumber={item.spotNumber}
                session={item.session}
                isSelected={selectedSessionId === item.session?.session_id}
                onSelect={() => item.session && onSelectSession(item.session.session_id)}
              />
            ))}
          </div>
        </div>

        {/* Central Driveway / Driving Lane */}
        <div className="relative py-2.5 px-4 bg-[#0B1724]/60 border-y border-dashed border-[#253441] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-[#91A5B3]">
            <span className="tracking-widest">◀ ONE WAY ENTRY</span>
            <span>━━━━━</span>
            <span>FACILITY ACCESS LANE</span>
            <span>━━━━━</span>
            <span className="tracking-widest">EXIT ONLY ▶</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-[#20E3FF] font-mono text-[11px]">
              <Zap className="w-3.5 h-3.5" />
              <span>Smart Bus: Active</span>
            </div>
          </div>
        </div>

        {/* Row 2 (South Bays) */}
        <div>
          <div className="text-[10px] font-mono text-[#91A5B3] uppercase tracking-widest mb-1.5 flex items-center justify-between">
            <span>South Parking Bays (CP-11 — CP-20)</span>
            <span className="text-[#20E3FF] font-semibold">6.6–11.0 kW / Port</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {row2.map((item) => (
              <VehicleSlot
                key={item.chargerId}
                chargerId={item.chargerId}
                spotNumber={item.spotNumber}
                session={item.session}
                isSelected={selectedSessionId === item.session?.session_id}
                onSelect={() => item.session && onSelectSession(item.session.session_id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

