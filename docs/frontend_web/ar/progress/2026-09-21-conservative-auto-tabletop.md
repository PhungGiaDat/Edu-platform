# Conservative AUTO Tabletop Presentation

Date: 2026-09-21

## Audit result

Production `AUTO` was blocked in `frontend/public/ar-xr.html` because
`getSurfaceWorldUp()` always returned `worldUp: null` while 8th Wall world
tracking remained disabled. DeviceMotion gravity was already normalized,
screen-mapped, camera-quaternion-derived, and emitted by the debug probe, but
that candidate never reached `classifySurfaceOrientation()`.

The existing 0.82 enter score, 0.65 exit score, 400 ms stability window, and
`surface-root` correction path were retained. A separate surface-orientation
loss grace prevents a short sensor gap from immediately changing a latched
TABLETOP mode. The interaction target-loss grace remains 300 ms and is
unchanged.

## Fix

- Added `resolveGravityWorldUpCandidate()` with finite-vector, freshness,
  and stability-dot checks.
- Enabled the existing browser-safe DeviceMotion source for `AUTO` when
  permission is implicit or already granted; iOS still requires the existing
  explicit debug gesture for `requestPermission()`.
- Passed an accepted gravity/world-up candidate into production
  `getSurfaceWorldUp()` and retained clean SCREEN fallback for unsupported,
  denied, stale, invalid, or noisy samples.
- Kept all presentation correction on `surfaceRoot.quaternion`; raw
  `trackedTargets`, proximity distance, transaction ownership, model scale,
  smoothing, combo, and QR flows are untouched.
- Made surface mode/orientation/gravity telemetry debug-only and throttled.

## Changed files

- `frontend/public/ar-xr.html`
- `frontend/public/static/ar-assets/js/ar-interaction-lifecycle.js`
- `frontend/public/static/ar-assets/js/ar-interaction-lifecycle.d.ts`
- `frontend/src/__tests__/arInteractionLifecycle.test.ts`
- `docs/frontend_web/ar/progress/2026-09-21-conservative-auto-tabletop.md`

## Verification

- RED: focused lifecycle run failed 5 tests before the runtime/helper change;
  failures covered the missing gravity candidate export and immediate invalid
  world-up fallback.
- GREEN: `npm --prefix frontend test -- src/__tests__/arInteractionLifecycle.test.ts src/__tests__/arCameraHandoffDiagnostics.test.ts`
  — 84 tests passed.
- Neighboring AR contracts: 9 test files, 159 tests passed.
- Build: `npm --prefix frontend run build` exited 0. Vite retained existing
  bundle-size and `three-mesh-bvh` export warnings; no build error occurred.
- `git diff --check` passed for the scoped runtime, type, and test files.

## Physical iPhone checklist

1. Deploy the committed frontend and open the normal AR route with default
   `presentation_mode=AUTO`.
2. For iOS, use the existing debug session gesture once to grant motion
   permission, then repeat the normal route after permission is retained.
3. Flat card on a desk: observe `SURFACE_ORIENTATION_SAMPLE` and confirm a
   finite candidate score, stable `TABLETOP` transition after about 400 ms,
   and no visible oscillation.
4. Hold the card upright: confirm the score stays below the enter threshold
   and the model remains in `SCREEN`.
5. Briefly cover or move the phone sensor: confirm a short gap does not flicker
   the active mode; a sustained stale/invalid stream falls back to `SCREEN`.
6. Run two-target CAT/FISH and QR flows while checking that combo proximity,
   300 ms target-loss grace, smoothing, learner overlay, and operator/debug
   gating behave as before.

Physical device evidence is still pending; this change is code- and
runtime-verified, not device-browser-verified.
