/**
 * PathCamera.tsx
 *
 * Follow camera that keeps the current lesson (and a useful section of path
 * around it) framed. OrbitControls owns camera.position (it derives it from
 * `target` + its internal spherical radius/angles on every `update()`), so
 * we cannot just assign a new camera.position each frame — OrbitControls
 * would overwrite it on its own next update. Instead we translate BOTH
 * camera.position and controls.target by the same delta every frame. That
 * keeps the user's chosen orbit/zoom offset from the tracked point intact
 * (a relative move, not a hard reset) while still following the path.
 *
 * `petProgress` itself is a discrete value (jumps when the current lesson or
 * the selected course changes, not a continuous per-frame number), so we
 * smoothly interpolate a local `displayProgress` toward it — that produces
 * the "smooth reframe on course switch" behavior for free, walking along the
 * spline's actual curvature rather than a straight-line camera glide.
 */

import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getPointOnSpline, getTangentOnSpline } from '@/lib/pathSpline';
import type { CatmullRomCurve3 } from 'three';

// ========== Constants ==========

const LOOK_HEIGHT_RATIO = 0.2; // look-at height, relative to heightOffset
/** How fast displayProgress catches up to petProgress (per frame, ~60fps). */
const PROGRESS_LERP = 0.05;
const SNAP_THRESHOLD = 0.0005;

// ========== Component Props ==========

export interface PathCameraProps {
  /** Current progress (0-1) along the path */
  petProgress: number;
  /** The spline curve to follow */
  spline: CatmullRomCurve3;
  /** Behind (opposite direction of travel) the tracked point. */
  backDistance: number;
  /** Above the tracked point. */
  heightOffset: number;
}

// ========== Component ==========

export const PathCamera: React.FC<PathCameraProps> = ({ petProgress, spline, backDistance, heightOffset }) => {
  const { controls, camera } = useThree() as any;
  const displayProgressRef = useRef(petProgress);
  const lastTrackedPointRef = useRef(new THREE.Vector3());
  const primedRef = useRef(false);

  useLayoutEffect(() => {
    // Prime instantly (absolute set, no lerp) so the very first frame — and
    // any rig change from a live breakpoint crossing — is already correctly
    // framed. This is the one place we ARE allowed to assign camera.position
    // directly, because we immediately resync OrbitControls' internal
    // spherical state via controls.update().
    displayProgressRef.current = petProgress;
    const point = getPointOnSpline(spline, petProgress);
    const tangent = getTangentOnSpline(spline, petProgress);
    const position = point.clone().addScaledVector(tangent, -backDistance);
    position.y = point.y + heightOffset;
    const target = new THREE.Vector3(point.x, point.y + heightOffset * LOOK_HEIGHT_RATIO, point.z);

    camera.position.copy(position);
    lastTrackedPointRef.current.copy(point);
    if (controls && typeof controls.target !== 'undefined') {
      controls.target.copy(target);
      controls.update?.();
    }
    primedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spline, controls, camera, backDistance, heightOffset]);

  useFrame(() => {
    if (!controls || !primedRef.current) return;

    // Walk displayProgress toward the real progress along the curve.
    const diff = petProgress - displayProgressRef.current;
    displayProgressRef.current += Math.abs(diff) < SNAP_THRESHOLD ? diff : diff * PROGRESS_LERP;

    const point = getPointOnSpline(spline, displayProgressRef.current);
    const delta = point.clone().sub(lastTrackedPointRef.current);
    if (delta.lengthSq() > 0) {
      camera.position.add(delta);
      controls.target.add(delta);
      lastTrackedPointRef.current.copy(point);
      controls.update?.();
    }
  });

  return null;
};

// ========== Export ==========

export default PathCamera;
