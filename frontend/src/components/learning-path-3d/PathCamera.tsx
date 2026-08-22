/**
 * PathCamera.tsx
 *
 * Follow camera that tracks the pet along the 3D learning path.
 * Stays behind the pet at a fixed offset and looks ahead along the path.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getPointOnSpline } from '@/lib/pathSpline';
import type { CatmullRomCurve3 } from 'three';

// ========== Component Props ==========

export interface PathCameraProps {
  /** Current progress (0-1) along the path */
  petProgress: number;
  /** The spline curve to follow */
  spline: CatmullRomCurve3;
}

// ========== Component ==========

export const PathCamera: React.FC<PathCameraProps> = ({ petProgress, spline }) => {
  const { camera } = useThree();
  const targetPosRef = useRef(new THREE.Vector3());

  useFrame(() => {
    // Calculate positions along the spline
    const behindProgress = petProgress - 0.05;
    const behindPos = getPointOnSpline(spline, behindProgress);
    const petPos = getPointOnSpline(spline, petProgress);

    // Camera position: behind and above the pet
    targetPosRef.current.set(
      behindPos.x,
      petPos.y + 4,
      behindPos.z + 6
    );

    // Smooth follow with lerp interpolation
    camera.position.lerp(targetPosRef.current, 0.05);

    // Look slightly ahead of the pet
    camera.lookAt(petPos.x, petPos.y + 1, petPos.z);
  });

  // This component doesn't render any visible geometry
  return null;
};

// ========== Export ==========

export default PathCamera;
