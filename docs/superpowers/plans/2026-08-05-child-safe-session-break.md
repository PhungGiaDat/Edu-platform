# Child-Safe Session Break Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the trapping timestamp-based break overlay with a browser-persisted, child-safe session state machine that enforces a five-minute break without depending on Redis availability.

**Architecture:** A pure TypeScript state module owns session transitions and persistence validation. `SessionContext` combines that state with route, idle, visibility, and clock signals; `GlobalSessionWatcher` owns the single global reminder UI. Backend session cleanup remains best-effort and existing Redis endpoints remain unchanged.

**Tech Stack:** React 18, TypeScript 5.8, React Router 6, Vitest 3, Testing Library, Playwright.

## Global Constraints

- Learning window: exactly 30 minutes.
- Warning threshold: exactly 25 minutes.
- Mandatory break cooldown: exactly 5 minutes.
- `/profile` and other non-learning routes remain usable during a break.
- A reload must not recreate the trapping limit overlay or bypass the cooldown.
- The **10 More Minutes (Parent)** action stays absent until a real parent gate exists.
- Redis and backend session endpoints are not deleted or consolidated in this repair.
- Local state transitions complete even when backend cleanup fails.
- Implement directly on `MindAR-Update`; do not create a worktree.

## File Structure

- Create `frontend-web/src/session/sessionBreakState.ts`: pure state types, transitions, route classification, serialization, and validation.
- Create `frontend-web/src/__tests__/sessionBreakState.test.ts`: deterministic unit tests for transitions, reload persistence, route pause, and corrupt storage.
- Modify `frontend-web/src/context/SessionContext.tsx`: React integration for the pure state machine and best-effort backend cleanup.
- Create `frontend-web/src/__tests__/SessionContext.test.tsx`: context integration tests with router, storage, and failed backend cleanup.
- Create `frontend-web/src/components/BreakCooldownNotice.tsx`: child-friendly countdown shown only when a learning route is opened during cooldown.
- Modify `frontend-web/src/components/BreakReminder.tsx`: remove the unauthenticated parent-extension action.
- Modify `frontend-web/src/components/GlobalSessionWatcher.tsx`: become the only owner of break reminder/cooldown rendering and navigation.
- Modify `frontend-web/src/components/SessionTimerBadge.tsx`: hide when no learning session exists and display break state without a false hard lock.
- Modify `frontend-web/src/pages/LearnARV2.tsx`: remove the duplicate page-local `BreakReminder` and extension handlers.
- Create `frontend-web/src/__tests__/GlobalSessionWatcher.test.tsx`: regression tests for escaping the limit overlay and cooldown routing.
- Modify `frontend-web/tests/e2e/session-break.spec.ts`: Mobile Safari regression for the production symptom.

---

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

### Task 2: Integrate the State Machine into SessionContext

**Files:**
- Modify: `frontend-web/src/context/SessionContext.tsx`
- Create: `frontend-web/src/__tests__/SessionContext.test.tsx`

**Interfaces:**
- Consumes: all Task 1 state functions and `isLearningPath(pathname)`.
- Produces: `SessionContextValue` with `phase`, `elapsedSeconds`, `remainingSeconds`, `breakRemainingSeconds`, `isWarning`, `isLimitReached`, `isOnBreak`, `isPaused`, `takeBreak(): void`, and `isInitialized`.

- [ ] **Step 1: Write failing context tests**

Create `frontend-web/src/__tests__/SessionContext.test.tsx`. Mock authentication and `sessionApi.endSession`, wrap `SessionProvider` in `MemoryRouter`, and assert:

```tsx
it('commits on_break locally even when backend cleanup fails', () => {
  endSession.mockResolvedValue(false);
  localStorage.setItem('edu_session_state_v1', JSON.stringify({
    version: 1,
    phase: 'limit_reached',
  }));

  const { result } = renderHook(() => useSession(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={['/courses/animals']}>
        <SessionProvider>{children}</SessionProvider>
      </MemoryRouter>
    ),
  });

  act(() => result.current.takeBreak());

  expect(result.current.isOnBreak).toBe(true);
  expect(JSON.parse(localStorage.getItem('edu_session_state_v1')!).phase).toBe('on_break');
});
```

Also add cases proving that `/profile` does not start a session, `/courses/animals` starts one, and leaving a learning route pauses elapsed time.

- [ ] **Step 2: Run the context test and verify RED**

```powershell
npm.cmd test -- src/__tests__/SessionContext.test.tsx
```

Expected: FAIL because `takeBreak`, `phase`, `breakRemainingSeconds`, and `isOnBreak` are not exposed.

