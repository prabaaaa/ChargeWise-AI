import React from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { KpiCard } from '../components/ui/KpiCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { PowerDemandChart } from '../components/charts/PowerDemandChart';
import { SimulationControls } from '../components/simulation/SimulationControls';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatPower, formatEnergy, formatCurrency, formatCarbon, formatPercent } from '../utils/formatting';
import {
  Zap,
  TrendingDown,
  BatteryCharging,
  Car,
  DollarSign,
  Leaf,
  Database,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Activity,
} from 'lucide-react';
import { PageId } from '../components/layout/Sidebar';

export interface OverviewPageProps {
  simulation: ReturnType<typeof useSimulation>;
  onNavigate: (page: PageId) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ simulation, onNavigate }) => {
  const comp = simulation.comparisonResult;
  const sim = simulation.simulationResult;

  const peakDemand = sim?.peak_demand_kw ?? 44.8;
  const peakReduction = comp?.peak_reduction_percent ?? 42.5;
  const energyDelivered = sim?.total_energy_delivered_kwh ?? 540.2;
  const vehiclesServed = sim?.sessions_count ?? 20;
  const costSavings = comp?.cost_savings ?? 44.25;
  const carbonSavings = comp?.carbon_savings ?? 44.3;

  return (
    <div className="space-y-6">
      {/* Automotive Cockpit Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b1724] via-[#111a22] to-[#0b1724] p-7 border border-[#253441] shadow-2xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#20e3ff]/15 text-[#20e3ff] border border-[#20e3ff]/30 shadow-sm flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#20e3ff]" />
                CHARGEWISE EV OS
              </span>
              <span className="text-xs text-[#91a5b3] font-mono uppercase tracking-wide">
                {simulation.datasetInfo?.metadata?.name || 'CALTECH JPL PILOT BENCHMARK'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#eaf5fa]">
              Electric Mobility & Energy Orchestration
            </h1>
            <p className="text-xs sm:text-sm text-[#91a5b3] leading-relaxed">
              Real-time dynamic load balancing, peak shaving under hard site caps, and automatic charging cutoff protection across 20 dual-port bi-directional EV bays.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => onNavigate('digital-twin')}
              className="gap-2 px-5 py-2.5 text-sm font-bold shadow-lg shadow-[#20e3ff]/25"
            >
              Launch 3D Digital Twin
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Subtle Ambient Glow */}
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-[#20e3ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-[#00d6b3]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 6 Instrument Panel KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard
          label="Peak Demand"
          value={formatPower(peakDemand).replace(' kW', '')}
          unit="kW"
          icon={Zap}
          iconColor="text-[#20e3ff]"
          comparisonValue={`${formatPower(comp?.uncontrolled.peak_demand_kw ?? 86.4)}`}
          comparisonLabel="Uncontrolled"
        />

        <KpiCard
          label="Peak Shaving"
          value={`-${formatPercent(peakReduction)}`}
          icon={TrendingDown}
          iconColor="text-[#7cff6b]"
          trend={{
            value: 'Grid Safe',
            direction: 'down',
          }}
        />

        <KpiCard
          label="Delivered Energy"
          value={formatEnergy(energyDelivered).replace(' kWh', '')}
          unit="kWh"
          icon={BatteryCharging}
          iconColor="text-[#00d6b3]"
          trend={{
            value: '98.5%',
            direction: 'up',
            label: 'served',
          }}
        />

        <KpiCard
          label="Vehicles Served"
          value={vehiclesServed}
          unit="EVs"
          icon={Car}
          iconColor="text-[#20e3ff]"
          trend={{
            value: '100%',
            direction: 'neutral',
            label: 'scheduled',
          }}
        />

        <KpiCard
          label="Cost Savings"
          value={formatCurrency(costSavings)}
          icon={DollarSign}
          iconColor="text-[#7cff6b]"
          comparisonValue={formatCurrency(comp?.cost_uncontrolled ?? 138.45)}
          comparisonLabel="Base"
        />

        <KpiCard
          label="Carbon Offset"
          value={formatCarbon(carbonSavings).replace(' kg CO₂', '')}
          unit="kg CO₂"
          icon={Leaf}
          iconColor="text-[#7cff6b]"
          trend={{
            value: '-39%',
            direction: 'down',
            label: 'emissions',
          }}
        />
      </div>

      {/* Simulation Quick Controls */}
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

      {/* Full-width Power Demand Chart Card */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[#253441]/60">
          <div>
            <CardTitle className="text-base font-bold text-[#eaf5fa]">
              Site Power Demand Profile vs Grid Transformer Cap
            </CardTitle>
            <p className="text-xs text-[#91a5b3]">
              Real-time comparison of uncontrolled peak spikes (red zone) versus ChargeWise LLF optimized power shaving (cyan zone).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('comparison')}
            className="text-xs gap-1 hidden sm:flex font-mono"
          >
            Detailed Analytics
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <PowerDemandChart
            uncontrolledResult={comp?.uncontrolled}
            optimizedResult={comp?.optimized}
            siteCapKw={simulation.siteCapKw}
            currentIntervalTimestamp={simulation.currentTime}
            height={320}
          />
        </CardContent>
      </Card>

      {/* Lower Row: Active Sessions Summary + Dataset Provenance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Charging Sessions Table */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[#253441]/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#eaf5fa]">
                <Car className="w-4 h-4 text-[#20e3ff]" />
                Active Sessions at Current Interval ({simulation.activeSessions.length} Vehicles Connected)
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('scheduler')}
                className="text-xs text-[#20e3ff] hover:text-white"
              >
                View Full Scheduler →
              </Button>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] text-[#91a5b3] uppercase bg-[#080d12] border-b border-[#253441] font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Charger</th>
                      <th className="py-2.5 px-3">Session</th>
                      <th className="py-2.5 px-3">Allocated Power</th>
                      <th className="py-2.5 px-3">Delivered / Target</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#253441]/50 font-mono">
                    {simulation.activeSessions.slice(0, 6).map((session) => (
                      <tr key={session.session_id} className="hover:bg-[#172330]/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#eaf5fa]">{session.charger_id}</td>
                        <td className="py-2.5 px-3 text-[#91a5b3]">{session.session_id}</td>
                        <td className="py-2.5 px-3 text-[#20e3ff] font-bold">{formatPower(session.allocated_power_kw)}</td>
                        <td className="py-2.5 px-3 text-[#eaf5fa]">
                          <span className="text-[#7cff6b] font-bold">{formatEnergy(session.energy_delivered_kwh)}</span> / {formatEnergy(session.energy_requested_kwh)}
                        </td>
                        <td className="py-2.5 px-3 text-[#eaf5fa] font-bold">{session.priority_score}/100</td>
                        <td className="py-2.5 px-3 font-sans">
                          <Badge
                            variant={
                              session.cutoff_status === 'TARGET REACHED' || session.cutoff_status === 'COMPLETED'
                                ? 'success'
                                : session.cutoff_status === 'AUTO CUTOFF'
                                ? 'warning'
                                : session.allocated_power_kw > 0.1
                                ? 'info'
                                : 'neutral'
                            }
                            dot
                            className="text-[10px]"
                          >
                            {session.cutoff_status || (session.allocated_power_kw > 0.1 ? 'CHARGING' : 'QUEUED')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dataset & Infrastructure Provenance Card */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader className="pb-2 border-b border-[#253441]/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#eaf5fa]">
                <Database className="w-4 h-4 text-[#20e3ff]" />
                Campus Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs text-[#91a5b3] pt-3">
              <div className="p-3 rounded-xl bg-[#080d12] border border-[#253441] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-[#20e3ff] uppercase font-mono font-bold tracking-wider">
                    {simulation.datasetInfo?.is_custom ? 'CUSTOM UPLOAD TRACE' : 'ACN-DATA BENCHMARK'}
                  </div>
                  <Badge variant={simulation.datasetInfo?.is_custom ? 'success' : 'info'} className="text-[9px] font-mono">
                    {simulation.datasetInfo?.session_count ?? simulation.allSessions.length} SESSIONS
                  </Badge>
                </div>
                <div className="font-bold text-[#eaf5fa]">
                  {simulation.datasetInfo?.metadata?.name || 'Caltech JPL EV Research Facility'}
                </div>
                <p className="text-[11px] text-[#91a5b3] leading-relaxed">
                  {simulation.datasetInfo?.is_custom
                    ? `Ingested custom fleet dataset with ${simulation.datasetInfo?.total_requested_kwh ?? 0} kWh energy demand active across 20 campus bays.`
                    : 'Caltech Pasadena campus dataset with 15-minute discrete intervals, Level 2 dual-port stations, and DC fast chargers.'}
                </p>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center py-1 border-b border-[#253441]/40">
                  <span className="text-[#91a5b3] font-sans">Substation Cap:</span>
                  <span className="text-[#20e3ff] font-bold">{simulation.siteCapKw} kW</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#253441]/40">
                  <span className="text-[#91a5b3] font-sans">Algorithm:</span>
                  <span className="text-[#eaf5fa]">Least-Laxity-First + Fairness</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#91a5b3] font-sans">Bifacial Solar:</span>
                  <span className="text-[#7cff6b] font-bold">34 kWp Array Active</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('settings')}
                className="w-full text-xs font-mono font-bold mt-1"
              >
                Configure Settings & Datasets
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
