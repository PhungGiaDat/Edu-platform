# Task 12 Report: Full Verification + Staged Test Deploy

## Goal
Run all verification suites, confirm obsolete paths are absent, and stage test deployment.

## Verification Results

### Step 1: Backend regression — PASS
```
tests/test_ar_object_catalog_schema.py .....  [5]
tests/test_backfill_ar_mind_catalog.py .....  [5]
tests/test_flashcard_ar_response.py .         [1]
tests/test_ar_service.py .................    [16]
======================== 27 passed in 4.33s
```

### Step 2: ar-viewer.js static syntax — PASS
```
node --check public/static/ar-assets/js/ar-viewer.js  → clean (exit 0)
```

### Step 3: Frontend vitest suite — PASS (230/230)
```
 Test Files  25 passed (25)
      Tests  230 passed (230)
   Duration  22.25s
```

### Step 4: Frontend build — PASS (fixed TS errors)
Initial build failed with 5 TypeScript errors introduced in Tasks 7–10 (strict mode was not enforced during development). Fixed and committed as `87a86bc`:

| File | Issue | Fix |
|------|-------|-----|
| `arTargetRegistry.test.ts` | Circular `typeof createRegistry['create']` type reference | Explicit `CreateFn = (opts) => Registry` type |
| `LearnARV2.catalogFlow.test.tsx` | `null` assigned to `undefined`-typed optional callbacks | `null` → `undefined` |
| `ARContainerV2.tsx` | Unused `revision` param in `armAckTimeout` | Prefixed `_revision` |
| `LearnARV2.tsx` | Unused `addCardStatus` state | Prefixed `_addCardStatus` |
| `arComboTagIdentity.test.ts` | Array mutation via shared reference | `[...targets]` spread |
| `ARContainerV2.persistentViewer.test.tsx` | Unused `screen` import | Removed |

Build output:
```
✓ built in 15.68s
dist/index.html   1.54 kB
dist/assets/index-DbqNuTGI.js  1,049.94 kB (gzip: 282.84 kB)
```

### Step 5: Obsolete-path grep — CLEAN
```
git grep mergeMindTargetBuffers|runtime-buffer|MULTI_MIND_MERGED|MIND_BUFFER_REQUEST
→ No matches in frontend-web/src or ar-viewer.js
```

`showImageFallbackForTarget(0/1, 'model-X-error')` — 5 instances confirmed as correct model-error handlers (hardcoded slot indices from outer scope, not the bug pattern).

## Commits Added
- `87a86bc` fix(frontend): resolve TS strict-mode build errors
- `caf9ab5` test(ar): add MULTI_MIND_* gate + Playwright E2E + test runbook (Task 11)

## Task 12 Status: COMPLETE ✓

### Remaining: Manual Steps (require human action)
1. **Physical-device gate**: Follow `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md` on iPhone Safari and Desktop Chrome. Both scan orders must pass.
2. **Vercel test deploy**: Set `VITE_PERSISTENT_MIND_VIEWER=true` on Vercel preview deployment.
3. **Feature flag on**: Once physical-device gate passes, flip `isPersistentMindViewerEnabled` to `true`.

## Branch Scope (8 commits, Tasks 5–12)
```
87a86bc fix(frontend): resolve TS strict-mode build errors
caf9ab5 test(ar): add MULTI_MIND_* gate + Playwright E2E + test runbook (Task 11)
d031fed fix(ar): resolve combos by tag sets not scan order (Task 10)
73d0cf0 fix(ar): activate second card in persistent catalog (Task 9)
016f62a fix(ar): keep viewer alive while adding cards (Task 8)
78ede41 feat(ar): bind catalog targets without restart (Task 7)
46a98f8 feat(ar): vendor A-Frame 1.4.2 and MindAR 1.2.5 locally
f751e13 feat(ar): scan add-card qr from viewer camera
```
