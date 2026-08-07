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

