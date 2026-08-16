## Status
**Active** — As of 2026-08-15

### Phase completion summary

| Phase | Title | Status |
|-------|-------|--------|
| P0 | Stabilization | ✅ Complete |
| P1 | XR Simulation | ✅ Complete |
| P2 | Backend Native AR Contract | ⚠️ Partial — see below |
| P3 | Runtime Reference-Image Library | ⚠️ Partial — see below |
| P4 | Multi-Card Registry Wiring | ⚠️ Partial — see below |
| P5 | Combo Refinement | ⚠️ Partial — blocked on P4 wiring, now resolved |
| P6–P11 | Backend combo, animation, game mode, Android, iOS, cutover | Not started |

## Target spec
- `docs/unity_ar/spec/requirements-baseline.md`
- `docs/unity_ar/spec/architecture-specification.md`
- `docs/unity_ar/spec/acceptance-gates.md`
- `docs/unity_ar/spec/mobile-ar-product-spec.md` (React Native mobile product spec)
- `docs/unity_ar/spec/mobile-feature-parity-matrix.md` (feature parity matrix)

---

## Orchestration Overview

This plan governs **Unity engine and AR Foundation** migration.

The companion plan `docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md` governs **React Native mobile product behavior**.

Both plans are coordinated via this master plan's milestones. No mobile phase may declare a Unity feature verified until the corresponding Unity phase gate is verified.

**Key coordination gates:**
- Unity P3 (runtime image library) → Mobile M4 (permissions UX), M5 (tracking guidance)
- Unity P4 (multi-card) → Mobile M6 (multi-card UX)
- Unity P5 (combo) → Mobile M7 (gamification), M8 (lifecycle)
- Unity P9 (Android) → Mobile M10 (Android E2E)
- Unity P10 (iOS) → Mobile M11 (iOS E2E)
- Unity P11 (cutover readiness) + Mobile M12 (routing cutover) → Legacy MindAR retired

See cross-system dependency table at bottom.

---

## Overview

The Unity / AR Foundation migration replaces the MindAR/WebView AR path with native Unity AR using ARCore (Android) and ARKit (iOS). The migration is phased, gated by verification evidence, and preserves the legacy MindAR path until native AR reaches explicit feature parity.

---

## Phase Summary

| Phase | Title | Gates | Blocked by |
|-------|-------|-------|------------|
| P0 | Stabilization & baseline | AC-BUILD-001 ✅, AC-BUILD-002 ✅ | COMPLETE (2026-08-14) |
| P1 | Editor AR baseline (XR Simulation) | AC-TRACK-001, AC-MULTI-001 | P0 |
| P2 | Backend native AR contract | AC-BRIDGE-002 | READY — schema fields exist in PostgreSQL; populate reference_image_url from existing storage (16/24 confirmed) |
| P3 | Runtime reference-image library | AC-TRACK-003, AC-BRIDGE-003 | P1, P2 |
| P4 | Multi-card registry wiring | AC-MULTI-001, AC-MULTI-002 | P3 |
| P5 | ComboInteractionEngine refinement | AC-COMBO-001, AC-COMBO-002 | P4 |
| P6 | Semantic Combo Resolution | AC-COMBO-003 | P5 |
| P6A | Hardcoded Combo Table Retirement | — (test verification) | P6 |
| P7 | Animation / content behavior | AC-GLB-002, AC-GLB-003 | P4 |
| P8 | Gamification Bridge | AC-GAME-001 | P5 |
| TBD | In-AR Game Mode | AC-GAME-002, AC-GAME-003 | P8 (future) |
| P9 | Android / ARCore device validation | AC-ANDROID-001, AC-ANDROID-002 | P6, P7, TBD |
| P10 | iOS / ARKit device validation | AC-IOS-001 | P9 |
| P11 | Unity Cutover Readiness | AC-* gates verified | P9, P10 |

---

## PHASE 0 — Stabilization & Baseline

### Goal
Establish a clean, compilable Unity baseline with all dependencies resolved. Verify EditMode tests pass. Identify and resolve blockers before any AR feature work.

### Prerequisites
None.

