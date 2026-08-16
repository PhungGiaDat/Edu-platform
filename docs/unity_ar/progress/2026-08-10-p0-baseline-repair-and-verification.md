## Session
2026-08-10 22:xx (UTC+7), agent: claude-code (fable), branch: MindAR-Update

## Goal
Execute Unity Core AR implementation from existing plans. First READY_NOW target:
re-establish the P0 build/test baseline (AC-BUILD-001 / AC-BUILD-002, P0-T001, P0-T002)
with FRESH compile + EditMode evidence, since prior sessions only had partial (16/16) proof.

## Tooling
- Besty UnitySkills REST **live** at `localhost:8090`, Unity `6000.3.20f1`, mode `bypass`.
- Unity MCP: 0→1 instance mid-session but bridge calls returned "No Unity Editor instances" (unreliable this session).
- Unity CLI bound (`cli_config.json enabled:true`, cliTest:true) — not used this session.

## Changed (this session)
- `mobile/unity/Assets/ARRuntime.asmdef` — moved `UNITY_ANIMATION` OUT of `defineConstraints`
  INTO `versionDefines` (`com.unity.modules.animation → UNITY_ANIMATION`), matching GLTFast's own
  asmdef pattern. Root cause: the define-constraint was excluding the ENTIRE ARRuntime assembly
  (UNITY_ANIMATION was never defined for it), which made every ARRuntime type unresolvable from
  EditModeTests (6× CS0246). This was a PRE-EXISTING uncommitted change in the working tree.
- `mobile/unity/Assets/Models/GLBLoader.cs` — removed an invalid custom DeferAgent block
  (used `go` before declaration → CS0841; wrong member `frameBudget` → CS1061; called static
  `SetDefaultDeferAgent` on instance → CS0176). `new GltfImport()` already installs a default
  `TimeBudgetPerFrameDeferAgent`, so the block was both buggy and redundant. (File is under
  git-ignored `Assets/Models/` — untracked but is the real compiled source.)
- `mobile/unity/Assets/Bridge/RNEventEmitter.cs` — guarded both `DontDestroyOnLoad` calls with
  `if (Application.isPlaying)`. Root cause: EditMode test `RemovedDoesEmitTrackingLost` triggered
  `RNEventEmitter.Instance` in edit mode → `InvalidOperationException`. Runtime behavior unchanged.
- `mobile/unity/Assets/Scripts/Interactions/ComboManager.cs` — added `CardA`, `CardB`,
  `ComboModelUrl` fields to nested `ComboDefinition` (contract already asserted by
  `ComboDefinitionTests` + P7 primitive-fallback plan). Trigger/animation flow unchanged.
- `mobile/unity/Assets/Scenes/ARScene.unity` — P0-T002: replaced `m_Script guid: PLACEHOLDER_GUID`
  on "AR Experience Handler" with the real `ARExperienceHandler` GUID
  (`ac0926a62caf4784d9e6933ae3c2a431`, verified from `.cs.meta` + git history); removed 2 orphan
  missing-script components on "AR Session Origin" (born in scene-creation commit c2129ae, resolve
  to no current script/package; runtime rig is built by `FullARBootstrap`, so no GUID to restore).

## Verified (fresh, this session)
- compile: **PASS** — `/compile/status` success:true, errorCount:0 at 15:26:55Z (only pre-existing
  unrelated `POCBuildScript.cs` CS0618 warning).
- EditMode tests (full): **258 passed / 0 failed / 1 skipped of 259** (job `31eb3f56`, post-fix).
  - IMPORTANT: an earlier "218/218" reading was INVALID — it ran against STALE DLLs while the test
    assembly was excluded by the broken define-constraint. The 259-count run is the real baseline.
- ARScene: **0 missing scripts** (`validate_find_missing_scripts`), **0 PLACEHOLDER_GUID** in YAML,
  loads via `scene_load`, `debug_get_errors` = 0 after load.
- PlayMode: `editor_play_capture` (6s) completed and exited Play Mode cleanly, no job warnings.
- GLTFast: `com.unity.cloud.gltfast` resolves as embedded package (packages-lock `file:` ref);
  no duplicate manifest entry. AR Foundation 6.3.5 (matches AR-REQ-001).

## Not Verified
- Any physical device (Android ARCore / iOS ARKit) — n/a this session.
- XR Simulation runtime image-library proof (P1-T001) — NOT RUN.
- Combo Editor playtest (P1-T002 / ComboEditorPlayTest) — NOT RUN.
- Final confirmation EditMode re-run — the Editor entered a licensing/AI-assistant failure loop
  (see blocker) and the REST listener stopped answering /health, so the extra re-run could not
  complete. The GREEN evidence above was captured before that saturation.

## Specs / gates touched
- `spec/acceptance-gates.md` — AC-BUILD-001, AC-BUILD-002 now have fresh EDITOR evidence
  (was BLOCKED / NOT VERIFIED). Not editing the spec file itself; recording evidence here.
- P0-T001 (verify GLTFast resolvable) acceptance: MET.
- P0-T002 (repair ARScene placeholder) acceptance: MET (in-Editor; note ARScene is Editor-scaffold
  only — `FullARBootstrap` is `#if !UNITY_EDITOR` and builds the device rig programmatically).

## Blockers raised
- `docs/unity_ar/blockers/2026-08-10-arcore-package-missing.md` — `manifest.json` has
  `com.unity.xr.arkit` but NO `com.unity.xr.arcore`; blocks ANDROID-REQ-001/002. Additive
  package decision — NOT added silently.
- `docs/unity_ar/blockers/2026-08-10-editor-licensing-gc-loop.md` — Unity licensing/AI-assistant
  cert failure loop saturating main thread; environmental, blocks further live verification until
  the Editor session is restarted/re-licensed.

## Note (repo hygiene, not fixed)
- `.gitignore:452` `**/assets/models/` makes `Assets/Models/` (incl. GLBLoader.cs, ModelSpawner.cs)
  UNTRACKED on case-insensitive Windows. Real source is edited but not under version control.
  Flagging only — out of scope for this task.

## Next
- When the Editor is healthy again (restart to clear the licensing loop), run P1-T001
  (RuntimeImageTrackingPOC under XR Simulation) then P1-T002 (ComboEditorPlayTest).
