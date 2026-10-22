import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ActiveSession } from '../../../api/types';

export interface FacilityEnvironment3DProps {
  solarPowerKw?: number;
  activeSessions?: ActiveSession[];
}

export const FacilityEnvironment3D: React.FC<FacilityEnvironment3DProps> = React.memo(({
  solarPowerKw = 0,
  activeSessions = [],
}) => {
  // Map active sessions to charger downlights
  const activeChargerMap = useMemo(() => {
    const map = new Map<string, { isCharging: boolean; isCutoff: boolean; isEmergency: boolean }>();
    activeSessions.forEach((s) => {
      const isCharging = (s.allocated_power_kw || 0) > 0.1;
      const isCutoff =
        s.cutoff_status === 'TARGET REACHED' ||
        s.cutoff_status === 'AUTO CUTOFF' ||
        s.cutoff_status === 'COMPLETED' ||
        s.is_manually_stopped ||
        (s.remaining_energy_kwh ?? 10) <= 0.05;
      map.set(s.charger_id, {
        isCharging,
        isCutoff,
        isEmergency: !!s.is_emergency,
      });
    });
    return map;
  }, [activeSessions]);

  // Materials with high architectural fidelity
  const baseSlabMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0c1322'),
        roughness: 0.85,
        metalness: 0.2,
      }),
    []
  );

  const asphaltRoadMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#101827'),
        roughness: 0.8,
        metalness: 0.15,
      }),
    []
  );

  const sidewalkPaverMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1e293b'),
        roughness: 0.7,
        metalness: 0.1,
      }),
    []
  );

  const concreteCurbMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#334155'),
        roughness: 0.65,
        metalness: 0.25,
      }),
    []
  );

  const steelStructureMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1e293b'),
        metalness: 0.85,
        roughness: 0.25,
      }),
    []
  );

  const solarGlassMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#072448'),
        emissive: new THREE.Color('#0284c7'),
        emissiveIntensity: solarPowerKw > 0 ? 0.45 : 0.08,
        metalness: 0.92,
        roughness: 0.08,
        transparent: true,
        opacity: 0.92,
      }),
    [solarPowerKw]
  );

  const shrubFoliageMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#065f46'),
        roughness: 0.9,
        metalness: 0.05,
      }),
    []
  );

  const woodPlanterMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#3f2314'),
        roughness: 0.8,
      }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* ------------------ 1. ARCHITECTURAL PODIUM / FOUNDATION SLAB ------------------ */}
      {/* Deep foundation base that gives the entire 3D model physical volume and grounding */}
      <mesh position={[0, -0.4, 0]} material={baseSlabMaterial} receiveShadow>
        <boxGeometry args={[54.0, 0.8, 32.0]} />
      </mesh>

      {/* Surface Asphalt Tarmac */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={asphaltRoadMaterial} receiveShadow>
        <planeGeometry args={[53.6, 31.6]} />
      </mesh>

      {/* ------------------ 2. PERIMETER CURBS & PEDESTRIAN SIDEWALKS ------------------ */}
      {/* North Raised Sidewalk */}
      <mesh position={[0, 0.12, -13.5]} material={sidewalkPaverMaterial} receiveShadow>
        <boxGeometry args={[53.6, 0.24, 2.6]} />
      </mesh>
      {/* South Raised Sidewalk */}
      <mesh position={[0, 0.12, 13.5]} material={sidewalkPaverMaterial} receiveShadow>
        <boxGeometry args={[53.6, 0.24, 2.6]} />
      </mesh>
      {/* East Pedestrian Boulevard */}
      <mesh position={[24.8, 0.12, 0]} material={sidewalkPaverMaterial} receiveShadow>
        <boxGeometry args={[2.8, 0.24, 29.6]} />
      </mesh>
      {/* West Security & Entrance Apron */}
      <mesh position={[-24.8, 0.12, 0]} material={sidewalkPaverMaterial} receiveShadow>
        <boxGeometry args={[2.8, 0.24, 29.6]} />
      </mesh>

      {/* Curb Facings */}
      <mesh position={[0, 0.12, -12.15]} material={concreteCurbMaterial}>
        <boxGeometry args={[53.6, 0.24, 0.12]} />
      </mesh>
      <mesh position={[0, 0.12, 12.15]} material={concreteCurbMaterial}>
        <boxGeometry args={[53.6, 0.24, 0.12]} />
      </mesh>

      {/* Stainless Steel Safety Bollards along Walkways */}
      {[-20, -12, -4, 4, 12, 20].map((x, i) => (
        <group key={`bollard-n-${i}`} position={[x, 0.45, -12.35]}>
          <mesh material={steelStructureMaterial} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.65, 12]} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.08, 12]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>
      ))}
      {[-20, -12, -4, 4, 12, 20].map((x, i) => (
        <group key={`bollard-s-${i}`} position={[x, 0.45, 12.35]}>
          <mesh material={steelStructureMaterial} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.65, 12]} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.08, 12]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>
      ))}

      {/* ------------------ 3. ROAD NETWORK, ZEBRAS & DIRECTIONAL MARKINGS ------------------ */}
      {/* Central Drive Aisle between Row 1 and Row 2 */}
      {/* Center Dashed White Lane Divider */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh
          key={`lane-dash-${i}`}
          position={[-16 + i * 4.0, 0.025, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[2.2, 0.14]} />
          <meshBasicMaterial color="#ffffff" opacity={0.75} transparent />
        </mesh>
      ))}

      {/* Lane Outer Solid Lines */}
      <mesh position={[0, 0.025, -3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36.0, 0.12]} />
        <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, 0.025, 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36.0, 0.12]} />
        <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
      </mesh>

      {/* Pedestrian Zebra Crosswalk at East and West ends of the bays */}
      {[-3.0, -2.0, -1.0, 0, 1.0, 2.0, 3.0].map((z, idx) => (
        <group key={`crosswalk-w-${idx}`}>
          <mesh position={[-16.8, 0.025, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, 0.6]} />
            <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
          </mesh>
          <mesh position={[16.8, 0.025, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, 0.6]} />
            <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
          </mesh>
        </group>
      ))}

      {/* Directional Stencil Arrows in Central Aisle */}
      {[-10, 0, 10].map((x, idx) => (
        <group key={`arrow-${idx}`} position={[x, 0.03, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[-0.4, 0, 0]}>
            <planeGeometry args={[1.2, 0.18]} />
            <meshBasicMaterial color="#ffffff" opacity={0.7} transparent />
          </mesh>
          <mesh position={[0.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.35, 0.6, 3]} />
            <meshBasicMaterial color="#ffffff" opacity={0.7} transparent />
          </mesh>
        </group>
      ))}

      {/* ------------------ 4. CAMPUS MONUMENT SIGN & SECURITY KIOSK ------------------ */}
      {/* Entrance Monument Sign */}
      <group position={[-23.5, 0.24, -9.5]}>
        {/* Stone Pedestal Base */}
        <mesh position={[0, 0.6, 0]} material={concreteCurbMaterial} castShadow>
          <boxGeometry args={[0.5, 1.2, 3.6]} />
        </mesh>
        {/* Architectural Plaque */}
        <mesh position={[0.26, 0.7, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[3.2, 0.8]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* Modern Security Gatehouse / Utility Kiosk */}
      <group position={[-23.2, 0.24, 7.5]}>
        <mesh position={[0, 1.3, 0]} material={baseSlabMaterial} castShadow receiveShadow>
          <boxGeometry args={[2.0, 2.4, 2.4]} />
        </mesh>
        {/* Glass Windows */}
        <mesh position={[0.9, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.8, 1.0]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} transparent opacity={0.8} />
        </mesh>
        {/* Kiosk Overhang Roof */}
        <mesh position={[0, 2.55, 0]} material={steelStructureMaterial} castShadow>
          <boxGeometry args={[2.4, 0.12, 2.8]} />
        </mesh>
      </group>

      {/* ------------------ 5. MODERN ARCHITECTURAL LANDSCAPING ------------------ */}
      {/* Planter boxes with greenery along North & South perimeters */}
      {[-16, -6, 6, 16].map((x, i) => (
        <group key={`planter-n-${i}`} position={[x, 0.45, -13.5]}>
          <mesh material={woodPlanterMaterial} castShadow>
            <boxGeometry args={[3.2, 0.45, 0.9]} />
          </mesh>
          {/* Shrub foliage clump */}
          <mesh position={[0, 0.35, 0]} material={shrubFoliageMaterial} castShadow>
            <boxGeometry args={[3.0, 0.45, 0.75]} />
          </mesh>
        </group>
      ))}
      {[-16, -6, 6, 16].map((x, i) => (
        <group key={`planter-s-${i}`} position={[x, 0.45, 13.5]}>
          <mesh material={woodPlanterMaterial} castShadow>
            <boxGeometry args={[3.2, 0.45, 0.9]} />
          </mesh>
          <mesh position={[0, 0.35, 0]} material={shrubFoliageMaterial} castShadow>
            <boxGeometry args={[3.0, 0.45, 0.75]} />
          </mesh>
        </group>
      ))}

      {/* ------------------ 6. HIGH-TECH CANTILEVER SOLAR CANOPIES ------------------ */}
      {/* North Canopy (over Row 1: CP-01 to CP-10) */}
      <group position={[0, 0, -6.3]}>
        {/* Structural Steel Columns & Angled Cantilever Arms */}
        {[-14.4, -9.6, -4.8, 0, 4.8, 9.6, 14.4].map((x, i) => (
          <group key={`col-n-${i}`} position={[x, 0, -2.8]}>
            <mesh position={[0, 2.5, 0]} material={steelStructureMaterial} castShadow>
              <boxGeometry args={[0.26, 5.0, 0.26]} />
            </mesh>
            {/* Cantilever Arm extending over vehicles */}
            <mesh
              position={[0, 4.8, 1.4]}
              rotation={[0.12, 0, 0]}
              material={steelStructureMaterial}
              castShadow
            >
              <boxGeometry args={[0.22, 0.22, 2.9]} />
            </mesh>
          </group>
        ))}

        {/* Solar Glass PV Panel Array */}
        <mesh
          position={[0, 5.05, 0.15]}
          rotation={[0.12, 0, 0]}
          material={solarGlassMaterial}
          castShadow
        >
          <boxGeometry args={[33.0, 0.08, 5.4]} />
        </mesh>
        {/* Aluminum Panel Grid Lines */}
        <mesh position={[0, 5.1, 0.15]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[32.8, 0.02, 5.3]} />
          <meshBasicMaterial color="#38bdf8" wireframe />
        </mesh>

        {/* Consolidated High-Efficiency Canopy Fill Lights (North Row) */}
        <pointLight position={[-7.5, 4.2, 0]} color="#38bdf8" intensity={0.85} distance={18} decay={1.5} />
        <pointLight position={[7.5, 4.2, 0]} color="#22d3ee" intensity={0.85} distance={18} decay={1.5} />

        {/* Overhead Canopy Downlight Fixtures for each of the 10 North bays */}
        {Array.from({ length: 10 }).map((_, i) => {
          const bayX = (i - 4.5) * 3.2;
          const chargerId = `CP-${String(i + 1).padStart(2, '0')}`;
          const state = activeChargerMap.get(chargerId);

          let glowColor = '#38bdf8';
          if (state?.isEmergency) {
            glowColor = '#ef4444';
          } else if (state?.isCutoff) {
            glowColor = '#10b981';
          } else if (state?.isCharging) {
            glowColor = '#22d3ee';
          }

          return (
            <group key={`downlight-n-${i}`} position={[bayX, 4.7, 0]}>
              {/* Fixture head housing */}
              <mesh material={steelStructureMaterial}>
                <cylinderGeometry args={[0.12, 0.12, 0.08, 10]} />
              </mesh>
              {/* Glowing emissive LED lens */}
              <mesh position={[0, -0.045, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.02, 10]} />
                <meshBasicMaterial color={glowColor} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* South Canopy (over Row 2: CP-11 to CP-20) */}
      <group position={[0, 0, 6.3]}>
        {[-14.4, -9.6, -4.8, 0, 4.8, 9.6, 14.4].map((x, i) => (
          <group key={`col-s-${i}`} position={[x, 0, 2.8]}>
            <mesh position={[0, 2.5, 0]} material={steelStructureMaterial} castShadow>
              <boxGeometry args={[0.26, 5.0, 0.26]} />
            </mesh>
            <mesh
              position={[0, 4.8, -1.4]}
              rotation={[-0.12, 0, 0]}
              material={steelStructureMaterial}
              castShadow
            >
              <boxGeometry args={[0.22, 0.22, 2.9]} />
            </mesh>
          </group>
        ))}

        <mesh
          position={[0, 5.05, -0.15]}
          rotation={[-0.12, 0, 0]}
          material={solarGlassMaterial}
          castShadow
        >
          <boxGeometry args={[33.0, 0.08, 5.4]} />
        </mesh>
        <mesh position={[0, 5.1, -0.15]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[32.8, 0.02, 5.3]} />
          <meshBasicMaterial color="#38bdf8" wireframe />
        </mesh>

        {/* Consolidated High-Efficiency Canopy Fill Lights (South Row) */}
        <pointLight position={[-7.5, 4.2, 0]} color="#38bdf8" intensity={0.85} distance={18} decay={1.5} />
        <pointLight position={[7.5, 4.2, 0]} color="#22d3ee" intensity={0.85} distance={18} decay={1.5} />

        {/* Overhead Canopy Downlight Fixtures for each of the 10 South bays */}
        {Array.from({ length: 10 }).map((_, i) => {
          const bayX = (i - 4.5) * 3.2;
          const chargerId = `CP-${String(i + 11).padStart(2, '0')}`;
          const state = activeChargerMap.get(chargerId);

          let glowColor = '#38bdf8';
          if (state?.isEmergency) {
            glowColor = '#ef4444';
          } else if (state?.isCutoff) {
            glowColor = '#10b981';
          } else if (state?.isCharging) {
            glowColor = '#22d3ee';
          }

          return (
            <group key={`downlight-s-${i}`} position={[bayX, 4.7, 0]}>
              <mesh material={steelStructureMaterial}>
                <cylinderGeometry args={[0.12, 0.12, 0.08, 10]} />
              </mesh>
              <mesh position={[0, -0.045, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.02, 10]} />
                <meshBasicMaterial color={glowColor} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ------------------ 7. PERIMETER ARCHITECTURAL LED LIGHT TOWERS ------------------ */}
      {/* Soft Campus Perimeter Fill Lights */}
      <pointLight position={[-15, 6.0, -11]} color="#f0f9ff" intensity={0.65} distance={25} />
      <pointLight position={[15, 6.0, 11]} color="#f0f9ff" intensity={0.65} distance={25} />

      {[-22, -8, 8, 22].map((x, i) => (
        <group key={`pole-n-${i}`} position={[x, 0, -12.4]}>
          <mesh position={[0, 2.8, 0]} material={steelStructureMaterial} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 5.6, 10]} />
          </mesh>
          <mesh position={[0, 5.6, 0.4]} material={steelStructureMaterial}>
            <boxGeometry args={[0.18, 0.12, 0.9]} />
          </mesh>
          <mesh position={[0, 5.54, 0.6]}>
            <boxGeometry args={[0.22, 0.02, 0.4]} />
            <meshBasicMaterial color="#e0f2fe" />
          </mesh>
        </group>
      ))}
      {[-22, -8, 8, 22].map((x, i) => (
        <group key={`pole-s-${i}`} position={[x, 0, 12.4]}>
          <mesh position={[0, 2.8, 0]} material={steelStructureMaterial} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 5.6, 10]} />
          </mesh>
          <mesh position={[0, 5.6, -0.4]} material={steelStructureMaterial}>
            <boxGeometry args={[0.18, 0.12, 0.9]} />
          </mesh>
          <mesh position={[0, 5.54, -0.6]}>
            <boxGeometry args={[0.22, 0.02, 0.4]} />
            <meshBasicMaterial color="#e0f2fe" />
          </mesh>
        </group>
      ))}
    </group>
  );
});

FacilityEnvironment3D.displayName = 'FacilityEnvironment3D';

