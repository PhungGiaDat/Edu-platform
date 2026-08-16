## Status
open

## Parent plan
`docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` (Phase 1)

## Goal
Run the `RuntimeImageTrackingPOC` scene in Unity Editor Play mode with XR Simulation enabled. Verify the runtime image tracking architecture works end-to-end: download → mutable library → `ScheduleAddImageWithValidationJob` → tracking → marker spawn.

## Linked requirement
`TRACK-REQ-001`, `TRACK-REQ-009`, `TRACK-REQ-010`

## Acceptance criteria
- [ ] `RuntimeImageTrackingPOC` scene loads in Play mode
- [ ] XR Simulation enabled (or AR subsystem available in Editor)
- [ ] Reference image downloads successfully (or graceful error logged)
- [ ] `MutableRuntimeReferenceImageLibrary` created successfully
- [ ] `ScheduleAddImageWithValidationJob` completes without ErrorInvalidImage (or graceful handling)
- [ ] `ARTrackedImageManager` enabled
- [ ] OnGUI shows "READY" or equivalent success message
- [ ] Console: no unhandled exceptions

## Verification
```
XR Simulation: REQUIRED
Physical device: optional (can run on device if available)
```
XR Simulation proves the architecture works in controlled environment. It does NOT prove real-world tracking quality.

## Time / risk estimate
M — involves Editor Play mode + XR Simulation. Risk: medium (XR Simulation environment setup).

## Prerequisites
- P0-T001 (GLTFast verified)
- P0-T002 (ARScene repaired)
- Unity Editor with XR Simulation enabled

## Scope
- Enable XR Simulation in Unity (Project Settings → XR Plug-in Management → Simulation)
- Open `RuntimeImageTrackingPOC` scene
- Run in Play mode
- Observe OnGUI status messages
- Check Console for errors
- Verify library builder flow

## Out of scope
- Multi-card (N > 1)
- Backend integration
- Physical device
- RN bridge changes

## Stop criteria
Stop after verifying (or clearly documenting failure of) the runtime image library construction path. If `supportsMutableLibrary` is false on this Editor: document the error, check ARCore/ARKit provider availability, stop.

## Progress
Link to `docs/unity_ar/progress/<file>.md` when work begins.
