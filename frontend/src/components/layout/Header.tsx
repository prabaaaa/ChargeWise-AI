import React from 'react';
import { Menu, Play, Pause, RotateCcw, Zap, Car, Clock, ShieldCheck, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatTime } from '../../utils/formatting';
import { cn } from '../../utils/formatting';

export interface HeaderProps {
  onToggleSidebar: () => void;
  isRunning: boolean;
  onTogglePlayPause: () => void;
  onReset: () => void;
  currentTime: string;
  connectedCount: number;
  currentPowerKw: number;
  siteCapKw: number;
  policy: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isRunning,
  onTogglePlayPause,
  onReset,
  currentTime,
  connectedCount,
  currentPowerKw,
  siteCapKw,
  policy,
}) => {
  const isCapExceeded = currentPowerKw > siteCapKw + 0.1;
  const loadPercentage = siteCapKw > 0 ? (currentPowerKw / siteCapKw) * 100 : 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#253441]/70 bg-[#0b131b]/95 px-4 sm:px-6 backdrop-blur-md shadow-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-[#91a5b3] hover:text-white hover:bg-[#1a2632] lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Scheduling Policy Badge */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#91a5b3] font-mono">
            Scheduler Engine:
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold font-mono bg-[#20e3ff]/10 text-[#20e3ff] border border-[#20e3ff]/30 shadow-sm flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#20e3ff]" />
            {policy === 'optimized'
              ? 'ChargeWise LLF (Peak Shaved)'
              : 'Uncontrolled FIFO (Max Draw)'}
          </span>
        </div>
      </div>

      {/* Header Quick Telemetry & Playback Controls */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Simulation Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111a22] border border-[#253441] font-mono text-xs text-[#eaf5fa] shadow-sm">
          <Clock className="w-3.5 h-3.5 text-[#20e3ff]" />
          <span className="font-bold">{formatTime(currentTime)}</span>
        </div>

        {/* Connected Vehicles */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111a22] border border-[#253441] text-xs text-[#eaf5fa] font-mono shadow-sm">
          <Car className="w-3.5 h-3.5 text-[#00d6b3]" />
          <span>{connectedCount} Active EVs</span>
        </div>

        {/* Site Power Usage vs Cap */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs shadow-sm transition-all',
            isCapExceeded
              ? 'bg-[#450a0a]/80 text-[#fca5a5] border-[#ef4444] animate-pulse'
              : 'bg-[#111a22] text-[#eaf5fa] border-[#253441]'
          )}
        >
          <Zap className={cn('w-3.5 h-3.5', isCapExceeded ? 'text-[#ef4444]' : 'text-[#20e3ff]')} />
          <span className="font-bold">{currentPowerKw.toFixed(1)} kW</span>
          <span className="text-[10px] text-[#91a5b3]">/ {siteCapKw} kW</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded text-[9px] font-bold ml-1',
              isCapExceeded
                ? 'bg-red-500/20 text-red-300'
                : loadPercentage > 85
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-[#20e3ff]/15 text-[#20e3ff]'
            )}
          >
            {loadPercentage.toFixed(0)}%
          </span>
        </div>

        {/* Play/Pause & Reset Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant={isRunning ? 'secondary' : 'primary'}
            size="sm"
            onClick={onTogglePlayPause}
            className="h-8 px-3 text-xs gap-1.5 font-bold"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Simulate</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 w-8 p-0 text-[#91a5b3] hover:text-[#eaf5fa] hover:bg-[#1a2632]"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
