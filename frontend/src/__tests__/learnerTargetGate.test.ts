import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLearnerTargetGate,
  LEARNER_TARGET_STABLE_DWELL_MS,
} from '../../public/static/ar-assets/js/learner-target-gate.js';

type StableFoundEvent = {
  targetName: string;
  word: string;
  acquiredAt: number;
};

type StableLostEvent = {
  targetName: string;
  lostAt: number;
};

function createGate() {
  const found: StableFoundEvent[] = [];
  const lost: StableLostEvent[] = [];
  const gate = createLearnerTargetGate({
    onStableFound: event => found.push(event),
    onStableLost: event => lost.push(event),
  });

  return { gate, found, lost };
}

describe('learner target gate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not emit a stable find when a raw target is lost before the dwell', () => {
    const { gate, found } = createGate();

    gate.onFound({ targetName: 'rabbit001', word: 'rabbit', acquiredAt: 100 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS - 1);
    gate.onRawLost('rabbit001');
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);

    expect(found).toEqual([]);
  });

  it('emits one stable find after the dwell', () => {
    const { gate, found } = createGate();

    gate.onFound({ targetName: 'cat001', word: 'cat', acquiredAt: 100 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);

    expect(found).toEqual([
      { targetName: 'cat001', word: 'cat', acquiredAt: 100 },
    ]);
  });

  it('does not restart dwell or duplicate a stable find for repeated found updates', () => {
    const { gate, found } = createGate();

    gate.onFound({ targetName: 'fish001', word: 'fish', acquiredAt: 100 });
    vi.advanceTimersByTime(100);
    gate.onFound({ targetName: 'fish001', word: 'fish', acquiredAt: 200 });
    vi.advanceTimersByTime(200);
    gate.onFound({ targetName: 'fish001', word: 'fish', acquiredAt: 400 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);

    expect(found).toEqual([
      { targetName: 'fish001', word: 'fish', acquiredAt: 100 },
    ]);
  });

  it('emits one stable loss only at the existing confirmed-loss boundary', () => {
    const { gate, found, lost } = createGate();

    gate.onFound({ targetName: 'cat001', word: 'cat', acquiredAt: 100 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);
    gate.onRawLost('cat001');

    expect(found).toHaveLength(1);
    expect(lost).toEqual([]);

    gate.onConfirmedLoss({ targetName: 'cat001', lostAt: 700 });
    gate.onConfirmedLoss({ targetName: 'cat001', lostAt: 800 });

    expect(lost).toEqual([{ targetName: 'cat001', lostAt: 700 }]);
  });

  it('preserves a stable acquisition when the target reacquires within runtime grace', () => {
    const { gate, found, lost } = createGate();

    gate.onFound({ targetName: 'cat001', word: 'cat', acquiredAt: 100 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);
    gate.onRawLost('cat001');
    gate.onFound({ targetName: 'cat001', word: 'cat', acquiredAt: 450 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);

    expect(found).toEqual([
      { targetName: 'cat001', word: 'cat', acquiredAt: 100 },
    ]);
    expect(lost).toEqual([]);
  });

  it('permits a new stable find after a confirmed loss and later reacquisition', () => {
    const { gate, found, lost } = createGate();

    gate.onFound({ targetName: 'cat001', word: 'cat', acquiredAt: 100 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);
    gate.onRawLost('cat001');
    gate.onConfirmedLoss({ targetName: 'cat001', lostAt: 700 });
    gate.onFound({ targetName: 'cat001', word: 'cat', acquiredAt: 900 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);

    expect(found).toEqual([
      { targetName: 'cat001', word: 'cat', acquiredAt: 100 },
      { targetName: 'cat001', word: 'cat', acquiredAt: 900 },
    ]);
    expect(lost).toEqual([{ targetName: 'cat001', lostAt: 700 }]);
  });

  it('keeps simultaneous targets independent', () => {
    const { gate, found } = createGate();

    gate.onFound({ targetName: 'cat001', word: 'cat', acquiredAt: 100 });
    vi.advanceTimersByTime(120);
    gate.onFound({ targetName: 'fish001', word: 'fish', acquiredAt: 220 });
    vi.advanceTimersByTime(180);
    gate.onRawLost('fish001');
    vi.advanceTimersByTime(120);

    expect(found).toEqual([
      { targetName: 'cat001', word: 'cat', acquiredAt: 100 },
    ]);
  });

  it('applies the same lifecycle to an arbitrary catalogue target', () => {
    const { gate, found, lost } = createGate();

    gate.onFound({ targetName: 'tiger-42', word: 'tiger', acquiredAt: 100 });
    vi.advanceTimersByTime(LEARNER_TARGET_STABLE_DWELL_MS);
    gate.onRawLost('tiger-42');
    gate.onConfirmedLoss({ targetName: 'tiger-42', lostAt: 700 });

    expect(found).toEqual([
      { targetName: 'tiger-42', word: 'tiger', acquiredAt: 100 },
    ]);
    expect(lost).toEqual([{ targetName: 'tiger-42', lostAt: 700 }]);
  });
});
