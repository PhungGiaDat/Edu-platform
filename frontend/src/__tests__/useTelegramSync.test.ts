import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildTelegramMessage,
  TELEGRAM_MESSAGE_LIMIT,
  useTelegramSync,
} from '../hooks/useTelegramSync';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('buildTelegramMessage', () => {
  it('keeps the complete log snapshot for backend chunking', () => {
    const message = buildTelegramMessage({
      logs: 'start\n' + 'x'.repeat(6000) + '\nlast-log-line',
      manualOffset: { x: 0.1, y: -0.2 },
      flashcardCount: 2,
      engine: 'MindAR',
    });

    expect(message.length).toBeGreaterThan(TELEGRAM_MESSAGE_LIMIT);
    expect(message).toContain('AR Sync Report');
    expect(message).toContain('Offset: X:0.1, Y:-0.2');
    expect(message).toContain('start\n');
    expect(message).toContain('last-log-line');
    expect(message).not.toContain('...start');
  });
});

describe('useTelegramSync', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('waits for the matching iframe snapshot before posting the report', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    const iframe = document.createElement('iframe');
    const iframeWindow = { postMessage: vi.fn() };
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: iframeWindow,
    });
    const iframeRef = { current: iframe };

    const { result } = renderHook(() => useTelegramSync({
      iframeRef,
      getParentLogs: () => 'parent-start\nparent-end',
      getActiveEngine: () => 'mindar',
    }));

    let syncPromise: Promise<void>;
    act(() => {
      syncPromise = result.current.syncTelegram();
    });

    const request = iframeWindow.postMessage.mock.calls[0][0] as {
      payload: { requestId: string };
    };
    expect(request).toEqual({
      type: 'REQUEST_IFRAME_LOGS',
      payload: { requestId: expect.any(String) },
    });
    expect(apiClient.post).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'IFRAME_LOGS',
          payload: {
            requestId: 'stale-request',
            logs: 'stale-iframe-log',
          },
        },
      }));
      expect(apiClient.post).not.toHaveBeenCalled();

      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'IFRAME_LOGS',
          payload: {
            requestId: request.payload.requestId,
            logs: 'iframe-start\niframe-end',
          },
        },
      }));
      await syncPromise;
    });

    expect(apiClient.post).toHaveBeenCalledOnce();
    const [, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(body).toEqual({
      text: expect.stringContaining('iframe-start\niframe-end'),
    });
    expect(body?.text).toContain('parent-start\nparent-end');
  });
});
