## Status
resolved

## Blocks
- `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` (Phase 0)
- `docs/unity_ar/spec/requirements-baseline.md` (CONTENT-REQ-003)
- `docs/unity_ar/spec/acceptance-gates.md` (AC-BUILD-001, AC-BUILD-002)

## Symptom
`com.unity.cloud.gltfast` is listed as an embedded package in `mobile/unity/Packages/manifest.json` but its actual availability during compilation has not been verified by an EditMode test run. `GLBLoader.cs` references `GLTFast.GltfImport` which depends on this package. No Unity EditMode test exercises the GLTFast import path. If the embedded package fails to resolve, `Assets/Models/GLBLoader.cs` would fail to compile.

## Hypotheses (ranked)
1. **Most likely — package is correctly embedded but not compile-verified** — `packages-lock.json` shows `com.unity.cloud.gltfast` at `file:com.unity.cloud.gltfast` with dependencies (burst, mathematics, collections) all resolved. The package is present on disk. No EditMode test actually instantiates `GltfImport`, so it has not been confirmed to resolve.
2. **Second — embedded path not on Unity's search path** — `file:` scheme packages must be placed in `Packages/com.unity.cloud.gltfast/`. If the folder is missing or malformed, the resolver ignores it silently and GLTFast fails at compile time.
3. **Least likely — version conflict** — `gltfast 6.x` may have API differences from what `GLBLoader.cs` assumes.

## Tried
- Inspecting `packages-lock.json` shows gltfast with correct dependency tree (✓)
- Inspecting `packages/` directory for gltfast folder — **not verified**
- Running EditMode tests — **not run in this session**
- Compiling in headless mode — **not attempted**

## Verification steps (P0-T001)

1. Open Unity project
2. Check `Packages/com.unity.cloud.gltfast/` folder exists with `package.json`
3. Check no other `com.unity.cloud.gltfast` entry in `manifest.json` (duplicate)
4. Run all EditMode tests: `MultiCardRegistryTests`, `ComboDefinitionTests`, `ARSessionManagerRegressionTests`, `ModelSpawnerRegressionTests`, `CardDescriptorTests`
5. Create a minimal compile test: `#if UNITY_EDITOR` that references `GLTFast.GltfImport` and asserts it resolves
6. If compile fails: investigate embedded package placement or switch to UPM registry URL

## Resolution
(Filled when status changes from open.)
