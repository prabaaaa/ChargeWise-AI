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
import { SimulationInterval } from '../../api/types';
import { formatTime } from '../../utils/formatting';

export interface SolarChartProps {
  intervals: SimulationInterval[];
  siteCapKw?: number;
  height?: number;
}

export const SolarChart: React.FC<SolarChartProps> = ({
  intervals = [],
  siteCapKw = 45,
  height = 340,
}) => {
  const chartData = intervals.map((interval) => ({
    time: formatTime(interval.timestamp),
    grid: interval.grid_power_kw,
    solar: interval.solar_power_kw,
    total: interval.site_total_power_kw,
    cap: siteCapKw,
  }));

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.65} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
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
            fontFamily="monospace"
          />
          <YAxis
            stroke="#91A5B3"
            fontSize={11}
            tickLine={false}
            unit=" kW"
            fontFamily="monospace"
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
            labelStyle={{ color: '#EAF5FA', fontWeight: 'bold' }}
            formatter={(value: any, name: string) => {
              const formattedVal = `${Number(value).toFixed(1)} kW`;
              if (name === 'solar') return [formattedVal, 'Solar Generation Absorbed'];
              if (name === 'grid') return [formattedVal, 'Grid Import'];
              return [formattedVal, name];
            }}
          />

          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            formatter={(value) => {
              if (value === 'solar') return <span className="text-xs text-[#F59E0B] font-mono font-medium">Solar PV Contribution</span>;
              if (value === 'grid') return <span className="text-xs text-[#20E3FF] font-mono font-medium">Grid Draw</span>;
              return <span className="text-xs text-[#91A5B3] font-mono">{value}</span>;
            }}
          />

          <ReferenceLine
            y={siteCapKw}
            stroke="#F59E0B"
            strokeDasharray="4 4"
            label={{
              value: `Transformer Cap: ${siteCapKw} kW`,
              fill: '#F59E0B',
              fontSize: 11,
              position: 'insideTopRight',
            }}
          />

          <Area
            type="monotone"
            dataKey="solar"
            stackId="1"
            stroke="#F59E0B"
            strokeWidth={2}
            fill="url(#solarGradient)"
          />

          <Area
            type="monotone"
            dataKey="grid"
            stackId="1"
            stroke="#20E3FF"
            strokeWidth={2}
            fill="url(#gridGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