### Scope
- Verify `com.unity.cloud.gltfast` is resolvable in `packages-lock.json`
- Verify `GLTFast.GltfImport` resolves in `GLBLoader.cs` (compile check)
- Repair `ARScene.unity` PLACEHOLDER_GUID component reference
- Run all 5 EditMode tests: `MultiCardRegistryTests`, `ComboDefinitionTests`, `ARSessionManagerRegressionTests`, `ModelSpawnerRegressionTests`, `CardDescriptorTests`
- Verify `ARTestHarness` loads in Play mode without errors

### Out of Scope
- Runtime image library
- Multi-card integration
- Backend changes
- Physical device testing

### Deliverables
- All EditMode tests passing
- ARScene playable (no broken script references)
- GLTFast dependency verified
- Compilation clean (0 errors)

### Dependencies
None.

### Acceptance Gate
**AC-BUILD-001** + **AC-BUILD-002** — all EditMode tests pass; compilation clean.

### Risks
- GLTFast embedded package may not resolve in headless build environments
- ARScene PLACEHOLDER_GUID may reference a deleted script

### What MUST NOT happen early
Do not wire multi-card routing before Phase P3. Do not add backend contract changes before Phase P2.

---

## PHASE 1 — Editor AR Baseline (XR Simulation)

### Goal
Verify the runtime image tracking architecture works in XR Simulation. Prove card identity association and multi-card coexistence without physical hardware.

### Prerequisites
Phase 0 complete (AC-BUILD-001 ✓).

### Scope
- Run `RuntimeImageTrackingPOC` scene in Play mode (Editor XR Simulation)
- Verify `MutableRuntimeReferenceImageLibrary` creation succeeds
- Verify `ScheduleAddImageWithValidationJob` completes without ErrorInvalidImage
- Run `ComboEditorPlayTest` in Play mode
- Verify: both cards spawn; proximity triggers combo after dwell time
- Verify: card identity (qrId) is stable across register/unregister cycles
- Verify: hiding one card does not destroy the other

### Out of Scope
- Backend integration
- Physical device testing
- RN bridge multi-card method

### Deliverables
- XR Simulation confirms runtime image library construction
- `ComboEditorPlayTest` confirms proximity logic + combo firing
- `MultiCardRegistry` proves per-card identity

### Dependencies
Phase 0.

### Acceptance Gate
**AC-TRACK-001** (runtime library), **AC-MULTI-001** (multi-card coexistence), **AC-MULTI-002** (identity stability).

### Risks
- XR Simulation may not fully exercise `ScheduleAddImageWithValidationJob` async paths
- Physical tracking quality cannot be inferred from XR Simulation

### What MUST NOT happen early
Do not test ARCore/ARKit-specific behavior (mutable library support varies by provider).

---

## PHASE 2 — Backend Native AR Contract

### Goal
Add the missing native AR fields to the backend: `reference_image_url` and `physical_width_m`. Create the backend migration path for existing ar_objects.

### Prerequisites
- Native AR backend field schema approved (see `docs/unity_ar/spec/backend-contract.md`)
- Decision: reference image = existing `image_2d_url` or separate field?

### Scope
- Verify `reference_image_url` and `physical_width_m` columns exist in `ar_tracking_targets` PostgreSQL table ✅ (existed from prior session)
- Verify `ARExperienceResponseSchema` includes both fields ✅
- Populate `reference_image_url` for cards with existing storage images (16 confirmed; 5 unconfirmed; 3 none) ✅ (SQL written: `populate_reference_images.sql`)
- Leave `physical_width_m` as NULL (Unity handles null width via unknown-size registration)
- Unity `ARPayloadMapper` + `CardTrackingRequest` DTO already support multi-card ✅
- ZXing QR scanner inside ARScene ✅ (`QRScanner.cs`)
- `onQrDecoded` bridge event ✅ (wired to `HandleQrDecoded` in `ARExperienceHandler`)
- Wire ComboManager ↔ ARExperienceHandler for proximity detection ✅ (P4 gap fixed)

### Out of Scope
- Physical card width measurement (BLOCKED_ON_FINAL_CONTENT)
- Final production reference image artwork (separate content team task)
- Unity GLTFast redesign, combo redesign, game mode

### Deliverables
- Backend: `reference_image_url` populated for 16+ cards — SQL written, pending execution
- Backend: `physical_width_m` remains NULL (nullable contract preserved)
- Unity: `ARExperiencePayloadDto` + `ARPayloadMapper` updated for multi-card native AR ✅
- Unity: QR scanner inside ARScene with `onQrDecoded` event ✅
- Unity: ComboManager proximity detection wired into ARExperienceHandler ✅

