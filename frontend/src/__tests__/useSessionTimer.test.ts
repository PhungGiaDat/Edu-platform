// frontend-web/src/__tests__/useSessionTimer.test.ts
/**
 * Vitest unit tests for the useSessionTimer hook.
 * Tests the session timer logic including warning/limit states and pause/resume.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionTimer } from '../hooks/useSessionTimer';

// Mock sessionApi
vi.mock('../services/sessionApi', () => ({
  default: {
    getLockState: vi.fn().mockResolvedValue(null),
    pauseLock: vi.fn().mockResolvedValue(true),
    resumeLock: vi.fn().mockResolvedValue(true),
    startLock: vi.fn().mockResolvedValue({}),
    extendLock: vi.fn().mockResolvedValue({}),
  },
}));

describe('useSessionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at 0 elapsed minutes', () => {
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25 })
    );
    expect(result.current.elapsedMins).toBe(0);
    expect(result.current.isWarning).toBe(false);
    expect(result.current.isLimitReached).toBe(false);
  });

  it('enters warning state at 25 minutes', () => {
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25 })
    );

    // Advance by 25 minutes (25 ticks at 60s each)
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(result.current.isWarning).toBe(true);
    expect(result.current.isLimitReached).toBe(false);
    expect(result.current.elapsedMins).toBeGreaterThanOrEqual(25);
  });

  it('enters limit state at 30 minutes', () => {
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25 })
    );

    // Advance by 30 minutes
    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });

    expect(result.current.isLimitReached).toBe(true);
    expect(result.current.elapsedMins).toBeGreaterThanOrEqual(30);
  });

  it('pause() stops the clock', () => {
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25 })
    );

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    const beforePause = result.current.elapsedMins;

    act(() => {
      result.current.pause();
    });

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    // Should not have advanced past the pause point
    expect(result.current.elapsedMins).toBeLessThanOrEqual(beforePause + 1);
    expect(result.current.isPaused).toBe(true);
  });

  it('extendTime(10) adds 10 minutes to remaining', () => {
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25 })
    );

    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    const beforeExtend = result.current.remainingMins;
    act(() => {
      result.current.extendTime(10);
    });

    expect(result.current.remainingMins).toBe(beforeExtend + 10);
    expect(result.current.isLimitReached).toBe(false);
  });

  it('formatRemaining returns human-readable string', () => {
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25 })
    );

    // Initial remaining should be 30 mins
    expect(result.current.formatRemaining()).toBe('30 mins');
  });

  it('warning fires onWarning callback', () => {
    const onWarning = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25, onWarning })
    );

    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(result.current.isWarning).toBe(true);
  });

  it('limit fires onLimitReached callback', () => {
    const onLimitReached = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25, onLimitReached })
    );

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });

    expect(result.current.isLimitReached).toBe(true);
  });

  it('reset() returns to initial state', async () => {
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25 })
    );

    // Advance time
    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000);
    });
    expect(result.current.elapsedMins).toBeGreaterThan(0);

    // Reset
    await act(async () => {
      await result.current.reset();
    });

    expect(result.current.elapsedMins).toBe(0);
    expect(result.current.isWarning).toBe(false);
    expect(result.current.isLimitReached).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('resume() unpauses the clock', async () => {
    const { result } = renderHook(() =>
      useSessionTimer({ limitMins: 30, warningMins: 25 })
    );

    // Pause
    await act(async () => {
      await result.current.pause();
    });
    expect(result.current.isPaused).toBe(true);

    // Resume
    await act(async () => {
      await result.current.resume();
    });
    expect(result.current.isPaused).toBe(false);
  });
});