- [ ] **Step 3: Replace timestamp flags with state-machine integration**

In `SessionContext.tsx`:

- Use `useLocation()` to compute `const learningPath = isLearningPath(location.pathname)`.
- Initialize `sessionState` with `readSessionState(localStorage, Date.now())`.
- Maintain `clockNow` with a one-second interval only while an active learning session or cooldown needs visible updates.
- Compute `shouldRun = learningPath && !isTabHidden && !isIdle`.
- On `shouldRun` changes, call `setSessionRunning(previous, Date.now(), shouldRun)`.
- On entering a learning path, call `beginLearningSession(previous, Date.now())`.
- On each clock update, settle an expired active window or cooldown.
- Persist state with `writeSessionState(localStorage, sessionState)`.
- Derive public fields through `getSessionSnapshot(sessionState, clockNow)`.
- Implement `takeBreak` in local-first order:

```ts
const takeBreak = useCallback(() => {
  const next = takeSessionBreak(Date.now());
  setSessionState(next);
  writeSessionState(localStorage, next);
  if (isAuthed) {
    void sessionApi.endSession().then(success => {
      if (!success) console.warn('[SessionContext] backend cleanup failed');
    });
  }
}, [isAuthed]);
```

Remove `pause`, `resume`, `extendLock`, `reset`, `startTime`, `pausedSeconds`, `isManualPaused`, and the old heartbeat interval from the public session-timer path. Do not delete `sessionApi` methods or backend routes.

- [ ] **Step 4: Run focused context and state tests**

```powershell
npm.cmd test -- src/__tests__/sessionBreakState.test.ts src/__tests__/SessionContext.test.tsx
```

Expected: both test files PASS without unhandled promise warnings.

- [ ] **Step 5: Commit context integration**

```powershell
git add frontend-web/src/context/SessionContext.tsx frontend-web/src/__tests__/SessionContext.test.tsx
git diff --cached --check
git commit -m "fix(session): persist child-safe break transitions"
```

---

### Task 3: Make the Global Watcher the Single UI Owner

**Files:**
- Create: `frontend-web/src/components/BreakCooldownNotice.tsx`
- Modify: `frontend-web/src/components/BreakReminder.tsx`
- Modify: `frontend-web/src/components/GlobalSessionWatcher.tsx`
- Modify: `frontend-web/src/components/SessionTimerBadge.tsx`
- Modify: `frontend-web/src/pages/LearnARV2.tsx`
- Create: `frontend-web/src/__tests__/GlobalSessionWatcher.test.tsx`

**Interfaces:**
- Consumes: Task 2 `useSession()` interface and Task 1 `isLearningPath`.
- Produces: exactly one limit overlay, a cooldown notice on learning routes, and successful navigation to `/profile`.

- [ ] **Step 1: Write the failing watcher regression test**

Create `GlobalSessionWatcher.test.tsx` using a real `SessionProvider` and `MemoryRouter`. Seed a `limit_reached` state, render course/profile routes, click **Take a Break**, and assert:

```tsx
expect(screen.getByText('Time for a Break!')).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /take a break/i }));
expect(screen.getByTestId('profile-route')).toBeInTheDocument();
expect(screen.queryByText('Time for a Break!')).not.toBeInTheDocument();
expect(JSON.parse(localStorage.getItem('edu_session_state_v1')!).phase).toBe('on_break');
expect(screen.queryByRole('button', { name: /10 more minutes/i })).not.toBeInTheDocument();
```

Add a second test that seeds an unexpired `on_break` state on `/courses/animals`, asserts a countdown is visible, clicks **Back to Profile**, and reaches the profile route.

- [ ] **Step 2: Run the watcher test and verify RED**

```powershell
npm.cmd test -- src/__tests__/GlobalSessionWatcher.test.tsx
```

Expected: FAIL because the old watcher calls `pause/extendLock`, the parent button remains, and no cooldown notice exists.

- [ ] **Step 3: Implement one global owner**

Create `BreakCooldownNotice.tsx` with props:

```ts
interface BreakCooldownNoticeProps {
  remainingSeconds: number;
  onBackToProfile: () => void;
}
```

Render an accessible dialog titled **Break time in progress**, a `MM:SS` countdown, reassuring child-facing copy, and one 64px button named **Back to Profile**.

Update `BreakReminder.tsx` to remove `onExtend` from its props and remove the **10 More Minutes (Parent)** button block.

Update `GlobalSessionWatcher.tsx` to use `useNavigate` and `useLocation`:

