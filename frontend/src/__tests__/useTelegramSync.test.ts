import { describe, expect, it } from 'vitest';
import {
  buildTelegramMessage,
  TELEGRAM_MESSAGE_LIMIT,
} from '../hooks/useTelegramSync';

describe('buildTelegramMessage', () => {
  it('keeps AR metadata and clips the log tail to Telegram limits', () => {
    const message = buildTelegramMessage({
      logs: 'start\n' + 'x'.repeat(6000) + '\nlast-log-line',
      manualOffset: { x: 0.1, y: -0.2 },
      flashcardCount: 2,
      engine: 'MindAR',
    });

    expect(message.length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_LIMIT);
    expect(message).toContain('AR Sync Report');
    expect(message).toContain('Offset: X:0.1, Y:-0.2');
    expect(message).toContain('last-log-line');
  });
});
