/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveFov } from '@/features/learning-path/useResponsiveFov';

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

describe('useResponsiveFov', () => {
  it('returns the wide-viewport fov on desktop widths', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useResponsiveFov(640, 68, 55));
    expect(result.current).toBe(55);
  });

  it('returns the narrow-viewport fov on mobile widths', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useResponsiveFov(640, 68, 55));
    expect(result.current).toBe(68);
  });

  it('updates live when the viewport crosses the breakpoint (resize/orientation change)', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useResponsiveFov(640, 68, 55));
    expect(result.current).toBe(55);

    act(() => media.setMatches(true));
    expect(result.current).toBe(68);

    act(() => media.setMatches(false));
    expect(result.current).toBe(55);
  });
});
