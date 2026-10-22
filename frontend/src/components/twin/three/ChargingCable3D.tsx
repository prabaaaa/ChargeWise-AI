import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface ChargingCable3DProps {
  isCharging?: boolean;
  powerKw?: number;
  isCutoff?: boolean;
  isEmergency?: boolean;
  startPos?: [number, number, number]; // Charger connection point
  endPos?: [number, number, number];   // Vehicle charge port point
}

export const ChargingCable3D: React.FC<ChargingCable3DProps> = React.memo(({
  isCharging = false,
  powerKw = 0,
  isCutoff = false,
  isEmergency = false,
  startPos = [-0.35, 1.15, -2.5],
  endPos = [-0.96, 0.58, -1.1],
}) => {
  // Construct a realistic hanging catenary / curved charging cable path
  const curve = useMemo(() => {
    const p0 = new THREE.Vector3(...startPos);
    const p3 = new THREE.Vector3(...endPos);

    // Natural hanging curve intermediate points
    const p1 = new THREE.Vector3(
      p0.x - 0.2,
      Math.min(p0.y, p3.y) - 0.25, // Droop down
      (p0.z + p3.z) * 0.65
    );
    const p2 = new THREE.Vector3(
      p3.x - 0.1,
      p3.y - 0.12,
      (p0.z + p3.z) * 0.35
    );

    return new THREE.CatmullRomCurve3([p0, p1, p2, p3], false, 'catmullrom', 0.5);
  }, [startPos, endPos]);

  // Main cable geometry
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.032, 8, false);
  }, [curve]);

  // Glow beads traveling along the cable when charging
  const beadCount = 3;
  const beadsRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);

  // Speed scales with active charging power (0 if power <= 0.1 kW)
  const isActivelyDelivering = isCharging && powerKw > 0.1;
  const flowSpeed = isActivelyDelivering ? Math.max(0.6, Math.min(2.2, powerKw * 0.18)) : 0;

  useFrame((_, delta) => {
    if (!beadsRef.current) return;

    if (!isActivelyDelivering) {
      if (beadsRef.current.visible) {
        beadsRef.current.visible = false;
      }
      return;
    }

    pulseRef.current = (pulseRef.current + delta * flowSpeed) % 1.0;
    beadsRef.current.visible = true;

    const children = beadsRef.current.children;
    for (let i = 0; i < beadCount; i++) {
      const offset = (pulseRef.current + i / beadCount) % 1.0;
      // Travel from charger (t=0) to car (t=1)
      const pos = curve.getPointAt(offset);
      if (children[i]) {
        children[i].position.copy(pos);
        const scale = Math.sin(offset * Math.PI) * 0.05 + 0.035;
        children[i].scale.setScalar(scale);
      }
    }
  });

  // Base cable material (matte rubber)
  const cableColor = isEmergency
    ? '#7f1d1d'
    : isCutoff
    ? '#064e3b'
    : isActivelyDelivering
    ? '#083344'
    : '#1e293b';

  const glowColor = isEmergency ? '#ef4444' : '#22d3ee';

  return (
    <group>
      {/* 1. Heavy Industrial Charging Cable Tube */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={cableColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* 2. Plug Handle at Car Port */}
      <mesh position={[endPos[0], endPos[1], endPos[2]]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.06, 0.18, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* 3. Energy Light Pulses (only active during real charging) */}
      <group ref={beadsRef} visible={false}>
        {Array.from({ length: beadCount }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
});

ChargingCable3D.displayName = 'ChargingCable3D';

