import React, { useMemo } from 'react';
import { ActiveSession } from '../../../api/types';
import { FacilityEnvironment3D } from './FacilityEnvironment3D';
import { Substation3D } from './Substation3D';
import { PowerConduits3D } from './PowerConduits3D';
import { ParkingBay3D, IntelligenceMode } from './ParkingBay3D';
import { CameraController, CameraPreset } from './CameraController';

export interface FacilitySceneProps {
  activeSessions: ActiveSession[];
  siteCapKw: number;
  totalPowerKw: number;
  solarPowerKw: number;
  selectedSessionId?: string | null;
  onSelectSession: (id: string) => void;
  cameraPreset: CameraPreset;
  intelligenceMode: IntelligenceMode;
}

export const FacilityScene: React.FC<FacilitySceneProps> = React.memo(({
  activeSessions,
  siteCapKw,
  totalPowerKw,
  solarPowerKw,
  selectedSessionId,
  onSelectSession,
  cameraPreset,
  intelligenceMode,
}) => {
  // 20 Bays: Row 1 (North CP-01 to CP-10) and Row 2 (South CP-11 to CP-20)
  const row1Bays = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const chargerId = `CP-${String(i + 1).padStart(2, '0')}`;
      const session = activeSessions.find((s) => s.charger_id === chargerId);
      const x = (i - 4.5) * 3.2;
      const z = -6.3;
      return {
        spotNumber: i + 1,
        chargerId,
        session,
        position: [x, 0, z] as [number, number, number],
        rotationY: 0,
      };
    });
  }, [activeSessions]);

  const row2Bays = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const spotNum = i + 11;
      const chargerId = `CP-${String(spotNum).padStart(2, '0')}`;
      const session = activeSessions.find((s) => s.charger_id === chargerId);
      const x = (i - 4.5) * 3.2;
      const z = 6.3;
      return {
        spotNumber: spotNum,
        chargerId,
        session,
        position: [x, 0, z] as [number, number, number],
        rotationY: Math.PI,
      };
    });
  }, [activeSessions]);

  const selectedPosition = useMemo((): [number, number, number] | null => {
    if (!selectedSessionId) return null;
    const allBays = [...row1Bays, ...row2Bays];
    const match = allBays.find(
      (b) =>
        b.session?.session_id === selectedSessionId ||
        b.chargerId === selectedSessionId
    );
    return match ? match.position : null;
  }, [selectedSessionId, row1Bays, row2Bays]);

  return (
    <>
      {/* 1. Camera Director */}
      <CameraController
        preset={cameraPreset}
        selectedPos={selectedPosition}
      />

      {/* 2. Atmospheric Depth Fog */}
      <fog attach="fog" args={['#080e1a', 45, 140]} />

      {/* 3. Cinematic Studio & Campus Lighting */}
      {/* High-quality ambient daylight fill */}
      <ambientLight intensity={0.65} color="#cbd5e1" />

      {/* Primary Key Sunlight with Soft High-Resolution Shadows */}
      <directionalLight
        position={[28, 38, 22]}
        intensity={1.35}
        color="#f8fafc"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={100}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.00015}
      />

      {/* Secondary Cool Architectural Fill Light from West */}
      <directionalLight
        position={[-24, 22, -18]}
        intensity={0.45}
        color="#38bdf8"
      />

      {/* Warm Golden Hour Rim Light from East */}
      <directionalLight
        position={[26, 12, -15]}
        intensity={0.25}
        color="#fef08a"
      />

      {/* Hemisphere Skylight vs Ground Bounce */}
      <hemisphereLight args={['#0284c7', '#0f172a', 0.45]} />

      {/* 4. Complete Campus Architecture & Environment */}
      <FacilityEnvironment3D
        solarPowerKw={solarPowerKw}
        activeSessions={activeSessions}
      />

      {/* 5. 480V 3-Phase Industrial Campus Substation */}
      <Substation3D
        position={[-20.0, 0, 0]}
        totalPowerKw={totalPowerKw}
        siteCapKw={siteCapKw}
        solarPowerKw={solarPowerKw}
      />

      {/* 6. ChargeWise Energy Network (Conduits & Dynamic Pulses) */}
      <PowerConduits3D
        activeSessions={activeSessions}
        substationX={-17.5}
      />

      {/* 7. 20 Interactive Charging Bays with Intelligence Heatmaps */}
      {/* North Row: CP-01 to CP-10 */}
      {row1Bays.map((bay) => {
        const isSelected =
          (bay.session && bay.session.session_id === selectedSessionId) ||
          bay.chargerId === selectedSessionId;
        return (
          <ParkingBay3D
            key={bay.chargerId}
            chargerId={bay.chargerId}
            spotNumber={bay.spotNumber}
            position={bay.position}
            rotationY={bay.rotationY}
            session={bay.session}
            isSelected={isSelected}
            onSelect={onSelectSession}
            intelligenceMode={intelligenceMode}
          />
        );
      })}

      {/* South Row: CP-11 to CP-20 */}
      {row2Bays.map((bay) => {
        const isSelected =
          (bay.session && bay.session.session_id === selectedSessionId) ||
          bay.chargerId === selectedSessionId;
        return (
          <ParkingBay3D
            key={bay.chargerId}
            chargerId={bay.chargerId}
            spotNumber={bay.spotNumber}
            position={bay.position}
            rotationY={bay.rotationY}
            session={bay.session}
            isSelected={isSelected}
            onSelect={onSelectSession}
            intelligenceMode={intelligenceMode}
          />
        );
      })}
    </>
  );
});

FacilityScene.displayName = 'FacilityScene';

