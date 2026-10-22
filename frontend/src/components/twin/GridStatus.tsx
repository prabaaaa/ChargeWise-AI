import React from 'react';
import { Zap, Sun, Car, Activity } from 'lucide-react';
import { Progress } from '../ui/Progress';
import { cn } from '../../utils/formatting';

export interface GridStatusProps {
  totalPowerKw: number;
  siteCapKw: number;
  solarPowerKw: number;
  gridPowerKw: number;
  connectedCount: number;
  className?: string;
}

export const GridStatus: React.FC<GridStatusProps> = ({
  totalPowerKw,
  siteCapKw,
  solarPowerKw,
  gridPowerKw,
  connectedCount,
  className,
}) => {
  const utilization = siteCapKw > 0 ? (totalPowerKw / siteCapKw) * 100 : 0;
  const isOverCap = totalPowerKw > siteCapKw + 0.1;
  const isNearCap = utilization > 85;

  return (
    <div className={cn('p-4 rounded-2xl bg-[#111a22]/95 border border-[#253441] shadow-xl space-y-3 backdrop-blur-md', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-[#20e3ff]/10 border border-[#20e3ff]/30 text-[#20e3ff]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#eaf5fa] uppercase tracking-wider font-mono">Grid & Substation Telemetry</h4>
            <p className="text-[10px] text-[#91a5b3]">Live Phase Load & Transformer Headroom</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border',
              isOverCap
                ? 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/40 animate-pulse'
                : isNearCap
                ? 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40'
                : 'bg-[#7cff6b]/15 text-[#7cff6b] border-[#7cff6b]/40'
            )}
          >
            {isOverCap ? 'CAP EXCEEDED' : isNearCap ? 'HIGH DEMAND' : 'OPTIMAL LOAD'}
          </span>
        </div>
      </div>

      {/* 4 Metrics in a row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-xl bg-[#080d12] border border-[#253441]">
          <div className="flex items-center gap-1.5 text-[#91a5b3] text-[10px] font-mono mb-1">
            <Zap className="w-3 h-3 text-[#20e3ff]" />
            <span>Site Load</span>
          </div>
          <div className="font-mono text-base font-bold text-[#eaf5fa]">
            {totalPowerKw.toFixed(1)} <span className="text-[10px] font-normal text-[#91a5b3]">/ {siteCapKw} kW</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#080d12] border border-[#253441]">
          <div className="flex items-center gap-1.5 text-[#91a5b3] text-[10px] font-mono mb-1">
            <Sun className="w-3 h-3 text-[#f59e0b]" />
            <span>Solar Generation</span>
          </div>
          <div className="font-mono text-base font-bold text-[#f59e0b]">
            {solarPowerKw.toFixed(1)} <span className="text-[10px] font-normal text-[#91a5b3]">kW</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#080d12] border border-[#253441]">
          <div className="flex items-center gap-1.5 text-[#91a5b3] text-[10px] font-mono mb-1">
            <Zap className="w-3 h-3 text-[#00d6b3]" />
            <span>Grid Import</span>
          </div>
          <div className="font-mono text-base font-bold text-[#00d6b3]">
            {gridPowerKw.toFixed(1)} <span className="text-[10px] font-normal text-[#91a5b3]">kW</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#080d12] border border-[#253441]">
          <div className="flex items-center gap-1.5 text-[#91a5b3] text-[10px] font-mono mb-1">
            <Car className="w-3 h-3 text-[#20e3ff]" />
            <span>Connected EVs</span>
          </div>
          <div className="font-mono text-base font-bold text-[#20e3ff]">
            {connectedCount} <span className="text-[10px] font-normal text-[#91a5b3]">vehicles</span>
          </div>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] text-[#91a5b3] font-mono">
          <span>Substation Capacity Utilization</span>
          <span className="font-bold text-[#eaf5fa]">{Math.round(utilization)}%</span>
        </div>
        <Progress
          value={Math.min(100, utilization)}
          className="bg-[#080d12] h-2"
          indicatorClassName={cn(
            isOverCap ? 'bg-[#ef4444]' : isNearCap ? 'bg-[#f59e0b]' : 'bg-[#20e3ff]'
          )}
        />
      </div>
    </div>
  );
};
