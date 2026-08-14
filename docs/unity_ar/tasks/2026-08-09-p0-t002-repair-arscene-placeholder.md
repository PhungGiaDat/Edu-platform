## Status
open

## Parent plan
`docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` (Phase 0)

## Goal
Identify and repair the `PLACEHOLDER_GUID` component reference in `ARScene.unity`. Remove orphaned component references or regenerate missing `.meta` files.

## Linked requirement
`AR-REQ-004` — ARScene must be intact before any AR Foundation work.

## Linked blocker
`docs/unity_ar/blockers/2026-08-09-arscene-placeholder-guid.md`

## Acceptance criteria
- [ ] Unity Console shows 0 warnings about missing scripts in ARScene
- [ ] `ARScene.unity` YAML contains no `PLACEHOLDER_GUID`
- [ ] `ARScene.unity` loads in Play mode without errors
- [ ] `FullARBootstrap` or manual AR rig starts correctly

## Verification
- Open `ARScene.unity` in Unity Editor
- Check Console for `PLACEHOLDER_GUID` warnings
- Play scene — no script errors
```
XR Simulation: optional (if AR subsystem available in Editor)
Physical device: not required
```

## Time / risk estimate
S — straightforward cleanup. Risk: low.

## Scope
- Inspect ARScene in Unity Editor
- Identify orphaned component (likely AnimationController, ARAudioPlayer, or ARGestureHandler)
- Either: reimport missing scripts to regenerate .meta files, OR remove orphaned component from scene
- Verify no more PLACEHOLDER_GUID warnings

## Out of scope
- Do NOT modify ARScene beyond removing/repairing orphaned component references
- Do NOT change scene lighting, camera, or non-broken GameObjects
- Do NOT modify scripts

## Investigation Protocol (required before any action)

Do NOT blindly regenerate .meta files or delete components. Follow this order:

1. **Inspect the exact broken reference:** Open `ARScene.unity` in Unity Editor. Check Console for `PLACEHOLDER_GUID` warnings — each warning names the GameObject. Alternatively, search the YAML for all `{fileID: 11500000, guid:` lines and compare against actual script `.meta` files.

2. **Inspect git status/history:** Run `git status` and `git log --follow -- mobile/unity/Assets/Scripts/Animation.meta mobile/unity/Assets/Scripts/Models.meta`. The `.meta` files for `Animation` and `Models` folders are deleted in git status. This confirms orphaned component references.

3. **Determine whether the original .meta/GUID belonged to an existing asset:** Check if `AnimationController.cs`, `ARAudioPlayer.cs`, or `ARGestureHandler.cs` exist as files. If they exist, their `.meta` files were deleted and need to be regenerated.

4. **Prefer restoring the original .meta/GUID when repository evidence supports it:** If the script files exist but their `.meta` files were deleted, re-import the scripts in Unity Editor (or touch the files) to regenerate the `.meta` with the original GUID. If the scripts themselves are deleted, the orphaned reference in the scene must be removed.

5. **Only remove a scene component if evidence proves the dependency was intentionally deleted:** If the script is missing and intentionally deleted, remove the component from the scene GameObject rather than creating placeholder scripts.

6. **Do not generate a new GUID and assume the old serialized scene reference is fixed:** If a script's `.meta` was regenerated with a new GUID, the old `{fileID: 11500000, guid: PLACEHOLDER_GUID, type: 3}` reference in the YAML will NOT automatically fix. You must either restore the original GUID or update the YAML to the new GUID.

## Notes
`FullARBootstrap` builds the full AR rig at runtime — ARScene.unity having broken references does NOT prevent the app from working on device. However, ARScene.unity may be used for manual Editor testing, so it should be repaired.

## Progress
Link to `docs/unity_ar/progress/<file>.md` when work begins.
