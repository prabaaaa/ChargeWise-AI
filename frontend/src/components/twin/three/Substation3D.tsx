import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface Substation3DProps {
  position?: [number, number, number];
  totalPowerKw: number;
  siteCapKw: number;
  solarPowerKw?: number;
}

export const Substation3D: React.FC<Substation3DProps> = React.memo(({
  position = [-20.0, 0, 0],
  totalPowerKw,
  siteCapKw,
  solarPowerKw = 0,
}) => {
  const beaconRef = useRef<THREE.Mesh>(null);
  const isOverload = totalPowerKw > siteCapKw + 0.1;
  const loadPercentage = siteCapKw > 0 ? (totalPowerKw / siteCapKw) * 100 : 0;

  useFrame(({ clock }) => {
    if (!beaconRef.current) return;
    if (isOverload) {
      const flash = (Math.sin(clock.getElapsedTime() * 12) + 1) * 0.5;
      (beaconRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + flash * 2.8;
    } else {
      const pulse = (Math.sin(clock.getElapsedTime() * 2.5) + 1) * 0.5;
      (beaconRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.6 + pulse * 0.6;
    }
  });

  // Materials
  const transformerTankMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1e293b'),
        metalness: 0.85,
        roughness: 0.3,
      }),
    []
  );

  const radiatorFinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#334155'),
        metalness: 0.8,
        roughness: 0.35,
      }),
    []
  );

  const porcelainInsulatorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#9a3412'),
        roughness: 0.25,
        metalness: 0.5,
      }),
    []
  );

  const copperBusbarMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#d97706'),
        metalness: 0.95,
        roughness: 0.2,
      }),
    []
  );

  const fenceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#475569'),
        metalness: 0.8,
        roughness: 0.4,
        wireframe: true,
      }),
    []
  );

  return (
    <group position={[position[0], position[1], position[2]]}>
      {/* ------------------ 1. HEAVY CONCRETE EQUIPMENT PAD ------------------ */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.6, 0.4, 7.6]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Equipment Pad Yellow Safety Boundary */}
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.4, 7.4]} />
        <meshBasicMaterial color="#030712" />
      </mesh>

      {/* ------------------ 2. INDUSTRIAL SECURITY ENCLOSURE FENCE ------------------ */}
      {/* North Fence Panel */}
      <mesh position={[0, 1.4, -3.7]} material={fenceMaterial}>
        <planeGeometry args={[4.4, 2.0]} />
      </mesh>
      {/* South Fence Panel */}
      <mesh position={[0, 1.4, 3.7]} material={fenceMaterial}>
        <planeGeometry args={[4.4, 2.0]} />
      </mesh>
      {/* West Fence Panel */}
      <mesh position={[-2.2, 1.4, 0]} rotation={[0, Math.PI / 2, 0]} material={fenceMaterial}>
        <planeGeometry args={[7.4, 2.0]} />
      </mesh>

      {/* Fence Steel Posts */}
      {[-2.2, 2.2].map((x, xi) =>
        [-3.7, 0, 3.7].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, 1.3, z]}>
            <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.2} />
          </mesh>
        ))
      )}

      {/* ------------------ 3. MAIN STEP-DOWN POWER TRANSFORMER ------------------ */}
      {/* Transformer Main Steel Tank */}
      <mesh position={[0, 1.9, -0.6]} material={transformerTankMaterial} castShadow receiveShadow>
        <boxGeometry args={[2.8, 2.8, 3.2]} />
      </mesh>

      {/* Oil Conservator Drum on Top */}
      <mesh position={[0, 3.5, -0.6]} rotation={[0, 0, Math.PI / 2]} material={transformerTankMaterial} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 2.4, 16]} />
      </mesh>

      {/* Radiator Cooling Fin Banks (Left and Right Flanks) */}
      {[-1.2, -0.6, 0, 0.6, 1.2].map((z, idx) => (
        <group key={`rad-${idx}`}>
          {/* West Bank */}
          <mesh position={[-1.55, 1.9, z - 0.6]} material={radiatorFinMaterial}>
            <boxGeometry args={[0.24, 2.2, 0.14]} />
          </mesh>
          {/* East Bank */}
          <mesh position={[1.55, 1.9, z - 0.6]} material={radiatorFinMaterial}>
            <boxGeometry args={[0.24, 2.2, 0.14]} />
          </mesh>
        </group>
      ))}

      {/* High-Voltage Ceramic Porcelain Bushings (3-Phase) */}
      {[-0.8, 0, 0.8].map((z, idx) => (
        <group key={`insulator-${idx}`} position={[0.7, 3.7, z - 0.6]}>
          <mesh material={porcelainInsulatorMaterial}>
            <cylinderGeometry args={[0.14, 0.22, 0.9, 14]} />
          </mesh>
          {/* Copper Terminal Lug */}
          <mesh position={[0, 0.52, 0]} material={copperBusbarMaterial}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
        </group>
      ))}

      {/* ------------------ 4. SWITCHGEAR & POWER CONTROL CABINET ------------------ */}
      <mesh position={[0, 1.7, 2.2]} material={transformerTankMaterial} castShadow receiveShadow>
        <boxGeometry args={[2.6, 2.4, 1.4]} />
      </mesh>

      {/* Cabinet Digital Monitor Panel Facing East (Toward Facility) */}
      <mesh position={[1.31, 1.8, 2.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.0, 0.7]} />
        <meshBasicMaterial color="#020617" />
      </mesh>
      {/* Status LED indicators on switchgear */}
      {[-0.2, 0, 0.2].map((z, i) => (
        <mesh key={`led-${i}`} position={[1.32, 2.2, 2.2 + z]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={isOverload ? '#ef4444' : '#10b981'} />
        </mesh>
      ))}

      {/* ------------------ 5. SAFETY WARNING BEACON & OVERLOAD ALERT ------------------ */}
      <mesh ref={beaconRef} position={[0, 3.5, 2.2]}>
        <cylinderGeometry args={[0.14, 0.18, 0.35, 16]} />
        <meshStandardMaterial
          color={isOverload ? '#ef4444' : '#22d3ee'}
          emissive={isOverload ? '#dc2626' : '#0891b2'}
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* ------------------ 6. FLOATING TELEMETRY HUD BILLBOARD ------------------ */}
      <Html
        position={[0, 4.6, 0]}
        center
        distanceFactor={22}
        zIndexRange={[90, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div className="px-3.5 py-2 rounded-xl bg-navy-950/95 border border-teal-500/50 backdrop-blur-md text-xs font-mono shadow-2xl text-center whitespace-nowrap ring-1 ring-teal-500/30">
          <div className="flex items-center justify-center gap-2 font-bold text-teal-300 text-[11px] tracking-wide">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            480V 3Φ MAIN SUBSTATION & SITE FEEDER
          </div>
          <div className="mt-1 flex items-center justify-center gap-2.5 text-white font-bold text-sm">
            <span className="text-teal-400">{totalPowerKw.toFixed(1)} kW</span>
            <span className="text-gray-500">/</span>
            <span className="text-gray-300">{siteCapKw.toFixed(0)} kW Cap</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isOverload
                  ? 'bg-red-500/30 text-red-300 border border-red-500'
                  : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
              }`}
            >
              {loadPercentage.toFixed(0)}% LOAD
            </span>
          </div>
          {solarPowerKw > 0 && (
            <div className="text-[10px] text-amber-400 mt-1 font-sans">
              Solar Contribution: +{solarPowerKw.toFixed(1)} kW clean power
            </div>
          )}
        </div>
      </Html>
    </group>
  );
});

Substation3D.displayName = 'Substation3D';

