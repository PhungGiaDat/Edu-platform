import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.fn();
vi.mock('@/services/apiClient', () => ({ request: (...args: unknown[]) => request(...args) }));

import { awardGameComplete } from '@/services/gamesVocabService';

// Shapes returned by PostgresGamificationService._result for POST /gamification/xp-event.
const applied = { success: true, xp_awarded: 30, idempotent_replay: false, status: 'applied', total_xp_after: 130 };
const replay = { ...applied, idempotent_replay: true };

describe('awardGameComplete', () => {
  beforeEach(() => request.mockReset());

  it('reports the newly awarded XP on the first completion of the day', async () => {
    request.mockResolvedValue(applied);
    await expect(awardGameComplete('u1', 'drag_match')).resolves.toEqual({ xp_awarded: 30, alreadyToday: false });
  });

  it('never presents an idempotent replay snapshot as newly earned XP', async () => {
    request.mockResolvedValue(replay);
    await expect(awardGameComplete('u1', 'drag_match')).resolves.toEqual({ xp_awarded: 0, alreadyToday: true });
  });

  it('sends a stable per-game, per-user, per-day event id', async () => {
    request.mockResolvedValue(applied);
    await awardGameComplete('u1', 'memory_pairs');
    await awardGameComplete('u1', 'memory_pairs');
    const [first, second] = request.mock.calls.map(([, init]) => (init as { body: { event_id: string; action: string } }).body);
    expect(first.action).toBe('game_completed');
    expect(first.event_id).toMatch(/^game_completed_memory_pairs_u1_\d{8}$/);
    expect(second.event_id).toBe(first.event_id);
  });
});
