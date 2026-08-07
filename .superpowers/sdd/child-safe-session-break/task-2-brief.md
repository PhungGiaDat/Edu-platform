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

