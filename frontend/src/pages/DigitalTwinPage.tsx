import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { ParkingLayout } from '../components/twin/ParkingLayout';
import { TwinCanvas } from '../components/twin/three/TwinCanvas';
import { VehicleDetail } from '../components/twin/VehicleDetail';
import { GridStatus } from '../components/twin/GridStatus';
import { PowerCapControl } from '../components/simulation/PowerCapControl';
import { SimulationControls } from '../components/simulation/SimulationControls';
import { PageId } from '../components/layout/Sidebar';
import { Zap } from 'lucide-react';

export interface DigitalTwinPageProps {
  simulation: ReturnType<typeof useSimulation>;
  onNavigate: (page: PageId) => void;
}

export const DigitalTwinPage: React.FC<DigitalTwinPageProps> = ({
  simulation,
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const currentInterval = simulation.currentInterval;
  const selectedSession = simulation.activeSessions.find(
    (s) => s.session_id === simulation.selectedSessionId
  );

  return (
    <div className="space-y-6">
      {/* Top telemetry and transformer control row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8">
          <GridStatus
            totalPowerKw={currentInterval?.site_total_power_kw ?? 0}
            siteCapKw={simulation.siteCapKw}
            solarPowerKw={currentInterval?.solar_power_kw ?? 0}
            gridPowerKw={currentInterval?.grid_power_kw ?? 0}
            connectedCount={simulation.activeSessions.length}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-4">
          <PowerCapControl
            currentCap={simulation.siteCapKw}
            onCapChange={simulation.setSiteCapKw}
            className="h-full flex flex-col justify-between"
          />
        </div>
      </div>

      {/* Playback & Step Controls */}
      <SimulationControls
        isRunning={simulation.isRunning}
        speed={simulation.speed}
        currentIntervalIndex={simulation.currentIntervalIndex}
        totalIntervals={simulation.totalIntervals}
        currentTime={simulation.currentTime}
        onTogglePlayPause={simulation.togglePlayPause}
        onStepForward={simulation.stepForward}
        onReset={simulation.reset}
        onSpeedChange={simulation.setSpeed}
      />

      {/* Main Digital Twin Grid: 3D/2D Facility + Vehicle Detail Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          {viewMode === '3d' ? (
            <TwinCanvas
              activeSessions={simulation.activeSessions}
              siteCapKw={simulation.siteCapKw}
              totalPowerKw={currentInterval?.site_total_power_kw ?? 0}
              solarPowerKw={currentInterval?.solar_power_kw ?? 0}
              selectedSessionId={simulation.selectedSessionId}
              onSelectSession={simulation.setSelectedSessionId}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              cutoffEvents={simulation.cutoffEvents}
            />
          ) : (
            <ParkingLayout
              activeSessions={simulation.activeSessions}
              siteCapKw={simulation.siteCapKw}
              totalPowerKw={currentInterval?.site_total_power_kw ?? 0}
              solarPowerKw={currentInterval?.solar_power_kw ?? 0}
              selectedSessionId={simulation.selectedSessionId}
              onSelectSession={simulation.setSelectedSessionId}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </div>

        <div className="lg:col-span-4">
          <VehicleDetail
            session={selectedSession}
            onEmergencyToggle={simulation.declareEmergency}
            onLeavingSoonToggle={simulation.declareLeavingSoon}
            onStopCharging={simulation.stopCharging}
            onStartCharging={simulation.startCharging}
            onOpenRescue={(sessionId) => {
              simulation.setSelectedSessionId(sessionId);
              onNavigate('rescue');
            }}
          />
        </div>
      </div>

      {/* Automatic Cutoff Telemetry & Safety Event Log */}
      <div className="p-5 rounded-xl bg-[#111A22] border border-[#253441] shadow-lg space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#20E3FF]/10 text-[#20E3FF] border border-[#20E3FF]/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#EAF5FA] flex items-center gap-2">
                Automatic Cutoff & Safety Telemetry Log
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#20E3FF]/10 text-[#20E3FF] border border-[#20E3FF]/30">
                  {simulation.cutoffEvents.length} Events
                </span>
              </h4>
              <p className="text-[11px] text-[#91A5B3]">
                Deterministic protection: target energy reached, battery capacity safety buffer, departure deadlines, and manual isolation.
              </p>
            </div>
          </div>
        </div>

        {simulation.cutoffEvents.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#080D12] border border-[#253441] text-center text-xs text-[#91A5B3] font-mono">
            No cutoff events triggered yet in this simulation window. Charging sessions are operating within nominal boundaries.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
            {simulation.cutoffEvents.slice(0, 9).map((evt, idx) => (
              <div
                key={`${evt.session_id}-${evt.reason}-${idx}`}
                className="p-3 rounded-xl bg-[#080D12] border border-[#253441] space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#EAF5FA] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#20E3FF]" />
                    {evt.charger_id} ({evt.session_id})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                      evt.reason === 'TARGET_REACHED'
                        ? 'bg-[#7CFF6B]/15 text-[#7CFF6B] border border-[#7CFF6B]/30'
                        : evt.reason === 'MANUAL_STOP'
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                        : evt.reason === 'BATTERY_CAPACITY_LIMIT'
                        ? 'bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/30'
                        : 'bg-[#20E3FF]/15 text-[#20E3FF] border border-[#20E3FF]/30'
                    }`}
                  >
                    {evt.reason.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] font-sans text-[#EAF5FA] leading-snug line-clamp-2">
                  {evt.message}
                </p>
                <div className="flex items-center justify-between text-[10px] text-[#91A5B3] pt-1.5 border-t border-[#253441]">
                  <span>Delivered: <strong className="text-[#00D6B3]">{evt.final_energy_delivered_kwh.toFixed(1)} kWh</strong></span>
                  <span className="text-[#7CFF6B] font-bold">POWER: 0.0 kW</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

