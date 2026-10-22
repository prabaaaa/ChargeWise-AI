import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ActiveSession, CutoffEvent } from '../../../api/types';
import { FacilityScene } from './FacilityScene';
import { FacilityHUD } from './FacilityHUD';
import { CameraPreset } from './CameraController';
import { IntelligenceMode } from './ParkingBay3D';
import { Loader2, AlertCircle } from 'lucide-react';

export interface TwinCanvasProps {
  activeSessions: ActiveSession[];
  siteCapKw: number;
  totalPowerKw: number;
  solarPowerKw: number;
  selectedSessionId?: string | null;
  onSelectSession: (id: string) => void;
  viewMode: '3d' | '2d';
  onViewModeChange: (mode: '3d' | '2d') => void;
  cutoffEvents?: CutoffEvent[];
  className?: string;
}

// Simple WebGL Error Boundary to prevent crashing if WebGL fails
class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error('WebGL Rendering Error:', error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const TwinCanvas: React.FC<TwinCanvasProps> = ({
  activeSessions,
  siteCapKw,
  totalPowerKw,
  solarPowerKw,
  selectedSessionId,
  onSelectSession,
  viewMode,
  onViewModeChange,
  cutoffEvents = [],
  className = '',
}) => {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [intelligenceMode, setIntelligenceMode] = useState<IntelligenceMode>('live');

  return (
    <div className={`relative w-full h-[640px] rounded-2xl overflow-hidden bg-navy-950 border border-graphite-700/70 shadow-2xl ${className}`}>
      {/* Interactive HUD Overlay */}
      <FacilityHUD
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        cameraPreset={cameraPreset}
        onCameraPresetChange={setCameraPreset}
        intelligenceMode={intelligenceMode}
        onIntelligenceModeChange={setIntelligenceMode}
        activeSessions={activeSessions}
        siteCapKw={siteCapKw}
        totalPowerKw={totalPowerKw}
        selectedSessionId={selectedSessionId}
        onSelectSession={onSelectSession}
        onClearSelection={() => onSelectSession('')}
        cutoffEvents={cutoffEvents}
      />

      {/* WebGL Canvas */}
      <WebGLErrorBoundary
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-navy-900">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="font-bold text-white text-sm">WebGL Acceleration Unavailable</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Your browser or graphics driver may not support 3D WebGL context. Please switch to the 2D Facility Map view.
            </p>
            <button
              type="button"
              onClick={() => onViewModeChange('2d')}
              className="mt-4 px-4 py-1.5 rounded-lg bg-teal-500 text-navy-950 font-bold text-xs"
            >
              Switch to 2D Facility Map
            </button>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center text-teal-400 gap-2 bg-navy-950">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs font-mono text-gray-300">
                Initializing 3D Caltech-JPL Digital Twin...
              </span>
            </div>
          }
        >
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{
              position: [0, 20, 26],
              fov: 45,
              near: 0.1,
              far: 200,
            }}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              stencil: false,
            }}
            onPointerMissed={() => onSelectSession('')}
          >
            <FacilityScene
              activeSessions={activeSessions}
              siteCapKw={siteCapKw}
              totalPowerKw={totalPowerKw}
              solarPowerKw={solarPowerKw}
              selectedSessionId={selectedSessionId}
              onSelectSession={onSelectSession}
              cameraPreset={cameraPreset}
              intelligenceMode={intelligenceMode}
            />
          </Canvas>
        </Suspense>
      </WebGLErrorBoundary>
    </div>
  );
};
