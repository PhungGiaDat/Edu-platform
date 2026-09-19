# DeviceMotion Gravity Feasibility Spike

Date: 2026-09-19

## Scope

Debug-only instrumentation determines whether standard browser motion data can provide a gravity candidate comparable with an 8th Wall image-target plane normal. No production TABLETOP behavior was enabled.

## Changed files

- `frontend/public/ar-xr.html`
- `frontend/public/static/ar-assets/js/ar-interaction-lifecycle.js`
- `frontend/public/static/ar-assets/js/ar-interaction-lifecycle.d.ts`
- `frontend/src/__tests__/arInteractionLifecycle.test.ts`

`frontend/src/pages/LearnAR8thWall.tsx` was not changed. Existing iframe permissions already include `gyroscope` and `accelerometer`, and existing debug query forwarding remains in place.

## Runtime probe

- Runs only with `debug=true` or on `localhost`.
- Normal learner mode hides motion controls and does not attach motion listeners.
- No permission request occurs during page load.
- Debug control: `Enable motion diagnostics`.
- On explicit click, iOS `DeviceMotionEvent.requestPermission()` and optional `DeviceOrientationEvent.requestPermission()` calls begin synchronously in the click handler before awaiting results.
- Motion and orientation listeners attach only after usable permission (`granted` or implicit non-iOS access).
- Device vectors, camera quaternion, target normal, and raw sample storage are reused; telemetry is throttled to 500 ms maximum per event family.

## APIs and transform

Detected/probed APIs:

- `DeviceMotionEvent`
- `DeviceMotionEvent.requestPermission` when exposed
- `DeviceOrientationEvent`
- `DeviceOrientationEvent.requestPermission` when exposed
- `event.accelerationIncludingGravity`
- `event.acceleration`
- `screen.orientation.angle`, with `window.orientation` fallback
- `deviceorientation` event availability

Transform implemented:

1. Normalize `accelerationIncludingGravity` in device body coordinates.
2. Rotate by display angle into screen/camera axes:
   - `0°`: `(x, y, z)`
   - `90°`: `(-y, x, z)`
   - `180°`: `(-x, -y, z)`
   - `270°`: `(y, -x, z)`
3. Apply current XR camera world quaternion to produce diagnostic scene-space `derivedWorldUp`.
4. Transform target-local `+Z` by anchor world quaternion.
5. Compare vectors with absolute dot product through existing `getSurfaceFlatScore()`.

This conversion remains a diagnostic hypothesis until physical iPhone evidence confirms that the XR camera quaternion and image-target anchor share a compatible frame while world tracking is disabled.

## Telemetry

Expected debug events:

- `DEVICE_MOTION_CAPABILITY`
- `DEVICE_GRAVITY_SAMPLE`
- `SURFACE_GRAVITY_DIAGNOSTIC`

Surface diagnostic payload marks `candidateOnly: true`; it never calls presentation classification or mutates `surfaceRoot`.

## Verification

- Focused test: `npm --prefix frontend test -- src/__tests__/arInteractionLifecycle.test.ts`
- Result: 72 tests passed.
- Frontend build: `npm --prefix frontend run build`
- Result: blocked by pre-existing TypeScript errors in `src/__tests__/services/AudioService.test.ts` and `src/__tests__/services/PronunciationService.test.ts` (`TS1294`, `erasableSyntaxOnly`). Vite build did not run after `tsc -b` stopped.
- `git diff --check` for changed spike files: no whitespace errors.

## Physical test

Open existing AR route with `debug=true`, scan a target, then tap **Enable motion diagnostics** in the iframe debug panel. Capture parent `AR_DEBUG` messages while running:

1. Card flat on desk, phone 25–40 cm above desk.
2. Card vertical facing phone.
3. Card flat while moderately tilting/moving phone.
4. Card unchanged while rotating portrait to landscape-left, landscape-right, and portrait.

Accept sensor approach only if flat/vertical scores separate near existing `0.82`/`0.65` thresholds, tilt remains stable, and screen rotation preserves equivalent score.

## Conclusion

`READY_FOR_PHYSICAL_SENSOR_TEST` — browser-side probe and deterministic transform are implemented. Production TABLETOP integration remains blocked pending iPhone telemetry and physical acceptance evidence.

## Follow-up verification

- Reused motion mapping arguments and replaced screen-angle membership-array allocation with scalar comparisons; runtime sensor path now keeps reusable vector and argument buffers.
- Preserved existing `AR_VIEWER_BUILD_VERSION` contract: `slam-boundary-diagnostics-v1`.
- Focused AR tests: 79 passed across `arInteractionLifecycle.test.ts` and `arCameraHandoffDiagnostics.test.ts`.
- Physical iPhone evidence remains pending; no production TABLETOP integration was added.