### Dependencies
None — schema is READY.

### Acceptance Gate
**AC-BACKEND-001** (native AR fields in backend schema) + **AC-BACKEND-002** (reference_image_url populated for development batch).

### Risks
- 5 cards have unconfirmed reference images (needs product verification)
- 3 cards have no existing image (dog123, britishshorthair001, combo target)
- `physical_width_m` not populated (development uses null-width registration path)

### What MUST NOT happen early
Do not use placeholder widths. Do not overwrite production `physical_width_m` without authoritative measurements.

---

## PHASE 3 — Runtime Reference-Image Library

### Goal
Wire `CardImageLibraryBuilder` into the AR session startup. Prove that Unity downloads reference images and builds a mutable library from backend-supplied card descriptors.

### Prerequisites
Phase 1 (AC-TRACK-001 ✓) + Phase 2 (new fields available).

### Scope
- Add `CardImageLibraryBuilder` reference to `ARExperienceHandler` ✅
- Create new RN → Unity method: `startImageTracking` with list of `CardDescriptor` ✅ (`startImageTrackingMulti`)
- `RNMessageReceiver` routes to `CardImageLibraryBuilder.BuildLibrary(cards)` ✅
- Reference images downloaded from `imageUrl` field ✅
- Library built via `MutableRuntimeReferenceImageLibrary` ✅
- `ARTrackedImageManager` enabled after library ready ✅
- `OnLibraryReady` fires `RNEventEmitter.onArReady` ✅
- Wire QRScanner `OnQrDecoded` → `HandleQrDecoded` ✅

### Out of Scope
- Multi-card model loading (Phase 4)
- Backend combo consumption (Phase 6)
- Physical device testing

### Deliverables
- `CardImageLibraryBuilder` wired into `ARExperienceHandler`
- New `startImageTracking` bridge method
- Runtime library built from N reference images
- AR subsystem tracking physical cards in Editor

### Dependencies
Phase 1 + Phase 2.

### Acceptance Gate
**AC-TRACK-003** (library build), **AC-BRIDGE-003** (multi-card bridge method).

### Risks
- `supportsMutableLibrary` may be false on some AR providers
- Reference image download may fail on poor networks

### What MUST NOT happen early
Do not skip the graceful failure path for download failures.

---

## PHASE 4 — Multi-Card Registry Wiring

### Goal
Complete the multi-card flow: N registered cards, each spawning its own model, each tracked independently.

### Prerequisites
Phase 3 (AC-TRACK-003 ✓).

### Scope
- `MultiCardRegistry` pre-registers N cards from RN payload ✅
- `HandleTrackedImageAdded` looks up `qrId` via `MultiCardRegistry.GetPayload(existingQrId)` ✅
- `GLBLoader.LoadGLB()` called per-card with correct `ModelUrl` ✅
- `ModelSpawner.Spawn()` with `id=qrId` (per-card model registry) ✅
- `ModelSpawner` per-id dictionary ensures models coexist ✅
- Each `ARTrackedImage` maps `referenceImage.name` → `qrId` → payload → model ✅
- `ComboManager.RegisterTrackedImage` called after each model spawn ✅ (critical P5 unblock)
- `ComboManager.UnregisterTrackedImage` called on removal ✅

### Out of Scope
- Combo logic (Phase 5)
- Backend combo consumption (Phase 6)
- Animation per-card (Phase 7)

### Deliverables
- Two simultaneous cards: both models active
- Losing one card: model remains in registry
- Regaining card: same `qrId` resolves correctly

### Dependencies
Phase 3.

### Acceptance Gate
**AC-MULTI-001** (coexistence), **AC-MULTI-002** (identity stability).

### Risks
- `HandleImageDetected` currently processes single payload; needs multi-card routing
- `ModelSpawner` has a dual-mode API (with/without `id`); misuse could cause regressions

### What MUST NOT happen early
Do not remove the single-card code path until multi-card is verified.

---

## PHASE 5 — ComboInteractionEngine Refinement

### Goal
Refine `ComboManager` proximity logic. Add hysteresis (exit threshold ≠ enter threshold). Verify clean removal of cards involved in combos.

