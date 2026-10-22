import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export type CameraPreset =
  | 'overview'
  | 'north'
  | 'south'
  | 'substation'
  | 'topdown'
  | 'fit'
  | 'selected';

export interface CameraControllerProps {
  preset: CameraPreset;
  selectedPos?: [number, number, number] | null;
  onPresetChange?: (preset: CameraPreset) => void;
}

const PRESET_CONFIGS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: {
    pos: [0, 20, 26],
    target: [0, 0, 0],
  },
  north: {
    pos: [0, 10, -17],
    target: [0, 0, -6.3],
  },
  south: {
    pos: [0, 10, 17],
    target: [0, 0, 6.3],
  },
  substation: {
    pos: [-24, 8, 7],
    target: [-19.5, 1.5, 0],
  },
  topdown: {
    pos: [0, 38, 0.01],
    target: [0, 0, 0],
  },
  fit: {
    pos: [0, 28, 35],
    target: [0, 0, 0],
  },
  selected: {
    pos: [0, 9, 14],
    target: [0, 0, 0],
  },
};

export const CameraController: React.FC<CameraControllerProps> = ({
  preset,
  selectedPos,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const targetCamPos = useRef(new THREE.Vector3(...PRESET_CONFIGS.overview.pos));
  const targetLookAt = useRef(new THREE.Vector3(...PRESET_CONFIGS.overview.target));
  const isTransitioning = useRef(true);

  useEffect(() => {
    isTransitioning.current = true;
    if (preset === 'selected' && selectedPos) {
      targetLookAt.current.set(selectedPos[0], selectedPos[1], selectedPos[2]);
      const zOffset = selectedPos[2] < 0 ? -8.5 : 8.5;
      targetCamPos.current.set(selectedPos[0], selectedPos[1] + 6.0, selectedPos[2] + zOffset);
    } else {
      const cfg = PRESET_CONFIGS[preset] || PRESET_CONFIGS.overview;
      targetCamPos.current.set(...cfg.pos);
      targetLookAt.current.set(...cfg.target);
    }
  }, [preset, selectedPos]);

  useFrame((_, delta) => {
    if (!controlsRef.current || !isTransitioning.current) return;

    const lerpFactor = Math.min(1.0, delta * 3.8);
    camera.position.lerp(targetCamPos.current, lerpFactor);
    controlsRef.current.target.lerp(targetLookAt.current, lerpFactor);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(targetCamPos.current) < 0.1 &&
      controlsRef.current.target.distanceTo(targetLookAt.current) < 0.1
    ) {
      isTransitioning.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={6}
      maxDistance={70}
      minPolarAngle={Math.PI / 14} // Prevent vertical inversion
      maxPolarAngle={Math.PI * 0.43} // Keep camera above the campus podium (~77.4 degrees)
      onStart={() => {
        isTransitioning.current = false;
      }}
    />
  );
};
