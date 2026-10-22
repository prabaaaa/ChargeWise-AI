import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { DEFAULT_TARIFF_PROFILE } from '../../utils/constants';
import { SimulationResult } from '../../api/types';

export interface CostChartProps {
  uncontrolledResult?: SimulationResult | null;
  optimizedResult?: SimulationResult | null;
  height?: number;
}

export const CostChart: React.FC<CostChartProps> = ({
  uncontrolledResult,
  optimizedResult,
  height = 340,
}) => {
  // Aggregate hourly energy * tariff rate for both policies
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 to 21:00

  const hourlyData = hours.map((hour) => {
    const tariff = DEFAULT_TARIFF_PROFILE[hour] || 0.20;
    const hourPrefix = `${String(hour).padStart(2, '0')}:`;

    // Filter intervals belonging to this hour
    const unctrlIntervals = uncontrolledResult?.intervals.filter((int) =>
      int.timestamp.includes(`T${hourPrefix}`)
    ) || [];
    const optIntervals = optimizedResult?.intervals.filter((int) =>
      int.timestamp.includes(`T${hourPrefix}`)
    ) || [];

    // Sum kW * 0.25h * tariff
    const unctrlKwh = unctrlIntervals.reduce((sum, int) => sum + int.grid_power_kw * 0.25, 0);
    const optKwh = optIntervals.reduce((sum, int) => sum + int.grid_power_kw * 0.25, 0);

    const costUnctrl = unctrlKwh * tariff;
    const costOpt = optKwh * tariff;

    return {
      hour: `${hour}:00`,
      tariff: `$${tariff.toFixed(2)}/kWh`,
      isPeakTOU: hour >= 16 && hour <= 20,
      uncontrolledCost: Math.round(costUnctrl * 100) / 100,
      optimizedCost: Math.round(costOpt * 100) / 100,
      savings: Math.max(0, Math.round((costUnctrl - costOpt) * 100) / 100),
    };
  });

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={hourlyData}
          margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#253441" vertical={false} />
          <XAxis
            dataKey="hour"
            stroke="#91A5B3"
            fontSize={11}
            tickLine={false}
            fontFamily="monospace"
          />
          <YAxis
            stroke="#91A5B3"
            fontSize={11}
            tickLine={false}
            unit=" $"
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
              const formatted = `$${Number(value).toFixed(2)}`;
              if (name === 'uncontrolledCost') return [formatted, 'Uncontrolled Cost'];
              if (name === 'optimizedCost') return [formatted, 'ChargeWise AI Cost'];
              return [formatted, name];
            }}
            labelFormatter={(label) => `${label} (TOU Dynamic Tariff Rate)`}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            formatter={(value) => {
              if (value === 'uncontrolledCost') return <span className="text-xs text-[#EF4444] font-mono">Uncontrolled Cost ($)</span>;
              if (value === 'optimizedCost') return <span className="text-xs text-[#00D6B3] font-mono font-bold">ChargeWise AI Cost ($)</span>;
              return <span className="text-xs text-[#91A5B3] font-mono">{value}</span>;
            }}
          />
          <Bar dataKey="uncontrolledCost" fill="#EF4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="optimizedCost" fill="#00D6B3" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

