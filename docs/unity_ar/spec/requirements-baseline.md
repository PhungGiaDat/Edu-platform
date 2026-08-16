## Status
draft

## Goal
Lock in the complete requirements baseline for the Unity / AR Foundation native AR migration.

---

## Requirement ID Conventions

| Namespace | Domain |
|-----------|--------|
| `LEGACY-REQ-xxx` | Legacy MindAR/WebAR coexistence |
| `AR-REQ-xxx` | AR Foundation core |
| `TRACK-REQ-xxx` | Image tracking |
| `CONTENT-REQ-xxx` | Model/content delivery |
| `BACKEND-REQ-xxx` | Backend AR API contract |
| `BRIDGE-REQ-xxx` | RN ↔ Unity bridge |
| `COMBO-REQ-xxx` | Multi-card combo interaction |
| `GAME-REQ-xxx` | Gamification ownership |
| `SEC-REQ-xxx` | Entitlement/security |
| `TEST-REQ-xxx` | Testing |
| `ANDROID-REQ-xxx` | Android device |
| `IOS-REQ-xxx` | iOS device |

Requirement levels: `MUST` / `MUST NOT` / `SHOULD` / `MAY`.

Requirement status: `CURRENT` (existing), `TARGET` (migration goal), `FUTURE` (post-migration), `OPTIONAL`.

---

## LEGACY COEXISTENCE

**LEGACY-REQ-001 [CURRENT][MUST]** — MindAR/WebAR path MUST remain functional throughout migration.
**LEGACY-REQ-002 [CURRENT][MUST]** — Legacy backend fields (`nft_base_url`, `mind_catalog_id`, `mind_target_index`, `combo_mind_url`) MUST NOT be removed until explicit feature-parity approval.
**LEGACY-REQ-003 [CURRENT][MUST]** — QR resolver `GET /api/v1/flashcard/{qr_id}` MUST continue serving existing payload shape.

---

## AR FOUNDATION CORE

**AR-REQ-001 [TARGET][MUST]** — Native AR uses AR Foundation 6.3.5 as the runtime AR abstraction layer.
**AR-REQ-002 [TARGET][MUST]** — AR Foundation MUST NOT consume MindAR .mind files for image tracking.
**AR-REQ-003 [TARGET][MUST]** — AR Foundation image tracking requires `reference_image_url` and `physical_width_m` per tracked target.
**AR-REQ-004 [TARGET][MUST]** — AR Foundation version upgrades MUST be verified with the existing ARScene before upgrading in manifest.json.
**AR-REQ-005 [TARGET][MUST]** — Unity MUST NOT connect directly to MongoDB.
**AR-REQ-006 [TARGET][MUST]** — React Native owns navigation, authentication, lesson UI, user state, and authenticated backend mutations.

---

## IMAGE TRACKING

**TRACK-REQ-001 [TARGET][MUST]** — Runtime reference-image library uses `MutableRuntimeReferenceImageLibrary` (AR Foundation 6.x managed pattern).
**TRACK-REQ-002 [TARGET][MUST]** — Physical printed image width MUST be represented as `physical_width_m` (meters), NOT `glb_size`.
**TRACK-REQ-003 [TARGET][MUST]** — `glb_size` is for 3D model/content sizing only.
**TRACK-REQ-004 [TARGET][MUST]** — Each tracked card MUST have explicit semantic identity tied to `qr_id` / `ar_tag`, NOT detection order.
**TRACK-REQ-005 [TARGET][MUST]** — Multiple flashcards MUST coexist simultaneously (Cat + Meat both active; hiding one does not destroy the other).
**TRACK-REQ-006 [TARGET][MUST]** — Hiding a card and re-acquiring it MUST restore the same semantic identity.
**TRACK-REQ-007 [TARGET][MUST]** — Moving cards MUST NOT swap identities.
**TRACK-REQ-008 [TARGET][MUST]** — Runtime instance identity is tied to `TrackableId`, not to world position or detection index.
**TRACK-REQ-009 [TARGET][SHOULD]** — Reference images SHOULD be downloaded at runtime from `reference_image_url` before adding to the mutable library.
**TRACK-REQ-010 [TARGET][MUST]** — Image tracking lifecycle: `added` → `updated` → `removed` per `ARTrackedImage`.
**TRACK-REQ-011 [TARGET][MUST]** — `onImageTrackingLost` fires ONLY from the `removed` path, NOT from the `updated` path (regression tested by `ARSessionManagerRegressionTests`).
**TRACK-REQ-012 [TARGET][MUST]** — Unity ARScene MUST own QR code discovery via AR Foundation camera + ZXing while ARScene is active. React Native MAY retain QR scanning for non-AR flows (e.g., lesson-based entry without camera).

