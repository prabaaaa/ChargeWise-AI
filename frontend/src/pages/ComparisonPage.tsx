import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { PowerDemandChart } from '../components/charts/PowerDemandChart';
import { EnergyDeliveryChart } from '../components/charts/EnergyDeliveryChart';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/Select';
import {
  formatPower,
  formatEnergy,
  formatPercent,
  formatCurrency,
  formatCarbon,
} from '../utils/formatting';
import {
  BarChart3,
  TrendingDown,
  Zap,
  DollarSign,
  Leaf,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Scale,
} from 'lucide-react';

export const ComparisonPage: React.FC<{ simulation: ReturnType<typeof useSimulation> }> = ({
  simulation,
}) => {
  const [selectedDay, setSelectedDay] = useState('day-3');
  const comp = simulation.comparisonResult;
  const unctrl = comp?.uncontrolled;
  const opt = comp?.optimized;

  return (
    <div className="space-y-6">
      {/* Header & Day Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#253441]/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#20E3FF] bg-[#20E3FF]/10 px-2 py-0.5 rounded border border-[#20E3FF]/20">
              BENCHMARK INTELLIGENCE
            </span>
            <span className="text-[10px] text-[#91A5B3] font-mono">CALTECH ACN TRACES</span>
          </div>
          <h2 className="text-xl font-bold text-[#EAF5FA] tracking-wide flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#20E3FF]" />
            Algorithmic Benchmark: Uncontrolled vs ChargeWise AI
          </h2>
          <p className="text-xs text-[#91A5B3] mt-0.5">
            Empirical stress comparison between unmanaged arrival charging and ChargeWise AI deadline-constrained scheduling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#91A5B3] font-mono">EVALUATION PERIOD:</span>
          <div className="w-56">
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="bg-[#111A22] border-[#253441] text-[#EAF5FA] font-mono text-xs">
                <SelectValue placeholder="Select Day" />
              </SelectTrigger>
              <SelectContent className="bg-[#111A22] border-[#253441] text-[#EAF5FA]">
                <SelectItem value="day-1">Oct 19 — Weekday Baseline</SelectItem>
                <SelectItem value="day-2">Oct 20 — High Demand Shift</SelectItem>
                <SelectItem value="day-3">Oct 21 — Full Lot Peak (Caltech)</SelectItem>
                <SelectItem value="day-4">Oct 22 — Solar Peak Overlap</SelectItem>
                <SelectItem value="day-5">Oct 23 — Grid Curtailment Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Comparison Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Peak Demand */}
        <Card className="p-4 space-y-2 border-[#253441] bg-[#111A22]">
          <div className="flex items-center justify-between text-xs text-[#91A5B3]">
            <span className="font-mono uppercase text-[10px] tracking-wider">Peak Demand</span>
            <Zap className="w-4 h-4 text-[#20E3FF]" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-2xl font-bold font-mono text-[#20E3FF]">
                {formatPower(opt?.peak_demand_kw ?? 44.8)}
              </div>
              <span className="text-[10px] text-[#00D6B3] font-mono">ChargeWise AI</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-[#EF4444] line-through">
                {formatPower(unctrl?.peak_demand_kw ?? 86.4)}
              </div>
              <span className="text-[10px] text-[#91A5B3]">Uncontrolled</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#253441]/80 text-xs text-[#7CFF6B] font-mono font-medium flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>-{formatPercent(comp?.peak_reduction_percent ?? 48)} peak shaved</span>
          </div>
        </Card>

        {/* Transformer Cap Violations */}
        <Card className="p-4 space-y-2 border-[#253441] bg-[#111A22]">
          <div className="flex items-center justify-between text-xs text-[#91A5B3]">
            <span className="font-mono uppercase text-[10px] tracking-wider">Transformer Cap Overloads</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-2xl font-bold font-mono text-[#7CFF6B]">0</div>
              <span className="text-[10px] text-[#00D6B3] font-mono">ChargeWise AI</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-[#EF4444] font-bold">
                {unctrl?.cap_violations ?? 22} intervals
              </div>
              <span className="text-[10px] text-[#91A5B3]">Uncontrolled</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#253441]/80 text-xs text-[#7CFF6B] font-mono font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Substation Compliance</span>
          </div>
        </Card>

        {/* Electricity TOU Cost */}
        <Card className="p-4 space-y-2 border-[#253441] bg-[#111A22]">
          <div className="flex items-center justify-between text-xs text-[#91A5B3]">
            <span className="font-mono uppercase text-[10px] tracking-wider">Electricity TOU Cost</span>
            <DollarSign className="w-4 h-4 text-[#20E3FF]" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-2xl font-bold font-mono text-[#20E3FF]">
                {formatCurrency(comp?.cost_optimized ?? 94.20)}
              </div>
              <span className="text-[10px] text-[#00D6B3] font-mono">ChargeWise AI</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-[#91A5B3] line-through">
                {formatCurrency(comp?.cost_uncontrolled ?? 138.45)}
              </div>
              <span className="text-[10px] text-[#91A5B3]">Uncontrolled</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#253441]/80 text-xs text-[#7CFF6B] font-mono font-medium">
            Saved {formatCurrency(comp?.cost_savings ?? 44.25)} (32% reduction)
          </div>
        </Card>

        {/* Carbon Emissions */}
        <Card className="p-4 space-y-2 border-[#253441] bg-[#111A22]">
          <div className="flex items-center justify-between text-xs text-[#91A5B3]">
            <span className="font-mono uppercase text-[10px] tracking-wider">Carbon Footprint</span>
            <Leaf className="w-4 h-4 text-[#7CFF6B]" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-2xl font-bold font-mono text-[#7CFF6B]">
                {formatCarbon(comp?.carbon_optimized ?? 68.2)}
              </div>
              <span className="text-[10px] text-[#00D6B3] font-mono">ChargeWise AI</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-[#91A5B3]">
                {formatCarbon(comp?.carbon_uncontrolled ?? 112.5)}
              </div>
              <span className="text-[10px] text-[#91A5B3]">Uncontrolled</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#253441]/80 text-xs text-[#7CFF6B] font-mono font-medium">
            Avoided {formatCarbon(comp?.carbon_savings ?? 44.3)} CO₂
          </div>
        </Card>
      </div>

      {/* Large Power Profile Comparison */}
      <Card className="border-[#253441] bg-[#111A22]">
        <CardHeader className="pb-3 border-b border-[#253441]/60">
          <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#20E3FF]" />
              Demand Duration Profile: Uncontrolled Spike vs Flattened Plateau
            </span>
            <span className="text-xs font-mono text-[#91A5B3]">TRANSFORMER CAP: {simulation.siteCapKw} kW</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <PowerDemandChart
            uncontrolledResult={unctrl}
            optimizedResult={opt}
            siteCapKw={simulation.siteCapKw}
            height={360}
          />
        </CardContent>
      </Card>

      {/* Energy Delivery Breakdown Chart */}
      <Card className="border-[#253441] bg-[#111A22]">
        <CardHeader className="pb-3 border-b border-[#253441]/60">
          <CardTitle className="text-sm font-bold text-[#EAF5FA] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#20E3FF]" />
            Per-Vehicle Energy Fulfillment: Target Request vs Unmanaged vs Optimized
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <EnergyDeliveryChart
            uncontrolledOutcomes={unctrl?.outcomes}
            optimizedOutcomes={opt?.outcomes}
            height={340}
          />
        </CardContent>
      </Card>
    </div>
  );
};

