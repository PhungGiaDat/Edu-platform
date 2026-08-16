import { describe, expect, it, vi } from 'vitest';

import { armViewerBootstrapWatchdog } from '@/components/ar/viewerBootstrapWatchdog';

describe('armViewerBootstrapWatchdog', () => {
  it('fires exactly once when the viewer never reports readiness', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    armViewerBootstrapWatchdog({ timeoutMs: 15_000, onTimeout });

    vi.advanceTimersByTime(14_999);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('can be cancelled after the viewer reports readiness', () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const cancel = armViewerBootstrapWatchdog({ timeoutMs: 15_000, onTimeout });

    cancel();
    vi.advanceTimersByTime(15_000);

    expect(onTimeout).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
