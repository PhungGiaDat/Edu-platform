# Frontend Structure Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete web `src/components` compatibility layer and consolidate web context providers under one `src/contexts` directory without breaking the application.

**Architecture:** Domain-owned implementations remain under `src/features/<domain>/components`, application-shell components remain under `src/app/components`, and reusable primitives remain under `src/shared/components`. The old `src/components` directory is removed only after an automated structural regression test and an import audit prove that no web source imports it. `SessionContext` is colocated with `AuthContext` and `LocaleContext` under `src/contexts`.

**Tech Stack:** React, TypeScript, Vite, Vitest, ESLint.

## Global Constraints

- Keep learner-facing behavior, API contracts, routes, styling, and runtime state transitions unchanged.
- Treat `frontend/` as the primary release surface; do not modify paused RN/Unity implementations.
- Preserve unrelated dirty worktree changes and do not stage or commit files in this task.
- Use test-first verification: observe RED before deletion, then GREEN after deletion.
- Delete only `frontend/src/components/**` and the obsolete `frontend/src/context/` directory.

---

### Task 1: Establish the structural contract with TDD

**Files:**
- Create: `frontend/src/__tests__/frontendStructure.test.ts`
- Read: `frontend/src/components/**`
- Read: `frontend/src/contexts/*.tsx`

- [x] **Step 1: Confirm branch and worktree state**

Run:

```powershell
git status --short
git branch --show-current
```

Expected: remain on the existing non-main branch and preserve unrelated changes.

- [x] **Step 2: Write the failing structural test**

Create `frontend/src/__tests__/frontendStructure.test.ts`:

```typescript
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('frontend source structure', () => {
  it('keeps all React contexts in the single contexts directory', () => {
    expect(existsSync(resolve(sourceRoot, 'context'))).toBe(false);
    expect(existsSync(resolve(sourceRoot, 'contexts'))).toBe(true);
    expect(existsSync(resolve(sourceRoot, 'contexts', 'AuthContext.tsx'))).toBe(true);
    expect(existsSync(resolve(sourceRoot, 'contexts', 'LocaleContext.tsx'))).toBe(true);
    expect(existsSync(resolve(sourceRoot, 'contexts', 'SessionContext.tsx'))).toBe(true);
  });

  it('does not keep the legacy top-level components directory', () => {
    expect(existsSync(resolve(sourceRoot, 'components'))).toBe(false);
  });
});
```

- [x] **Step 3: Run the test and verify RED**

Run from `frontend/`:

```powershell
npm.cmd test -- --run src/__tests__/frontendStructure.test.ts
```

Expected: the contexts assertion passes and the legacy-components assertion fails because `src/components` still exists.

### Task 2: Remove obsolete web compatibility paths

**Files:**
- Delete: `frontend/src/components/**` (111 compatibility-only files)
- Delete: `frontend/src/context/` (empty after the context move)
- Verify: `frontend/src/contexts/SessionContext.tsx`

- [x] **Step 1: Audit imports before deletion**

Run from the repository root:

```powershell
rg -n --glob '*.{ts,tsx}' '@/components/|\.\./components/|\./components/' frontend/src -g '!frontend/src/components/**'
```

Expected: no output.

- [x] **Step 2: Remove the exact verified compatibility directory**

Delete only `frontend/src/components`. Do not remove `frontend/src/features`, `frontend/src/app`, or `frontend/src/shared`.

- [x] **Step 3: Verify old context imports are absent**

Run:

```powershell
rg -n --glob '*.{ts,tsx}' 'context/SessionContext|@/context/' frontend/src
```

Expected: no output; all providers and consumers use `frontend/src/contexts`.

### Task 3: Run GREEN and quality gates

**Files:**
- Test: `frontend/src/__tests__/frontendStructure.test.ts`
- Regression tests: `frontend/src/__tests__/SessionContext.test.tsx`, `frontend/src/__tests__/GlobalSessionWatcher.test.tsx`

- [x] **Step 1: Run the structural test and verify GREEN**

Run from `frontend/`:

```powershell
npm.cmd test -- --run src/__tests__/frontendStructure.test.ts
```

Expected: 2 tests pass with 0 failures.

- [x] **Step 2: Run session regression tests**

Run from `frontend/`:

```powershell
npm.cmd test -- --run src/__tests__/SessionContext.test.tsx src/__tests__/GlobalSessionWatcher.test.tsx
```

Expected: no module-resolution failure caused by the context move.

Result: `SessionContext.test.tsx` passed 6/6. `GlobalSessionWatcher.test.tsx` had no module-resolution failure; 2/11 tests passed and 9 existing behavior assertions remain failing.

- [x] **Step 3: Run typecheck/build and lint**

Run from `frontend/`:

```powershell
npm.cmd run build
npm.cmd run lint -- --quiet
```

Expected: both commands exit with code 0; existing Vite chunk warnings may remain.

- [x] **Step 4: Check whitespace and final import cleanliness**

Run from the repository root:

```powershell
git diff --check
rg -n --glob '*.{ts,tsx}' 'context/SessionContext|@/context/|@/components/|\.\./components/|\./components/' frontend/src
```

Expected: `git diff --check` exits 0 and the import search returns no legacy web paths.

## Verification result

- Structural regression: 2/2 passed after deletion; the RED run was 1/2 before deletion.
- Current build/typecheck: passed with existing Vite dependency/chunk warnings.
- Current lint: passed.
- Current `git diff --check`: passed.
- Full suite: 11 test files failed, 37 tests failed, and 302 tests passed; failures are existing UI, AR, Sentry, and session behavior assertions, with no legacy-path module-resolution failure.
