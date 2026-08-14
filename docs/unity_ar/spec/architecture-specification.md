## Status
draft

## Goal
Lock in the authoritative native AR architecture: system ownership, runtime sequence, identity model, component responsibilities, and integration boundaries.

---

## System Ownership Boundaries

### React Native owns
- Navigation and routing between screens
- Authentication and session management
- Lesson content and flashcard display
- Normal application UI (non-AR)
- User state, progress, settings
- Authenticated backend mutations (XP, progress, entitlement)
- Non-AR lifecycle management
- AR session lifecycle initiation (`initSession`, `destroySession`)

### Unity owns
- ARSession lifecycle and AR subsystem management
- AR camera and AR Foundation management
- Tracked-image lifecycle and ARTrackedImageManager
- Runtime card instance management
- 3D rendering, lighting, camera
- Runtime model lifecycle (load, spawn, animate, destroy)
- Spatial interaction and combo logic
- AR-specific Canvas/UI overlay
- AR event production (via RNEventEmitter)

### Backend owns
- QR code resolution (`GET /api/v1/flashcard/{qr_id}`)
- Flashcard metadata (word, translation, audio)
- AR metadata (model_3d_url, transforms, animation_type)
- Combo definitions (required_tags, semantic_result, bonus_xp)
- Authorization (lesson entitlement — future)
- Gamification state (XP, rewards, stickers)
- Learning progress
- Future entitlement enforcement

### Storage/CDN owns
- Reference image assets (for native AR tracking targets)
- Remote .glb model files
- Large binary content
- Future protected/signed assets

### Unity MUST NOT
- Connect directly to MongoDB
- Call backend HTTP endpoints for gamification
- Own user authentication or session state
- Manage lesson or navigation logic

---

## Legacy Architecture (MindAR / WebAR)

```
React Native WebView
  → MindAR.js
  → Three.js renderer
  → Camera feed via getUserMedia
  → MindAR .mind files (compiled image targets)
  → 3D model overlay
```

Backend legacy fields: `nft_base_url`, `mind_catalog_id`, `mind_target_index`, `combo_mind_url`.

---

## Target Native Architecture (Unity / AR Foundation)

```
React Native / Backend
  ↓ GET /api/v1/flashcard/{qr_id}
  ↓ AR experience payload
  ↓ card definition:
  ↓   - reference image URL
  ↓   - physical width (meters)
  ↓   - semantic AR tag (ar_tag)
  ↓   - model URL (.glb)
  ↓   - transform (position, rotation, scale)
  ↓   - combo definitions
Unity
  ↓ CardImageLibraryBuilder.BuildLibrary(List<CardDescriptor>)
  ↓   → download reference images
  ↓   → MutableRuntimeReferenceImageLibrary
  ↓   → ARTrackedImageManager
  ↓ ARTrackedImage (per detected card)
  ↓ CardRegistry (qr_id → payload + spawned model)
  ↓ ContentLoader / GLTFast
  ↓   → LoadGLB(model_3d_url)
  ↓   → InstantiateMainSceneAsync
  ↓   → apply transform
  ↓ runtime model instance (per card)
  ↓ animation / content controller
  ↓ ComboManager / ComboInteractionEngine
  ↓   → proximity detection
  ↓   → dwell timing
  ↓   → combo trigger
  ↓ Unity gameplay event (RNEventEmitter)
  ↓   → onComboComplete { comboId, xp }
React Native
  ↓ handleUnityEvent()
  ↓ POST /gamification/add-xp
Backend
  → XP / rewards / progress update
```

---

## Runtime Sequence (Native AR Session)

### Session startup
1. RN: user opens AR lesson
2. RN: calls `GET /api/v1/flashcard/{qr_id}` for each card → builds list of `CardDescriptor`
3. RN: calls `UnityBridge.startImageTracking(cards)` (new multi-card method)
4. Unity: `RNMessageReceiver.OnMessageFromRN("startImageTracking|{json}")`
5. Unity: `ARExperienceHandler.StartImageTracking()` wires up session
6. Unity: `CardImageLibraryBuilder.BuildLibrary(cards)`:
   - download all reference images in parallel
   - create `MutableRuntimeReferenceImageLibrary`
   - schedule `AddReferenceImageJob` per card
   - wait for all jobs to complete
   - enable `ARTrackedImageManager`
