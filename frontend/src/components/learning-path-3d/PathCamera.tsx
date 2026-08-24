/**
 * PathCamera.tsx
 *
 * Follow camera that tracks the pet along the 3D learning path.
 * Smoothly updates the OrbitControls target (look-at point) so the user
 * can still freely orbit/zoom with controls while the framing follows
 * the active node along the path.
 */

import { useEffect, useRef } from 'react';
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
  const { controls } = useThree() as any;
  const targetRef = useRef(new THREE.Vector3());

  useEffect(() => {
    // Prime the look-at so the first frame already has a sensible framing
    // before useFrame starts ticking.
    const initial = getPointOnSpline(spline, petProgress);
    targetRef.current.set(initial.x, initial.y + 1, initial.z);
    if (controls && typeof controls.target !== 'undefined') {
      controls.target.copy(targetRef.current);
      controls.update?.();
    }
  }, [spline, controls]);

  useFrame(() => {
    if (!controls) return;

    const petPos = getPointOnSpline(spline, petProgress);
    targetRef.current.set(petPos.x, petPos.y + 1, petPos.z);

    // Smoothly move the orbit target so the user keeps manual control
    // (rotate / zoom). We never overwrite camera.position here.
    controls.target.lerp(targetRef.current, 0.08);
    controls.update?.();
  });

  return null;
};

// ========== Export ==========

export default PathCamera;
