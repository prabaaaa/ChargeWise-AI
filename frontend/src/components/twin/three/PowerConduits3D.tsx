import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ActiveSession } from '../../../api/types';

export interface PowerConduits3DProps {
  activeSessions: ActiveSession[];
  substationX?: number;
}

export const PowerConduits3D: React.FC<PowerConduits3DProps> = React.memo(({
  activeSessions,
  substationX = -17.5,
}) => {
  const row1PulsesRef = useRef<THREE.Group>(null);
  const row2PulsesRef = useRef<THREE.Group>(null);
  const flowProgressRef = useRef(0);

  // Map of active chargerId -> allocated power
  const activePowerMap = useMemo(() => {
    const map = new Map<string, number>();
    activeSessions.forEach((s) => {
      if (s.allocated_power_kw > 0.1) {
        map.set(s.charger_id, s.allocated_power_kw);
      }
    });
    return map;
  }, [activeSessions]);

  useFrame((_, delta) => {
    flowProgressRef.current = (flowProgressRef.current + delta * 1.8) % 1.0;

    // Row 1 Pulses (North Row CP-01 to CP-10)
    if (row1PulsesRef.current) {
      const children = row1PulsesRef.current.children;
      let meshIdx = 0;
      for (let i = 0; i < 10; i++) {
        const chargerId = `CP-${String(i + 1).padStart(2, '0')}`;
        const power = activePowerMap.get(chargerId) || 0;
        if (power > 0.1 && meshIdx < children.length) {
          const targetX = (i - 4.5) * 3.2;
          const mesh = children[meshIdx] as THREE.Mesh;
          mesh.visible = true;
          // Pulse travels along conduit
          const curX = THREE.MathUtils.lerp(substationX, targetX, flowProgressRef.current);
          mesh.position.set(curX, 0.16, -9.1);
          const pulseScale = Math.min(1.6, 0.8 + (power / 11.0) * 0.8);
          mesh.scale.setScalar(pulseScale);
          meshIdx++;
        }
      }
      for (let k = meshIdx; k < children.length; k++) {
        children[k].visible = false;
      }
    }

    // Row 2 Pulses (South Row CP-11 to CP-20)
    if (row2PulsesRef.current) {
      const children = row2PulsesRef.current.children;
      let meshIdx = 0;
      for (let i = 0; i < 10; i++) {
        const chargerId = `CP-${String(i + 11).padStart(2, '0')}`;
        const power = activePowerMap.get(chargerId) || 0;
        if (power > 0.1 && meshIdx < children.length) {
          const targetX = (i - 4.5) * 3.2;
          const mesh = children[meshIdx] as THREE.Mesh;
          mesh.visible = true;
          const curX = THREE.MathUtils.lerp(substationX, targetX, flowProgressRef.current);
          mesh.position.set(curX, 0.16, 9.1);
          const pulseScale = Math.min(1.6, 0.8 + (power / 11.0) * 0.8);
          mesh.scale.setScalar(pulseScale);
          meshIdx++;
        }
      }
      for (let k = meshIdx; k < children.length; k++) {
        children[k].visible = false;
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ------------------ 1. HEAVY INDUSTRIAL CABLE CONDUIT BUSWAYS ------------------ */}
      {/* North Row Main Underground Feeder Trench */}
      <mesh position={[0, 0.05, -9.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[36.0, 0.36]} />
        <meshStandardMaterial color="#0b1220" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* South Row Main Underground Feeder Trench */}
      <mesh position={[0, 0.05, 9.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[36.0, 0.36]} />
        <meshStandardMaterial color="#0b1220" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* Substation Cross Feeder Link (Connecting West Substation to North and South Trenches) */}
      <mesh position={[-17.5, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.38, 18.2]} />
        <meshStandardMaterial color="#0b1220" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* Protective Anodized Trench Edging Rails */}
      <mesh position={[0, 0.06, -9.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36.0, 0.04]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, 0.06, -8.92]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36.0, 0.04]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, 0.06, 8.92]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36.0, 0.04]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, 0.06, 9.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36.0, 0.04]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.5} transparent />
      </mesh>

      {/* Feeder Spur Lines rising into each Charger Pedestal */}
      {Array.from({ length: 10 }).map((_, i) => {
        const x = (i - 4.5) * 3.2;
        const chargerIdN = `CP-${String(i + 1).padStart(2, '0')}`;
        const chargerIdS = `CP-${String(i + 11).padStart(2, '0')}`;
        const hasPowerN = (activePowerMap.get(chargerIdN) || 0) > 0.1;
        const hasPowerS = (activePowerMap.get(chargerIdS) || 0) > 0.1;

        return (
          <group key={`spurs-${i}`}>
            {/* North Spur */}
            <mesh position={[x, 0.06, -9.1]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.1, 0.7]} />
              <meshBasicMaterial color={hasPowerN ? '#22d3ee' : '#334155'} />
            </mesh>
            {/* South Spur */}
            <mesh position={[x, 0.06, 9.1]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.1, 0.7]} />
              <meshBasicMaterial color={hasPowerS ? '#22d3ee' : '#334155'} />
            </mesh>
          </group>
        );
      })}

      {/* ------------------ 2. DYNAMIC ENERGY FLOW PULSES ------------------ */}
      {/* North Row Pulses */}
      <group ref={row1PulsesRef}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={`p-n-${i}`} visible={false}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.95} />
          </mesh>
        ))}
      </group>

      {/* South Row Pulses */}
      <group ref={row2PulsesRef}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={`p-s-${i}`} visible={false}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.95} />
          </mesh>
        ))}
      </group>
    </group>
  );
});

PowerConduits3D.displayName = 'PowerConduits3D';

