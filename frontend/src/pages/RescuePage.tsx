import React from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { RescuePanel } from '../components/rescue/RescuePanel';

export const RescuePage: React.FC<{ simulation: ReturnType<typeof useSimulation> }> = ({
  simulation,
}) => {
  return (
    <div className="space-y-6">
      <RescuePanel
        sessions={simulation.allSessions}
        activeSessions={simulation.activeSessions}
        initialSelectedSessionId={simulation.selectedSessionId}
      />
    </div>
  );
};
