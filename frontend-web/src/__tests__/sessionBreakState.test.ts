import { describe, expect, it } from 'vitest';
import { SESSION_LIMIT_SECS, SESSION_WARNING_SECS } from '../config';
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

  const throwingStorage = (methods: Partial<Storage>): Storage => ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
    ...methods,
  }) as Storage;

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

  it.each([
    '/LEARN-AR',
    '/learn-ar/',
    '/FlashCards/deck-1/',
    '/COURSES/animals/lessons/1/',
    '/F/scan-123/',
  ])('recognizes React Router learning-path variants: %s', pathname => {
    expect(isLearningPath(pathname)).toBe(true);
  });

  it.each([
    '/learn-ar-archive',
    '/flashcards-admin',
    '/courses-old/animals',
    '/f/',
    '/f/scan-123/extra',
  ])('rejects non-learning lookalikes: %s', pathname => {
    expect(isLearningPath(pathname)).toBe(false);
  });

  it('pauses elapsed time outside learning routes', () => {
    const active = beginLearningSession(null, now)!;
    const paused = setSessionRunning(active, now + 60_000, false);
    expect(getSessionSnapshot(paused, now + 10 * 60_000).elapsedSeconds).toBe(60);
  });

  it('accumulates sub-second running segments at the exact warning and limit thresholds', () => {
    let state = beginLearningSession(null, now)!;
    const segmentDurationMs = 250;
    const segmentsToWarning = SESSION_WARNING_SECS * 4;

    for (let index = 0; index < segmentsToWarning; index += 1) {
      const startedAt = now + index * segmentDurationMs * 2;
      state = setSessionRunning(state, startedAt + segmentDurationMs, false)!;
      state = setSessionRunning(state, startedAt + segmentDurationMs * 2, true)!;
    }

    expect(state).toMatchObject({
      phase: 'active',
      elapsedSeconds: SESSION_WARNING_SECS,
    });
    expect(getSessionSnapshot(state, now + segmentsToWarning * segmentDurationMs * 2)).toMatchObject({
      elapsedSeconds: SESSION_WARNING_SECS,
      remainingSeconds: SESSION_LIMIT_SECS - SESSION_WARNING_SECS,
      isWarning: true,
      isLimitReached: false,
    });

    const limitAt = now + segmentsToWarning * segmentDurationMs * 2;
    state = setSessionRunning(state, limitAt + 1, true)!;
    state = setSessionRunning(state, limitAt + (SESSION_LIMIT_SECS - SESSION_WARNING_SECS) * 1000, false)!;

    expect(settleSessionState(state, limitAt + (SESSION_LIMIT_SECS - SESSION_WARNING_SECS) * 1000)).toEqual({
      version: 1,
      phase: 'limit_reached',
    });
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

  it('treats unavailable storage and failed invalid-state cleanup as an empty session', () => {
    const securityError = new DOMException('blocked', 'SecurityError');
    const unavailableStorage = throwingStorage({
      getItem: () => {
        throw securityError;
      },
      removeItem: () => {
        throw securityError;
      },
    });
    const corruptStorage = throwingStorage({
      getItem: () => '{invalid json',
      removeItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    });

    expect(readSessionState(unavailableStorage, now)).toBeNull();
    expect(readSessionState(corruptStorage, now)).toBeNull();
  });

  it('does not throw when session-state writes are blocked', () => {
    const quotaExceeded = new DOMException('full', 'QuotaExceededError');
    const storage = throwingStorage({
      setItem: () => {
        throw quotaExceeded;
      },
      removeItem: () => {
        throw quotaExceeded;
      },
    });

    expect(() => writeSessionState(storage, takeSessionBreak(now))).not.toThrow();
    expect(() => writeSessionState(storage, null)).not.toThrow();
  });
});
