/**
 * Collect AR debug logs and send them to the backend Telegram gateway.
 *
 * The Telegram bot token never enters the browser. The backend owns the bot
 * credentials and forwards this authenticated report to the configured chat.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { HapticService } from '@/services/HapticService';
import { apiClient } from '@/services/apiClient';

export const TELEGRAM_MESSAGE_LIMIT = 4096;
const IFRAME_LOG_REQUEST_TIMEOUT_MS = 1000;

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface TelegramMessageInput {
  logs: string;
  manualOffset: { x: number; y: number };
  flashcardCount: number;
  engine: string;
}

export function buildTelegramMessage({
  logs,
  manualOffset,
  flashcardCount,
  engine,
}: TelegramMessageInput): string {
  const metadata =
    `🚀 AR Sync Report\n` +
    `Offset: X:${manualOffset.x}, Y:${manualOffset.y}\n` +
    `Flashcards: ${flashcardCount}\n` +
    `Engine: ${engine}\n` +
    `Time: ${new Date().toISOString()}\n\n` +
    `Logs Snapshot:\n`;

  // Telegram's per-message limit is enforced by the backend, which splits the
  // complete report into ordered messages. Keep the complete snapshot here so
  // the beginning of the diagnostic session is not silently discarded.
  return metadata + logs;
}

interface UseTelegramSyncOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  manualOffset?: { x: number; y: number };
  flashcardCount?: number;
  enabled?: boolean;
  getParentLogs?: () => string;
  getActiveEngine?: () => string;
}

interface MobileDebugApi {
  getLogs?: () => string;
  activeEngine?: string;
}

interface IframeLogsPayload {
  requestId?: string;
  logs?: string;
}

interface PendingIframeLogsRequest {
  requestId: string;
  resolve: (logs: string) => void;
  timeoutId: number;
}

function getMobileDebug(): MobileDebugApi | undefined {
  return (window as Window & { MobileDebug?: MobileDebugApi }).MobileDebug;
}

export function useTelegramSync({
  iframeRef,
  manualOffset = { x: 0, y: 0 },
  flashcardCount = 1,
  enabled = true,
  getParentLogs = () => getMobileDebug()?.getLogs?.() || 'No parent logs.',
  getActiveEngine = () => getMobileDebug()?.activeEngine || 'unknown',
}: UseTelegramSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [iframeLogs, setIframeLogs] = useState<string>('');
  const iframeLogsRef = useRef('');
  const pendingIframeLogsRef = useRef<PendingIframeLogsRequest | null>(null);
  const iframeLogRequestSequenceRef = useRef(0);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'IFRAME_LOGS') return;

      const iframeWindow = iframeRef.current?.contentWindow;
      if (event.source && iframeWindow && event.source !== iframeWindow) return;

      const payload = (event.data.payload || {}) as IframeLogsPayload;
      const logs = typeof payload.logs === 'string' ? payload.logs : '';
      iframeLogsRef.current = logs;
      setIframeLogs(logs);

      const pendingRequest = pendingIframeLogsRef.current;
      if (!pendingRequest || payload.requestId !== pendingRequest.requestId) return;

      window.clearTimeout(pendingRequest.timeoutId);
      pendingIframeLogsRef.current = null;
      pendingRequest.resolve(logs);
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      const pendingRequest = pendingIframeLogsRef.current;
      if (!pendingRequest) return;

      window.clearTimeout(pendingRequest.timeoutId);
      pendingIframeLogsRef.current = null;
      pendingRequest.resolve(iframeLogsRef.current);
    };
  }, [iframeRef]);

  const requestIframeLogs = useCallback((): Promise<string> => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return Promise.resolve(iframeLogsRef.current);

    const requestId = `telegram-log-${Date.now()}-${iframeLogRequestSequenceRef.current++}`;

    return new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        const pendingRequest = pendingIframeLogsRef.current;
        if (!pendingRequest || pendingRequest.requestId !== requestId) return;

        pendingIframeLogsRef.current = null;
        resolve(iframeLogsRef.current);
      }, IFRAME_LOG_REQUEST_TIMEOUT_MS);

      pendingIframeLogsRef.current = { requestId, resolve, timeoutId };

      try {
        iframeWindow.postMessage(
          { type: 'REQUEST_IFRAME_LOGS', payload: { requestId } },
          '*',
        );
      } catch {
        window.clearTimeout(timeoutId);
        pendingIframeLogsRef.current = null;
        resolve(iframeLogsRef.current);
      }
    });
  }, [iframeRef]);

  const syncTelegram = useCallback(async () => {
    if (!enabled || syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    HapticService.tap();

    const currentIframeLogs = await requestIframeLogs();

    const parentLogs = getParentLogs();
    let allLogs = `=== PARENT LOGS ===\n${parentLogs}`;
    if (currentIframeLogs) {
      allLogs += `\n\n=== IFRAME LOGS (buffer snapshot) ===\n${currentIframeLogs}`;
    }

    const text = buildTelegramMessage({
      logs: allLogs,
      manualOffset,
      flashcardCount,
      engine: getActiveEngine(),
    });

    try {
      await apiClient.post('/api/v1/telegram/sync', { text });
      setSyncStatus('success');
      HapticService.success();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ Telegram Sync Failed:', error.message);
      setSyncStatus('error');
      HapticService.error();
    } finally {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [
    enabled,
    syncStatus,
    iframeRef,
    requestIframeLogs,
    manualOffset,
    flashcardCount,
    getParentLogs,
    getActiveEngine,
  ]);

  return { syncTelegram, syncStatus, iframeLogs };
}
