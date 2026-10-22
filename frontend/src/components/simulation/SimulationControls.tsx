import React from 'react';
import { Play, Pause, StepForward, RotateCcw, FastForward } from 'lucide-react';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { TimeDisplay } from './TimeDisplay';
import { SIMULATION_SPEEDS } from '../../utils/constants';
import { cn } from '../../utils/formatting';

export interface SimulationControlsProps {
  isRunning: boolean;
  speed: number;
  currentIntervalIndex: number;
  totalIntervals: number;
  currentTime: string;
  onTogglePlayPause: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onIntervalChange?: (index: number) => void;
  className?: string;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isRunning,
  speed,
  currentIntervalIndex,
  totalIntervals,
  currentTime,
  onTogglePlayPause,
  onStepForward,
  onReset,
  onSpeedChange,
  className,
}) => {
  const progressPercent = totalIntervals > 0 ? ((currentIntervalIndex + 1) / totalIntervals) * 100 : 0;

  return (
    <div className={cn('p-4 rounded-2xl bg-[#111a22]/95 border border-[#253441] shadow-xl space-y-3 backdrop-blur-md', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={isRunning ? 'secondary' : 'primary'}
            size="sm"
            onClick={onTogglePlayPause}
            className="w-26 gap-1.5 font-bold shadow-md"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Simulate
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onStepForward}
            title="Advance 15-minute interval"
            disabled={isRunning}
            className="gap-1 text-xs font-mono"
          >
            <StepForward className="w-3.5 h-3.5" />
            +15m Step
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            title="Reset simulation to beginning"
            className="text-[#91a5b3] hover:text-[#eaf5fa] hover:bg-[#1a2632]"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1.5 bg-[#080d12] p-1 rounded-xl border border-[#253441]">
          <FastForward className="w-3.5 h-3.5 text-[#91a5b3] ml-1 mr-0.5" />
          {SIMULATION_SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn(
                'px-2.5 py-0.5 rounded-lg text-xs font-mono transition-all font-semibold',
                speed === s
                  ? 'bg-[#20e3ff] text-[#080d12] font-bold shadow-sm'
                  : 'text-[#91a5b3] hover:text-[#eaf5fa]'
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Time display */}
        <TimeDisplay
          isoString={currentTime}
          intervalIndex={currentIntervalIndex}
          totalIntervals={totalIntervals}
        />
      </div>

      {/* Progress track */}
      <div className="space-y-1">
        <Progress value={progressPercent} className="h-1.5 bg-[#080d12]" />
        <div className="flex justify-between text-[10px] text-[#91a5b3] font-mono">
          <span>06:00 (Arrivals)</span>
          <span className="text-[#20e3ff]">12:00 (Solar Peak)</span>
          <span>22:00 (Departures)</span>
        </div>
      </div>
    </div>
  );
};