---

## MODEL / CONTENT DELIVERY

**CONTENT-REQ-001 [CURRENT][MUST]** — Current model delivery uses remote `.glb` files via Supabase Storage + `model_3d_url`.
**CONTENT-REQ-002 [TARGET][MUST]** — Unity uses GLTFast (`GltfImport`) to load remote `.glb` files — NOT Addressables (Addressables is a future optional decision).
**CONTENT-REQ-003 [TARGET][MUST]** — GLTFast dependency (`com.unity.cloud.gltfast`) MUST be present in `Packages/manifest.json` and resolvable.
**CONTENT-REQ-004 [TARGET][MUST]** — Model loading path: `model_3d_url` → `GLTFast.GltfImport` → `InstantiateMainSceneAsync` → `GameObject`.
**CONTENT-REQ-005 [TARGET][MUST]** — Model transforms (`position`, `rotation`, `scale`) are applied after `InstantiateMainSceneAsync`.
**CONTENT-REQ-006 [TARGET][MUST]** — Animation types (`rotate`, `bounce`, `idle`) MUST be supported per-card.
**CONTENT-REQ-007 [TARGET][MUST]** — GLB cache to `Application.temporaryCachePath` is acceptable.
**CONTENT-REQ-008 [TARGET][MUST]** — GLB loading cancellation MUST be supported (existing `GLBLoader.CancelLoad()`).
**CONTENT-REQ-009 [FUTURE][OPTIONAL]** — Unity prefab or AssetBundle delivery is NOT the current architecture.
**CONTENT-REQ-010 [FUTURE][OPTIONAL]** — Addressables delivery requires explicit future architecture decision.

---

## BACKEND AR API CONTRACT

**BACKEND-REQ-001 [CURRENT][MUST]** — QR resolver: `GET /api/v1/flashcard/{qr_id}` where `qr_id` is an opaque business identifier (e.g. `ele123`, `apple_001`).
**BACKEND-REQ-002 [CURRENT][MUST]** — AR experience response contains: `flashcard`, `target` (ar_object), `related_combos`.
**BACKEND-REQ-003 [TARGET][MUST]** — Native AR additive fields (NOT currently in backend): `reference_image_url: str` and `physical_width_m: float` per ar_object.
**BACKEND-REQ-004 [TARGET][MUST]** — Backend `model_3d_url` is the authoritative remote `.glb` URL.
**BACKEND-REQ-005 [TARGET][MUST]** — Backend combo definitions include `required_tags`, `semantic_result`, `animation`, `bonus_xp`, `center_transform`.
**BACKEND-REQ-006 [CURRENT][MUST]** — Backend does NOT currently enforce private-card entitlement (gap: see `entitlement-gap.md`).
**BACKEND-REQ-007 [FUTURE][OPTIONAL]** — Future entitlement may include private Supabase storage + short-lived signed URLs.

---

## RN ↔ UNITY BRIDGE

