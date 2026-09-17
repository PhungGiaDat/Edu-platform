/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveCameraRig } from '@/features/learning-path/useResponsiveCameraRig';

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: '',
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.delete(cb),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;

  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb({ matches: next }));
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useResponsiveCameraRig', () => {
  it('returns a farther/wider rig on desktop widths', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useResponsiveCameraRig(640));
    expect(result.current).toEqual({ fov: 50, backDistance: 6, heightOffset: 4 });
  });

  it('returns a closer, only-modestly-wider rig on mobile widths (not fov alone)', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useResponsiveCameraRig(640));
    expect(result.current).toEqual({ fov: 58, backDistance: 4.2, heightOffset: 3 });
    // Mobile must be closer, not just wider-fov-at-the-same-distance.
    expect(result.current.backDistance).toBeLessThan(6);
    expect(result.current.heightOffset).toBeLessThan(4);
  });

  it('updates live when the viewport crosses the breakpoint (resize/orientation change)', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useResponsiveCameraRig(640));
    expect(result.current.fov).toBe(50);

    act(() => media.setMatches(true));
    expect(result.current.fov).toBe(58);
    expect(result.current.backDistance).toBe(4.2);

    act(() => media.setMatches(false));
    expect(result.current.fov).toBe(50);
  });
});
