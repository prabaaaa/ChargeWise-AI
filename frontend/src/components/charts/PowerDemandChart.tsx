import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { SimulationResult } from '../../api/types';
import { formatTime } from '../../utils/formatting';

export interface PowerDemandChartProps {
  uncontrolledResult?: SimulationResult | null;
  optimizedResult?: SimulationResult | null;
  siteCapKw?: number;
  currentIntervalTimestamp?: string;
  height?: number;
}

export const PowerDemandChart: React.FC<PowerDemandChartProps> = ({
  uncontrolledResult,
  optimizedResult,
  siteCapKw = 45,
  currentIntervalTimestamp,
  height = 340,
}) => {
  // Combine uncontrolled and optimized intervals into a single chart dataset
  const intervalsCount = Math.max(
    uncontrolledResult?.intervals.length || 0,
    optimizedResult?.intervals.length || 0
  );

  const chartData = [];
  for (let i = 0; i < intervalsCount; i++) {
    const unctrl = uncontrolledResult?.intervals[i];
    const opt = optimizedResult?.intervals[i];
    const timestamp = opt?.timestamp || unctrl?.timestamp || '';
    const label = formatTime(timestamp);

    chartData.push({
      timestamp,
      time: label,
      uncontrolled: unctrl?.site_total_power_kw ?? 0,
      optimized: opt?.site_total_power_kw ?? 0,
      solar: opt?.solar_power_kw ?? 0,
      cap: siteCapKw,
    });
  }

  const currentTimeLabel = currentIntervalTimestamp ? formatTime(currentIntervalTimestamp) : null;

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="uncontrolledGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="optimizedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#20E3FF" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#00D6B3" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#253441" vertical={false} />
          
          <XAxis
            dataKey="time"
            stroke="#91A5B3"
            fontSize={11}
            tickLine={false}
            interval={4}
          />
          <YAxis
            stroke="#91A5B3"
            fontSize={11}
            tickLine={false}
            unit=" kW"
            domain={[0, (dataMax: number) => Math.max(60, Math.ceil(dataMax * 1.15))]}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#111A22',
              borderColor: '#253441',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6)',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
            labelStyle={{ color: '#EAF5FA', marginBottom: '4px', fontWeight: 'bold' }}
            formatter={(value: any, name: string) => {
              const formattedVal = `${Number(value).toFixed(1)} kW`;
              if (name === 'uncontrolled') return [formattedVal, 'Uncontrolled Demand'];
              if (name === 'optimized') return [formattedVal, 'ChargeWise AI Load'];
              return [formattedVal, name];
            }}
          />

          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            formatter={(value) => {
              if (value === 'uncontrolled') return <span className="text-xs text-[#EF4444] font-mono font-medium">Uncontrolled (Spike Load)</span>;
              if (value === 'optimized') return <span className="text-xs text-[#20E3FF] font-mono font-bold">ChargeWise AI (Optimized)</span>;
              return <span className="text-xs text-[#91A5B3] font-mono">{value}</span>;
            }}
          />

          {/* Site Cap Reference Line */}
          <ReferenceLine
            y={siteCapKw}
            stroke="#F59E0B"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: `Site Cap: ${siteCapKw} kW`,
              fill: '#F59E0B',
              fontSize: 11,
              position: 'insideTopRight',
            }}
          />

          {/* Current Simulation Step Indicator */}
          {currentTimeLabel && (
            <ReferenceLine
              x={currentTimeLabel}
              stroke="#20E3FF"
              strokeWidth={2}
              label={{
                value: 'NOW',
                fill: '#20E3FF',
                fontSize: 10,
                position: 'top',
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="uncontrolled"
            stroke="#EF4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#uncontrolledGradient)"
          />

          <Area
            type="monotone"
            dataKey="optimized"
            stroke="#20E3FF"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#optimizedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

