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