**BRIDGE-REQ-001 [TARGET][MUST]** — Bridge direction: RN → Unity via native module calls (`UnityBridge`), Unity → RN via `RNEventEmitter` → `UnitySendMessage`.
**BRIDGE-REQ-002 [CURRENT][MUST]** — Existing RN → Unity methods: `initSession`, `loadARExperience`, `startImageTracking`, `triggerCombo`, `setPlaneDetection`, `pauseSession`, `resumeSession`, `destroySession`.
**BRIDGE-REQ-003 [CURRENT][MUST]** — Existing Unity → RN events: `onArReady`, `onError`, `onImageDetected`, `onImageTrackingLost`, `onMultiImageDetected`, `onObjectPlaced`, `onModelLoaded`, `onProximityNear`, `onComboTriggered`, `onComboComplete`, `onFoodDragging`, `onFoodFed`, `onPetStateChanged`.
**BRIDGE-REQ-004 [TARGET][MUST]** — Payload contracts: `ARPayloadMapper.Parse(json)` expects `qrId`, `word`, `translationVi`, `audioUrl`, `modelUrl`, `animationType`, `glbSize`, `position`, `rotation`, `scale`.
**BRIDGE-REQ-005 [TARGET][MUST]** — `CardDescriptor` (used by `CardImageLibraryBuilder`) expects: `qrId`, `imageUrl`, `physicalWidthMeters`.
**BRIDGE-REQ-006 [TARGET][MUST]** — `LOAD_EXPERIENCE` RN method maps to Unity `ARExperienceHandler.LoadARExperience(json)` via `RNMessageReceiver`.
**BRIDGE-REQ-007 [TARGET][MUST]** — RN bridge MUST support multi-card payloads (list of `CardDescriptor`) routed to `CardImageLibraryBuilder.BuildLibrary()`.
**BRIDGE-REQ-008 [CURRENT][MUST]** — `ARExperienceHandler` currently processes a single `ARExperiencePayload`; multi-card routing needs integration work.
**BRIDGE-REQ-009 [TARGET][MUST]** — Gamification: Unity emits `onComboComplete` → RN calls `POST /gamification/add-xp`. Unity MUST NOT call backend directly.

---

## COMBO INTERACTION

**COMBO-REQ-001 [TARGET][MUST]** — Architecture supports spatial multi-card interactions (canonical: CAT + MEAT → Eat interaction).
**COMBO-REQ-002 [TARGET][MUST]** — Combo inputs include: `trackingState`, `TrackableId`, `ar_tag`, world position, world rotation, distance, relative orientation, dwell duration.
**COMBO-REQ-003 [TARGET][MUST]** — Combo logic MUST use hysteresis on proximity interactions (enter threshold ≠ exit threshold).
**COMBO-REQ-004 [TARGET][SHOULD]** — Design example thresholds: enter ≈ 0.18 m, exit ≈ 0.25 m, dwell ≈ 400 ms. Actual values require physical testing.
**COMBO-REQ-005 [TARGET][MUST]** — ComboInteractionEngine (or `ComboManager`) MUST NOT fire every frame or create jitter-trigger loops.
**COMBO-REQ-006 [TARGET][MUST]** — Combo logic MUST remain separated from low-level image detection (`ARTrackedImageManager` / `HandleTrackedImagesChanged`).
**COMBO-REQ-007 [TARGET][MUST]** — ComboManager proximity detection uses pairwise distance across `_trackedImages` dictionary.
**COMBO-REQ-008 [TARGET][MUST]** — Hiding a card involved in a combo MUST NOT crash or corrupt the combo state.
**COMBO-REQ-009 [CURRENT][MUST]** — Existing `ComboManager` uses hardcoded combo pairs; backend combo definitions from `related_combos` are NOT yet consumed.

---

## GAMIFICATION OWNERSHIP