7. Unity: `OnLibraryReady` → `RNEventEmitter.onArReady`

### Card detection
1. AR subsystem detects physical card → `ARTrackedImage` created
2. `ARSessionManager.HandleTrackedImagesChanged` fires `added` path
3. `ARExperienceHandler.HandleImageDetected(imageId, position)`:
   - look up `qrId` via `MultiCardRegistry.GetPayload(imageId)`
   - call `GLBLoader.LoadGLB(payload.ModelUrl)`
   - call `ModelSpawner.Spawn(prefab, position, rotation, scale, id=qrId)`
   - call `AnimationController.PlayAnimation(payload.AnimationType)`
   - call `ARAudioPlayer.PlayAudio(payload.AudioUrl)` if present
4. `RNEventEmitter.onImageDetected({ imageId, qrId })`
5. `RNEventEmitter.onObjectPlaced({ qrId, worldX, worldY, worldZ })`
6. `RNEventEmitter.onModelLoaded({ modelUrl })`
7. Update `MultiCardRegistry.SetSpawnedModel(qrId, model)`

### Multi-card tracking
- Each `ARTrackedImage` maps `referenceImage.name` → `qrId` via registry
- `ARExperienceHandler._trackedImages[imageId] = trackedImage`
- `ARSessionManager.OnMultiImageDetected` fires when `_activeImages.Count >= 2`
- `ComboManager` subscribes and tracks pairwise distance in `Update()`

### Card lost / regained
1. AR subsystem loses tracking → `removed` path fires
2. `ARSessionManager` removes from `_activeImages` and fires `OnImageTrackingLost`
3. `ARExperienceHandler` removes from `_trackedImages`
4. Model remains in `MultiCardRegistry` (not destroyed)
5. Re-acquisition: `added` path fires → same `qrId` resolved → same model restored

### Combo trigger
1. `ComboManager.Update()` computes pairwise distance
2. Both cards within `proximityThreshold` for `proximityHoldTime`
3. `ComboManager.OnProximityNear` fires → `RNEventEmitter.onProximityNear`
4. OR: user taps combo button → RN calls `triggerCombo(cardA, cardB)` → `ComboManager.TriggerCombo(cardA, cardB)`
5. `ComboManager.PlayComboAnimation()` runs
6. `RNEventEmitter.onComboComplete({ rewardCardId, xpAwarded })`
7. RN: `POST /gamification/add-xp action=combo_discovered`

---

## Identity Model

Four distinct identity layers — never conflate:

| Identity | Type | Examples | Used by |
|----------|------|----------|---------|
| `qr_id` | Business flashcard ID | `ele123`, `apple_001` | Backend, RN, Unity registry |
| `ar_tag` | Semantic AR content ID | `elephant`, `apple_marker` | Backend ar_objects, Unity combo table |
| Reference image identity | AR Foundation reference image name | same as `qrId` in `CardDescriptor.qrId` | Unity runtime library |
| `TrackableId` | One runtime tracked physical instance | `ARTrackedImage.trackingId` | AR Foundation, per-session only |

Rules:
- `qr_id` is the business key; never use it as a positional index
- `ar_tag` maps to backend `ar_object`; used for combo lookup
- Reference image name = `qrId` in `CardDescriptor`; used for AR Foundation library lookup
- `TrackableId` is ephemeral; never use it as a stable card key across sessions
- Multi-card association is NEVER based on detection order
- Each tracked card's semantic identity is explicit via `qrId` → `MultiCardRegistry`

---

## Unity Component Responsibilities

