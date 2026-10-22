import React from 'react';
import { Clock } from 'lucide-react';
import { formatTime } from '../../utils/formatting';
import { cn } from '../../utils/formatting';

export interface TimeDisplayProps {
  isoString: string;
  intervalIndex: number;
  totalIntervals: number;
  className?: string;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  isoString,
  intervalIndex,
  totalIntervals,
  className,
}) => {
  const timeFormatted = formatTime(isoString);
  const dateFormatted = isoString ? new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Oct 21, 2026';

  return (
    <div className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-navy-800 border border-graphite-600/60 shadow-inner', className)}>
      <Clock className="w-4 h-4 text-teal-400 animate-pulse" />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold font-mono text-white tracking-wider">{timeFormatted}</span>
          <span className="text-[10px] uppercase font-semibold text-teal-400 bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-500/30">
            {isoString.includes('Z') ? 'UTC' : 'PDT'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>{dateFormatted}</span>
          <span>•</span>
          <span>Step {intervalIndex + 1}/{totalIntervals}</span>
        </div>
      </div>
    </div>
  );
};