**GAME-REQ-001 [TARGET][MUST]** — Gamification ownership: Unity emits AR/gameplay events → React Native performs authenticated backend mutation.
**GAME-REQ-002 [TARGET][MUST]** — Unity MUST NOT make direct HTTP calls to backend for gamification.
**GAME-REQ-003 [TARGET][MUST]** — Example flow: Unity `onComboComplete` → RN `POST /gamification/add-xp action=combo_discovered`.
**GAME-REQ-004 [FUTURE][OPTIONAL]** — XP/rewards/stickers/progress are owned by backend.

---

## ENTITLEMENT / SECURITY

**SEC-REQ-001 [CURRENT][MUST]** — Current `GET /api/v1/flashcard/{qr_id}` does NOT enforce private-card ownership.
**SEC-REQ-002 [CURRENT][MUST]** — Current model URLs are public Supabase URLs; no entitlement enforcement exists.
**SEC-REQ-003 [FUTURE][OPTIONAL]** — Private flashcard entitlement (authenticated RN → backend entitlement check → controlled asset access) is NOT implemented.
**SEC-REQ-004 [FUTURE][OPTIONAL]** — Private Supabase storage + short-lived signed URLs is NOT implemented.

---

## TESTING

**TEST-REQ-001 [TARGET][MUST]** — XR Simulation validates: tracked-image lifecycle, card identity mapping, multi-card bookkeeping, CardRegistry, combo logic, animation behavior, bridge logic, backend payload parsing.
**TEST-REQ-002 [TARGET][MUST]** — XR Simulation does NOT prove: real image-recognition quality, ARCore/ARKit computer vision, real lighting, autofocus, physical tracking, mobile FPS, mobile memory, thermal behavior.
**TEST-REQ-003 [TARGET][MUST]** — Acceptance criteria MUST distinguish: `EDITOR / XR_SIMULATION VERIFIED` vs `ANDROID DEVICE VERIFIED` vs `IOS DEVICE VERIFIED`.
**TEST-REQ-004 [CURRENT][MUST]** — EditMode tests MUST pass without AR hardware: `MultiCardRegistryTests`, `ComboDefinitionTests`, `ARSessionManagerRegressionTests`, `ModelSpawnerRegressionTests`, `CardDescriptorTests`.
**TEST-REQ-005 [TARGET][MUST]** — `ComboEditorPlayTest` enables editor-side combo logic verification without AR hardware.

---

## ANDROID DEVICE

**ANDROID-REQ-001 [TARGET][MUST]** — ARCore image tracking support via `com.unity.xr.arfoundation` + `com.unity.xr.arcore`.
**ANDROID-REQ-002 [TARGET][MUST]** — `MutableRuntimeReferenceImageLibrary` support must be verified on Android (ARCore provider-specific behavior).
**ANDROID-REQ-003 [TARGET][MUST]** — Physical device testing required before marking any AR feature Android-complete.

---

## IOS DEVICE

**IOS-REQ-001 [TARGET][MUST]** — ARKit image tracking support via `com.unity.xr.arfoundation` + `com.unity.xr.arkit`.
**IOS-REQ-002 [TARGET][MUST]** — Physical device testing required before marking any AR feature iOS-complete.

---

## Open questions

| # | Question | Blocks spec approval? |
|---|----------|----------------------|
| OQ-1 | What is the exact backend schema for `reference_image_url` and `physical_width_m`? Required for `BACKEND-REQ-003`. | Yes |
| OQ-2 | What is the physical width for each existing flashcard? Required for `TRACK-REQ-002`. | Yes |
| OQ-3 | Should multi-card AR experiences be scoped to a single `loadARExperience` call with a list payload, or per-card calls? Affects `BRIDGE-REQ-007`. | Yes |
| OQ-4 | Should `ComboManager` consume backend combo definitions from the `related_combos` field, or continue with hardcoded pairs? Affects `COMBO-REQ-009`. | Yes |
| OQ-5 | What is the actual proximity hysteresis (enter/exit/dwell) for physical testing? `COMBO-REQ-004` has design examples only. | No (physical test required) |
