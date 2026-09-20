# XR Dual-Gate Loading Overlay

Date: 2026-09-20

## Scope

Restored the viewer loading-overlay invariant in `frontend/public/ar-xr.html`: the overlay remains available after camera video starts and hides only when `shouldRevealAR({ cameraReady, primaryReady })` succeeds inside `maybeRevealAR()`.

## Changed files

- `frontend/public/ar-xr.html`
- `frontend/src/__tests__/LearnAR8thWall.transitionUX.test.tsx`

No QR scanner, DeviceMotion, TABLETOP, XR targeting, model transforms, smoothing, target-loss grace, target catalogue, interaction logic, or backend code changed.

## Root cause

`b97b9d02` hid the overlay on `XR_CAMERA_HAS_VIDEO` before the primary model completed, and then suppressed `showOverlay()` after camera readiness. Slow model download or compilation exposed an unpopulated camera feed with no loading state.

## Verification

- RED: `npm --prefix frontend test -- src/__tests__/LearnAR8thWall.transitionUX.test.tsx` failed on the old camera-ready `showOverlay()` suppression.
- GREEN: `npm --prefix frontend test -- src/__tests__/LearnAR8thWall.transitionUX.test.tsx src/__tests__/arInteractionLifecycle.test.ts` passed: 92 tests.
- `arInteractionLifecycle.test.ts` preserves all four `shouldRevealAR` readiness combinations.

## Physical retest

1. Open a clean normal AR URL and scan a valid QR.
2. Confirm camera video alone does not dismiss the viewer loading state.
3. Confirm `BOOT_GATE_OPEN` occurs only after camera and primary model readiness.
4. Confirm the overlay then disappears and the primary model is visible.
