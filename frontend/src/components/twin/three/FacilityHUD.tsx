import React from 'react';
import { CameraPreset } from './CameraController';
import { IntelligenceMode } from './ParkingBay3D';
import { ActiveSession, CutoffEvent } from '../../../api/types';
import {
  Eye,
  Camera,
  Layers,
  Zap,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Maximize2,
  Radio,
} from 'lucide-react';

export interface FacilityHUDProps {
  viewMode: '3d' | '2d';
  onViewModeChange: (mode: '3d' | '2d') => void;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
  intelligenceMode: IntelligenceMode;
  onIntelligenceModeChange: (mode: IntelligenceMode) => void;
  activeSessions: ActiveSession[];
  siteCapKw: number;
  totalPowerKw: number;
  selectedSessionId?: string | null;
  onSelectSession: (id: string) => void;
  onClearSelection: () => void;
  cutoffEvents?: CutoffEvent[];
}

export const FacilityHUD: React.FC<FacilityHUDProps> = ({
  viewMode,
  onViewModeChange,
  cameraPreset,
  onCameraPresetChange,
  intelligenceMode,
  onIntelligenceModeChange,
  activeSessions,
  siteCapKw,
  totalPowerKw,
  selectedSessionId,
  onSelectSession,
  onClearSelection,
  cutoffEvents = [],
}) => {
  const totalBays = 20;
  const occupiedCount = activeSessions.length;
  const availableCount = Math.max(0, totalBays - occupiedCount);

  let chargingCount = 0;
  let cutoffCount = 0;
  let queuedCount = 0;

  activeSessions.forEach((s) => {
    const isCharging = (s.allocated_power_kw || 0) > 0.1;
    const isCutoff =
      s.cutoff_status === 'TARGET REACHED' ||
      s.cutoff_status === 'AUTO CUTOFF' ||
      s.cutoff_status === 'COMPLETED' ||
      s.is_manually_stopped ||
      (s.remaining_energy_kwh ?? 10) <= 0.05;

    if (isCharging) {
      chargingCount++;
    } else if (isCutoff) {
      cutoffCount++;
    } else {
      queuedCount++;
    }
  });

  const loadPercent = siteCapKw > 0 ? (totalPowerKw / siteCapKw) * 100 : 0;
  const isOverload = totalPowerKw > siteCapKw + 0.1;

  // Build Recent Event Timeline Items from active sessions and cutoff events
  const timelineEvents = React.useMemo(() => {
    const items: {
      id: string;
      sessionId: string;
      chargerId: string;
      label: string;
      type: 'charging' | 'cutoff' | 'emergency' | 'queued';
    }[] = [];

    // Add recent cutoff events
    cutoffEvents.slice(0, 4).forEach((evt, idx) => {
      items.push({
        id: `cutoff-${evt.session_id}-${idx}`,
        sessionId: evt.session_id,
        chargerId: evt.charger_id,
        label: `Cutoff: ${evt.charger_id} (${evt.reason.replace('_', ' ')})`,
        type: 'cutoff',
      });
    });

    // Add active emergency sessions
    activeSessions
      .filter((s) => s.is_emergency)
      .slice(0, 2)
      .forEach((s) => {
        items.push({
          id: `emerg-${s.session_id}`,
          sessionId: s.session_id,
          chargerId: s.charger_id,
          label: `Emergency: ${s.charger_id} (${s.session_id})`,
          type: 'emergency',
        });
      });

    // Add active charging sessions
    activeSessions
      .filter((s) => s.allocated_power_kw > 0.1)
      .slice(0, 4)
      .forEach((s) => {
        items.push({
          id: `charge-${s.session_id}`,
          sessionId: s.session_id,
          chargerId: s.charger_id,
          label: `${s.charger_id}: Charging @ ${s.allocated_power_kw.toFixed(1)} kW`,
          type: 'charging',
        });
      });

    return items.slice(0, 7);
  }, [cutoffEvents, activeSessions]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 select-none">
      {/* ------------------ TOP CONTROL BAR ------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Facility Identity & View Switcher */}
        <div className="flex items-center gap-2.5 bg-navy-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-graphite-700/80 shadow-2xl">
          <div className="flex items-center gap-2 pr-3 border-r border-graphite-700/60">
            <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-white tracking-wide block">
                Caltech-JPL Energy Campus
              </span>
              <span className="text-[10px] text-teal-300 font-mono block">
                20 Bi-Directional Bays • 480V Substation
              </span>
            </div>
          </div>

          {/* 3D vs 2D Switcher */}
          <div className="flex items-center bg-navy-900 rounded-lg p-0.5 border border-graphite-700/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => onViewModeChange('3d')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === '3d'
                  ? 'bg-teal-500 text-navy-950 font-bold shadow-md shadow-teal-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>3D Campus</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('2d')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === '2d'
                  ? 'bg-teal-500 text-navy-950 font-bold shadow-md shadow-teal-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Layout</span>
            </button>
          </div>
        </div>

        {/* Center: Intelligence Heatmap Mode Selector (3D only) */}
        {viewMode === '3d' && (
          <div className="flex items-center gap-1 bg-navy-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-graphite-700/80 shadow-2xl text-xs font-mono">
            <span className="text-[11px] text-gray-400 mr-1.5 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Layer:
            </span>
            <button
              type="button"
              onClick={() => onIntelligenceModeChange('live')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                intelligenceMode === 'live'
                  ? 'bg-teal-500/25 text-teal-300 border border-teal-500/50 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Live State
            </button>
            <button
              type="button"
              onClick={() => onIntelligenceModeChange('power')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                intelligenceMode === 'power'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Power Demand
            </button>
            <button
              type="button"
              onClick={() => onIntelligenceModeChange('risk')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                intelligenceMode === 'risk'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Departure Risk
            </button>
            <button
              type="button"
              onClick={() => onIntelligenceModeChange('cutoff')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                intelligenceMode === 'cutoff'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Cutoff History
            </button>
          </div>
        )}

        {/* Right: Camera Director Presets */}
        {viewMode === '3d' && (
          <div className="flex items-center gap-1 bg-navy-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-graphite-700/80 shadow-2xl text-xs font-mono">
            <Camera className="w-3.5 h-3.5 text-teal-400 mr-1" />
            <button
              type="button"
              onClick={() => onCameraPresetChange('overview')}
              className={`px-2 py-1 rounded-md transition-all ${
                cameraPreset === 'overview'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                  : 'text-gray-300 hover:bg-navy-800'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => onCameraPresetChange('north')}
              className={`px-2 py-1 rounded-md transition-all ${
                cameraPreset === 'north'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                  : 'text-gray-300 hover:bg-navy-800'
              }`}
            >
              North Row
            </button>
            <button
              type="button"
              onClick={() => onCameraPresetChange('south')}
              className={`px-2 py-1 rounded-md transition-all ${
                cameraPreset === 'south'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                  : 'text-gray-300 hover:bg-navy-800'
              }`}
            >
              South Row
            </button>
            <button
              type="button"
              onClick={() => onCameraPresetChange('substation')}
              className={`px-2 py-1 rounded-md transition-all ${
                cameraPreset === 'substation'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                  : 'text-gray-300 hover:bg-navy-800'
              }`}
            >
              Substation
            </button>
            <button
              type="button"
              onClick={() => onCameraPresetChange('topdown')}
              className={`px-2 py-1 rounded-md transition-all ${
                cameraPreset === 'topdown'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                  : 'text-gray-300 hover:bg-navy-800'
              }`}
            >
              Blueprint
            </button>
            <button
              type="button"
              onClick={() => onCameraPresetChange('fit')}
              className={`p-1 rounded-md transition-all text-gray-300 hover:bg-navy-800`}
              title="Fit Entire Campus"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            {selectedSessionId && (
              <button
                type="button"
                onClick={() => onCameraPresetChange('selected')}
                className="px-2 py-1 rounded-md bg-cyan-500 text-navy-950 font-bold shadow animate-pulse"
              >
                Focus Bay
              </button>
            )}
          </div>
        )}
      </div>

      {/* ------------------ BOTTOM STATUS & TIMELINE STRIP ------------------ */}
      <div className="flex flex-col gap-2.5 pointer-events-auto">
        {/* Interactive Simulation Event Timeline Strip */}
        {viewMode === '3d' && timelineEvents.length > 0 && (
          <div className="bg-navy-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-graphite-700/80 shadow-2xl flex items-center gap-2 overflow-x-auto text-[11px] font-mono scrollbar-none">
            <span className="text-gray-400 whitespace-nowrap font-bold flex items-center gap-1.5 pr-2 border-r border-graphite-800">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              Event Feed:
            </span>
            <div className="flex items-center gap-1.5">
              {timelineEvents.map((evt) => (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => onSelectSession(evt.sessionId)}
                  className={`px-2.5 py-0.5 rounded-lg border whitespace-nowrap transition-all ${
                    evt.type === 'emergency'
                      ? 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30'
                      : evt.type === 'cutoff'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                      : evt.type === 'charging'
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 hover:bg-teal-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  }`}
                  title="Click to focus camera on this vehicle"
                >
                  {evt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Bay Counts & Site Demand Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Bay Counts & Selection Banner */}
          <div className="flex flex-wrap items-center gap-2 bg-navy-950/90 backdrop-blur-md p-2 rounded-xl border border-graphite-700/80 shadow-2xl text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
              <Zap className="w-3.5 h-3.5" />
              <span className="font-bold">{chargingCount}</span> Charging
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="font-bold">{cutoffCount}</span> Cutoff / Ready
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-bold">{queuedCount}</span> Queued
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800/80 text-gray-400 border border-gray-700">
              <span className="font-bold">{availableCount}</span> Available
            </div>

            {selectedSessionId && (
              <div className="flex items-center gap-2 pl-2 border-l border-graphite-700">
                <span className="text-teal-300 font-bold">
                  Inspecting: {selectedSessionId}
                </span>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="p-1 rounded hover:bg-navy-800 text-gray-400 hover:text-white"
                  title="Deselect and reset camera"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right: Site Demand vs Cap Meter */}
          <div className="bg-navy-950/90 backdrop-blur-md px-4 py-2 rounded-xl border border-graphite-700/80 shadow-2xl min-w-[240px]">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-gray-400 font-sans">Campus Power Limit</span>
              <span
                className={`font-bold ${
                  isOverload
                    ? 'text-red-400'
                    : loadPercent > 85
                    ? 'text-amber-400'
                    : 'text-teal-400'
                }`}
              >
                {totalPowerKw.toFixed(1)} / {siteCapKw.toFixed(0)} kW ({loadPercent.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-navy-900 rounded-full overflow-hidden border border-graphite-700/60">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isOverload
                    ? 'bg-red-500 animate-pulse'
                    : loadPercent > 85
                    ? 'bg-amber-400'
                    : 'bg-teal-400'
                }`}
                style={{ width: `${Math.min(100, loadPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
