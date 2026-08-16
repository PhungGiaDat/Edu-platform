## Status
open

## Parent plan
`docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` (Phase 1)

## Goal
Run `ComboEditorPlayTest` in Unity Editor Play mode (no AR hardware required). Verify: two cards spawn simultaneously; proximity detection fires after dwell time; combo animation plays; `OnComboComplete` event fires.

## Linked requirement
`COMBO-REQ-001`, `COMBO-REQ-002`, `COMBO-REQ-003`, `COMBO-REQ-005`, `COMBO-REQ-007`

## Acceptance criteria
- [ ] SPACE key: both mock cards spawn (chicken + egg)
- [ ] Distance shown in status text is above `proximityThreshold` initially
- [ ] C key: cards move close (below threshold)
- [ ] After `proximityHoldTime` seconds: `OnProximityNear` fires (logged in Console)
- [ ] `OnComboComplete` fires with correct `rewardCardId` and `xpAwarded`
- [ ] Both models visible simultaneously (coexistence)
- [ ] X key: cards move apart → proximity resets (NearStartTime = -1)
- [ ] R key: full reset works cleanly
- [ ] G key: force combo immediately → fires without waiting for dwell

## Verification
```
XR Simulation: REQUIRED (this test is the XR simulation fixture)
Physical device: NOT required
```
This test validates combo logic in a fully deterministic Editor environment. It is the primary verification artifact for AC-COMBO-001 and AC-MULTI-001.

## Time / risk estimate
S — run existing test harness. Risk: low.

## Prerequisites
- P0-T001 (GLTFast verified — not directly needed for combo test but good baseline)
- `ComboEditorPlayTest` attached to a GameObject in scene

## Scope
- Open scene with `ComboEditorPlayTest` attached (or create a minimal scene)
- Press Play
- Follow on-screen instructions (SPACE, C, X, R, G)
- Observe Console output for `[COMBO EVENT]` lines
- Verify all acceptance criteria pass

## Out of scope
- Backend integration
- RN bridge
- Physical device
- Real AR tracking

## Notes
`ComboEditorPlayTest` creates the full test rig at runtime (ARSessionManager, ARTrackedImageManager, ComboManager, ModelSpawner). No scene authoring needed. The test uses mock `ARTrackedImage` created via `GameObject.CreatePrimitive` + reflection to set `referenceImage`.

## Stop criteria
Stop after documenting pass/fail for each acceptance criterion. If the test passes all criteria: mark AC-COMBO-001 verified. If failures: document exact failure, update blocker if needed, stop.

## Progress
Link to `docs/unity_ar/progress/<file>.md` when work begins.
