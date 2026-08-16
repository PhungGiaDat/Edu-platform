## Status
draft

## Goal
Lock in system-level acceptance gates that verify the native AR migration against its requirements.

---

## Acceptance ID Conventions

| Prefix | Domain |
|--------|--------|
| `AC-BUILD` | Build / compile / package integrity |
| `AC-BACKEND` | Backend native AR schema |
| `AC-TRACK` | Image tracking |
| `AC-MULTI` | Multi-card |
| `AC-GLB` | Model loading |
| `AC-BRIDGE` | RN ↔ Unity bridge |
| `AC-COMBO` | Combo interaction |
| `AC-GAME` | Gamification |
| `AC-SEC` | Security / entitlement |
| `AC-ANDROID` | Android device |
| `AC-IOS` | iOS device |

---

## AC-BUILD — Build Integrity

### AC-BUILD-001
- **Linked requirement:** `AR-REQ-003`, `AR-REQ-004`
- **Environment:** EDITOR
- **Procedure:** Open Unity project, resolve all package dependencies, compile all assemblies
- **Expected evidence:** 0 compile errors, all 18 scripts present
- **Pass condition:** `Assets/Scripts/**/*.cs` + `Assets/Models/**/*.cs` + `Assets/Bridge/**/*.cs` + `Assets/AR/**/*.cs` + `Assets/Interactions/**/*.cs` compile without errors
- **Current status:** BLOCKED — `com.unity.cloud.gltfast` embedded package must be verified resolvable; `ARScene.unity` has PLACEHOLDER_GUID component reference

### AC-BUILD-002
- **Linked requirement:** `CONTENT-REQ-003`
- **Environment:** EDITOR
- **Procedure:** Inspect `Packages/manifest.json`, verify `com.unity.cloud.gltfast` is listed and resolved in `packages-lock.json`
- **Expected evidence:** `GLTFast.GltfImport` resolves without compile errors in `Assets/Models/GLBLoader.cs`
- **Pass condition:** `using GLTFast;` compiles and `GltfImport` is accessible
- **Current status:** NOT VERIFIED — GLTFast 6.x embedded; needs compile verification

---

## AC-BACKEND — Backend Native AR Schema

### AC-BACKEND-001
- **Linked requirement:** `BACKEND-REQ-003`, `TRACK-REQ-002`, `TRACK-REQ-003`
- **Environment:** BACKEND_TEST
- **Procedure:** Verify `backend/models/ar_object.py` contains `reference_image_url: Optional[str]` and `physical_width_m: Optional[float]`. Verify schemas (`ARObjectCreate`, `ARObjectUpdate`, `ARObjectResponse`) include both fields. Run backend tests.
- **Expected evidence:** Both fields present in document model, all schemas, and response serialization. Backend tests pass.
- **Pass condition:** Backend native AR fields exist, serialize correctly, and do not break existing MindAR payload shape.
- **Current status:** NOT VERIFIED — blocked by `docs/unity_ar/blockers/2026-08-09-native-ar-backend-missing-fields.md`

### AC-BACKEND-002
- **Linked requirement:** `BACKEND-REQ-003`
- **Environment:** BACKEND_TEST
- **Procedure:** Run migration script for existing ar_objects. Verify `reference_image_url` and `physical_width_m` are populated or nullable for all existing records.
- **Expected evidence:** All existing ar_objects have the new fields (populated or explicitly null). No backend crash on existing MindAR payloads.
- **Pass condition:** Migration populates new fields; legacy MindAR fields (`nft_base_url`, `mind_catalog_id`, `mind_target_index`) remain compatible.
- **Current status:** NOT VERIFIED — depends on AC-BACKEND-001

---

**Note:** AC-BACKEND gates are **not** the same as AC-BRIDGE gates. AC-BRIDGE-002 verifies the bridge payload shape (`CardDescriptor` fields). AC-BACKEND-001 verifies the backend database schema and response serialization. Bridge parsing is downstream from the backend gate.

