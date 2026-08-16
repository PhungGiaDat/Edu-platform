import { describe, expect, it } from 'vitest';
import {
  acknowledgeRevision,
  initialRevisionState,
  rejectRevision,
  requestRevision,
} from '@/components/ar/activeTargetRevision';
import type { ActiveViewerTarget } from '@/core/types/ARMessages';

const elephant: ActiveViewerTarget = {
  slotIndex: 0,
  mindTargetIndex: 0,
  arTag: 'elephant_marker_01',
  modelUrl: '/elephant.glb',
  word: 'elephant',
};

const shiba: ActiveViewerTarget = {
  slotIndex: 1,
  mindTargetIndex: 1,
  arTag: 'shiba_marker_01',
  modelUrl: '/shiba.glb',
  word: 'shiba dog',
};

describe('activeTargetRevision', () => {
  it('starts with an empty desired and acknowledged revision', () => {
    expect(initialRevisionState.desiredRevision).toBe(0);
    expect(initialRevisionState.acknowledgedRevision).toBe(0);
    expect(initialRevisionState.desiredTargets).toEqual([]);
    expect(initialRevisionState.acknowledgedTargets).toEqual([]);
  });

  it('keeps the last acknowledged target set until the new revision is acknowledged', () => {
    const first = acknowledgeRevision(requestRevision(initialRevisionState, [elephant]), 1);
    const second = requestRevision(first, [elephant, shiba]);
    expect(second.desiredRevision).toBe(2);
    expect(second.acknowledgedTargets).toEqual([elephant]);
    expect(acknowledgeRevision(second, 2).acknowledgedTargets).toEqual([elephant, shiba]);
  });

  it('ignores a stale acknowledgement', () => {
    const state = requestRevision(
      requestRevision(initialRevisionState, [elephant]),
      [elephant, shiba],
    );
    expect(acknowledgeRevision(state, 1)).toBe(state);
  });

  it('clears a previous rejection when a new revision is requested', () => {
    const requested = requestRevision(initialRevisionState, [elephant]);
    const rejected = rejectRevision(requested, 1);
    expect(rejected.rejectedRevision).toBe(1);
    const next = requestRevision(rejected, [elephant, shiba]);
    expect(next.rejectedRevision).toBeNull();
    expect(next.desiredRevision).toBe(2);
  });

  it('ignores a rejection for a stale revision', () => {
    const requested = requestRevision(initialRevisionState, [elephant]);
    expect(rejectRevision(requested, 0)).toBe(requested);
  });
});