### Prerequisites
Phase 4 (AC-MULTI-001 ✓).

### Scope
- Verify `ComboManager` uses per-card `NearStartTime` tracking ✅
- Confirm pairwise distance loop processes all card pairs ✅
- Verify `proximityThreshold` is a design-placeholder value (needs physical testing) — placeholder confirmed
- Verify `proximityHoldTime` dwell timing ✅ (1.0s hardcoded)
- Test: remove card B while combo is pending; verify clean cleanup ✅ (`ComboManager.UnregisterTrackedImage` removes from `_trackedImages`)
- Test: combo fires exactly once per approach (not every frame) ✅ (`_pendingCombos` dedup guard)
- Physical proximity threshold calibration (not testable in Editor XR Simulation)

### Out of Scope
- Backend combo consumption (Phase 6)
- Visual feedback for proximity (Phase 8)

### Deliverables
- `ComboManager` proximity detection verified in XR Simulation
- Per-card proximity state tracked cleanly
- Card removal from combo tracked images is clean

### Dependencies
Phase 4.

### Acceptance Gate
**AC-COMBO-001** (proximity + dwell), **AC-COMBO-002** (clean removal).

### Risks
- Proximity threshold values are placeholders; will need physical adjustment
- Dwell timing may cause false triggers on slow card movements

---

## PHASE 6 — Semantic Combo Resolution

### Goal
Replace `ComboManager`'s hardcoded qrId-pair lookup with dynamic backend combo definitions using semantic arTag → required_tags → comboId resolution.

### Prerequisites
Phase 5 (AC-COMBO-002 ✓).

### Scope
- RN sends `related_combos` data to Unity (as part of AR experience payload or separate call)
- `ComboManager` resolves `required_tags` (list of `arTag` values) against currently registered cards
- Backend `comboId`, `bonus_xp`, `semantic_result` used for combo trigger and reward
- Semantic combo matching: arTag → MultiCardRegistry → qrId for each participant
- The **hardcoded table remains active as fallback** during this phase (see Phase 6A for removal)

**Key distinction:** The target combo resolution uses `arTag` (semantic identity from backend `related_combos`), NOT hardcoded `qrId` pairs.

### Out of Scope
- Hardcoded table removal (Phase 6A)
- Combo animation from backend data (Phase 7)
- Visual feedback (Phase 8)
- In-AR Game Mode (future phase)

### Deliverables
- Backend combo definitions trigger correctly via semantic arTag matching
- `related_combos` consumed from AR experience payload
- No hardcoded pairs needed for tested combos

### Dependencies
Phase 5.

### Acceptance Gate
**AC-COMBO-003** (semantic combo resolution).

### CURRENT vs TARGET state
**Current:** `_comboTable[("flashcard_chicken", "flashcard_egg")]` hardcoded in `InitComboTable()`.
**Target:** `required_tags` from `related_combos` matched against `arTag` from registered payloads.

---

## PHASE 6A — Hardcoded Combo Table Retirement

### Goal
Remove the hardcoded `_comboTable` from `ComboManager` after dynamic backend combo consumption is verified.

### Prerequisites
Phase 6 (AC-COMBO-003 ✓) verified.

### Scope
- Remove `InitComboTable()` hardcoded table from `ComboManager`
- Remove `_comboTable` dictionary
- Remove `ComboDefinition` hardcoded fields that only the hardcoded table populated
- Verify combo still fires via semantic matching only

### Out of Scope
- New combo functionality (covered by P6)
- In-AR Game Mode (future phase)

### Deliverables
- `_comboTable` removed from `ComboManager`
- All tested combos use only backend-provided `related_combos`
- No regression in combo behavior

### Dependencies
Phase 6.

### Acceptance Gate
Hardcoded table removal verified by test suite (all combos still fire via semantic matching).

---

## PHASE 7 — Animation / Content Behavior

### Goal
Verify per-card animation plays correctly. Verify combo reward animation loads from backend `model_3d_url` (or continues with primitive fallback).

### Prerequisites
Phase 4 (AC-MULTI-001 ✓).

### Scope
- Per-card `AnimationController` plays `rotate`, `bounce`, `idle` correctly
- Combo reward animation: load `.glb` from backend `model_3d_url` OR use primitive fallback
- Verify combo animation sequence (fly to midpoint, hide originals, spawn reward)
- Verify `ARAudioPlayer` plays audio per-card

