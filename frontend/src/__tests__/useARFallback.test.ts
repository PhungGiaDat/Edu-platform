import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useARFallback } from '@/hooks/useARFallback';

describe('useARFallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fall back after a same-origin viewer reports AR_READY', () => {
    const onFallbackTriggered = vi.fn();
    const { result } = renderHook(() => useARFallback({
      timeoutMs: 35_000,
      onFallbackTriggered,
    }));

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'AR_READY', payload: { initialized: true }, origin: 'child' },
        origin: window.location.origin,
      }));
    });

    act(() => {
      vi.advanceTimersByTime(70_000);
    });

    expect(result.current.engine).toBe('mindar');
    expect(result.current.fallbackTriggered).toBe(false);
    expect(result.current.timeToReady).not.toBeNull();
    expect(onFallbackTriggered).not.toHaveBeenCalled();
  });

  it('falls back when no AR_READY event arrives before the deadline', () => {
    const onFallbackTriggered = vi.fn();
    const { result } = renderHook(() => useARFallback({
      timeoutMs: 35_000,
      onFallbackTriggered,
    }));

    act(() => {
      vi.advanceTimersByTime(35_000);
    });

    expect(result.current.engine).toBe('xr');
    expect(result.current.fallbackTriggered).toBe(true);
    expect(onFallbackTriggered).toHaveBeenCalledWith('TIMEOUT_NO_READY');
  });

  it('ignores AR_READY messages from a different browser origin', () => {
    const onFallbackTriggered = vi.fn();
    const { result } = renderHook(() => useARFallback({
      timeoutMs: 35_000,
      onFallbackTriggered,
    }));

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'AR_READY', origin: 'child' },
        origin: 'https://untrusted.example',
      }));
      vi.advanceTimersByTime(35_000);
    });

    expect(result.current.engine).toBe('xr');
    expect(onFallbackTriggered).toHaveBeenCalledWith('TIMEOUT_NO_READY');
  });
});
