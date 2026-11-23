/**
 * PathCamera.tsx
 *
 * Follow camera that keeps the current lesson (and a useful section of path
 * ahead of it) framed. OrbitControls owns camera.position (it derives it
 * from `target` + its internal spherical radius/angles on every `update()`),
 * so we cannot just assign a new camera.position each frame — OrbitControls
 * would overwrite it on its own next update. Instead we translate BOTH
 * camera.position and controls.target by their own frame-to-frame delta.
 * That keeps the user's chosen zoom offset intact (a relative move, not a
 * hard reset) while still following the path.
 *
 * The camera POSITION anchors to the current lesson (`petProgress`), but the
 * look-at TARGET anchors to a point further along the path
 * (`lookAheadProgress`, provided by the caller — typically ~30% of the way
 * toward the next lesson). That decouples "where the camera sits" from
 * "what it's aimed at", producing a forward-looking composition that shows
 * the upcoming journey instead of centering tightly on one node.
 *
 * Both progress values are discrete (jump on lesson/course change, not
 * continuous per-frame numbers), so each is smoothly interpolated locally —
 * that's what gives the "smooth reframe on course switch" behavior for
 * free, walking along the spline's actual curvature.
 */

import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getPointOnSpline, getTangentOnSpline } from '@/lib/pathSpline';
import type { CatmullRomCurve3 } from 'three';

// ========== Constants ==========

const LOOK_HEIGHT_RATIO = 0.2; // look-at height, relative to heightOffset
/** How fast each displayProgress catches up to its target (per frame, ~60fps). */
const PROGRESS_LERP = 0.05;
const SNAP_THRESHOLD = 0.0005;

function stepToward(current: number, target: number): number {
  const diff = target - current;
  return current + (Math.abs(diff) < SNAP_THRESHOLD ? diff : diff * PROGRESS_LERP);
}

// ========== Component Props ==========

export interface PathCameraProps {
  /** Current progress (0-1) along the path — anchors camera POSITION. */
  petProgress: number;
  /** Progress (0-1) further along the path — anchors the look-at TARGET.
   * Defaults to petProgress when not provided. */
  lookAheadProgress?: number;
  /** The spline curve to follow */
  spline: CatmullRomCurve3;
  /** Behind (opposite direction of travel) the tracked point. */
  backDistance: number;
  /** Above the tracked point. */
  heightOffset: number;
}

// ========== Component ==========

export const PathCamera: React.FC<PathCameraProps> = ({
  petProgress,
  lookAheadProgress,
  spline,
  backDistance,
  heightOffset,
}) => {
  const { controls, camera } = useThree() as any;
  const focusProgress = lookAheadProgress ?? petProgress;

  const displayAnchorRef = useRef(petProgress);
  const displayFocusRef = useRef(focusProgress);
  const lastAnchorPointRef = useRef(new THREE.Vector3());
  const lastFocusPointRef = useRef(new THREE.Vector3());
  const primedRef = useRef(false);

  useLayoutEffect(() => {
    // Prime instantly (absolute set, no lerp) so the very first frame — and
    // any rig change from a live breakpoint crossing — is already correctly
    // framed. This is the one place we ARE allowed to assign camera.position
    // directly, because we immediately resync OrbitControls' internal
    // spherical state via controls.update().
    displayAnchorRef.current = petProgress;
    displayFocusRef.current = focusProgress;

    const anchorPoint = getPointOnSpline(spline, petProgress);
    const anchorTangent = getTangentOnSpline(spline, petProgress);
    const position = anchorPoint.clone().addScaledVector(anchorTangent, -backDistance);
    position.y = anchorPoint.y + heightOffset;

    const focusPoint = getPointOnSpline(spline, focusProgress);
    const target = new THREE.Vector3(focusPoint.x, focusPoint.y + heightOffset * LOOK_HEIGHT_RATIO, focusPoint.z);

    camera.position.copy(position);
    lastAnchorPointRef.current.copy(anchorPoint);
    lastFocusPointRef.current.copy(focusPoint);
    if (controls && typeof controls.target !== 'undefined') {
      controls.target.copy(target);
      controls.update?.();
    }
    primedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spline, controls, camera, backDistance, heightOffset]);

  useFrame(() => {
    if (!controls || !primedRef.current) return;

    displayAnchorRef.current = stepToward(displayAnchorRef.current, petProgress);
    displayFocusRef.current = stepToward(displayFocusRef.current, focusProgress);

    const anchorPoint = getPointOnSpline(spline, displayAnchorRef.current);
    const anchorDelta = anchorPoint.clone().sub(lastAnchorPointRef.current);
    if (anchorDelta.lengthSq() > 0) {
      camera.position.add(anchorDelta);
      lastAnchorPointRef.current.copy(anchorPoint);
    }

    const focusPoint = getPointOnSpline(spline, displayFocusRef.current);
    const focusDelta = focusPoint.clone().sub(lastFocusPointRef.current);
    if (focusDelta.lengthSq() > 0) {
      controls.target.add(focusDelta);
      lastFocusPointRef.current.copy(focusPoint);
    }

    if (anchorDelta.lengthSq() > 0 || focusDelta.lengthSq() > 0) {
      controls.update?.();
    }
  });

  return null;
};

// ========== Export ==========

export default PathCamera;
