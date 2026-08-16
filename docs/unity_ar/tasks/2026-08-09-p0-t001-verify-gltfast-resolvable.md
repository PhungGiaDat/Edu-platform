## Status
open

## Parent plan
`docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` (Phase 0)

## Goal
Verify that `com.unity.cloud.gltfast` embedded package is resolvable and `GLTFast.GltfImport` compiles in `GLBLoader.cs`. Resolve any compilation issues before Phase 1.

## Linked requirement
`CONTENT-REQ-003` — GLTFast dependency must be present and resolvable.

## Linked blocker
`docs/unity_ar/blockers/2026-08-09-gltfast-dependency.md`

## Acceptance criteria
- [ ] `Packages/com.unity.cloud.gltfast/` folder exists with `package.json`
- [ ] No duplicate `com.unity.cloud.gltfast` entry in `manifest.json`
- [ ] `using GLTFast;` compiles without error
- [ ] `GltfImport` type is accessible from `Assets/Models/GLBLoader.cs`
- [ ] All 5 EditMode tests pass (no AR hardware required)

## Verification
```
Run EditMode tests in Unity Editor:
- MultiCardRegistryTests
- ComboDefinitionTests
- ARSessionManagerRegressionTests
- ModelSpawnerRegressionTests
- CardDescriptorTests
```
XR Simulation: not required for this task.
Physical device: not required for this task.

## Time / risk estimate
S — single verification task. Risk: low if package is correctly embedded.

## Scope
- Verify GLTFast package resolves
- Run EditMode tests
- Do NOT modify GLTFast package or change model-loading architecture
- Do NOT change package manifest

## Out of scope
- Runtime image library
- Multi-card integration
- Backend changes
- Physical device testing

## Progress
Link to `docs/unity_ar/progress/<file>.md` when work begins.