### Out of Scope
- Physical device testing
- Complex animation timelines

### Deliverables
- Animation plays on model load
- Combo animation sequence fires

### Dependencies
Phase 4.

### Acceptance Gate
**AC-GLB-002** (model transform), **AC-GLB-003** (animation).

---

## PHASE 8 — Gamification Bridge

### Goal
Verify Unity → RN → Backend gamification flow. Unity emits combo event; RN calls authenticated backend mutation.

### Prerequisites
Phase 6 (AC-COMBO-003 ✓).

### Scope
- `RNEventEmitter.onComboComplete` fires with `rewardCardId` and `xpAwarded`
- RN `useARSession` hook subscribes and calls `POST /gamification/add-xp`
- Backend validates and applies XP
- Unity never calls backend directly
- Unity → RN → Backend game result boundary is reserved for future Game Mode (AC-GAME-002/003)

### Out of Scope
- XP display in Unity (RN handles UI)
- XP history / progress tracking
- In-AR Game Mode (future phase TBD)

### Deliverables
- XP awarded on combo trigger
- Unity event fires; backend mutation succeeds
- Game result event boundary documented

### Dependencies
Phase 6.

### Acceptance Gate
**AC-GAME-001** (gamification ownership).

---

## PHASE TBD — In-AR Game Mode Foundation

### Goal
Establish the In-AR Game Mode architecture: Game button, GAME_ACTIVE state, game canvas/3D root, and semantic game result events. Game Mode operates while AR camera remains active.

### Prerequisites
Phase 8 (AC-GAME-001 ✓). Not a prerequisite for AR camera verification.

### Scope
- Add `GameModeManager` component to Unity
- AR HUD Game button triggers `GameModeManager.EnterGame()`
- Game canvas / 3D game root activates
- AR camera remains active, ARSession alive, tracking continues
- `GameModeManager.ExitGame()` restores AR_SCAN state
- Semantic game events emitted to RN (exact event names TBD)
- RN receives game result and calls authenticated backend mutation

**Game Mode does NOT require:**
- Destroying ARSession, XROrigin, ARCameraManager
- Unmounting UnityView
- Navigating RN to another screen
- Loading a separate scene

### Out of Scope
- Specific game types (Canvas UI, 3D minigame, AR-space gameplay) — future design
- Game-specific gameplay implementation
- Combo → game launch orchestration (future)

### Deliverables
- Game button on AR HUD
- GAME_ACTIVE ↔ AR_SCAN state transition
- Game canvas/3D root activates/deactivates
- AR camera remains visible during game
- Semantic game events emitted to RN

### Dependencies
Phase 8.

### Acceptance Gate
**AC-GAME-002** (game button → GAME_ACTIVE), **AC-GAME-003** (game lifecycle / AR camera persistence).

### Future Tasks
This phase will decompose into at least:
- Dynamic combo definition ingestion
- Semantic combo matching (arTag → required_tags → comboId)
- Hardcoded combo table retirement
- In-AR Game Mode foundation
- Game lifecycle (enter/exit/completion/AR_SCAN restoration)
- Game result events (Unity → RN)
- RN/backend reward integration

---

## PHASE 9 — Android / ARCore Device Validation

### Goal
Verify native AR works on physical Android device with ARCore.

### Prerequisites
Phase 6 + Phase 7 + Phase 8. In-AR Game Mode (TBD) is NOT a prerequisite.

### Scope
- Build APK with ARCore support
- Install on ARCore-certified Android device
- Point camera at printed flashcard
- Verify model spawns, tracks, and animates
- Verify `MutableRuntimeReferenceImageLibrary` supported on ARCore
- Verify multi-card coexistence on physical device
- Verify combo triggers on physical device

### Out of Scope
- iOS testing
- Performance benchmarking
- Legacy cutover

### Deliverables
- APK builds successfully
- AR features work on physical Android device
- All Editor/XR_SIMULATION-verified behaviors confirmed on physical device

### Dependencies
Phase 6 + Phase 7 + Phase 8.

### Acceptance Gate
**AC-ANDROID-001** (model spawn + track + animate), **AC-ANDROID-002** (mutable library on ARCore).

---

## PHASE 10 — iOS / ARKit Device Validation

