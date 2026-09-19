# QR Scanner Empty Decode Guard

Date: 2026-09-20

## Scope

`QRScanner` now validates decoded jsQR payloads before latching detection or shutting down the scanner. Empty, whitespace-only, and non-string payloads leave the active scan loop, camera stream, video element, and parent handoff untouched. Valid payloads are trimmed before the existing camera-stop-before-callback handoff.

## Changed files

- `frontend/src/features/ar/components/QRScanner.tsx`
- `frontend/src/__tests__/arCameraHandoffDiagnostics.test.ts`

No changes were made to `ar-xr.html`, DeviceMotion diagnostics, TABLETOP presentation, XR8 configuration, target catalogue, model assets, smoothing, target-loss grace, or backend code.

## Root cause

The scanner treated any truthy jsQR result object as a valid detection. It set the detection latch, cancelled RAF, stopped media tracks, released the video, and emitted `QR_HANDOFF_TO_PARENT` before passing raw `code.data` to `LearnAR8thWall`. Parent normalization rejected an empty value after this shutdown, leaving React in `SCANNING` with no active scanner camera.

## Verification

- RED: `arCameraHandoffDiagnostics.test.ts` failed because `normalizeQrDetectionPayload` and the scanner-side payload guard did not exist.
- GREEN: `npm --prefix frontend test -- src/__tests__/arCameraHandoffDiagnostics.test.ts` passed: 8 tests.
- Focused regression: `npm --prefix frontend test -- src/__tests__/arCameraHandoffDiagnostics.test.ts src/__tests__/learnAR8thWallTargetConfig.test.ts` passed: 22 tests.
- `git diff --check` completed without whitespace errors for scanner and test changes.

## Physical retest

On iPhone Safari, retry the scan scenario that previously produces an empty or whitespace decode, then scan a valid card. Invalid decode must retain the live scanner and must not emit `QR_CAMERA_STOP_BEGIN`, `QR_CAMERA_STOP_CALLED`, `QR_VIDEO_RELEASED`, or `QR_HANDOFF_TO_PARENT`. A valid scan must retain the existing telemetry order and transition to XR.

DeviceMotion and TABLETOP work remain blocked pending this QR physical retest.