| Component | File | Responsibility |
|-----------|------|---------------|
| `RNMessageReceiver` | `Assets/Bridge/RNMessageReceiver.cs` | Dispatches RN→Unity method calls |
| `RNEventEmitter` | `Assets/Bridge/RNEventEmitter.cs` | Unity→RN JSON events via `UnitySendMessage` |
| `ARPayloadMapper` | `Assets/Bridge/ARPayloadMapper.cs` | JSON → `ARExperiencePayload` |
| `CardDescriptor` | `Assets/AR/CardImageLibraryBuilder.cs` (nested) | RN card definition: `qrId`, `imageUrl`, `physicalWidthMeters` |
| `ARExperienceHandler` | `Assets/AR/ARExperienceHandler.cs` | Top-level AR session orchestrator |
| `ARSessionManager` | `Assets/AR/ARSessionManager.cs` | ARFoundation session + tracked image lifecycle |
| `CardImageLibraryBuilder` | `Assets/AR/CardImageLibraryBuilder.cs` | Runtime reference image library construction |
| `MultiCardRegistry` | `Assets/AR/MultiCardRegistry.cs` | Per-card payload + spawned model registry |
| `GLBLoader` | `Assets/Models/GLBLoader.cs` | Remote .glb loading via GLTFast |
| `ModelSpawner` | `Assets/Models/ModelSpawner.cs` | Model instantiation with per-id registry |
| `AnimationController` | `Assets/Models/AnimationController.cs` | Animation playback |
| `ARAudioPlayer` | `Assets/Audio/ARAudioPlayer.cs` | Audio playback |
| `ARGestureHandler` | `Assets/Gestures/ARGestureHandler.cs` | Gesture interaction |
| `PlaneDetection` | `Assets/AR/PlaneDetection.cs` | AR plane management |
| `AnchorManager` | `Assets/AR/AnchorManager.cs` | Anchor creation |
| `ComboManager` | `Assets/Interactions/ComboManager.cs` | Proximity detection + combo animation |
| `GameModeManager` | TBD (planned) | Game button, GAME_ACTIVE state, game canvas/3D root activation, semantic game events |
| `FoodInteraction` | `Assets/Interactions/FoodInteraction.cs` | Draggable food model + pet proximity |
| `PetController` | `Assets/Interactions/PetController.cs` | Pet state machine |
| `FullARBootstrap` | `Assets/AR/FullARBootstrap.cs` | Runtime AR rig construction (non-Editor) |

---

## AR Session / Combo Participant Aggregation

`ComboManager` aggregates tracked images via `RegisterTrackedImage(ARTrackedImage, GameObject)`, keyed by `referenceImage.name` (= `qrId`).

`ARExperienceHandler` currently calls `SpawnModelAtImage(imageId, transform)` per card but processes a single `_currentPayload`. The multi-card routing integration point is:
- `RNMessageReceiver.startImageTracking` → `CardImageLibraryBuilder.BuildLibrary(cards)` → multi-card registry → per-card model loading

---

## Backend AR API Contract

### Current (MindAR-compatible)

```
GET /api/v1/flashcard/{qr_id}
→ { flashcard, target: ar_object, related_combos: [...] }

ar_object fields:
  ar_tag, description, animation_type, glb_size,
  nft_base_url (DEPRECATED),
  model_3d_url, texture_url, image_2d_url,
  position, rotation, scale,
  mind_catalog_id, mind_target_index

ar_combination fields:
  combo_id, required_tags, target_order (DEPRECATED),
  model_3d_url, combo_mind_url (DEPRECATED),
  bonus_xp, center_transform,
  semantic_result, animation, sound, phrase, priority, active,
  flashcard_set, cross_category_allowed
```

### Native AR Additive Fields (needed)

Per `ar_object` document, add:
- `reference_image_url: str` — URL of the physical printout's reference image (for native AR tracking)
- `physical_width_m: float` — physical width of the printed card in meters

These do NOT currently exist in `backend/models/ar_object.py`. They are additive requirements.

---

## Security Boundary

- Current backend does NOT enforce private-card entitlement
- Current model URLs are public Supabase URLs
- Private flashcard access requires future: authenticated RN → backend entitlement check → controlled asset access
- Unity receives no auth token; Unity cannot gate on user entitlement

---

## Legacy Coexistence

Unity AR and MindAR/WebAR coexist as separate React Native screens:
- MindAR: `ARContainerV2.tsx` + WebView
- Native AR: Unity AR scene via native module bridge

---

## In-AR Game Mode Architecture

**Status: PLANNED (future phase, not implemented)**

### Overview

In-AR Game Mode is a future native AR capability where the learner presses a Game button while the AR camera is active and a game Canvas/3D experience activates directly over the camera scene.

The AR camera remains the visual background. The game overlay uses:
- Screen-Space Canvas
- World-Space Canvas
- 3D Unity gameplay objects
- or combinations thereof

### Design Invariants

1. **ARScene is the persistent AR runtime container.** The game overlay operates inside ARScene, not replacing it.
2. **AR camera remains active.** Entering GAME_ACTIVE does not destroy ARSession, XROrigin, ARCameraManager, or the UnityView.
3. **Game Mode ≠ Combo Mode.** They are separate features. A combo may later launch a game, but that is orchestration between features.
4. **Game ownership is bounded.** Unity owns game presentation (HUD, canvas, 3D). RN owns navigation, entry/exit, and backend mutation. Backend owns authoritative game state.

