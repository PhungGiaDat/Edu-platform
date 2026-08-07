# Task 12: Verify Complete Feature and Stage Test-Branch Rollout

## Plan Reference
`docs/superpowers/plans/2026-08-06-shared-mind-persistent-viewer.md` — Task 12

## Goal
Run all verification suites, verify obsolete paths are absent, and stage the test-branch deployment.

## Verification Steps

### 1. Backend regression suite
```bash
cd backend
python -m pytest tests/test_ar_object_catalog_schema.py tests/test_backfill_ar_mind_catalog.py tests/test_flashcard_ar_response.py tests/test_ar_service.py -q
```

### 2. Catalog verification
```bash
cd frontend-web
npm.cmd run ar:catalog:verify
```

### 3. Full frontend suite and build
```bash
cd frontend-web
npm.cmd test
npm.cmd run build
```

### 4. Static viewer scripts
```bash
cd frontend-web
node --check public/static/ar-assets/js/ar-add-card-scanner.js
node --check public/static/ar-assets/js/ar-target-registry.js
node --check public/static/ar-assets/js/ar-viewer.js
```

### 5. Verify obsolete paths are absent
```bash
git grep -n -E "mergeMindTargetBuffers|runtime-buffer|MULTI_MIND_MERGED|MIND_BUFFER_REQUEST" -- frontend-web/src frontend-web/public/static/ar-assets/js/ar-viewer.js
```
Expected: no matches (or only backward-compat documented for deletion)

```bash
git grep -n -E "showImageFallbackForTarget\([01], 'model-[01]-(asset|entity)-error'" -- frontend-web/public/static/ar-assets/js/ar-viewer.js
```
Expected: no output.

### 6. Branch scope
```bash
git diff main...HEAD --check
git status --short
```

### 7. Deploy to test branch
Set `VITE_PERSISTENT_MIND_VIEWER=true` on Vercel test deployment.

### 8. Physical-device gate
Follow `docs/report/AR_PERSISTENT_VIEWER_TEST_RUNBOOK.md`. Both scan orders must pass.

## Success Criteria
- All backend tests pass
- All frontend tests pass
- Build succeeds
- No obsolete paths in new flow
- Feature flag set on test deployment
- Physical device verification complete
