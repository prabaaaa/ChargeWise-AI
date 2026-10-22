import React, { useMemo } from 'react';
import { ChargingSession, SimulationInterval, ActiveSession } from '../../api/types';
import { formatTime, formatDuration } from '../../utils/formatting';
import { cn } from '../../utils/formatting';
import { Zap, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export interface SessionTimelineProps {
  sessions: ChargingSession[];
  currentTime?: string;
  intervals?: SimulationInterval[];
  activeSessions?: ActiveSession[];
  onSelectSession?: (sessionId: string) => void;
  selectedSessionId?: string | null;
}

export const SessionTimeline: React.FC<SessionTimelineProps> = ({
  sessions,
  currentTime,
  intervals = [],
  activeSessions = [],
  onSelectSession,
  selectedSessionId,
}) => {
  // 1. Calculate Authoritative Time Bounds from Dataset Sessions & Sim Clock
  const { minMs, maxMs, totalMs, ticks } = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      const now = currentTime ? new Date(currentTime).getTime() : Date.now();
      const start = now - 4 * 3600000;
      const end = now + 12 * 3600000;
      return { minMs: start, maxMs: end, totalMs: end - start, ticks: [] };
    }

    let min = Infinity;
    let max = -Infinity;

    sessions.forEach((s) => {
      const arr = new Date(s.arrival_time).getTime();
      const dep = new Date(s.departure_time).getTime();
      if (!isNaN(arr) && arr < min) min = arr;
      if (!isNaN(dep) && dep > max) max = dep;
    });

    if (currentTime) {
      const cur = new Date(currentTime).getTime();
      if (!isNaN(cur)) {
        if (cur < min) min = cur;
        if (cur > max) max = cur;
      }
    }

    // Fallback if timestamps are invalid
    if (min === Infinity || max === -Infinity || min >= max) {
      min = Date.now();
      max = min + 12 * 3600000;
    }

    // Pad bounds to nearest round hour
    const padMin = new Date(min);
    padMin.setMinutes(0, 0, 0);
    const startMs = padMin.getTime();

    const padMax = new Date(max);
    padMax.setHours(padMax.getHours() + 1);
    padMax.setMinutes(0, 0, 0);
    const endMs = Math.max(startMs + 4 * 3600000, padMax.getTime());

    const spanMs = endMs - startMs;

    // Generate intelligent hour tick marks (every 2h or 3h depending on total span)
    const tickIntervalHours = spanMs > 36 * 3600000 ? 6 : spanMs > 18 * 3600000 ? 3 : 2;
    const tickIntervalMs = tickIntervalHours * 3600000;

    const tickList: { label: string; pct: number }[] = [];
    let curTick = startMs;
    while (curTick <= endMs) {
      const pct = ((curTick - startMs) / spanMs) * 100;
      const d = new Date(curTick);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      tickList.push({ label: `${hours}:${mins}`, pct });
      curTick += tickIntervalMs;
    }

    return { minMs: startMs, maxMs: endMs, totalMs: spanMs, ticks: tickList };
  }, [sessions, currentTime]);

  // Convert an ISO timestamp to percentage on the timeline axis
  const getPercent = (timeStr?: string): number => {
    if (!timeStr) return 0;
    try {
      const t = new Date(timeStr).getTime();
      if (isNaN(t)) return 0;
      const clamped = Math.max(minMs, Math.min(maxMs, t));
      return ((clamped - minMs) / totalMs) * 100;
    } catch {
      return 0;
    }
  };

  const currentPercent = currentTime ? getPercent(currentTime) : null;

  // Pre-index interval allocations for fast active charging window lookups
  const chargingIntervalsBySession = useMemo(() => {
    const map = new Map<string, { startPct: number; widthPct: number; powerKw: number }[]>();
    if (!intervals || intervals.length === 0) return map;

    // Group consecutive charging intervals per session
    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      const allocs = interval.allocations || {};
      const intStart = new Date(interval.timestamp).getTime();
      const intEnd = intStart + 15 * 60000;

      for (const [sid, power] of Object.entries(allocs)) {
        if (power > 0.05) {
          if (!map.has(sid)) map.set(sid, []);
          const list = map.get(sid)!;

          const startPct = Math.max(0, Math.min(100, ((intStart - minMs) / totalMs) * 100));
          const endPct = Math.max(0, Math.min(100, ((intEnd - minMs) / totalMs) * 100));
          const widthPct = Math.max(0.4, endPct - startPct);

          // Merge if contiguous with previous interval
          const prev = list[list.length - 1];
          if (prev && Math.abs(prev.startPct + prev.widthPct - startPct) < 0.2) {
            prev.widthPct += widthPct;
            prev.powerKw = Math.max(prev.powerKw, power);
          } else {
            list.push({ startPct, widthPct, powerKw: power });
          }
        }
      }
    }
    return map;
  }, [intervals, minMs, totalMs]);

  // Fast map of active sessions for real-time status badges
  const activeSessionMap = useMemo(() => {
    const map = new Map<string, ActiveSession>();
    activeSessions.forEach((s) => map.set(s.session_id, s));
    return map;
  }, [activeSessions]);

  return (
    <div className="w-full space-y-3">
      {/* 1. Synchronized Time Axis Header */}
      <div className="relative h-7 border-b border-[#253441] text-[10px] text-[#91A5B3] font-mono select-none">
        {ticks.map((tick, idx) => (
          <div
            key={`tick-${idx}-${tick.label}`}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${tick.pct}%` }}
          >
            <span className="text-[#91A5B3] hover:text-[#EAF5FA] transition-colors">{tick.label}</span>
            <div className="w-px h-1.5 bg-[#253441] mt-0.5" />
          </div>
        ))}

        {/* Global Current Simulation Clock Header Marker */}
        {currentPercent !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none"
            style={{ left: `${currentPercent}%` }}
          >
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#20E3FF] text-[#080D12] shadow-[0_0_10px_rgba(32,227,255,0.6)]">
              {formatTime(currentTime)}
            </span>
            <div className="w-0.5 h-2 bg-[#20E3FF]" />
          </div>
        )}
      </div>

      {/* 2. Interactive Schedule Gantt Rows */}
      <div className="relative space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {/* Unified Full-Height Simulation Clock Cursor Line */}
        {currentPercent !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#20E3FF] z-20 pointer-events-none shadow-[0_0_8px_rgba(32,227,255,0.8)]"
            style={{ left: `calc(130px + (100% - 130px) * ${currentPercent / 100})` }}
          />
        )}

        {sessions.map((session) => {
          const arrPct = getPercent(session.arrival_time);
          const depPct = getPercent(session.departure_time);
          const parkWidthPct = Math.max(1.5, depPct - arrPct);

          const isSelected = selectedSessionId === session.session_id;
          const activeSess = activeSessionMap.get(session.session_id);
          const chargingWindows = chargingIntervalsBySession.get(session.session_id) || [];

          // Status & Visuals
          const isCurrentlyCharging = (activeSess?.allocated_power_kw ?? 0) > 0.1;
          const isTargetReached =
            activeSess?.cutoff_status === 'TARGET REACHED' ||
            (activeSess && (activeSess.remaining_energy_kwh ?? 10) <= 0.05);
          const isEmergency = activeSess?.is_emergency;
          const isAutoCutoff = activeSess?.cutoff_status === 'AUTO CUTOFF' || activeSess?.is_manually_stopped;

          return (
            <div
              key={session.session_id}
              onClick={() => onSelectSession?.(session.session_id)}
              className={cn(
                'group relative flex items-center h-9 rounded-xl cursor-pointer px-2.5 transition-all text-xs font-mono',
                isSelected
                  ? 'bg-[#172330] border border-[#20E3FF] shadow-[0_0_14px_rgba(32,227,255,0.25)] ring-1 ring-[#20E3FF]/30'
                  : 'bg-[#0B1117] hover:bg-[#121B24] border border-[#253441]/70'
              )}
            >
              {/* Left session badge info */}
              <div className="w-[120px] shrink-0 flex items-center justify-between pr-2.5 border-r border-[#253441]/50">
                <div className="flex flex-col">
                  <span className="font-bold text-[#EAF5FA] flex items-center gap-1">
                    {session.charger_id}
                    {isEmergency && <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />}
                  </span>
                  <span className="text-[10px] text-[#91A5B3] truncate max-w-[70px]">
                    {session.session_id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#20E3FF]">
                    {session.requested_energy_kwh ?? 25}k
                  </span>
                </div>
              </div>

              {/* Right Gantt Track Area */}
              <div className="relative flex-1 h-6 ml-2 rounded-lg bg-[#080D12] border border-[#253441]/40 overflow-hidden">
                {/* A. Overall Parking Window (Base Slot) */}
                <div
                  className={cn(
                    'absolute h-full rounded border transition-all flex items-center justify-between px-2',
                    isSelected
                      ? 'bg-[#162330] border-[#20E3FF]/50'
                      : 'bg-[#0E1720] border-[#253441] group-hover:border-[#38BDF8]/40'
                  )}
                  style={{ left: `${arrPct}%`, width: `${parkWidthPct}%` }}
                >
                  <span className="text-[9px] text-[#91A5B3] truncate z-10">
                    {formatTime(session.arrival_time)}
                  </span>
                  <span className="text-[9px] text-[#91A5B3] truncate z-10">
                    {formatTime(session.departure_time)}
                  </span>
                </div>

                {/* B. Active Charging Windows (Authoritative intervals where power was delivered) */}
                {chargingWindows.map((cw, i) => (
                  <div
                    key={`cw-${session.session_id}-${i}`}
                    className="absolute top-1 bottom-1 rounded bg-gradient-to-r from-[#20E3FF] to-[#00D6B3] shadow-sm shadow-[#20E3FF]/40 z-10 pointer-events-none"
                    style={{ left: `${cw.startPct}%`, width: `${cw.widthPct}%` }}
                    title={`Active Charging: ${cw.powerKw.toFixed(1)} kW`}
                  />
                ))}

                {/* C. Real-time Status Indicator Badge on the Bar */}
                {activeSess && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-15 pointer-events-none"
                    style={{ left: `${Math.min(92, Math.max(arrPct + 1, arrPct + parkWidthPct / 2))}%` }}
                  >
                    {isCurrentlyCharging && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#20E3FF] text-[#080D12] flex items-center gap-0.5 animate-pulse">
                        <Zap className="w-2.5 h-2.5" />
                        {activeSess.allocated_power_kw.toFixed(1)}kW
                      </span>
                    )}
                    {isTargetReached && (
                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-[#10B981] text-[#080D12] flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        DONE
                      </span>
                    )}
                    {isAutoCutoff && (
                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-[#F59E0B] text-[#080D12]">
                        CUTOFF
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Gantt Schedule Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#253441]/50 text-[10px] font-mono text-[#91A5B3]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-2 rounded bg-[#0E1720] border border-[#253441]" />
            <span>Parking Duration Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-2 rounded bg-gradient-to-r from-[#20E3FF] to-[#00D6B3]" />
            <span className="text-[#EAF5FA]">Active Charging Intervals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Target Reached / Cutoff</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#20E3FF] animate-pulse" />
            <span className="text-[#20E3FF]">Simulation Clock Cursor</span>
          </div>
        </div>
        <div>
          <span>Click any vehicle row to synchronize 3D Digital Twin</span>
        </div>
      </div>
    </div>
  );
};
