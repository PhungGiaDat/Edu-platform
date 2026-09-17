import { useEffect, useState } from 'react';

export interface CameraRig {
  fov: number;
  /** Distance behind the tracked point, opposite the direction of travel. */
  backDistance: number;
  /** Height above the tracked point. */
  heightOffset: number;
}

/**
 * Reversal: earlier passes kept tightening this (down to backDistance 3.7 /
 * heightOffset 2.5 on mobile) chasing "nodes too small", but the real
 * screenshot showed the OPPOSITE failure — the camera sitting almost at
 * ground level with one giant foreground object and empty background. A
 * controlled 2.5D map composition needs a farther, higher camera showing
 * current + a few neighbors, not a close-up on one node. Node/platform
 * *scale* (LessonNode3D) is now the lever for "nodes readable on mobile",
 * not camera proximity.
 */
const WIDE: CameraRig = { fov: 48, backDistance: 8, heightOffset: 5.5 };
const NARROW: CameraRig = { fov: 50, backDistance: 6, heightOffset: 4.2 };

/**
 * Tracks whether the viewport is narrower than `breakpointPx` and returns the
 * matching camera rig (fov + follow distance/height as one coherent system).
 * Uses matchMedia's `change` event so it only updates on an actual breakpoint
 * crossing — not on every pixel of a resize/orientation-change drag — and
 * fires correctly for both window resizing and device rotation.
 */
export function useResponsiveCameraRig(breakpointPx = 640): CameraRig {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpointPx : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const query = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => setIsNarrow(event.matches);

    handleChange(query); // sync in case it changed between initial state and effect running
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [breakpointPx]);

  return isNarrow ? NARROW : WIDE;
}
