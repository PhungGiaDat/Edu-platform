## Status
open

## Parent plan
`docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` (Phase 3)

## Goal
Wire `CardImageLibraryBuilder` into `ARExperienceHandler`. Create the RN → Unity bridge method for sending a list of `CardDescriptor` to build a runtime reference image library. Prove the multi-card library construction path.

## Linked requirement
`TRACK-REQ-001`, `TRACK-REQ-009`, `BRIDGE-REQ-005`, `BRIDGE-REQ-007`

## Linked blocker
`docs/unity_ar/blockers/2026-08-09-native-ar-backend-missing-fields.md` (must be resolved first)

## Acceptance criteria
- [ ] `ARExperienceHandler` has a reference to `CardImageLibraryBuilder`
- [ ] New `RNMessageReceiver` method handles multi-card payload (`startImageTracking` or equivalent)
- [ ] `CardImageLibraryBuilder.BuildLibrary(cards)` is called with a list of `CardDescriptor`
- [ ] Runtime library is created from N reference images
- [ ] `OnLibraryReady` fires `RNEventEmitter.onArReady`
- [ ] Graceful error handling when `supportsMutableLibrary == false`
- [ ] Graceful error handling when reference image download fails

## Verification
```
XR Simulation: REQUIRED for library construction path
Physical device: optional for library path (can use mock)
```
Full end-to-end test requires real reference images or mocks. Use `EditorMockImageDetector` or hardcoded test URLs.

## Time / risk estimate
M — bridge method creation + component wiring. Risk: medium (touching ARExperienceHandler wiring).

## Prerequisites
- BACKEND-T001 (native AR fields added to backend)
- RN payload updated with `referenceImageUrl` and `physicalWidthMeters`
- P1-T001 (runtime library POC verified in Phase 1)

## Scope
- Add `CardImageLibraryBuilder` field to `ARExperienceHandler` and wire in `AutoWire()`
- Create new `RNMessageReceiver` method: `startImageTracking` or `startImageTrackingMulti`
- Deserialize list of `CardDescriptor` from JSON
- Call `CardImageLibraryBuilder.BuildLibrary(cards)`
- Handle `OnLibraryReady` → `RNEventEmitter.onArReady`
- Handle `OnError` → `RNEventEmitter.onError`
- Test with mock `CardDescriptor` list in Editor

## Out of scope
- Actual multi-card model loading (Phase 4)
- Backend combo consumption (Phase 6)
- Physical device

## Implementation constraints
- Do NOT break existing `loadARExperience` single-card path
- New method is additive (parallel method or conditional routing)
- `supportsMutableLibrary` check must be handled gracefully

## Stop criteria
Stop after the library builder is wired and the library construction path is proven in Editor. Do not continue into multi-card model loading (Phase 4) in the same session.

## Progress
Link to `docs/unity_ar/progress/<file>.md` when work begins.
