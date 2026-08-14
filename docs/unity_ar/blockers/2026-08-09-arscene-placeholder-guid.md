## Status
resolved

## Blocks
- `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` (Phase 0)
- `docs/unity_ar/spec/acceptance-gates.md` (AC-BUILD-001)

## Symptom
`mobile/unity/Assets/Scenes/ARScene.unity` contains at line 274 a component reference with `PLACEHOLDER_GUID`:
```
m_Script: {fileID: 11500000, guid: PLACEHOLDER_GUID, type: 3}
```
This means a MonoBehaviour script was assigned in the scene and then either the script was deleted, the `.meta` file was removed, or the GUID in the `.meta` file changed. Any component with `PLACEHOLDER_GUID` causes a "Missing (MonoScript)" warning in the Editor and breaks that GameObject's functionality for that component.

## Hypotheses (ranked)
1. **Most likely — deleted Animation or Audio script** — `ARScene.unity` references `AnimationController`, `ARAudioPlayer`, or `ARGestureHandler` which may have been temporarily deleted during the migration, leaving a dangling component reference.
2. **Second — assembly definition meta file change** — Unity generates GUIDs for `.asmdef` files. If an `.asmdef` was regenerated, all scripts in that assembly would get new GUIDs, orphaning references in the scene.
3. **Least likely — corrupted scene serialization** — YAML corruption could produce a synthetic `PLACEHOLDER_GUID`.

## Tried
- Inspected YAML context: the `PLACEHOLDER_GUID` appears on a `m_Script` field on a `GameObject` in ARScene. The specific `GameObject` name was not captured in this session.
- Checked git status: `mobile/unity/Assets/Scripts/Animation.meta` and `mobile/unity/Assets/Scripts/Models.meta` are shown as deleted in git status. This confirms that some `.meta` files were removed, which would orphan script references.
- **Full scene inspection not completed in this session** — need to identify which GameObject and which script is orphaned.

## Verification steps (P0-T002)

1. Open `ARScene.unity` in Unity Editor
2. Check Console for `PLACEHOLDER_GUID` warnings — each warning names the GameObject
3. Or: search the YAML for all `{fileID: 11500000, guid:` lines and compare against actual script `.meta` files
4. Identify which script(s) have `PLACEHOLDER_GUID` — likely the orphaned `AnimationController`, `ARAudioPlayer`, or `ARGestureHandler`
5. Re-import the missing scripts or remove the orphaned component from the GameObject
6. If the orphaned component is `AnimationController`/`ARAudioPlayer` and they exist as files: reimport them to regenerate `.meta` files with correct GUIDs
7. If the orphaned component was deleted intentionally: remove the reference from the GameObject in the scene

## Note on FullARBootstrap
`FullARBootstrap` builds the full AR rig at runtime (not from scene). It would work correctly even if `ARScene.unity` has broken references. However, `ARScene.unity` may still be used for manual testing, so it should be repaired.

## Resolution
(Filled when status changes from open.)