## AC-TRACK — Image Tracking

### AC-TRACK-001
- **Linked requirement:** `TRACK-REQ-001`, `TRACK-REQ-010`
- **Environment:** XR_SIMULATION (Editor Play mode with mock image detector)
- **Procedure:** Run `RuntimeImageTrackingPOC` scene; verify `MutableRuntimeReferenceImageLibrary` is created and `ScheduleAddImageWithValidationJob` succeeds
- **Expected evidence:** `OnGUI` shows "READY. Point the camera at the printed image."; Console shows no errors
- **Pass condition:** Library built, manager enabled, no exception thrown
- **Current status:** NOT VERIFIED — runtime AR subsystem not available in mock

### AC-TRACK-002
- **Linked requirement:** `TRACK-REQ-004`, `TRACK-REQ-006`, `TRACK-REQ-007`, `TRACK-REQ-008`
- **Environment:** XR_SIMULATION
- **Procedure:** Use `EditorMockImageDetector` or `ComboEditorPlayTest` to fire `added` event for card "A" then card "B"; verify each maps to correct `qrId`
- **Expected evidence:** `OnImageDetected` fires per card with correct `qrId`; `MultiCardRegistry` has 2 entries
- **Pass condition:** Detection order does not affect identity mapping
- **Current status:** NOT VERIFIED

### AC-TRACK-003
- **Linked requirement:** `TRACK-REQ-009`
- **Environment:** EDITOR (mock) or ANDROID_DEVICE
- **Procedure:** Call `CardImageLibraryBuilder.BuildLibrary(cards)` with N reference image URLs; verify all download and are added to mutable library
- **Expected evidence:** All N images in library; no `ErrorInvalidImage` or `ErrorUnknown` job failures (or failures logged and skipped gracefully)
- **Pass condition:** Library has ≥ 1 image; graceful handling of download failures
- **Current status:** NOT VERIFIED

---

## AC-MULTI — Multi-Card

### AC-MULTI-001
- **Linked requirement:** `TRACK-REQ-005`, `TRACK-REQ-006`, `TRACK-REQ-007`
- **Environment:** XR_SIMULATION (`ComboEditorPlayTest`)
- **Procedure:** `ComboEditorPlayTest`: SPACE to spawn both cards; verify both `GameObject` models exist simultaneously in scene
- **Expected evidence:** `MultiCardRegistry.Count == 2`; both models active; `OnMultiImageDetected` fires
- **Pass condition:** Two models coexist; hiding one does not destroy the other
- **Current status:** PARTIAL — `MultiCardRegistryTests` passes; `ComboEditorPlayTest` exists but not run in CI

### AC-MULTI-002
- **Linked requirement:** `TRACK-REQ-008`
- **Environment:** XR_SIMULATION
- **Procedure:** Detect card "A" → lose tracking → regain tracking; verify same `qrId` resolves to same model semantics
- **Expected evidence:** Second detection of "A" restores same identity (same `qrId` in registry); no duplicate registration
- **Pass condition:** Identity stable across track / untrack / retrack cycle
- **Current status:** NOT VERIFIED

---

## AC-GLB — Model Loading

### AC-GLB-001
- **Linked requirement:** `CONTENT-REQ-001`, `CONTENT-REQ-002`, `CONTENT-REQ-004`
- **Environment:** EDITOR (Play mode) or ANDROID_DEVICE
- **Procedure:** Send `loadARExperience` with a valid `modelUrl` pointing to a real `.glb`; wait for `onModelLoaded` event
- **Expected evidence:** `RNEventEmitter` fires `onModelLoaded` with matching `modelUrl`; model GameObject exists in scene
- **Pass condition:** GLB loads and instantiates without crash; correct event fires
- **Current status:** NOT VERIFIED — needs real network and GLTFast runtime

