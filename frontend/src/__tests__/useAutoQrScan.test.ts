import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const eventBusMocks = vi.hoisted(() => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock('@/runtime/EventBus', () => ({
  eventBus: eventBusMocks,
}));

import { useAutoQrScan } from '@/components/ar/useAutoQrScan';

describe('useAutoQrScan', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    eventBusMocks.emit.mockClear();
    eventBusMocks.on.mockClear();
    eventBusMocks.off.mockClear();
    vi.stubGlobal('crypto', { randomUUID: () => 'test-session' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts the first QR scan automatically after AR_READY', () => {
    const { result, unmount } = renderHook(() => useAutoQrScan({ enabled: true, maxCards: 2 }));

    act(() => {
      result.current.markReady();
      vi.advanceTimersByTime(800);
    });

    expect(eventBusMocks.emit).toHaveBeenCalledWith('AR_COMMAND', expect.objectContaining({
      type: 'BEGIN_ADD_CARD_SCAN',
      payload: expect.objectContaining({ excludedQrIds: [], timeoutMs: 15_000 }),
    }));

    unmount();
  });

  it('continues scanning while excluding the first detected QR', () => {
    const { result, unmount } = renderHook(() => useAutoQrScan({ enabled: true, maxCards: 2 }));

    act(() => {
      result.current.markReady();
      vi.advanceTimersByTime(800);
      result.current.markQr('cat001');
    });

    expect(eventBusMocks.emit).toHaveBeenCalledWith('AR_COMMAND', expect.objectContaining({
      type: 'BEGIN_ADD_CARD_SCAN',
      payload: expect.objectContaining({ excludedQrIds: ['cat001'], timeoutMs: 30_000 }),
    }));

    unmount();
  });
});
