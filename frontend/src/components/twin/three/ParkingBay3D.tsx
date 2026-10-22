import React, { useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { ActiveSession } from '../../../api/types';
import { ProceduralVehicle, getVehicleColor } from './ProceduralVehicle';
import { ChargerPedestal3D } from './ChargerPedestal3D';
import { ChargingCable3D } from './ChargingCable3D';

export type IntelligenceMode = 'live' | 'power' | 'risk' | 'cutoff';

export interface ParkingBay3DProps {
  chargerId: string;
  spotNumber: number;
  position: [number, number, number];
  rotationY: number;
  session?: ActiveSession | null;
  isSelected?: boolean;
  onSelect: (id: string) => void;
  intelligenceMode?: IntelligenceMode;
}

export const ParkingBay3D: React.FC<ParkingBay3DProps> = React.memo(({
  chargerId,
  spotNumber,
  position,
  rotationY,
  session,
  isSelected = false,
  onSelect,
  intelligenceMode = 'live',
}) => {
  const [hovered, setHovered] = useState(false);

  const isOccupied = !!session;
  const isEmergency = session?.is_emergency;
  const allocatedPower = session?.allocated_power_kw ?? 0;
  const isCharging = allocatedPower > 0.1;
  const isTargetReached =
    session?.cutoff_status === 'TARGET REACHED' ||
    (session && (session.remaining_energy_kwh ?? 10) <= 0.05);
  const isAutoCutoff =
    session?.cutoff_status === 'AUTO CUTOFF' || session?.is_manually_stopped;
  const isCompleted = session?.cutoff_status === 'COMPLETED';
  const isIncomplete = session?.cutoff_status === 'INCOMPLETE';
  const isWaiting =
    isOccupied &&
    !isCharging &&
    !isTargetReached &&
    !isAutoCutoff &&
    !isCompleted &&
    !isIncomplete;

  const vehicleColor = session?.session_id
    ? getVehicleColor(session.session_id)
    : '#0ea5e9';

  // Compute Departure Risk Status
  let riskStatus: 'safe' | 'at_risk' | 'infeasible' = 'safe';
  if (session) {
    if (session.feasibility_status === 'likely_infeasible') {
      riskStatus = 'infeasible';
    } else if (session.feasibility_status === 'at_risk') {
      riskStatus = 'at_risk';
    } else {
      riskStatus = 'safe';
    }
  }

  // Determine Badge Styling and Label based on Intelligence Mode
  let badgeTitle = chargerId;
  let badgeSubtitle = 'AVAILABLE';
  let badgeColorClass = 'bg-gray-800/90 text-gray-400 border-gray-700';

  if (intelligenceMode === 'power') {
    badgeSubtitle = `${allocatedPower.toFixed(1)} kW`;
    badgeColorClass =
      allocatedPower > 7.0
        ? 'bg-blue-500/20 text-cyan-300 border-cyan-400 ring-1 ring-cyan-500/50'
        : allocatedPower > 0.1
        ? 'bg-teal-500/20 text-teal-300 border-teal-400'
        : 'bg-gray-800/80 text-gray-400 border-gray-700';
  } else if (intelligenceMode === 'risk') {
    if (!isOccupied) {
      badgeSubtitle = 'NO VEHICLE';
      badgeColorClass = 'bg-gray-800/80 text-gray-500 border-gray-700';
    } else if (riskStatus === 'infeasible') {
      badgeSubtitle = 'CRITICAL DEADLINE';
      badgeColorClass = 'bg-red-500/20 text-red-300 border-red-500 ring-1 ring-red-500';
    } else if (riskStatus === 'at_risk') {
      badgeSubtitle = 'AT RISK';
      badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500';
    } else {
      badgeSubtitle = 'FEASIBLE';
      badgeColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500';
    }
  } else if (intelligenceMode === 'cutoff') {
    if (isAutoCutoff) {
      badgeSubtitle = 'MANUAL STOP';
      badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500';
    } else if (isTargetReached || isCompleted) {
      badgeSubtitle = 'TARGET REACHED';
      badgeColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500';
    } else if (isCharging) {
      badgeSubtitle = 'CHARGING (ACTIVE)';
      badgeColorClass = 'bg-teal-500/20 text-teal-300 border-teal-500';
    } else if (isOccupied) {
      badgeSubtitle = 'QUEUED';
      badgeColorClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500';
    } else {
      badgeSubtitle = 'AVAILABLE';
      badgeColorClass = 'bg-gray-800/80 text-gray-500 border-gray-700';
    }
  } else {
    // Default 'live' mode
    if (!isOccupied) {
      badgeSubtitle = 'AVAILABLE';
      badgeColorClass = 'bg-gray-800/80 text-gray-400 border-gray-700';
    } else if (isEmergency) {
      badgeSubtitle = 'EMERGENCY';
      badgeColorClass = 'bg-red-500/20 text-red-300 border-red-500 ring-1 ring-red-500';
    } else if (isAutoCutoff) {
      badgeSubtitle = 'AUTO CUTOFF';
      badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500';
    } else if (isTargetReached) {
      badgeSubtitle = 'TARGET REACHED';
      badgeColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500';
    } else if (isCompleted) {
      badgeSubtitle = 'COMPLETED';
      badgeColorClass = 'bg-emerald-600/20 text-emerald-300 border-emerald-600';
    } else if (isIncomplete) {
      badgeSubtitle = 'INCOMPLETE';
      badgeColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500';
    } else if (isCharging) {
      badgeSubtitle = `${allocatedPower.toFixed(1)} kW`;
      badgeColorClass = 'bg-teal-500/20 text-teal-300 border-teal-500';
    } else {
      badgeSubtitle = 'QUEUED';
      badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500';
    }
  }

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (session) {
      onSelect(session.session_id);
    } else {
      onSelect(chargerId);
    }
  };

  const stallWidth = 2.8;
  const stallLength = 5.2;

  // Power Demand 3D Pillar Height (0 to 2.4 units)
  const powerPillarHeight = Math.max(0, (allocatedPower / 11.0) * 2.4);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* ------------------ 1. PARKING STALL ASPHALT & BOUNDARY STRIPES ------------------ */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[stallWidth, stallLength]} />
        <meshStandardMaterial
          color={
            isSelected
              ? '#0d3240'
              : hovered
              ? '#152438'
              : '#0a101d'
          }
          roughness={0.8}
        />
      </mesh>

      {/* Yellow Stall Marking Borders */}
      <mesh position={[-stallWidth / 2, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, stallLength]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[stallWidth / 2, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, stallLength]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[0, 0.025, -stallLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[stallWidth, 0.08]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>

      {/* Wheel Stop Barrier */}
      <mesh position={[0, 0.08, -stallLength / 2 + 0.6]} castShadow>
        <boxGeometry args={[1.8, 0.14, 0.18]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* ------------------ 2. CHARGER PEDESTAL ------------------ */}
      <group position={[0, 0, -stallLength / 2 - 0.45]}>
        <ChargerPedestal3D
          chargerId={chargerId}
          isOccupied={isOccupied}
          isCharging={isCharging}
          isCutoff={isTargetReached || isAutoCutoff || isCompleted}
          isEmergency={isEmergency}
          isWaiting={isWaiting}
          powerKw={allocatedPower}
        />
      </group>

      {/* ------------------ 3. PARKED VEHICLE & CHARGING CABLE ------------------ */}
      {isOccupied && (
        <group position={[0, 0, 0]}>
          <ProceduralVehicle
            sessionId={session.session_id}
            color={vehicleColor}
            isCharging={isCharging}
            isEmergency={isEmergency}
            isCutoff={isTargetReached || isAutoCutoff || isCompleted}
            powerKw={allocatedPower}
          />

          <ChargingCable3D
            isCharging={isCharging}
            powerKw={allocatedPower}
            isCutoff={isTargetReached || isAutoCutoff || isCompleted}
            isEmergency={isEmergency}
            startPos={[-0.26, 1.25, -stallLength / 2 - 0.45]}
            endPos={[-0.98, 0.62, -1.25]}
          />
        </group>
      )}

      {/* ------------------ 4. 3D INTELLIGENCE OVERLAYS ------------------ */}
      {/* Power Heatmap 3D Vertical Pillar */}
      {intelligenceMode === 'power' && allocatedPower > 0.1 && (
        <mesh position={[0, powerPillarHeight / 2 + 0.05, 0]}>
          <boxGeometry args={[0.2, powerPillarHeight, 0.2]} />
          <meshBasicMaterial
            color={allocatedPower > 7.0 ? '#38bdf8' : '#22d3ee'}
            transparent
            opacity={0.75}
          />
        </mesh>
      )}

      {/* Departure Risk Halo Ring on Ground */}
      {intelligenceMode === 'risk' && isOccupied && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.65, 24]} />
          <meshBasicMaterial
            color={
              riskStatus === 'infeasible'
                ? '#ef4444'
                : riskStatus === 'at_risk'
                ? '#f59e0b'
                : '#10b981'
            }
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ------------------ 5. SELECTION BEACON & SPOTLIGHT ------------------ */}
      {isSelected && (
        <group position={[0, 0, 0]}>
          {/* Glowing Ground Selection Ring */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.7, 1.88, 32]} />
            <meshBasicMaterial color="#22d3ee" side={THREE.DoubleSide} />
          </mesh>
          {/* Vertical Holographic Cylinder */}
          <mesh position={[0, 2.0, 0]}>
            <cylinderGeometry args={[1.5, 1.7, 4.0, 32, 1, true]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* ------------------ 6. FLOATING INTERACTIVE HTML BILLBOARD TOOLTIP ------------------ */}
      {/* High-Performance: Render DOM 3D projections only on hover, selection, or emergency to eliminate FPS drops */}
      {(hovered || isSelected || isEmergency) && (
        <Html
          position={[0, 2.5, 0]}
          center
          distanceFactor={18}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            className={`px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-mono shadow-2xl transition-all duration-200 ${
              isSelected
                ? 'bg-navy-950/95 border-teal-400 ring-2 ring-teal-500/40'
                : 'bg-navy-950/90 border-graphite-600/80'
            }`}
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-bold text-white tracking-wide">
                {badgeTitle}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeColorClass}`}
              >
                {badgeSubtitle}
              </span>
            </div>

            {session && (
              <div className="mt-1.5 flex items-center gap-2.5 text-[10px] text-gray-300 font-sans border-t border-graphite-700/60 pt-1">
                <span className="font-mono text-gray-400">{session.session_id}</span>
                {session.initial_soc_percent !== null && (
                  <span className="text-teal-400 font-bold">
                    SOC {Math.round(session.initial_soc_percent)}%
                  </span>
                )}
                <span className="text-white">
                  {session.energy_delivered_kwh.toFixed(1)} kWh delivered
                </span>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
});

ParkingBay3D.displayName = 'ParkingBay3D';

