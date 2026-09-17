import { useEffect, useState } from 'react';

export interface CameraRig {
  fov: number;
  /** Distance behind the tracked point, opposite the direction of travel. */
  backDistance: number;
  /** Height above the tracked point. */
  heightOffset: number;
}

const WIDE: CameraRig = { fov: 50, backDistance: 5.4, heightOffset: 3.4 };
/**
 * Mobile is NOT just "wider fov" — a wide fov alone shrinks every object in
 * frame. A narrow viewport instead gets a noticeably CLOSER camera (smaller
 * backDistance/heightOffset) with only a modest fov bump, so the current
 * node and its neighbors read as large, legible landmarks instead of tiny
 * dots on a wide establishing shot. Pulled in further than the first pass —
 * screenshots still showed too much empty ground around a small world.
 */
const NARROW: CameraRig = { fov: 56, backDistance: 3.7, heightOffset: 2.5 };

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