### Goal
Verify native AR works on physical iOS device with ARKit.

### Prerequisites
Phase 9.

### Scope
- Build Xcode project with ARKit support
- Install on ARKit device
- Repeat Android test scenarios on iOS

### Out of Scope
- Legacy cutover
- In-AR Game Mode (future phase TBD)

### Deliverables
- App builds for iOS
- AR features work on physical iOS device

### Dependencies
Phase 9.

### Acceptance Gate
**AC-IOS-001** (model spawn + track + animate on iOS).

---

## PHASE 11 — Unity Cutover Readiness

### Goal
Verify Unity subsystem is ready for mobile cutover. Prove Unity AR is production-ready for all supported device targets.

### Prerequisites
Phase 9 + Phase 10 (all acceptance gates verified). In-AR Game Mode (TBD) is NOT a prerequisite for cutover.

### Scope
- All Unity acceptance gates verified: AC-BUILD-001/002, AC-TRACK-001/002/003, AC-MULTI-001/002, AC-GLB-001/002/003, AC-BRIDGE-001/002/003, AC-COMBO-001/002/003, AC-GAME-001/002/003, AC-ANDROID-001/002, AC-IOS-001
- Unity production readiness confirmed for Android and iOS
- MindAR .mind files and WebView AR code remain in codebase (Legacy REMOVE_LATER)
- Legacy fields (`nft_base_url`, `mind_catalog_id`, `mind_target_index`) remain in backend
- Unity subsystem handed off to Mobile for routing cutover
- In-AR Game Mode (TBD) remains a future phase — does not block cutover

### Out of Scope
- Deleting MindAR files (out of scope for MVP)
- Removing legacy backend fields
- In-AR Game Mode implementation

### Deliverables
- All Unity acceptance gates confirmed green
- Unity production readiness checklist signed off
- Unity subsystem handed off to Mobile for routing cutover
- MindAR path preserved (owned by Mobile M12)

### Dependencies
Phase 9 + Phase 10.

### Acceptance Gate
- All Unity acceptance gates verified (AC-BUILD-001/002, AC-TRACK-001/002/003, AC-MULTI-001/002, AC-GLB-001/002/003, AC-BRIDGE-001/002/003, AC-COMBO-001/002/003, AC-GAME-001/002/003, AC-ANDROID-001/002, AC-IOS-001)
- Unity production readiness confirmed
- **Note:** RN routing cutover (Unity AR as default, MindAR behind feature flag) is owned by Mobile M12, not by this phase. This phase's acceptance gate is Unity subsystem readiness only.

---

## Dependency Order (Simplified)

```
P0 (stabilization)
    ↓
P1 (XR sim baseline)
    ↓
BACKEND-T001 → P2 (native AR backend fields)
    ↓
P3 (runtime image library)
    ↓
P4 (multi-card wiring)
    ↓
P5 (combo refinement)
    ↓
P6 (semantic combo resolution)
    ↓
P6A (hardcoded table retirement)   ← depends on P6
    │
P7 (animation)              ←→ P8 (gamification)  ← P6
    │
TBD (In-AR Game Mode)       ← P8 (future, non-blocking)
    │
P9 (Android device)
    ↓
P10 (iOS device)
    ↓
P11 (Unity cutover readiness — routing owned by Mobile M12)
```

**Note:** In-AR Game Mode (TBD) does NOT block any other phase. AR camera verification is independent of game mode.

---

## Cross-System Dependencies (Unity ↔ Mobile)

Unity phases provide gates that unblock mobile phases. Mobile must not E2E-verify a feature before its Unity gate is confirmed.

| Unity Phase Gate | Mobile Phase(s) Unblocked |
|-----------------|--------------------------|
| P0 (stabilization) | M2 (host shell) |
| P1 (XR sim) | M1 (contract), M3 (experience load), M4 (permissions UX) |
| P2 (backend native AR fields) | M3 (experience load with native AR data) |
| P3 (runtime image library) | M4 (AR_READY), M5 (tracking guidance) |
| P4 (multi-card) | M6 (multi-card UX) |
| P5 (combo refinement) | M7 (gamification), M8 (lifecycle) |
| P6 (semantic combo resolution) | M6 (combo UX) — backend combo definitions from `related_combos` needed before combo UX can be fully functional |
| P6A (hardcoded table retirement) | — (Unity internal) |
| P7 (animation) | M9 (error/recovery) |
| P8 (gamification) | M7 (gamification UX) |
| TBD (In-AR Game Mode) | TBD (future) — Game Mode is Unity-owned; RN owns navigation/backend only |
| P9 (Android) | M10 (Android E2E) |
| P10 (iOS) | M11 (iOS E2E) |
| P11 (cutover readiness) | M12 (routing cutover — Unity ready, Mobile owns routing) |