### AC-GLB-002
- **Linked requirement:** `CONTENT-REQ-005`
- **Environment:** EDITOR
- **Procedure:** Load a `.glb` with known transform values; verify spawned model has correct position, rotation, scale
- **Expected evidence:** `ModelSpawner.Spawn()` called with correct parameters; transform applied via `Transform.localPosition`, `localRotation`, `localScale`
- **Pass condition:** Model at expected pose
- **Current status:** NOT VERIFIED

### AC-GLB-003
- **Linked requirement:** `CONTENT-REQ-006`
- **Environment:** EDITOR
- **Procedure:** Load model with `animationType = "rotate"`; verify animation plays
- **Expected evidence:** `AnimationController` receives the type; animator component is active
- **Pass condition:** Animation plays without error
- **Current status:** NOT VERIFIED

---

## AC-BRIDGE — RN ↔ Unity Bridge

### AC-BRIDGE-001
- **Linked requirement:** `BRIDGE-REQ-001`, `BRIDGE-REQ-002`, `BRIDGE-REQ-006`
- **Environment:** EDITOR (`ARTestHarness`)
- **Procedure:** Run `ARTestHarness` in Play mode on `ARTestScene`; verify all 5 tests pass (loadARExperience, triggerCombo, setPlaneDetection, imageDetection, lifecycle)
- **Expected evidence:** Console shows "5 pass, 0 fail"; `RNMessageReceiver` switch routes all methods correctly
- **Pass condition:** All harness tests pass; correct event names sent
- **Current status:** EXISTS — harness script written; needs runtime verification

### AC-BRIDGE-002
- **Linked requirement:** `BRIDGE-REQ-004`, `BRIDGE-REQ-005`
- **Environment:** EDITOR
- **Procedure:** Send JSON matching `ARExperiencePayloadDto` shape; verify `ARPayloadMapper.Parse()` produces correct `ARExperiencePayload`
- **Expected evidence:** `CardDescriptor` populated with `qrId`, `imageUrl`, `physicalWidthMeters`; no `FormatException`
- **Pass condition:** Correct parsing; missing fields fall back to defaults
- **Current status:** PARTIAL — `CardDescriptorTests` verifies defaults; parsing integration not tested end-to-end

### AC-BRIDGE-003
- **Linked requirement:** `BRIDGE-REQ-007`
- **Environment:** EDITOR (mock) or ANDROID_DEVICE
- **Procedure:** Call `startImageTracking` with a list of N `CardDescriptor`; verify all N cards register in `MultiCardRegistry`
- **Expected evidence:** N entries in `MultiCardRegistry`; library builder processes all N images
- **Pass condition:** Multi-card list payload handled without crash
- **Current status:** NOT VERIFIED — integration point not wired

---

## AC-COMBO — Combo Interaction

### AC-COMBO-001
- **Linked requirement:** `COMBO-REQ-001`, `COMBO-REQ-002`, `COMBO-REQ-003`, `COMBO-REQ-005`
- **Environment:** XR_SIMULATION (`ComboEditorPlayTest`)
- **Procedure:** SPACE spawns two cards at far distance; C moves them close (below `proximityThreshold`); hold for `proximityHoldTime`
- **Expected evidence:** `OnProximityNear` fires; after hold time, `OnComboComplete` fires with correct `RewardCardId` and `XpReward`
- **Pass condition:** Proximity detection works; dwell timing respected; combo fires exactly once
- **Current status:** EXISTS — `ComboEditorPlayTest` implemented; needs execution to verify

### AC-COMBO-002
- **Linked requirement:** `COMBO-REQ-006`, `COMBO-REQ-007`
- **Environment:** XR_SIMULATION
- **Procedure:** Hide card B (fire `removed` path); verify combo state is cleaned; no exception on next proximity check
- **Expected evidence:** Card B removed from `ComboManager._trackedImages`; no null reference; combo does not fire with partial participants
- **Pass condition:** Clean removal; no crashes
- **Current status:** PARTIAL — `UnregisterTrackedImage` exists; not exercised in test

