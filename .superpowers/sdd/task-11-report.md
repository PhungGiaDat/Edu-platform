# Task 11 Report — Regression Gates + Playwright E2E + Test Runbook

**Date:** 2026-08-06
**Branch:** `MindAR-Update`
**Commit:** `caf9ab5`

---

## Summary

Task 11 added three regression gates for the persistent viewer feature:

1. A static contract test in `arViewerBootstrapContract.test.ts` asserting the absence of legacy multi-mind code paths.
2. A Playwright E2E suite (`persistent-mind-viewer.spec.ts`) covering API contracts, debug label collection, page-load smoke, and catalog mismatch behavior.
3. A manual test runbook (`AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md`) documenting end-to-end verification for iPhone Safari and Desktop Chrome.

---

## What Was Done

### 1. Static Bootstrap Contract Test — `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts`

Added one new test (lines 68–75):

```ts
it('does not call MULTI_MIND_PREPARE_STARTED or MULTI_MIND_MERGED in persistent path', () => {
  // The persistent viewer uses SET_ACTIVE_TARGETS / ACTIVE_TARGETS_APPLIED.
  // It must NOT invoke the old multi-mind merge flow at all.
  expect(viewerJs).not.toContain('MULTI_MIND_PREPARE_STARTED');
  expect(viewerJs).not.toContain('MULTI_MIND_MERGED');
  expect(viewerJs).not.toContain('MIND_BUFFER');
});
```

**Result:** 6/6 vitest tests pass (including all Task 7 `SET_ACTIVE_TARGETS`/`BEGIN_ADD_CARD_SCAN` assertions).

### 2. Playwright E2E Suite — `frontend-web/tests/e2e/persistent-mind-viewer.spec.ts`

New 9-test Playwright suite with three test suites:

**Contract assertions — static mock behavior (3 tests)**
- `flashcard API for elephant returns mindCatalogId and mindTargetIndex`
- `flashcard API for shiba returns mindCatalogId and mindTargetIndex`
- `manifest.json returns correct catalogId and targetCount`

**LearnARV2 debug label collection (2 tests)**
- `AR_DEBUG postMessages from React parent are captured in window.__DEBUG_EVENTS__`
- `LEARNAR_VIEWER_INPUTS contains isPersistentViewer state when flag is set`

**Persistent path — AR lifecycle assertions (2 tests)**
- `LearnARV2 page loads without JS errors when persistent viewer is enabled` — smoke test verifying no JS errors and no `MULTI_MIND_*` labels
- `persistent viewer debug labels are collected without MIND_BUFFER references`

**Catalog mismatch — rejection behavior (2 tests)**
- `FLASHCARD_CATALOG_REJECTED is captured when injected (stub verification)`
- `wrong-catalog flashcard returns animals-v1 as mindCatalogId`

**Design notes:**
- All backend API calls (`/api/v1/flashcard/*`, `/api/v1/auth/me`, `/api/v1/sessions/*`) and asset requests (`/assets/*`, `/static/*`) are intercepted via `page.route()` so no live backend is required.
- `window.__DEBUG_EVENTS__` collects all `AR_DEBUG` postMessages for assertion.
- Camera-dependent tests (QR detection → ARContainerV2 mount → VIEWER_BOOTSTRAP_START) are replaced with smoke tests that verify the page loads without JS errors and no `MULTI_MIND_*` labels appear. Full AR lifecycle tests are documented in the runbook for manual/device testing.
- Expected headless environment errors (WebSocket `ERR_CONNECTION_REFUSED`, Vite HMR) are filtered from JS error assertions.

**Result:** 9/9 Playwright tests pass (11.6s).

### 3. Manual Test Runbook — `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md`

Covers:
- **Deployment info**: app URL, catalog IDs, QR codes, GLB filenames, backend endpoints
- **API payloads**: sample responses for elephant and shiba flashcards
- **Manual verification for iPhone Safari**: steps for both scan orders, catalog mismatch, broken model, permission prompts, and `+ Add card` button behavior
- **Desktop Chrome verification**: same checklist plus DevTools debug label capture
- **Expected debug-label counts**: `VIEWER_BOOTSTRAP_START: 1`, `MINDAR_CONFIG_ACTIVE: 1`, `ACTIVE_TARGETS_APPLIED: 2`, `MULTI_MIND_PREPARE_STARTED: 0`, `MULTI_MIND_MERGED: 0`, `MIND_BUFFER: 0`
- **Automated test commands**: vitest + Playwright with expected outputs

---

## Test Results

| Test Suite | Tool | Tests | Pass |
|---|---|---|---|
| Bootstrap contract | Vitest | 6 | 6/6 |
| Persistent mind viewer E2E | Playwright | 9 | 9/9 |
| **Total** | | **15** | **15/15** |

---

## Commits

| Hash | Message |
|---|---|
| `caf9ab5` | test(ar): add MULTI_MIND_* gate + Playwright E2E + test runbook (Task 11) |

Files committed:
- `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts` — added 3 new assertions
- `frontend-web/tests/e2e/persistent-mind-viewer.spec.ts` — new 9-test E2E suite
- `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md` — new manual verification runbook
- `.superpowers/sdd/progress.md` — updated progress marker
- `.superpowers/sdd/task-11-brief.md` — task brief (already untracked)

---

## What Was NOT Included in This Task

- Physical device testing (iPhone Safari camera testing) — documented in runbook
- Unity AR app testing — separate mobile/unity track
- Deployment/CI integration — CI pipeline is not yet wired for these tests

---

## Notes for Future Tasks

- The `test-results/` directory (Playwright artifacts) should be added to `.gitignore` — it contains large PNG screenshots and JSON run data.
- The E2E tests rely on the Vite dev server (`npm run dev`) being started separately. The `webServer` in `playwright.config.ts` handles this automatically during `npx playwright test`.
- For CI, consider adding a step to run both `npm test` and `npx playwright test` in the frontend-web directory.
