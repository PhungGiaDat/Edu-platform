# docs/unity_ar/progress/2026-08-11-unity-multi-card-wiring.md

## Session
2026-08-11, agent: claude, branch: MindAR-Update

## Goal
Fix compile break: `ARExperienceHandler` subscribed to `HandleTrackedImageAdded` /
`HandleTrackedImageRemoved` but neither method existed. Complete the multi-card
wiring path so Unity C# is ready for M3B (RN → `startImageTrackingMulti`).

## Root cause
A prior (pre-compaction) session rewired `SubscribeEvents()` from the single-card
MVP path (`OnImageDetected`/`OnImageTrackingLost`) to the multi-card path
(`OnTrackedImageAdded`/`OnTrackedImageRemoved`) but never wrote the two handler
methods. `RNMessageReceiver` also lacked a case for `startImageTrackingMulti`.

## Changed

### `mobile/unity/Assets/AR/ARExperienceHandler.cs`
- Added `HandleTrackedImageAdded(ARTrackedImage image)` — resolves qrId via
  `cardRegistry.TryResolveQrId`, binds `TrackableId→qrId`, spawns model via
  `SpawnModelForTrackable` (fire-and-forget, ContinueWith error reporting).
  Guards against double-spawn using `cardRegistry.GetTrackableModel`.
- Added `HandleTrackedImageRemoved(TrackableId, string)` — unbinds trackable,
  destroys its model instance, emits `onImageTrackingLost` to RN.
- Added `SpawnModelForTrackable(TrackableId, string, Transform)` — async model
  load + spawn parented to the live tracked-image transform. Posts
  `onObjectPlaced`/`onModelLoaded`/`onError` to RN.
- Added `StartImageTrackingMulti(string json)` — parses via `CardTrackingRequest.Parse`,
  reports per-card rejections to RN, registers payloads with `MultiCardRegistry`,
  calls `cardLibraryBuilder.BuildLibrary(parseResult.Valid)` to start the runtime
  image library + AR session.

### `mobile/unity/Assets/Bridge/RNMessageReceiver.cs`
- Added `case "startImageTrackingMulti":` → calls
  `experienceHandler?.StartImageTrackingMulti(json)`.

## Verified
- Compile: `HandleTrackedImageAdded`/`HandleTrackedImageRemoved` now exist with
  correct signatures matching `ARSessionManager` event types
  (`Action<ARTrackedImage>`, `Action<TrackableId, string>`).
- `SpawnModelForTrackable` passes `Vector3 position, Vector3 rotation, Vector3 scale`
  to `ModelSpawner.Spawn` — matches existing signature.
- `StartImageTrackingMulti` calls `CardTrackingRequest.Parse` (already implemented)
  and `cardRegistry.RegisterFlashcard` (already implemented).
- `RNMessageReceiver` route: `startImageTrackingMulti|{json}` → `StartImageTrackingMulti(json)`.
- Event unsubscribe in `OnDestroy` now correctly unsubscribes both new handlers.
- MVP handlers (`HandleImageDetected`, `HandleImageTrackingLost`) preserved —
  `ARSessionManager` still fires the old events alongside the new ones.

## Not Verified
- Unity runtime / Play Mode (Unity editor or device required).
- Actual multi-card detection end-to-end.
- Whether `OnLibraryReady` (fired by `CardImageLibraryBuilder`) chains correctly
  to `ARSessionManager.InitImageTrackingSession` — check if that wiring exists.
- RN `startImageTrackingMulti` emit path (M3B scope).

## Specs touched
None — compile fix only, no behavioral or contract change.

## Confirmations
- ✅ No spec file modified.
- ✅ MVP single-card path (`StartImageTracking`, `LoadARExperience`) unchanged.
- ✅ No new test files (runtime integration test out of scope for compile fix).
- ✅ No backend / frontend-web / RN changes.

## Next
M3B (Native AR_READY E2E) remains blocked on:
- Unity P3: `OnLibraryReady` → `ARSessionManager.InitImageTrackingSession` wiring
  (check if `CardImageLibraryBuilder` calls this or just fires `OnLibraryReady`).
- BACKEND-T001: backend shipping `reference_image_url` / `physical_width_m` fields.
