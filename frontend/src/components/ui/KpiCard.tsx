import React from 'react';
import { Card } from './Card';
import { cn } from '../../utils/formatting';
import { LucideIcon } from 'lucide-react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  comparisonValue?: string;
  comparisonLabel?: string;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  icon: Icon,
  iconColor = 'text-[#20e3ff]',
  trend,
  comparisonValue,
  comparisonLabel,
  className,
}) => {
  return (
    <Card className={cn('relative overflow-hidden group hover:border-[#20e3ff]/40 transition-all p-4.5 bg-[#111a22]/95 border border-[#253441]', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[#91a5b3] uppercase tracking-wider font-mono">{label}</p>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#eaf5fa] font-mono">{value}</span>
            {unit && <span className="text-xs text-[#91a5b3] font-medium font-mono">{unit}</span>}
          </div>
        </div>

        {Icon && (
          <div className={cn('p-2.5 rounded-xl bg-[#172330] border border-[#253441] shadow-inner group-hover:scale-110 group-hover:border-[#20e3ff]/30 transition-all duration-200', iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(trend || comparisonValue) && (
        <div className="mt-3 pt-2.5 border-t border-[#253441]/60 flex items-center justify-between text-xs">
          {trend && (
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span
                className={cn(
                  'font-semibold inline-flex items-center',
                  trend.direction === 'up' && 'text-[#7cff6b]',
                  trend.direction === 'down' && 'text-[#20e3ff]',
                  trend.direction === 'neutral' && 'text-[#91a5b3]'
                )}
              >
                {trend.direction === 'up' ? '↑ ' : trend.direction === 'down' ? '↓ ' : ''}
                {trend.value}
              </span>
              {trend.label && <span className="text-[#91a5b3]">{trend.label}</span>}
            </div>
          )}

          {comparisonValue && (
            <div className="text-[#91a5b3] ml-auto text-[11px] font-mono">
              {comparisonLabel && <span>{comparisonLabel}: </span>}
              <span className="text-[#eaf5fa] font-semibold">{comparisonValue}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
