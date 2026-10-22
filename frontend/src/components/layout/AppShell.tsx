import React, { useState } from 'react';
import { Sidebar, PageId } from './Sidebar';
import { Header } from './Header';
import { useSimulation } from '../../hooks/useSimulation';
import { ToastProvider, ToastViewport } from '../ui/Toast';

export interface AppShellProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
  children: React.ReactNode;
  simulation: ReturnType<typeof useSimulation>;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onPageChange,
  children,
  simulation,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#080d12] text-[#eaf5fa]">
        {/* Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onPageChange={onPageChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Column */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#080d12] ev-tech-grid">
          {/* Header */}
          <Header
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            isRunning={simulation.isRunning}
            onTogglePlayPause={simulation.togglePlayPause}
            onReset={simulation.reset}
            currentTime={simulation.currentTime}
            connectedCount={simulation.activeSessions.length}
            currentPowerKw={simulation.currentInterval?.site_total_power_kw ?? 0}
            siteCapKw={simulation.siteCapKw}
            policy={simulation.policy}
          />

          {/* Main page view */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {children}
          </main>
        </div>
      </div>
      <ToastViewport />
    </ToastProvider>
  );
};
