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
  Cell,
} from 'recharts';
import { SessionOutcome } from '../../api/types';

export interface EnergyDeliveryChartProps {
  uncontrolledOutcomes?: SessionOutcome[];
  optimizedOutcomes?: SessionOutcome[];
  height?: number;
}

export const EnergyDeliveryChart: React.FC<EnergyDeliveryChartProps> = ({
  uncontrolledOutcomes = [],
  optimizedOutcomes = [],
  height = 360,
}) => {
  const chartData = optimizedOutcomes.slice(0, 12).map((opt) => {
    const unctrl = uncontrolledOutcomes.find((u) => u.session_id === opt.session_id);
    const requested = opt.energy_requested_kwh || 20;
    const deliveredOpt = opt.energy_delivered_kwh;
    const deliveredUnctrl = unctrl ? unctrl.energy_delivered_kwh : deliveredOpt;
    const shortfall = Math.max(0, requested - deliveredOpt);

    return {
      name: opt.session_id.replace('cs-', 'EV-'),
      requested,
      uncontrolled: deliveredUnctrl,
      optimized: deliveredOpt,
      shortfall,
      isUnderserved: opt.is_underserved,
    };
  });

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#253441" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#91A5B3"
            fontSize={11}
            tickLine={false}
            angle={-30}
            textAnchor="end"
            fontFamily="monospace"
          />
          <YAxis
            stroke="#91A5B3"
            fontSize={11}
            tickLine={false}
            unit=" kWh"
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
              const formatted = `${Number(value).toFixed(1)} kWh`;
              if (name === 'requested') return [formatted, 'Requested Demand'];
              if (name === 'uncontrolled') return [formatted, 'Uncontrolled Delivered'];
              if (name === 'optimized') return [formatted, 'ChargeWise AI Delivered'];
              return [formatted, name];
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            formatter={(value) => {
              if (value === 'requested') return <span className="text-xs text-[#91A5B3] font-mono">Target Request</span>;
              if (value === 'uncontrolled') return <span className="text-xs text-[#EF4444] font-mono">Uncontrolled</span>;
              if (value === 'optimized') return <span className="text-xs text-[#20E3FF] font-mono font-bold">ChargeWise AI</span>;
              return <span className="text-xs text-[#EAF5FA] font-mono">{value}</span>;
            }}
          />
          <Bar dataKey="requested" fill="#253441" radius={[4, 4, 0, 0]} />
          <Bar dataKey="uncontrolled" fill="#EF4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="optimized" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isUnderserved ? '#F59E0B' : '#20E3FF'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

