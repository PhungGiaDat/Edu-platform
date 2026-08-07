### Task 1: Pure Session State Machine

**Files:**
- Create: `frontend-web/src/session/sessionBreakState.ts`
- Create: `frontend-web/src/__tests__/sessionBreakState.test.ts`
- Modify: `frontend-web/src/config.ts`

**Interfaces:**
- Produces: `SessionState`, `SessionSnapshot`, `readSessionState(storage, now)`, `writeSessionState(storage, state)`, `beginLearningSession(state, now)`, `setSessionRunning(state, now, shouldRun)`, `settleSessionState(state, now)`, `takeSessionBreak(now)`, `getSessionSnapshot(state, now)`, and `isLearningPath(pathname)`.
- Consumes: `SESSION_LIMIT_SECS`, `SESSION_WARNING_SECS`, and new `SESSION_BREAK_SECS`.

- [ ] **Step 1: Write failing transition tests**

Create `frontend-web/src/__tests__/sessionBreakState.test.ts` with these concrete cases:

```ts
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
```

- [ ] **Step 2: Run the tests and verify RED**

Run from `frontend-web`:

```powershell
npm.cmd test -- src/__tests__/sessionBreakState.test.ts
```

Expected: FAIL because `../session/sessionBreakState` and `SESSION_BREAK_SECS` do not exist.

- [ ] **Step 3: Add the break constant and state module**

Add to `frontend-web/src/config.ts`:

```ts
/** Mandatory cooldown after a completed learning session (5 minutes). */
export const SESSION_BREAK_SECS = 5 * 60;
```

Create `frontend-web/src/session/sessionBreakState.ts` with these exact public types:

```ts
import {
  SESSION_BREAK_SECS,
  SESSION_LIMIT_SECS,
  SESSION_WARNING_SECS,
} from '../config';

export const SESSION_STATE_STORAGE_KEY = 'edu_session_state_v1';
export const LEGACY_SESSION_KEYS = [
  'edu_session_started_at',
  'edu_session_paused_seconds',
] as const;

export type SessionState =
  | { version: 1; phase: 'active'; elapsedSeconds: number; runningSince: number | null }
  | { version: 1; phase: 'limit_reached' }
  | { version: 1; phase: 'on_break'; breakUntil: number };

export interface SessionSnapshot {
  phase: SessionState['phase'] | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  breakRemainingSeconds: number;
  isWarning: boolean;
  isLimitReached: boolean;
  isOnBreak: boolean;
  isPaused: boolean;
}
```

Implement the exported functions with these rules:

```ts
const elapsedAt = (state: Extract<SessionState, { phase: 'active' }>, now: number) =>
  state.elapsedSeconds +
  (state.runningSince === null ? 0 : Math.max(0, Math.floor((now - state.runningSince) / 1000)));

export function beginLearningSession(state: SessionState | null, now: number): SessionState {
  const settled = settleSessionState(state, now);
  if (settled === null) {
    return { version: 1, phase: 'active', elapsedSeconds: 0, runningSince: now };
  }
  if (settled.phase === 'active' && settled.runningSince === null) {
    return { ...settled, runningSince: now };
  }
  return settled;
}

export function takeSessionBreak(now: number): SessionState {
  return { version: 1, phase: 'on_break', breakUntil: now + SESSION_BREAK_SECS * 1000 };
}
```

`settleSessionState` converts active elapsed time at or above `SESSION_LIMIT_SECS` to `{version: 1, phase: 'limit_reached'}` and converts an expired `on_break` state to `null`. `setSessionRunning` settles first, accumulates elapsed time when pausing, and sets `runningSince=now` when resuming. `getSessionSnapshot` derives all booleans and counters without mutating state.

`readSessionState` must remove both legacy keys, parse only version `1`, reject negative elapsed time, reject non-finite timestamps, reject active `runningSince > now + 60_000`, and reject `breakUntil > now + (SESSION_BREAK_SECS + 60) * 1000`. Invalid input removes only `SESSION_STATE_STORAGE_KEY` and returns `null`. `writeSessionState` removes the key for `null` and otherwise stores JSON.

`isLearningPath` returns true only for `/learn-ar`, `/flashcards` and descendants, `/courses` and descendants, and `/f/<qrId>`.

- [ ] **Step 4: Run the unit test and verify GREEN**

```powershell
npm.cmd test -- src/__tests__/sessionBreakState.test.ts
```

Expected: all `sessionBreakState` tests PASS.

- [ ] **Step 5: Commit the pure state model**

```powershell
git add frontend-web/src/config.ts frontend-web/src/session/sessionBreakState.ts frontend-web/src/__tests__/sessionBreakState.test.ts
git diff --cached --check
git commit -m "feat(session): add child-safe break state machine"
```

---

