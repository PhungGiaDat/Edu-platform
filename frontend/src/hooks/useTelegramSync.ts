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

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface TelegramMessageInput {
  logs: string;
  manualOffset: { x: number; y: number };
  flashcardCount: number;
  engine: string;
}

function truncateTail(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(-maxLength);
  return `...${value.slice(-(maxLength - 3))}`;
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

  if (metadata.length >= TELEGRAM_MESSAGE_LIMIT) {
    return metadata.slice(0, TELEGRAM_MESSAGE_LIMIT);
  }

  return metadata + truncateTail(logs, TELEGRAM_MESSAGE_LIMIT - metadata.length);
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

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'IFRAME_LOGS') return;

      const logs = event.data.payload?.logs || '';
      iframeLogsRef.current = logs;
      setIframeLogs(logs);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const syncTelegram = useCallback(async () => {
    if (!enabled || syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    HapticService.tap();

    iframeRef.current?.contentWindow?.postMessage(
      { type: 'REQUEST_IFRAME_LOGS' },
      '*',
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const parentLogs = getParentLogs();
    let allLogs = `=== PARENT LOGS ===\n${parentLogs}`;
    if (iframeLogsRef.current) {
      allLogs += `\n\n=== IFRAME LOGS (Last 200) ===\n${iframeLogsRef.current}`;
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
    manualOffset,
    flashcardCount,
    getParentLogs,
    getActiveEngine,
  ]);

  return { syncTelegram, syncStatus, iframeLogs };
}