### AC-COMBO-003
- **Linked requirement:** `COMBO-REQ-009`
- **Environment:** EDITOR
- **Procedure:** Send backend combo payload via `related_combos`; verify `ComboManager` loads from dynamic source (vs. hardcoded)
- **Expected evidence:** Backend-defined combos fire correctly; hardcoded table is replaced or supplemented
- **Pass condition:** Backend combos work; no regression in existing hardcoded behavior
- **Current status:** NOT VERIFIED — backend combo consumption not implemented

---

## AC-GAME — Gamification

### AC-GAME-001
- **Linked requirement:** `GAME-REQ-001`, `GAME-REQ-002`, `GAME-REQ-003`
- **Environment:** EDITOR (mock) or ANDROID_DEVICE
- **Procedure:** Trigger a combo; verify `RNEventEmitter.onComboComplete` fires with correct `xpAwarded`; RN calls `POST /gamification/add-xp` with `action=combo_discovered`
- **Expected evidence:** Backend receives XP mutation; Unity never calls backend directly
- **Pass condition:** Unity event fires; RN backend call succeeds; no Unity-side HTTP calls
- **Current status:** PARTIAL — `RNEventEmitter.onComboComplete` exists; RN backend call not verified

---

## AC-SEC — Security / Entitlement

### AC-SEC-001
- **Linked requirement:** `SEC-REQ-001`, `SEC-REQ-002`
- **Environment:** ANDROID_DEVICE (physical)
- **Procedure:** Attempt to access private flashcard (if entitlement model exists in future) without auth; verify rejection
- **Expected evidence:** `GET /api/v1/flashcard/{qr_id}` returns 403 or empty; model URLs are not accessible without entitlement
- **Pass condition:** No unauthorized access
- **Current status:** NOT IMPLEMENTED — entitlement model does not exist; gap documented

---

## AC-ANDROID — Android Device

### AC-ANDROID-001
- **Linked requirement:** `ANDROID-REQ-001`, `ANDROID-REQ-002`
- **Environment:** ANDROID_DEVICE (physical)
- **Procedure:** Build APK with native AR; install on ARCore-certified device; point camera at known flashcard; verify model spawns
- **Expected evidence:** Model appears anchored to card; `onObjectPlaced` fires; animation plays
- **Pass condition:** Model spawns, tracks, and animates on physical device
- **Current status:** NOT VERIFIED

### AC-ANDROID-002
- **Linked requirement:** `ANDROID-REQ-002`
- **Environment:** ANDROID_DEVICE
- **Procedure:** Build and run; verify `descriptor.supportsMutableLibrary == true` on Android/ARCore
- **Expected evidence:** `CardImageLibraryBuilder` does not emit "does not support MutableRuntimeReferenceImageLibrary" error
- **Pass condition:** Mutable library supported on ARCore
- **Current status:** NOT VERIFIED

---

## AC-IOS — iOS Device

### AC-IOS-001
- **Linked requirement:** `IOS-REQ-001`, `IOS-REQ-002`
- **Environment:** IOS_DEVICE (physical)
- **Procedure:** Build Xcode project with native AR; install on ARKit device; point camera at known flashcard; verify model spawns
- **Expected evidence:** Model appears anchored to card; `onObjectPlaced` fires; animation plays
- **Pass condition:** Model spawns, tracks, and animates on physical iOS device
- **Current status:** NOT VERIFIED

---

## Gate Summary

