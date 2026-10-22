import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface ChargerPedestal3DProps {
  chargerId: string;
  isOccupied?: boolean;
  isCharging?: boolean;
  isCutoff?: boolean;
  isEmergency?: boolean;
  isWaiting?: boolean;
  powerKw?: number;
}

export const ChargerPedestal3D: React.FC<ChargerPedestal3DProps> = React.memo(({
  chargerId,
  isOccupied = false,
  isCharging = false,
  isCutoff = false,
  isEmergency = false,
  isWaiting = false,
  powerKw = 0,
}) => {
  const crownRef = useRef<THREE.Mesh>(null);
  const isActivelyDelivering = isCharging && powerKw > 0.1;

  // Status-driven LED lighting
  let statusColor = '#334155'; // Standby slate
  let emissiveColor = '#1e293b';
  let baseIntensity = 0.5;

  if (isEmergency) {
    statusColor = '#ef4444';
    emissiveColor = '#dc2626';
    baseIntensity = 2.0;
  } else if (isCutoff) {
    statusColor = '#10b981';
    emissiveColor = '#059669';
    baseIntensity = 1.4;
  } else if (isActivelyDelivering) {
    statusColor = '#22d3ee';
    emissiveColor = '#06b6d4';
    baseIntensity = 1.6;
  } else if (isWaiting) {
    statusColor = '#f59e0b';
    emissiveColor = '#d97706';
    baseIntensity = 1.2;
  } else if (isOccupied) {
    statusColor = '#38bdf8';
    emissiveColor = '#0284c7';
    baseIntensity = 0.9;
  }

  // Animation pulse on halo crown only when actively charging or emergency
  useFrame(({ clock }) => {
    if (!crownRef.current) return;
    if (isActivelyDelivering) {
      const pulse = (Math.sin(clock.getElapsedTime() * 4.5) + 1) * 0.5;
      (crownRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        baseIntensity + pulse * 1.5;
    } else if (isEmergency) {
      const flash = (Math.sin(clock.getElapsedTime() * 9.0) + 1) * 0.5;
      (crownRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.5 + flash * 2.5;
    }
  });

  // Materials
  const aluminumBodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0f172a'),
        metalness: 0.85,
        roughness: 0.25,
      }),
    []
  );

  const silverTrimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#94a3b8'),
        metalness: 0.95,
        roughness: 0.15,
      }),
    []
  );

  const concretePadMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#334155'),
        roughness: 0.8,
        metalness: 0.2,
      }),
    []
  );

  const screenGlassMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#020617'),
        metalness: 0.95,
        roughness: 0.05,
      }),
    []
  );

  const ledCrownMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(statusColor),
        emissive: new THREE.Color(emissiveColor),
        emissiveIntensity: baseIntensity,
        roughness: 0.1,
      }),
    [statusColor, emissiveColor, baseIntensity]
  );

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Heavy Bolted Concrete Foundation Curb */}
      <mesh position={[0, 0.1, 0]} material={concretePadMaterial} receiveShadow castShadow>
        <boxGeometry args={[0.75, 0.2, 0.65]} />
      </mesh>
      {/* Anchor Bolt Caps */}
      {[-0.28, 0.28].map((x, xi) =>
        [-0.22, 0.22].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, 0.21, z]} material={silverTrimMaterial}>
            <cylinderGeometry args={[0.025, 0.025, 0.03, 8]} />
          </mesh>
        ))
      )}

      {/* 2. Main Sculpted Commercial Charger Column */}
      <mesh position={[0, 0.95, 0]} material={aluminumBodyMaterial} castShadow receiveShadow>
        <boxGeometry args={[0.46, 1.5, 0.36]} />
      </mesh>
      {/* Side Anodized Silver Accent Bevels */}
      <mesh position={[-0.24, 0.95, 0]} material={silverTrimMaterial}>
        <boxGeometry args={[0.03, 1.46, 0.34]} />
      </mesh>
      <mesh position={[0.24, 0.95, 0]} material={silverTrimMaterial}>
        <boxGeometry args={[0.03, 1.46, 0.34]} />
      </mesh>

      {/* 3. Angled Digital Display Console */}
      <mesh
        position={[0, 1.15, 0.19]}
        rotation={[-0.12, 0, 0]}
        material={screenGlassMaterial}
      >
        <boxGeometry args={[0.36, 0.55, 0.04]} />
      </mesh>
      {/* Active Screen Surface */}
      <mesh position={[0, 1.18, 0.22]} rotation={[-0.12, 0, 0]}>
        <planeGeometry args={[0.3, 0.32]} />
        <meshBasicMaterial
          color={
            isEmergency
              ? '#450a0a'
              : isCutoff
              ? '#022c22'
              : isActivelyDelivering
              ? '#082f49'
              : '#030712'
          }
        />
      </mesh>

      {/* 4. 360-Degree Halo Status Crown at Pedestal Top */}
      <mesh
        ref={crownRef}
        position={[0, 1.74, 0]}
        material={ledCrownMaterial}
      >
        <boxGeometry args={[0.48, 0.08, 0.38]} />
      </mesh>
      {/* Top Protective Sunshade Cap */}
      <mesh position={[0, 1.8, 0]} material={aluminumBodyMaterial}>
        <boxGeometry args={[0.47, 0.04, 0.37]} />
      </mesh>

      {/* 5. Dual Holster Docks (Left & Right) */}
      <group position={[-0.26, 1.25, 0]}>
        <mesh material={silverTrimMaterial}>
          <boxGeometry args={[0.08, 0.24, 0.16]} />
        </mesh>
      </group>
      <group position={[0.26, 1.25, 0]}>
        <mesh material={silverTrimMaterial}>
          <boxGeometry args={[0.08, 0.24, 0.16]} />
        </mesh>
      </group>

      {/* 6. Heavy-Duty Lower Cable Management Reel */}
      <mesh position={[-0.27, 0.78, 0]} material={aluminumBodyMaterial}>
        <cylinderGeometry args={[0.05, 0.05, 0.22, 12]} />
      </mesh>

    </group>
  );
});

ChargerPedestal3D.displayName = 'ChargerPedestal3D';

