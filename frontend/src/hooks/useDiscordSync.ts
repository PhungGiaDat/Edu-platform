/**
 * useDiscordSync.ts
 *
 * React hook for syncing AR debug logs to Discord.
 * Composes parent + iframe logs and sends to Discord webhook.
 *
 * @example
 * const { syncDiscord, syncStatus } = useDiscordSync({ iframeRef });
 */
import { useCallback, useEffect, useState } from 'react';
import { HapticService } from '@/services/HapticService';

const DISCORD_WEBHOOK =
  'https://discord.com/api/webhooks/1542098492200189964/sP6wSXxxHXqm7uFVn3s1W_sfHLwKaqW1T2kg1GP5e6JvcGKlKeFA2TDDFO-Lo-F4K0Is';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface UseDiscordSyncOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  manualOffset?: { x: number; y: number };
  flashcardCount?: number;
  getParentLogs?: () => string;
  getActiveEngine?: () => string;
}

export function useDiscordSync({
  iframeRef,
  manualOffset = { x: 0, y: 0 },
  flashcardCount = 1,
  getParentLogs = () => (window as any).MobileDebug?.getLogs?.() || 'No parent logs.',
  getActiveEngine = () => (window as any).MobileDebug?.activeEngine || 'unknown',
}: UseDiscordSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [iframeLogs, setIframeLogs] = useState<string>('');

  // Listen for iframe logs forwarded for Discord sync
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'IFRAME_LOGS_FOR_DISCORD') {
        setIframeLogs(event.data.payload?.logs || '');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const syncDiscord = useCallback(async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    HapticService.tap();

    // 1. Request iframe logs
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'REQUEST_IFRAME_LOGS' },
      '*'
    );

    // 2. Small delay to allow iframe logs to arrive
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 3. Compose message
    const parentLogs = getParentLogs();
    let allLogs = `=== PARENT LOGS ===\n${parentLogs}`;
    if (iframeLogs) {
      allLogs += `\n\n=== IFRAME LOGS (Last 200) ===\n${iframeLogs}`;
    }

    const metadata =
      `🚀 **AR Sync Report**\n` +
      `**Offset:** X:${manualOffset.x}, Y:${manualOffset.y}\n` +
      `**Flashcards:** ${flashcardCount}\n` +
      `**Engine:** ${getActiveEngine()}\n` +
      `**Time:** ${new Date().toISOString()}\n\n` +
      `**Logs Snapshot:**\n`;

    const maxLogChars = 2000 - metadata.length - 10;
    const slicedLogs =
      allLogs.length > maxLogChars
        ? `...${allLogs.slice(-maxLogChars)}`
        : allLogs;

    const content = `${metadata}\`\`\`\n${slicedLogs}\n\`\`\``;

    // 4. Send to Discord
    try {
      const response = await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setSyncStatus('success');
        HapticService.success();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error(String(err));
      console.error('❌ Discord Sync Failed:', error.message);
      setSyncStatus('error');
      HapticService.error();

      // 5. Fallback: try iframe direct sync
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'SYNC_DISCORD_REQUEST' },
          '*'
        );
      }
    } finally {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [syncStatus, iframeRef, manualOffset, flashcardCount, iframeLogs,
      getParentLogs, getActiveEngine]);

  return { syncDiscord, syncStatus, iframeLogs };
}
