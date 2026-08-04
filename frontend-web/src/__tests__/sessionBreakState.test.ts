import { describe, expect, it } from 'vitest';
import {
  beginLearningSession,
  getSessionSnapshot,
  isLearningPath,
  readSessionState,
  setSessionRunning,
  settleSessionState,
  takeSessionBreak,
  writeSessionState,
} from '../session/sessionBreakState';

describe('sessionBreakState', () => {
  const now = 1_800_000_000_000;

  it('starts a fresh active session only on a learning route', () => {
    expect(beginLearningSession(null, now)).toEqual({
      version: 1,
      phase: 'active',
      elapsedSeconds: 0,
      runningSince: now,
    });
    expect(isLearningPath('/courses/animals/lessons/1')).toBe(true);
    expect(isLearningPath('/learn-ar')).toBe(true);
    expect(isLearningPath('/profile')).toBe(false);
  });

  it('pauses elapsed time outside learning routes', () => {
    const active = beginLearningSession(null, now)!;
    const paused = setSessionRunning(active, now + 60_000, false);
    expect(getSessionSnapshot(paused, now + 10 * 60_000).elapsedSeconds).toBe(60);
  });

  it('settles an expired learning window to limit_reached', () => {
    const active = beginLearningSession(null, now)!;
    expect(settleSessionState(active, now + 30 * 60_000)?.phase).toBe('limit_reached');
  });

  it('persists a five-minute break across reloads', () => {
    const storage = window.localStorage;
    const onBreak = takeSessionBreak(now);
    writeSessionState(storage, onBreak);
    expect(readSessionState(storage, now + 60_000)).toEqual(onBreak);
    expect(getSessionSnapshot(onBreak, now + 60_000).breakRemainingSeconds).toBe(240);
  });

  it('expires a break into no active session', () => {
    expect(settleSessionState(takeSessionBreak(now), now + 5 * 60_000)).toBeNull();
  });

  it('rejects corrupt and far-future persisted timestamps', () => {
    const storage = window.localStorage;
    storage.setItem('edu_session_state_v1', '{bad json');
    expect(readSessionState(storage, now)).toBeNull();
    storage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'on_break',
      breakUntil: now + 24 * 60 * 60_000,
    }));
    expect(readSessionState(storage, now)).toBeNull();
  });
});
