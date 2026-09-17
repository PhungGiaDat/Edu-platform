import { useEffect, useState } from 'react';

/**
 * Tracks whether the viewport is narrower than `breakpointPx` and returns the
 * matching camera FOV. Uses matchMedia's `change` event (not a resize/scroll
 * listener) so it only re-renders when the viewport actually crosses the
 * breakpoint — not on every pixel of a resize/orientation-change drag — and
 * fires correctly for both window resizing and device rotation.
 */
export function useResponsiveFov(
  breakpointPx = 640,
  narrowFov = 68,
  wideFov = 55,
): number {
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

  return isNarrow ? narrowFov : wideFov;
}
