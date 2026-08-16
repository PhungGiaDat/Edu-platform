## Status
open

## Blocks
- `docs/unity_ar/spec/requirements-baseline.md` (legacies)

## Topic
Documentation vs. runtime reality: image tracking direction

---

## DOC-DRIFT-001: Legacy AR uses image tracking, not plane detection

### Documentation claim
Legacy documentation may reference "plane tap placement" — scanning physical space, tapping on detected planes, placing 3D content on surfaces.

### Runtime implementation
Legacy MindAR/WebAR path uses **image tracking** via MindAR.js and compiled `.mind` files (catalogs containing image targets). The physical card is the "marker" — not a scanned plane.

### Resolution
Runtime implementation (image tracking via MindAR) is **authoritative**. Documentation should reference "image tracking" or "marker-based AR," not "plane detection / tap-to-place." This drift does not affect the migration — native AR also uses image tracking, consistent with current reality.

### Action
Update relevant README files to reference "image tracking" instead of "plane detection" for the AR scanning flow. Do not change product code to match documentation.

---

## DOC-DRIFT-002: ARScene PLACEHOLDER_GUID

### Documentation claim
No documentation claims ARScene is broken.

### Runtime reality
`mobile/unity/Assets/Scenes/ARScene.unity:274` has `{fileID: 11500000, guid: PLACEHOLDER_GUID, type: 3}` — a missing MonoBehaviour reference. `mobile/unity/Assets/Scripts/Animation.meta` and `mobile/unity/Assets/Scripts/Models.meta` are deleted in git status.

### Resolution
`FullARBootstrap` builds the full AR rig at runtime, bypassing ARScene.unity. ARScene.unity is used for manual Editor testing. The PLACEHOLDER_GUID must be repaired for ARScene to be usable for manual testing.

### Action
Track as blocker `2026-08-09-arscene-placeholder-guid.md`. Do not delete ARScene.unity.

---

## DOC-DRIFT-003: RN bridge event naming

### Documentation claim
`mobile/README.md` and `mobile/unity/README.md` list event types including `onObjectPlaced`.

### Runtime implementation
`ARExperienceHandler.SpawnModelAtImage()` fires `onObjectPlaced` at line 163. `AnchorManager.cs` also fires `onObjectPlaced` at line 66. Two distinct code paths both emit the same event name. No collision observed in practice because they fire at different stages, but the dual-path is undocumented.

### Resolution
Document the dual-path `onObjectPlaced` emission as a known architecture detail (not a bug — they fire at different stages of the placement pipeline). Future work may consolidate.

### Action
Track as a note in the bridge contract spec. No immediate fix required.
