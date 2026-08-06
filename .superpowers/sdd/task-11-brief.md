# Task 11: Regression Gates and Mobile-Simulator Coverage

## Plan Reference
`docs/superpowers/plans/2026-08-06-shared-mind-persistent-viewer.md` — Task 11

## Files to Create
- `frontend-web/e2e/persistent-mind-viewer.spec.ts`
- `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md`

## Files to Modify
- `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts`

## Goal
Strengthen static bootstrap contracts, write Playwright lifecycle tests, and document the physical-device verification checklist.

## Bootstrap Contract Additions

Already added in Task 7:
- Assert `SET_ACTIVE_TARGETS` and `BEGIN_ADD_CARD_SCAN` in viewerJs
- Assert no `showImageFallbackForTarget` calls in viewerJs

## Playwright E2E Test

`e2e/persistent-mind-viewer.spec.ts`:
- Mock flashcard responses, model range responses, target messages
- Capture debug labels and iframe nodes
- Assert in both scan orders:
  - Exactly 1 `VIEWER_BOOTSTRAP_START`
  - Exactly 1 `MINDAR_CONFIG_ACTIVE`
  - `ADD_CARD_SCAN_STARTED` and terminal scan event
  - `ACTIVE_TARGETS_APPLIED`
  - No `MULTI_MIND_PREPARE_STARTED` or `MULTI_MIND_MERGED`
  - Viewer src after second card === src after first card

## Runbook

`docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md` documents:
- Deployment commit hash
- Catalog ID/URL/SHA-256
- API payload for both cards
- iPhone/browser version
- Both scan orders with expected debug-label counts
- Model rendering result
- Catalog mismatch result
- Deliberately broken model result
- Confirmation that no second permission prompt occurred

## Success Criteria
- `arViewerBootstrapContract.test.ts` all pass
- Playwright test passes in both scan orders
- Runbook documents all required verification steps
