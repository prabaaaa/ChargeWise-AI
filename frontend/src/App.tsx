import React, { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { PageId } from './components/layout/Sidebar';
import { useSimulation } from './hooks/useSimulation';
import { OverviewPage } from './pages/OverviewPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { RescuePage } from './pages/RescuePage';
import { SustainabilityPage } from './pages/SustainabilityPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ErrorState } from './components/ui/ErrorState';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const simulation = useSimulation();

  if (simulation.isLoading && !simulation.simulationResult) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-navy-900 text-white">
        <LoadingSpinner size="lg" message="Initializing ChargeWise AI Engine & Caltech Benchmark..." />
      </div>
    );
  }

  if (simulation.error && !simulation.simulationResult) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-navy-900 p-6">
        <ErrorState
          title="Engine Initialization Error"
          message={simulation.error}
          onRetry={simulation.reload}
        />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage simulation={simulation} onNavigate={setCurrentPage} />;
      case 'digital-twin':
        return <DigitalTwinPage simulation={simulation} onNavigate={setCurrentPage} />;
      case 'scheduler':
        return <SchedulerPage simulation={simulation} onNavigate={setCurrentPage} />;
      case 'comparison':
        return <ComparisonPage simulation={simulation} />;
      case 'rescue':
        return <RescuePage simulation={simulation} />;
      case 'sustainability':
        return <SustainabilityPage simulation={simulation} />;
      case 'settings':
        return <SettingsPage simulation={simulation} />;
      default:
        return <OverviewPage simulation={simulation} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <AppShell
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      simulation={simulation}
    >
      {renderPage()}
    </AppShell>
  );
}

export default App;