### Runtime State Model

```
AR_SCAN
   │
   │ Game button
   ▼
GAME_ACTIVE
   │
   │ exit / completion / back
   ▼
AR_SCAN
```

Entering GAME_ACTIVE does NOT require:
- Destroying ARSession
- Destroying XROrigin
- Stopping ARCameraManager
- Unmounting UnityView
- Navigating RN to another screen
- Loading BridgeSmokeScene
- Restarting Unity

### Runtime Flow

```
ARScene
   ↓
ARSession running
ARCameraManager running
camera passthrough visible
   ↓
AR HUD
   ↓
GAME button
   ↓
GameModeManager.EnterGame(...)
   ↓
game UI / 3D gameplay activates
   ↓
AR camera remains active
```

### Semantic Game Events (Unity → RN Boundary)

Unity emits semantic game results. RN performs authenticated backend mutations.

```
Unity game completes
        ↓
semantic game event
        ↓
React Native
        ↓
authenticated backend mutation
```

Potential events (exact names TBD — do not lock without checking bridge contract):

```
onGameStarted
onGameCompleted
onGameExited
```

### Component: GameModeManager (Planned)

```
GameModeManager
├── EnterGame()
├── ExitGame()
├── activate/deactivate game presentation roots
├── coordinate game-mode interaction state
└── emit semantic game events
```

Possible scene composition:

```
ARScene
├── ARSession
├── XROrigin
│   └── AR Camera
├── ARExperienceHandler
├── MultiCardRegistry
├── ComboManager
├── GameModeManager        ← planned
├── ARHudCanvas
│   └── GameButton
├── GameCanvasRoot         ← planned (not implemented)
└── Game3DRoot            ← planned (not implemented)
```

### Ownership Boundaries

| Component | Owner | Notes |
|-----------|-------|-------|
| Game button | Unity | AR-specific HUD |
| Game Canvas | Unity | AR-specific presentation |
| World-space AR game UI | Unity | AR-specific presentation |
| 3D AR gameplay | Unity | AR-specific gameplay |
| Application navigation | React Native | |
| ARScreen entry/exit | React Native | |
| Authenticated user state | React Native | |
| Backend reward/progress mutation | React Native | |
| Authoritative reward/progress state | Backend | |
| Game/gameplay metadata | Backend (where applicable) | |

### Non-Goals

- In-AR Game Mode is NOT a prerequisite for AR camera verification.
- Game Mode does NOT require a separate Unity scene (ARScene is the container).
- Game Mode does NOT replace ARScene.
- ComboManager does NOT own game state.
- Unity does NOT call backend directly for game rewards.

### Open questions

| # | Question | Blocks approval? |
|---|----------|-----------------|
| IG-1 | Does Game Mode launch from a combo trigger, a standalone button, or both? | No |
| IG-2 | What game types are supported (Canvas UI, 3D minigame, AR-space gameplay)? | No |
| IG-3 | Does game completion award XP/ rewards, and if so via which Unity → RN → Backend path? | No |
| IG-4 | What is the exact game result event schema? | No |
| IG-5 | Is there a game canvas per game type or one generic canvas? | No |

---

## Open questions

| # | Question | Blocks approval? | Status |
|---|----------|-----------------|--------|
| AQ-1 | Does `ARExperienceHandler` need a `CardImageLibraryBuilder` reference for multi-card? | Yes | **Resolved** — Yes. `CardImageLibraryBuilder` must be wired into `ARExperienceHandler` for P3 (per Unity plan P3 scope). See `bridge-contract.md` Gap 3. |
| AQ-2 | Should `startImageTracking` receive a list of `CardDescriptor` or a single payload? | Yes | **Resolved** — `startImageTrackingMulti` method with `CardDescriptor[]` payload. See `bridge-contract.md` Multi-Card Bridge Contract section. |
| AQ-3 | Should `ComboManager` consume `related_combos` from backend, or keep hardcoded pairs? | Yes | **Resolved** — Backend consumption. Unity P6 (backend combo consumption) replaces hardcoded table with dynamic `related_combos` from `GET /api/v1/flashcard/{qr_id}` response. |
