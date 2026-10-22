import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SessionTimeline } from '../components/charts/SessionTimeline';
import { formatPower, formatEnergy, formatTime } from '../utils/formatting';
import {
  Calendar,
  AlertTriangle,
  Zap,
  Clock,
  ShieldAlert,
  ArrowUpDown,
  CheckCircle2,
  ListOrdered,
  Cpu,
  Activity,
  Layers,
} from 'lucide-react';
import { PageId } from '../components/layout/Sidebar';

export interface SchedulerPageProps {
  simulation: ReturnType<typeof useSimulation>;
  onNavigate: (page: PageId) => void;
}

export const SchedulerPage: React.FC<SchedulerPageProps> = ({
  simulation,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | 'charging' | 'at_risk'>('all');

  const filteredSessions = simulation.activeSessions.filter((s) => {
    if (filter === 'charging') return s.allocated_power_kw > 0.1;
    if (filter === 'at_risk') return s.feasibility_status === 'at_risk' || s.feasibility_status === 'infeasible';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#253441]/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#20E3FF] bg-[#20E3FF]/10 px-2 py-0.5 rounded border border-[#20E3FF]/20">
              REAL-TIME DISPATCH ENGINE
            </span>
            <span className="text-[10px] text-[#91A5B3] font-mono">20 BI-DIRECTIONAL TERMINALS</span>
          </div>
          <h2 className="text-xl font-bold text-[#EAF5FA] tracking-wide flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#20E3FF]" />
            Dynamic Fleet Power Scheduler
          </h2>
          <p className="text-xs text-[#91A5B3] mt-0.5">
            Real-time deadline-driven power allocation, priority ranking, and automated cutoff enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#111A22] p-1 rounded-xl border border-[#253441]">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              filter === 'all'
                ? 'bg-[#20E3FF] text-[#080D12] font-bold shadow-[0_0_12px_rgba(32,227,255,0.35)]'
                : 'text-[#91A5B3] hover:text-[#EAF5FA] hover:bg-[#1a2634]'
            }`}
          >
            All Active ({simulation.activeSessions.length})
          </button>
          <button
            onClick={() => setFilter('charging')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              filter === 'charging'
                ? 'bg-[#20E3FF] text-[#080D12] font-bold shadow-[0_0_12px_rgba(32,227,255,0.35)]'
                : 'text-[#91A5B3] hover:text-[#EAF5FA] hover:bg-[#1a2634]'
            }`}
          >
            Charging ({simulation.activeSessions.filter((s) => s.allocated_power_kw > 0.1).length})
          </button>
          <button
            onClick={() => setFilter('at_risk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              filter === 'at_risk'
                ? 'bg-[#EF4444] text-[#EAF5FA] font-bold shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                : 'text-[#91A5B3] hover:text-[#EAF5FA] hover:bg-[#1a2634]'
            }`}
          >
            At Risk ({simulation.activeSessions.filter((s) => s.feasibility_status !== 'feasible').length})
          </button>
        </div>
      </div>

      {/* Gantt Schedule Timeline */}
      <Card className="border-[#253441] bg-[#111A22]">
        <CardHeader className="pb-3 border-b border-[#253441]/60">
          <CardTitle className="text-xs uppercase tracking-wider text-[#91A5B3] flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#EAF5FA] font-semibold text-sm normal-case tracking-normal">
              <Clock className="w-4 h-4 text-[#20E3FF]" />
              Vehicle Departure Timeline & Active Windows
            </span>
            <span className="text-xs font-mono font-medium text-[#20E3FF] bg-[#20E3FF]/10 px-2.5 py-1 rounded border border-[#20E3FF]/30">
              SIM CLOCK: {formatTime(simulation.currentTime)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <SessionTimeline
            sessions={simulation.allSessions}
            currentTime={simulation.currentTime}
            intervals={simulation.simulationResult?.intervals}
            activeSessions={simulation.activeSessions}
            selectedSessionId={simulation.selectedSessionId}
            onSelectSession={simulation.setSelectedSessionId}
          />
        </CardContent>
      </Card>

      {/* Grid: Live Allocations Table + Scheduler Decision Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Allocations Table */}
        <div className="lg:col-span-8">
          <Card className="border-[#253441] bg-[#111A22] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#253441]/60">
              <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#20E3FF]" />
                Live Dispatch & Priority Queue
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#91A5B3] bg-[#080D12] px-2.5 py-1 rounded border border-[#253441]">
                  Total Load: <span className="text-[#20E3FF] font-bold">{simulation.currentInterval?.site_total_power_kw ?? 0}</span> / {simulation.siteCapKw} kW
                </span>
                <span className="text-xs font-mono text-[#00D6B3] bg-[#00D6B3]/10 px-2 py-0.5 rounded border border-[#00D6B3]/30 hidden sm:inline-block">
                  LLF ENGINE
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] text-[#91A5B3] uppercase bg-[#080D12] border-b border-[#253441] font-mono tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Priority & Bay</th>
                      <th className="py-3 px-3.5">Session / Driver</th>
                      <th className="py-3 px-3.5">Urgency & Laxity</th>
                      <th className="py-3 px-3.5">Allocated Power</th>
                      <th className="py-3 px-3.5">Energy Target</th>
                      <th className="py-3 px-3.5">Departure</th>
                      <th className="py-3 px-3.5">Telematic State</th>
                      <th className="py-3 px-3.5 text-right">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#253441]/60 font-mono">
                    {filteredSessions.map((session, idx) => (
                      <tr
                        key={session.session_id}
                        className={`hover:bg-[#172330]/80 transition-colors ${
                          session.is_emergency ? 'bg-[#EF4444]/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#20E3FF]/15 text-[#20E3FF] border border-[#20E3FF]/30">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-[#EAF5FA]">{session.charger_id}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="flex flex-col">
                            <span className="text-[#EAF5FA] font-medium">{session.session_id}</span>
                            <span className="text-[10px] text-[#91A5B3]">{session.departure_source}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          {session.is_emergency ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 animate-pulse">
                              EMERGENCY TOP
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-[10px] font-bold ${
                                (session.laxity_hours ?? 1) < 0.5 ? 'text-[#EF4444]' : (session.laxity_hours ?? 1) < 1.5 ? 'text-[#F59E0B]' : 'text-[#00D6B3]'
                              }`}>
                                {session.laxity_hours !== undefined && session.laxity_hours !== null
                                  ? `${session.laxity_hours.toFixed(1)}h slack`
                                  : '0.0h'}
                              </span>
                              <div className="w-16 h-1 rounded-full bg-[#1A2634] overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#20E3FF] to-[#00D6B3]"
                                  style={{ width: `${Math.min(100, Math.max(5, session.priority_score ?? 50))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#20E3FF]">
                              {formatPower(session.allocated_power_kw)}
                            </span>
                            <span className="text-[10px] text-[#91A5B3]">
                              max {session.charger_max_power_kw ?? 6.6} kW
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="flex flex-col">
                            <span className="text-[#EAF5FA]">
                              {formatEnergy(session.energy_delivered_kwh)} / {formatEnergy(session.effective_energy_target_kwh ?? session.energy_requested_kwh)}
                            </span>
                            <span className="text-[10px] text-[#00D6B3]">
                              {formatEnergy(session.remaining_energy_kwh)} rem
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-[#91A5B3]">
                          {formatTime(session.departure_time)}
                        </td>
                        <td className="py-2.5 px-3.5 font-sans">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge
                              variant={
                                session.is_emergency
                                  ? 'danger'
                                  : session.cutoff_status === 'TARGET REACHED'
                                  ? 'success'
                                  : session.cutoff_status === 'AUTO CUTOFF'
                                  ? 'warning'
                                  : session.cutoff_status === 'CHARGING'
                                  ? 'info'
                                  : 'neutral'
                              }
                              dot
                              className="text-[10px]"
                            >
                              {session.is_emergency
                                ? 'EMERGENCY'
                                : session.cutoff_status || session.feasibility_status.toUpperCase()}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant={session.is_manually_stopped ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => session.is_manually_stopped
                                ? simulation.startCharging(session.session_id)
                                : simulation.stopCharging(session.session_id)
                              }
                              className={`text-[10px] h-6 px-2.5 font-mono ${
                                session.is_manually_stopped
                                  ? 'bg-[#00D6B3] text-[#080D12] font-bold'
                                  : 'text-[#F59E0B] hover:bg-[#F59E0B]/10 border-[#F59E0B]/40'
                              }`}
                            >
                              {session.is_manually_stopped ? 'RESUME' : 'CUTOFF'}
                            </Button>
                            <Button
                              variant={session.is_emergency ? 'danger' : 'outline'}
                              size="sm"
                              onClick={() => simulation.declareEmergency(session.session_id)}
                              className="text-[10px] h-6 px-2.5 font-mono"
                            >
                              {session.is_emergency ? 'REVERT' : 'PRIORITY'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduler Decision Log */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-[#253441] bg-[#111A22]">
            <CardHeader className="pb-3 border-b border-[#253441]/60">
              <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#20E3FF]" />
                Optimization Engine Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs pt-4">
              <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#00D6B3] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00D6B3] animate-pulse" />
                    CONVERGED (0.012s)
                  </span>
                  <span className="text-[10px] text-[#91A5B3]">SOLVER ACTIVE</span>
                </div>
                <p className="text-[11px] text-[#EAF5FA]">
                  Peak site demand contained at <span className="text-[#20E3FF] font-bold">{simulation.currentInterval?.site_total_power_kw ?? 0} kW</span> (Transformer Cap: {simulation.siteCapKw} kW).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#F59E0B] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    ALPHA-FAIRNESS ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-[#91A5B3]">
                  Least-Laxity-First (LLF) priority with proportional fairness prevents vehicle starvation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#20E3FF] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#20E3FF]" />
                    SOLAR CURVE SHIFT
                  </span>
                </div>
                <p className="text-[11px] text-[#91A5B3]">
                  Absorbed <span className="text-[#00D6B3] font-bold">{simulation.currentInterval?.solar_power_kw ?? 0} kW</span> solar PV generation directly into high-capacity battery packs.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('rescue')}
                className="w-full text-xs gap-2 mt-2 border-[#20E3FF]/40 text-[#20E3FF] hover:bg-[#20E3FF]/10 font-sans"
              >
                Inspect Off-Site Rescue Hubs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

