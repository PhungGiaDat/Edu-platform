# Lifecycle Module Cache-Bust After Gravity Exports

Date: 2026-09-20

## Scope

Cache-bust only. Bumped the `ar-interaction-lifecycle.js` module query version from `?v=visual-pose-v1` to `?v=device-gravity-v1` so devices stop serving a cached copy that predates the DeviceMotion gravity exports.

## Changed files

- `frontend/public/ar-xr.html`
- `frontend/src/__tests__/arInteractionLifecycle.test.ts`

No lifecycle implementation, QRScanner, dual-gate loader, Eruda isolation, DeviceMotion math, TABLETOP, XR8 config, target catalogue, model loading/transforms, interaction logic, smoothing, target-loss grace, or backend code changed.

## Root cause

Commit `2d884503` (feat(ar): add debug device gravity diagnostics) added three new named exports to `ar-interaction-lifecycle.js` — `mapDeviceGravityToScreen`, `normalizeDeviceGravity`, `resolveDeviceMotionPermissionMode` — but left the module URL query at `?v=visual-pose-v1` in both `ar-xr.html` imports.

A physical iPhone therefore received the new `ar-xr.html` alongside a cached old `ar-interaction-lifecycle.js?v=visual-pose-v1` lacking those exports. Observed sequence: `MODULE_PROBE_LIFECYCLE_FAIL` → the static named ES import failed during linking (`VIEWER_ERROR`), so the main AR module never executed and the UI stuck at "Đang mở thế giới AR." `XR8_SCRIPT_LOAD` still appeared because the XR8 engine `<script>` loads independently of the failed ES module.

This is the same bug class as `51d5b88a` (fix(ar): bust stale lifecycle module interface cache), which bumped both import URLs together when the interface last changed.

## Fix

- `ar-xr.html`: both lifecycle import URLs (dynamic probe import + static named import) bumped to `?v=device-gravity-v1`. They remain identical.
- `arInteractionLifecycle.test.ts`: `EXPECTED_LIFECYCLE_MODULE_URL` bumped to the same URL; added 6 assertions proving the probe list and the module both carry the three gravity exports.

The exports already exist at HEAD (verified `export function` camelCase), so no implementation change was needed.

## Verification

- RED: `npm --prefix frontend test -- src/__tests__/arInteractionLifecycle.test.ts` failed on `EXPECTED_LIFECYCLE_MODULE_URL` — received `?v=visual-pose-v1`, expected `?v=device-gravity-v1`.
- GREEN: `npm --prefix frontend test -- src/__tests__/arInteractionLifecycle.test.ts src/__tests__/LearnAR8thWall.transitionUX.test.tsx src/__tests__/debugOverlayContract.test.ts` passed: 102 tests.
- No stale `?v=visual-pose-v1` remains in `ar-xr.html`; both occurrences are `device-gravity-v1` (lines 240, 304).
- `git diff --check` clean.
- Reviewer subagent was infra-blocked (4 consecutive failures across providers: model-ID ambiguity, 429 rate-limit, 401 credits exhausted, 401 provider auth). Manual review substituted with explicit user approval: both URLs identical and bumped, no stale `visual-pose-v1`, three gravity exports present at HEAD as `export function`, only the query string changed (no runtime logic), QR/loader/Eruda code untouched.

## Physical acceptance (retest same iPhone after deploy)

Expected probe sequence:

```
MODULE_PROBE_START
MODULE_PROBE_THREE_OK
MODULE_PROBE_GLTF_OK
MODULE_PROBE_LIFECYCLE_OK
MODULE_PROBE_COMPLETE
```

No `MODULE_PROBE_LIFECYCLE_FAIL`, no `VIEWER_ERROR`. Then runtime:

```
XR8_SCRIPT_LOAD
XR_PIPELINE_READY
XR_RUN_CALLED
XR_CAMERA_HAS_VIDEO
BOOT_CAMERA_READY
BOOT_PRIMARY_READY
BOOT_GATE_OPEN
```

Stop for physical confirmation before any further DeviceMotion/TABLETOP work.
