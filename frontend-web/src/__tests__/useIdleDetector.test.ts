// frontend-web/src/__tests__/useIdleDetector.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleDetector } from '../hooks/useIdleDetector';

describe('useIdleDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts as not idle', () => {
    const { result } = renderHook(() => useIdleDetector(5000));
    expect(result.current.isIdle).toBe(false);
  });

  it('becomes idle after timeout', () => {
    const { result } = renderHook(() => useIdleDetector(5000));
    
    // Flush pending effects and timers
    act(() => {
      vi.runAllTimers();
    });
    
    expect(result.current.isIdle).toBe(true);
  });

  it('resets idle state on activity', () => {
    const { result } = renderHook(() => useIdleDetector(5000));

    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.isIdle).toBe(true);

    // Simulate activity
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove'));
    });
    expect(result.current.isIdle).toBe(false);

    // Advance timers - should still not be idle
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.isIdle).toBe(true);
  });

  it('reset() manually resets the idle timer', () => {
    const { result } = renderHook(() => useIdleDetector(5000));

    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.isIdle).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.isIdle).toBe(false);
  });
});
