import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface ProceduralVehicleProps {
  sessionId?: string;
  color?: string;
  isCharging?: boolean;
  isEmergency?: boolean;
  isCutoff?: boolean;
  powerKw?: number;
}

// Curated automotive paint palette
const VEHICLE_COLORS = [
  '#f8fafc', // Glacier White Metallic
  '#0284c7', // Cyber Electric Blue
  '#334155', // Stealth Slate Gray
  '#1e293b', // Deep Onyx Metallic
  '#059669', // Racing Emerald Green
  '#dc2626', // Crimson Red Metallic
  '#d97706', // Sunset Gold Pearl
  '#6366f1', // Ultra Violet Cobalt
  '#cbd5e1', // Liquid Silver Metallic
];

export function getVehicleColor(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return VEHICLE_COLORS[Math.abs(hash) % VEHICLE_COLORS.length];
}

export function getVehicleArchetype(sessionId: string): 'sedan' | 'suv' | 'coupe' {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = sessionId.charCodeAt(i) + ((hash << 3) - hash);
  }
  const archetypes: ('sedan' | 'suv' | 'coupe')[] = ['sedan', 'suv', 'coupe'];
  return archetypes[Math.abs(hash) % archetypes.length];
}

export const ProceduralVehicle: React.FC<ProceduralVehicleProps> = React.memo(({
  sessionId = 'DEMO',
  color,
  isCharging = false,
  isEmergency = false,
  isCutoff = false,
  powerKw = 0,
}) => {
  const chosenColor = color || getVehicleColor(sessionId);
  const archetype = getVehicleArchetype(sessionId);

  // Materials with realistic automotive properties
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(chosenColor),
        metalness: 0.88,
        roughness: 0.18,
        envMapIntensity: 1.5,
      }),
    [chosenColor]
  );

  const glassMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0a1120'),
        metalness: 0.95,
        roughness: 0.05,
        transparent: true,
        opacity: 0.88,
      }),
    []
  );

  const tireMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#16181c'),
        roughness: 0.9,
        metalness: 0.1,
      }),
    []
  );

  const rimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#cbd5e1'),
        metalness: 0.92,
        roughness: 0.15,
      }),
    []
  );

  const brakeCaliperMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isEmergency ? new THREE.Color('#ef4444') : new THREE.Color('#06b6d4'),
        metalness: 0.7,
        roughness: 0.3,
      }),
    [isEmergency]
  );

  const trimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0f172a'),
        roughness: 0.75,
        metalness: 0.3,
      }),
    []
  );

  const headlightMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#f0f9ff'),
        emissive: new THREE.Color('#38bdf8'),
        emissiveIntensity: 1.2,
        roughness: 0.1,
      }),
    []
  );

  const taillightMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ef4444'),
        emissive: new THREE.Color('#dc2626'),
        emissiveIntensity: isEmergency ? 2.5 : 1.2,
        roughness: 0.1,
      }),
    [isEmergency]
  );

  // Charge port indicator color
  const portColor = isEmergency
    ? '#ef4444'
    : isCutoff
    ? '#10b981'
    : isCharging && powerKw > 0.1
    ? '#22d3ee'
    : '#64748b';

  return (
    <group position={[0, 0, 0]}>
      {archetype === 'suv' ? (
        // ------------------ ARCHETYPE: ELECTRIC SUV / CROSSOVER ------------------
        <group>
          {/* Main Lower Chassis with rugged bottom cladding */}
          <mesh position={[0, 0.52, 0]} material={bodyMaterial} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.55, 4.3]} />
          </mesh>
          {/* Rugged Bottom Cladding */}
          <mesh position={[0, 0.28, 0]} material={trimMaterial}>
            <boxGeometry args={[2.02, 0.16, 4.32]} />
          </mesh>
          {/* Front Bumper & Lower Skid Plate */}
          <mesh position={[0, 0.42, 2.1]} material={trimMaterial} castShadow>
            <boxGeometry args={[1.96, 0.38, 0.3]} />
          </mesh>
          {/* Rear Lower Diffuser */}
          <mesh position={[0, 0.42, -2.1]} material={trimMaterial} castShadow>
            <boxGeometry args={[1.96, 0.38, 0.3]} />
          </mesh>

          {/* Elevated SUV Greenhouse Cabin */}
          <mesh position={[0, 1.15, -0.1]} material={glassMaterial} castShadow receiveShadow>
            <boxGeometry args={[1.72, 0.72, 2.65]} />
          </mesh>
          {/* Panoramic Roof Slab with Body Color Surround */}
          <mesh position={[0, 1.52, -0.1]} material={bodyMaterial} castShadow>
            <boxGeometry args={[1.68, 0.08, 2.55]} />
          </mesh>
          {/* Silver Roof Rails */}
          <mesh position={[-0.78, 1.58, -0.1]} material={rimMaterial}>
            <boxGeometry args={[0.04, 0.06, 2.3]} />
          </mesh>
          <mesh position={[0.78, 1.58, -0.1]} material={rimMaterial}>
            <boxGeometry args={[0.04, 0.06, 2.3]} />
          </mesh>

          {/* Windshield & Rear Slopes */}
          <mesh position={[0, 1.05, 1.12]} rotation={[-0.55, 0, 0]} material={glassMaterial}>
            <boxGeometry args={[1.7, 0.65, 0.08]} />
          </mesh>
          <mesh position={[0, 1.05, -1.35]} rotation={[0.42, 0, 0]} material={glassMaterial}>
            <boxGeometry args={[1.7, 0.65, 0.08]} />
          </mesh>
        </group>
      ) : archetype === 'coupe' ? (
        // ------------------ ARCHETYPE: PERFORMANCE EV SPORTS COUPE ------------------
        <group>
          {/* Low, wide aerodynamic chassis */}
          <mesh position={[0, 0.42, 0]} material={bodyMaterial} castShadow receiveShadow>
            <boxGeometry args={[1.98, 0.44, 4.2]} />
          </mesh>
          {/* Front Carbon Splitter */}
          <mesh position={[0, 0.22, 2.05]} material={trimMaterial} castShadow>
            <boxGeometry args={[1.96, 0.08, 0.4]} />
          </mesh>
          {/* Rear Aggressive Diffuser Fins */}
          <mesh position={[0, 0.24, -2.05]} material={trimMaterial} castShadow>
            <boxGeometry args={[1.94, 0.12, 0.35]} />
          </mesh>

          {/* Low-slung teardrop cockpit */}
          <mesh position={[0, 0.88, -0.22]} material={glassMaterial} castShadow receiveShadow>
            <boxGeometry args={[1.58, 0.52, 2.2]} />
          </mesh>
          {/* Roof Shell with aerodynamic center channel */}
          <mesh position={[0, 1.15, -0.25]} material={bodyMaterial} castShadow>
            <boxGeometry args={[1.52, 0.06, 2.0]} />
          </mesh>
          {/* Integrated Rear Ducktail Spoiler */}
          <mesh position={[0, 0.72, -2.0]} rotation={[-0.2, 0, 0]} material={bodyMaterial} castShadow>
            <boxGeometry args={[1.7, 0.08, 0.35]} />
          </mesh>

          {/* Raked Windshield and Fastback Glass */}
          <mesh position={[0, 0.82, 0.82]} rotation={[-0.7, 0, 0]} material={glassMaterial}>
            <boxGeometry args={[1.55, 0.6, 0.06]} />
          </mesh>
          <mesh position={[0, 0.82, -1.25]} rotation={[0.65, 0, 0]} material={glassMaterial}>
            <boxGeometry args={[1.55, 0.6, 0.06]} />
          </mesh>
        </group>
      ) : (
        // ------------------ ARCHETYPE: AERODYNAMIC LUXURY FASTBACK SEDAN ------------------
        <group>
          {/* Sleek aerodynamic main body */}
          <mesh position={[0, 0.46, 0]} material={bodyMaterial} castShadow receiveShadow>
            <boxGeometry args={[1.92, 0.48, 4.25]} />
          </mesh>
          {/* Sculpted Hood Wedge */}
          <mesh position={[0, 0.48, 1.45]} rotation={[0.08, 0, 0]} material={bodyMaterial} castShadow>
            <boxGeometry args={[1.86, 0.25, 1.3]} />
          </mesh>
          {/* Flush Rear Decklid */}
          <mesh position={[0, 0.52, -1.6]} rotation={[-0.06, 0, 0]} material={bodyMaterial} castShadow>
            <boxGeometry args={[1.86, 0.22, 1.0]} />
          </mesh>

          {/* Sweeping Fastback Glass Canopy */}
          <mesh position={[0, 0.98, -0.2]} material={glassMaterial} castShadow receiveShadow>
            <boxGeometry args={[1.62, 0.58, 2.35]} />
          </mesh>
          {/* Tinted Glass Roof Center Slab */}
          <mesh position={[0, 1.28, -0.22]} material={glassMaterial} castShadow>
            <boxGeometry args={[1.56, 0.05, 2.1]} />
          </mesh>

          {/* Windshield & Fastback Slopes */}
          <mesh position={[0, 0.92, 0.92]} rotation={[-0.58, 0, 0]} material={glassMaterial}>
            <boxGeometry args={[1.6, 0.58, 0.06]} />
          </mesh>
          <mesh position={[0, 0.92, -1.32]} rotation={[0.5, 0, 0]} material={glassMaterial}>
            <boxGeometry args={[1.6, 0.58, 0.06]} />
          </mesh>
        </group>
      )}

      {/* ------------------ COMMON DETAILED WHEELS (4 TIRES + RIMS + CALIPERS) ------------------ */}
      {/* Front Left Wheel */}
      <group position={[-0.96, 0.34, 1.35]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={tireMaterial} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.26, 24]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
          <cylinderGeometry args={[0.24, 0.24, 0.27, 16]} />
        </mesh>
        {/* Brake Disc & Caliper inside rim */}
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.08, 0.08, 0]} material={brakeCaliperMaterial}>
          <boxGeometry args={[0.06, 0.12, 0.08]} />
        </mesh>
      </group>

      {/* Front Right Wheel */}
      <group position={[0.96, 0.34, 1.35]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={tireMaterial} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.26, 24]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
          <cylinderGeometry args={[0.24, 0.24, 0.27, 16]} />
        </mesh>
        <mesh position={[-0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-0.08, 0.08, 0]} material={brakeCaliperMaterial}>
          <boxGeometry args={[0.06, 0.12, 0.08]} />
        </mesh>
      </group>

      {/* Rear Left Wheel */}
      <group position={[-0.96, 0.34, -1.35]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={tireMaterial} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.26, 24]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
          <cylinderGeometry args={[0.24, 0.24, 0.27, 16]} />
        </mesh>
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Rear Right Wheel */}
      <group position={[0.96, 0.34, -1.35]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={tireMaterial} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.26, 24]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={rimMaterial}>
          <cylinderGeometry args={[0.24, 0.24, 0.27, 16]} />
        </mesh>
        <mesh position={[-0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ------------------ SIDE VIEW MIRRORS WITH TURN INDICATORS ------------------ */}
      <group position={[-0.98, 0.92, 0.75]}>
        <mesh material={bodyMaterial}>
          <boxGeometry args={[0.18, 0.1, 0.12]} />
        </mesh>
        <mesh position={[-0.08, 0, 0]} material={glassMaterial}>
          <boxGeometry args={[0.02, 0.08, 0.1]} />
        </mesh>
        <mesh position={[-0.02, 0, 0.05]} material={taillightMaterial}>
          <boxGeometry args={[0.12, 0.02, 0.02]} />
        </mesh>
      </group>
      <group position={[0.98, 0.92, 0.75]}>
        <mesh material={bodyMaterial}>
          <boxGeometry args={[0.18, 0.1, 0.12]} />
        </mesh>
        <mesh position={[0.08, 0, 0]} material={glassMaterial}>
          <boxGeometry args={[0.02, 0.08, 0.1]} />
        </mesh>
        <mesh position={[0.02, 0, 0.05]} material={taillightMaterial}>
          <boxGeometry args={[0.12, 0.02, 0.02]} />
        </mesh>
      </group>

      {/* ------------------ MODERN LIGHTING (FRONT MATRIX LED & REAR LIGHTBAR) ------------------ */}
      {/* Front Horizontal Matrix LED Lightbar */}
      <mesh position={[0, 0.52, 2.14]} material={headlightMaterial}>
        <boxGeometry args={[1.78, 0.07, 0.08]} />
      </mesh>
      {/* Left Projector Lamp */}
      <mesh position={[-0.72, 0.52, 2.15]} material={headlightMaterial}>
        <boxGeometry args={[0.26, 0.1, 0.08]} />
      </mesh>
      {/* Right Projector Lamp */}
      <mesh position={[0.72, 0.52, 2.15]} material={headlightMaterial}>
        <boxGeometry args={[0.26, 0.1, 0.08]} />
      </mesh>

      {/* Rear Full-Width Neon Red Lightbar */}
      <mesh position={[0, 0.62, -2.14]} material={taillightMaterial}>
        <boxGeometry args={[1.8, 0.08, 0.08]} />
      </mesh>

      {/* ------------------ EV CHARGE PORT (LEFT REAR QUARTER) ------------------ */}
      <group position={[-0.98, 0.62, -1.25]}>
        {/* Charge port housing recessed cavity */}
        <mesh material={trimMaterial}>
          <boxGeometry args={[0.04, 0.24, 0.24]} />
        </mesh>
        {/* Glowing Status Ring around socket */}
        <mesh position={[-0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[0.06, 0.1, 20]} />
          <meshBasicMaterial color={portColor} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Contact Ambient Shadow on Ground */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 4.6]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.65} />
      </mesh>
    </group>
  );
});

ProceduralVehicle.displayName = 'ProceduralVehicle';

