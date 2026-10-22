import React from 'react';
import {
  LayoutDashboard,
  Monitor,
  Calendar,
  BarChart3,
  LifeBuoy,
  Leaf,
  Settings,
  Zap,
  X,
  Radio,
  Cpu,
} from 'lucide-react';
import { cn } from '../../utils/formatting';

export type PageId =
  | 'overview'
  | 'digital-twin'
  | 'scheduler'
  | 'comparison'
  | 'rescue'
  | 'sustainability'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  isOpen,
  onClose,
  className,
}) => {
  const navItems: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'digital-twin', label: 'Live Digital Twin', icon: Monitor },
    { id: 'scheduler', label: 'Charging Scheduler', icon: Calendar },
    { id: 'comparison', label: 'Policy Comparison', icon: BarChart3 },
    { id: 'rescue', label: 'Charging Rescue', icon: LifeBuoy },
    { id: 'sustainability', label: 'Energy & Sustainability', icon: Leaf },
    { id: 'settings', label: 'Data & Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#080d12]/80 backdrop-blur-md lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0b131b] border-r border-[#253441]/60 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#253441]/60 bg-[#080d12]/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#20e3ff] to-[#00d6b3] shadow-lg shadow-[#20e3ff]/20 text-[#080d12]">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-[#eaf5fa] text-base">ChargeWise</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#20e3ff]/15 text-[#20e3ff] border border-[#20e3ff]/30">
                  EV OS
                </span>
              </div>
              <span className="block text-[9px] text-[#91a5b3] font-mono tracking-wider">
                MOBILITY INTELLIGENCE
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#91a5b3] hover:text-white hover:bg-[#1a2632] lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  onClose();
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all group relative select-none',
                  isActive
                    ? 'bg-[#20e3ff]/10 text-[#20e3ff] font-semibold shadow-inner border border-[#20e3ff]/20'
                    : 'text-[#91a5b3] hover:bg-[#172330]/60 hover:text-[#eaf5fa]'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#20e3ff] shadow-[0_0_10px_#20e3ff]" />
                )}
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-[#20e3ff]' : 'text-[#91a5b3] group-hover:text-[#eaf5fa]'
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Facility Telematics Badge */}
        <div className="p-4 border-t border-[#253441]/60 bg-[#080d12]/70">
          <div className="rounded-xl p-3 bg-[#111a22] border border-[#253441] text-xs space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-[#91a5b3] text-[9px] uppercase font-mono tracking-wider">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#20e3ff]" />
                Facility Telemetry
              </span>
              <span className="flex items-center gap-1 text-[#7cff6b] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7cff6b] animate-pulse" />
                ACTIVE
              </span>
            </div>
            <div className="text-[#eaf5fa] font-semibold text-xs">Caltech-JPL Campus</div>
            <div className="text-[10px] text-[#91a5b3] font-mono flex items-center justify-between">
              <span>20 Bays Online</span>
              <span className="text-[#20e3ff]">45 kW Cap</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
