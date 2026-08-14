## Session
2026-08-09 10:00, agent: opus-4.8, branch: MindAR-Update

## Goal
Create authoritative Unity/AR Foundation memory workspace: spec baseline, migration plan, blockers, and bounded tasks for future Sonnet agents.

## Changed
Memory workspace under `docs/unity_ar/`:
- `spec/000-index.md` — specification index
- `spec/legacy-coexistence.md` — MindAR coexistence invariant (approved)
- `spec/requirements-baseline.md` — 50+ requirements across 12 namespaces
- `spec/architecture-specification.md` — system ownership, runtime sequence, identity model, component map
- `spec/acceptance-gates.md` — 20 acceptance gates (AC-BUILD through AC-IOS)
- `spec/backend-contract.md` — backend API contract + native AR additive fields
- `spec/bridge-contract.md` — RN↔Unity bridge gaps
- `spec/entitlement-gap.md` — confirmed private-card entitlement gap (approved)
- `spec/combo-interaction.md` — combo architecture invariants
- `plans/2026-08-09-unity-ar-migration-plan.md` — 12-phase master plan
- `blockers/2026-08-09-gltfast-dependency.md` — P0: GLTFast not compile-verified
- `blockers/2026-08-09-arscene-placeholder-guid.md` — P0: ARScene PLACEHOLDER_GUID
- `blockers/2026-08-09-native-ar-backend-missing-fields.md` — P0: backend lacks reference_image_url + physical_width_m
- `blockers/2026-08-09-arsessionmanager-tracking-lost-regression.md` — RESOLVED: regression fixed
- `blockers/2026-08-09-documentation-drift.md` — 3 documentation vs. runtime conflicts
- `tasks/2026-08-09-p0-t001-verify-gltfast-resolvable.md` — P0 task: verify GLTFast
- `tasks/2026-08-09-p0-t002-repair-arscene-placeholder.md` — P0 task: repair ARScene
- `tasks/2026-08-09-backend-t001-native-ar-fields.md` — P2 task: add native AR fields
- `tasks/2026-08-09-p1-t001-xr-sim-runtime-library.md` — P1 task: XR sim runtime library
- `tasks/2026-08-09-p1-t002-xr-sim-combo-editor-playtest.md` — P1 task: combo play test
- `tasks/2026-08-09-p3-t001-card-library-builder-wiring.md` — P3 task: wire library builder

## Verified
- Unity package manifest: AR Foundation 6.3.5, ARKit 6.3.5, GLTFast 6.x (embedded)
- GLTFast embedded at `file:com.unity.cloud.gltfast` with correct dependency tree (burst, mathematics, collections) — NOT compile-verified (open blocker)
- 4 AR scripts: ARSessionManager, CardImageLibraryBuilder, MultiCardRegistry, ARExperienceHandler
- 5 model/bridge scripts: GLBLoader, ModelSpawner, AnimationController, RNEventEmitter, ARPayloadMapper
- 5 EditMode tests: MultiCardRegistryTests, ComboDefinitionTests, ARSessionManagerRegressionTests, ModelSpawnerRegressionTests, CardDescriptorTests
- 2 scenes: ARScene.unity (PLACEHOLDER_GUID found), ARTestScene.unity
- Backend ar_object: mind_catalog_id + mind_target_index, no reference_image_url / physical_width_m
- ARScene.unity:274 has PLACEHOLDER_GUID component reference
- ARScene.unity deleted .meta files: Animation.meta, Models.meta (from git status)
- FullARBootstrap: builds full AR rig at runtime (bypasses broken scene)
- ComboManager: hardcoded combo table; not yet consuming backend related_combos
- RN bridge: LOAD_EXPERIENCE method routes to ARPayloadMapper.Parse()
- RN AR payload: UnityARExperiencePayload lacks reference_image_url + physical_width_m
- Current ARExperienceHandler: single _currentPayload; multi-card routing not wired
- ARSessionManager regression: args.updated path no longer emits OnImageTrackingLost (verified resolved)
- Backend: no reference_image_url or physical_width_m anywhere (grep confirmed zero matches)
- No competing root-level unity_ar/ workspace created

## Not Verified
- GLTFast actually compiles (blocked: needs Unity Editor)
- ARScene PLACEHOLDER_GUID specific GameObject + component (needs Unity Editor)
- XR Simulation runtime library (needs Unity Editor + AR subsystem)
- ComboEditorPlayTest execution (needs Unity Editor)
- ARTestHarness execution (needs Unity Editor)
- Physical device AR (needs hardware)
- Backend migration for native AR fields (needs BACKEND-T001)
- RN bridge multi-card method (needs P3-T001)
- ComboManager consuming backend combos (needs Phase 6)

## Specs touched
- `docs/unity_ar/spec/requirements-baseline.md` (all requirements)
- `docs/unity_ar/spec/architecture-specification.md` (runtime sequence, component map)
- `docs/unity_ar/spec/acceptance-gates.md` (all 20 gates)
- `docs/unity_ar/spec/backend-contract.md` (new fields)
- `docs/unity_ar/spec/bridge-contract.md` (integration gaps)
- `docs/unity_ar/spec/entitlement-gap.md` (confirmed gap)

## Blockers raised
- `blockers/2026-08-09-gltfast-dependency.md` (P0, open)
- `blockers/2026-08-09-arscene-placeholder-guid.md` (P0, open)
- `blockers/2026-08-09-native-ar-backend-missing-fields.md` (P0, open)
- `blockers/2026-08-09-documentation-drift.md` (documentation, open)

## Key architectural conclusions (ground-truth verified)
1. Runtime direction is IMAGE TRACKING, not plane detection
2. GLTFast IS part of current architecture (NOT Addressables)
3. AR Foundation does NOT consume .mind files
4. glb_size ≠ physical_width_m (distinct semantics confirmed)
5. qr_id / ar_tag / reference image / TrackableId are four distinct identity layers
6. Multi-card association is NOT based on detection order (per MultiCardRegistry + ComboManager)
7. Gamification: Unity event → RN authenticated backend (confirmed gap)
8. Private-card entitlement is NOT implemented (confirmed gap)
9. Legacy MindAR path must remain until native AR feature parity
10. ARSessionManager regression (bug #9) is RESOLVED

## Recommended next executable task
`docs/unity_ar/tasks/2026-08-09-p0-t001-verify-gltfast-resolvable.md`

Evidence: P0 is the first gate. GLTFast must be compile-verified before any Unity AR feature work begins. This task only requires opening the Unity Editor and running EditMode tests — no AR hardware, no backend changes, no multi-card wiring.

## Recommended next blocker's next steps
For `blockers/2026-08-09-native-ar-backend-missing-fields.md`: determine if `image_2d_url` is suitable as `reference_image_url` for AR tracking. This decision unblocks BACKEND-T001.