| Gate ID | Environment | Current Status |
|---------|-------------|----------------|
| AC-BUILD-001 | EDITOR | VERIFIED ✅ (2026-08-14: 262 EditMode tests pass, PLACEHOLDER_GUID resolved) |
| AC-BUILD-002 | EDITOR | VERIFIED ✅ (2026-08-14: GLTFast 6.18.1-pre.1 present, 814 files, compile clean) |
| AC-BACKEND-001 | BACKEND_TEST | NOT VERIFIED (blocked by backend blocker) |
| AC-BACKEND-002 | BACKEND_TEST | NOT VERIFIED (depends on AC-BACKEND-001) |
| AC-TRACK-001 | XR_SIMULATION | PARTIAL — architecture verified (MutableRuntimeReferenceImageLibrary, CardImageLibraryBuilder, ARTrackedImageManager wiring confirmed in code); interactive Play Mode test pending |
| AC-TRACK-002 | XR_SIMULATION | PARTIAL — EditorMockImageDetector + ARSessionManager.HandleTrackedImagesChanged wiring confirmed in code; interactive Play Mode test pending |
| AC-TRACK-003 | EDITOR/ANDROID | NOT VERIFIED |
| AC-MULTI-001 | XR_SIMULATION | PARTIAL (tests pass) |
| AC-MULTI-002 | XR_SIMULATION | NOT VERIFIED |
| AC-GLB-001 | EDITOR/ANDROID | NOT VERIFIED |
| AC-GLB-002 | EDITOR | NOT VERIFIED |
| AC-GLB-003 | EDITOR | NOT VERIFIED |
| AC-BRIDGE-001 | EDITOR | EXISTS, NOT RUN |
| AC-BRIDGE-002 | EDITOR | PARTIAL |
| AC-BRIDGE-003 | EDITOR/ANDROID | NOT VERIFIED |
| AC-COMBO-001 | XR_SIMULATION | EXISTS, NOT RUN |
| AC-COMBO-002 | XR_SIMULATION | PARTIAL |
| AC-COMBO-003 | EDITOR | NOT VERIFIED |
| AC-GAME-001 | EDITOR/ANDROID | PARTIAL |
| AC-SEC-001 | ANDROID | NOT IMPLEMENTED |
| AC-ANDROID-001 | ANDROID_DEVICE | NOT VERIFIED |
| AC-ANDROID-002 | ANDROID_DEVICE | NOT VERIFIED |
| AC-IOS-001 | IOS_DEVICE | NOT VERIFIED |

---

## Mobile Acceptance Gates

Mobile-specific gates (see `docs/unity_ar/spec/mobile-ar-product-spec.md`).

| Gate ID | Environment | Description |
|---------|-----------|-------------|
| MOB-GATE-001 | RN_TEST | AR screen navigates with correct params |
| MOB-GATE-002 | RN_TEST | QR state machine transitions correctly |
| MOB-GATE-003 | RN_TEST | Permission states map to Unity events |
| MOB-GATE-004 | RN_TEST / XR_SIMULATION | AR loading overlay shows all preparation states |
| MOB-GATE-005 | RN_TEST / XR_SIMULATION | Tracking guidance shows for all target states |
| MOB-GATE-006 | RN_TEST / XR_SIMULATION | Multi-card state guidance displays correctly |
| MOB-GATE-007 | RN_TEST / XR_SIMULATION | Combo overlay activates at correct state |
| MOB-GATE-008 | RN_TEST / XR_SIMULATION | `onComboComplete` triggers RN gamification call |
| MOB-GATE-009 | RN_TEST | App lifecycle pause/resume is wired |
| MOB-GATE-010 | RN_TEST | All error codes map to user messages |
| MOB-GATE-011 | RN_TEST | WebAR fallback routing is wired |
| MOB-GATE-012 | ANDROID_DEVICE | Full AR entry E2E on Android |
| MOB-GATE-013 | IOS_DEVICE | Full AR entry E2E on iOS |

---

## Gate Summary

**Unity gate count: 22 acceptance gates (20 Unity + 2 Backend)**
**Mobile gate count: 13 acceptance gates**
**Total gate count: 35 acceptance gates**

| Category | Count |
|---------|-------|
| Unity gates | 20 |
| Backend gates | 2 |
| Mobile gates | 13 |
| **Verified (Unity)** | 2 |
| **Partially verified (Unity)** | 7 |
| **Not verified (Unity)** | 11 |
| **Not implemented (gap, Unity)** | 1 |
| **Not verified (Backend)** | 2 |
| **Verified (Mobile)** | 0 |
| **Not verified (Mobile)** | 13 |