**Mobile MUST NOT claim E2E verification for any feature until its Unity gate is confirmed.**
**Game Mode is Unity-owned presentation. RN owns navigation and backend mutation only.**

---

## Risks

| Risk | Phase | Impact | Mitigation |
|------|-------|--------|------------|
| GLTFast not resolvable in CI/headless | P0 | High | Verify P0 before Phase 3 |
| ARCore does not support MutableRuntimeReferenceImageLibrary | P3 | High | Check `supportsMutableLibrary` before assuming; degrade gracefully |
| Reference images unsuitable for AR tracking (low feature points) | P3 | High | Use high-quality reference images; validate with `AddReferenceImageJob` status |
| Physical proximity thresholds wrong | P5 | Medium | Use design placeholders; adjust after physical testing |
| Backend migration of existing ar_objects is slow/manual | P2 | Medium | Automate where possible; batch process |
| Physical device testing reveals unexpected tracking issues | P9 | Medium | Reserve buffer time for P9/P10; don't compress schedule |
| Semantic combo resolution conflates arTag with qrId | P6 | High | Enforce arTag → required_tags → comboId path; test with multi-arTag combos |
| Game Mode conflates with Combo Mode | TBD | Medium | Keep ComboManager and GameModeManager distinct; ComboManager does NOT own game state |
| Game Mode destroys ARSession instead of overlaying | TBD | High | Phase TBD scope explicitly forbids ARSession destruction; verify in acceptance tests |
| RN/backend mutation not wired for game results | TBD | Medium | Reserve semantic events in bridge contract early; do not add events without RN wiring |

---

## What MUST NOT Happen Early

1. **Never wire multi-card before P3** — doing so creates integration debt and invalidates XR Simulation evidence.
2. **Never remove legacy MindAR before P11 + M12 cutover** — LEGACY-REQ-001 is inviolable until feature parity is verified and Mobile M12 completes routing cutover. Note: routing cutover (RN default → Unity AR) is owned by Mobile M12, not by Unity P11.
3. **Never deploy backend migration before P2 acceptance** — `reference_image_url` and `physical_width_m` must be populated before Unity consumes them.
4. **Never add Unity → Backend HTTP calls** — gamification ownership is RN → backend only.
5. **Never substitute GLTFast with Addressables** — CONTENT-REQ-002 is the approved architecture.
6. **Never expand AR camera verification to include Game Mode** — In-AR Game Mode (TBD) is a future phase, not a prerequisite for AR camera verification. P9 gates remain achievable without Game Mode.
7. **Never let Game Mode replace ARScene** — Game Mode operates inside ARScene, not instead of it. Entering GAME_ACTIVE must not destroy ARSession, XROrigin, or ARCameraManager.

---

## Open questions

| # | Question | Blocks phase | Answer needed from |
|---|----------|-------------|-------------------|
| OQ-1 | What is the exact schema for `reference_image_url` and `physical_width_m`? | P2 | Backend architect |
| OQ-2 | Who measures the physical widths of existing flashcards? | P2 | Product / content team — nullable width confirmed; measurements needed before production |
| OQ-3 | Are reference images the same as `image_2d_url` or separate? | P2 | Content / design |
| OQ-4 | What are the physically measured proximity thresholds? | P5 | Physical testing |
| OQ-5 | Should `startImageTracking` be replaced or added as parallel method? | P3 | **Resolved** — `startImageTrackingMulti` added as new method per bridge-contract.md |
| OQ-6 | Does In-AR Game Mode launch from a combo trigger, standalone button, or both? | TBD | Product |
| OQ-7 | What game types are supported (Canvas UI, 3D minigame, AR-space gameplay)? | TBD | Product / design |
| OQ-8 | Does game completion award XP/rewards via which Unity → RN → Backend path? | TBD | Product |