```tsx
const {
  isWarning,
  isLimitReached,
  isOnBreak,
  remainingSeconds,
  breakRemainingSeconds,
  takeBreak,
} = useSession();

const handleExit = () => {
  takeBreak();
  navigate('/profile', { replace: true });
};

if (isOnBreak && isLearningPath(location.pathname)) {
  return (
    <BreakCooldownNotice
      remainingSeconds={breakRemainingSeconds}
      onBackToProfile={() => navigate('/profile', { replace: true })}
    />
  );
}
```

Only render the hard limit overlay on learning routes. Keep the dismissible warning behavior local to the watcher.

Update `SessionTimerBadge.tsx` to return `null` when `phase === null` or `phase === 'on_break'`; retain active/warning/limit formatting.

Remove the `BreakReminder` import, `useSession` timer destructuring, `handleBreakExtend`, `handleBreakExit`, and page-local `<BreakReminder>` block from `LearnARV2.tsx`. Keep its separate backend learning-session lifecycle unchanged.

- [ ] **Step 4: Run UI regression tests**

```powershell
npm.cmd test -- src/__tests__/sessionBreakState.test.ts src/__tests__/SessionContext.test.tsx src/__tests__/GlobalSessionWatcher.test.tsx
```

Expected: all focused tests PASS and only one dialog is rendered at the limit.

- [ ] **Step 5: Commit the UI repair**

```powershell
git add frontend-web/src/components/BreakCooldownNotice.tsx frontend-web/src/components/BreakReminder.tsx frontend-web/src/components/GlobalSessionWatcher.tsx frontend-web/src/components/SessionTimerBadge.tsx frontend-web/src/pages/LearnARV2.tsx frontend-web/src/__tests__/GlobalSessionWatcher.test.tsx
git diff --cached --check
git commit -m "fix(session): let children exit the break overlay"
```

---

### Task 4: Mobile Safari Regression and Final Verification

**Files:**
- Modify: `frontend-web/tests/e2e/session-break.spec.ts`

**Interfaces:**
- Consumes: persisted state schema and UI from Tasks 1-3.
- Produces: browser-level evidence for the reported iPhone failure.

- [ ] **Step 1: Replace skipped limit tests with the production regression**

Seed the versioned state before page load:

```ts
await page.addInitScript(() => {
  localStorage.setItem('guestMode', 'true');
  localStorage.setItem('edu_session_state_v1', JSON.stringify({
    version: 1,
    phase: 'limit_reached',
  }));
});
```

Test this sequence:

```ts
await page.goto('/courses/animals');
await expect(page.getByText('Time for a Break!')).toBeVisible();
await expect(page.getByRole('button', { name: /10 more minutes/i })).toHaveCount(0);
await page.getByRole('button', { name: /take a break/i }).click();
await expect(page).toHaveURL(/\/profile$/);
await expect(page.getByText('Time for a Break!')).toHaveCount(0);
await page.reload();
await expect(page.getByText('Time for a Break!')).toHaveCount(0);
await page.goto('/courses/animals');
await expect(page.getByText('Break time in progress')).toBeVisible();
```

- [ ] **Step 2: Run the Mobile Safari regression**

```powershell
npm.cmd run test:e2e -- session-break.spec.ts --project="Mobile Safari"
```

Expected: production regression PASS on the iPhone emulation profile.

- [ ] **Step 3: Run full frontend verification**

```powershell
npm.cmd test
npm.cmd run build
npm.cmd exec eslint -- src/session/sessionBreakState.ts src/context/SessionContext.tsx src/components/BreakReminder.tsx src/components/BreakCooldownNotice.tsx src/components/GlobalSessionWatcher.tsx src/components/SessionTimerBadge.tsx src/pages/LearnARV2.tsx src/__tests__/sessionBreakState.test.ts src/__tests__/SessionContext.test.tsx src/__tests__/GlobalSessionWatcher.test.tsx
```

Expected: Vitest PASS, TypeScript/Vite build PASS, and scoped ESLint reports no errors.

- [ ] **Step 4: Verify repository scope**

```powershell
git diff --check
git status --short
git log -6 --oneline
```

Expected: no whitespace errors; only intended session files are modified or committed; pre-existing untracked user files remain untouched.

- [ ] **Step 5: Commit the browser regression**

```powershell
git add frontend-web/tests/e2e/session-break.spec.ts
git diff --cached --check
git commit -m "test(session): cover child break flow on mobile Safari"
```

After this commit, re-run the focused Mobile Safari test once more, then request code review before pushing `MindAR-Update`.
