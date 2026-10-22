import React from 'react';
import { Zap, AlertOctagon } from 'lucide-react';
import { Slider } from '../ui/Slider';
import { Button } from '../ui/Button';
import { SITE_CAP_PRESETS } from '../../utils/constants';
import { cn } from '../../utils/formatting';

export interface PowerCapControlProps {
  currentCap: number;
  onCapChange: (newCap: number) => void;
  className?: string;
  compact?: boolean;
}

export const PowerCapControl: React.FC<PowerCapControlProps> = ({
  currentCap,
  onCapChange,
  className,
  compact = false,
}) => {
  const handleStressTest = () => {
    const stressedCap = Math.max(15, Math.round(currentCap * 0.5));
    onCapChange(stressedCap);
  };

  return (
    <div className={cn('p-4 rounded-2xl bg-[#111a22]/95 border border-[#253441] shadow-xl backdrop-blur-md', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-[#20e3ff]/10 border border-[#20e3ff]/30 text-[#20e3ff]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#eaf5fa] uppercase tracking-wider font-mono">Site Power Cap</h4>
            <p className="text-[10px] text-[#91a5b3]">Active Substation Feed Limit</p>
          </div>
        </div>

        <div className="flex items-baseline gap-1 bg-[#080d12] px-3 py-1 rounded-xl border border-[#253441] font-mono shadow-inner">
          <span className="text-base font-extrabold text-[#20e3ff]">{currentCap}</span>
          <span className="text-[10px] text-[#91a5b3] font-medium">kW</span>
        </div>
      </div>

      <div className="py-2">
        <Slider
          value={[currentCap]}
          min={5}
          max={100}
          step={1}
          onValueChange={(val) => onCapChange(val[0])}
        />
        <div className="flex justify-between text-[10px] text-[#91a5b3] font-mono mt-1">
          <span>5 kW</span>
          <span className="text-[#00d6b3]">50 kW Normal</span>
          <span>100 kW</span>
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#253441]/60 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#91a5b3] font-mono mr-1">Presets:</span>
            {SITE_CAP_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => onCapChange(preset)}
                className={cn(
                  'px-2.5 py-0.5 rounded-lg text-xs font-mono transition-all border',
                  currentCap === preset
                    ? 'bg-[#20e3ff] text-[#080d12] border-[#20e3ff] font-bold shadow-sm'
                    : 'bg-[#172330] text-[#91a5b3] border-[#253441] hover:bg-[#1e2f3f] hover:text-[#eaf5fa]'
                )}
              >
                {preset}k
              </button>
            ))}
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleStressTest}
            className="text-[11px] h-7 px-2.5 gap-1 shadow-red-500/15 font-bold"
            title="Halve site capacity to trigger real-time curtailment & rescue"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            -50% Stress Test
          </Button>
        </div>
      )}
    </div>
  );
};
