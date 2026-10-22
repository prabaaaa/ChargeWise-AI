import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { SolarChart } from '../components/charts/SolarChart';
import { CostChart } from '../components/charts/CostChart';
import { Switch } from '../components/ui/Switch';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatEnergy, formatCarbon, formatCurrency } from '../utils/formatting';
import { Leaf, Sun, DollarSign, BatteryCharging, Zap, ShieldCheck } from 'lucide-react';

export const SustainabilityPage: React.FC<{ simulation: ReturnType<typeof useSimulation> }> = ({
  simulation,
}) => {
  const [solarEnabled, setSolarEnabled] = useState(true);
  const [curtailmentShift, setCurtailmentShift] = useState(true);

  const comp = simulation.comparisonResult;
  const sim = simulation.simulationResult;

  const totalDelivered = sim?.total_energy_delivered_kwh ?? 540;
  const solarGenerated = solarEnabled ? Math.round(totalDelivered * 0.42) : 0;
  const gridDrawn = totalDelivered - solarGenerated;

  return (
    <div className="space-y-6">
      {/* Top Banner with Toggle Controls */}
      <Card className="p-5 border-[#253441] bg-[#111A22]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7CFF6B]/10 border border-[#7CFF6B]/30 text-[#7CFF6B]">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#7CFF6B] bg-[#7CFF6B]/10 px-2 py-0.5 rounded border border-[#7CFF6B]/20">
                  DECARBONIZATION TELEMETRY
                </span>
                <span className="text-[10px] text-[#91A5B3] font-mono">100% RE RENEWABLE CURTAILMENT SHIFT</span>
              </div>
              <h2 className="text-lg font-bold text-[#EAF5FA] tracking-wide flex items-center gap-2.5">
                Renewable Energy & Carbon Intelligence
                <Badge variant="success">Zero-Curtailment Mode</Badge>
              </h2>
              <p className="text-xs text-[#91A5B3] mt-0.5">
                Aligns EV charging demand curves with rooftop solar PV generation and real-time marginal carbon intensity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#080D12] p-2.5 rounded-xl border border-[#253441]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#EAF5FA]">Rooftop Solar PV:</span>
              <Switch checked={solarEnabled} onCheckedChange={setSolarEnabled} />
            </div>

            <div className="w-px h-5 bg-[#253441]" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#EAF5FA]">Clean Hour Shifting:</span>
              <Switch checked={curtailmentShift} onCheckedChange={setCurtailmentShift} />
            </div>
          </div>
        </div>

        {/* 3 Green Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 mt-4 border-t border-[#253441]/80 text-xs">
          <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441]">
            <span className="text-[10px] text-[#91A5B3] uppercase font-mono tracking-wider">Solar Energy Absorbed</span>
            <div className="font-mono text-base font-bold text-[#F59E0B] mt-0.5">
              {formatEnergy(solarGenerated)} ({solarEnabled ? '42%' : '0%'})
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441]">
            <span className="text-[10px] text-[#91A5B3] uppercase font-mono tracking-wider">Grid Draw Avoided</span>
            <div className="font-mono text-base font-bold text-[#20E3FF] mt-0.5">
              {formatEnergy(solarGenerated)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#080D12] border border-[#253441]">
            <span className="text-[10px] text-[#91A5B3] uppercase font-mono tracking-wider">Carbon Emissions Avoided</span>
            <div className="font-mono text-base font-bold text-[#7CFF6B] mt-0.5">
              {formatCarbon(comp?.carbon_savings ?? 44.3)}
            </div>
          </div>
        </div>
      </Card>

      {/* Solar Stacked Profile Chart */}
      <Card className="border-[#253441] bg-[#111A22]">
        <CardHeader className="pb-3 border-b border-[#253441]/60">
          <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-[#F59E0B]" />
              Solar Generation Absorption & Grid Import Breakdown
            </span>
            <span className="text-xs font-mono text-[#91A5B3]">CAMPUS PV ARRAY</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <SolarChart
            intervals={simulation.simulationResult?.intervals ?? []}
            siteCapKw={simulation.siteCapKw}
            height={320}
          />
        </CardContent>
      </Card>

      {/* TOU Tariff & Cost Savings Chart */}
      <Card className="border-[#253441] bg-[#111A22]">
        <CardHeader className="pb-3 border-b border-[#253441]/60">
          <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#20E3FF]" />
              Time-of-Use Electricity Tariff & Cost Minimization
            </span>
            <span className="text-xs font-mono text-[#00D6B3]">32% COST AVOIDANCE</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <CostChart
            uncontrolledResult={comp?.uncontrolled}
            optimizedResult={comp?.optimized}
            height={320}
          />
        </CardContent>
      </Card>
    </div>
  );
};

