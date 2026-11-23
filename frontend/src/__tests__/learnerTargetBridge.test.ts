import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceSection(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  return source.slice(from, to);
}

describe('ar-xr learner target bridge contract', () => {
  it('adds learner events at the existing found, raw-loss, and confirmed-loss boundaries', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/ar-xr.html'), 'utf8');
    const foundHandler = sourceSection(source, 'function onTargetFound(detail)', '\n    function onTargetLost(name)');
    const lostHandler = sourceSection(source, 'function onTargetLost(name)', '\n    // ========== COMBO DETECTION');
    const confirmedLossHandler = sourceSection(source, 'function processPendingTargetLosses(now)', '\n    function evaluateInteraction(now)');

    expect(source).toContain("from './static/ar-assets/js/learner-target-gate.js'");
    expect(source).toContain("sendMessage('AR_LEARNER_TARGET_STABLE_FOUND'");
    expect(source).toContain("sendMessage('AR_LEARNER_TARGET_STABLE_LOST'");
    expect(foundHandler).toContain('learnerTargetGate.onFound');
    expect(lostHandler).toContain('learnerTargetGate.onRawLost(name)');
    expect(confirmedLossHandler).toContain('learnerTargetGate.onConfirmedLoss');
    expect(confirmedLossHandler).toContain('lostGraceMs: INTERACTION_CONFIG.lostGraceMs');
  });
});
