## Status
draft

## Goal
Lock in the product behavior of React Native mobile surrounding native Unity AR: entry flows, states, permissions, UX, lifecycle, error recovery, and WebAR fallback policy.

---

## Scope

This spec covers **React Native mobile product behavior** for native Unity AR experiences.
It does NOT cover Unity engine internals (see `architecture-specification.md`) or backend contracts (see `backend-contract.md`).

**Legacy WebAR remains available** per `LEGACY-REQ-001`. This spec governs only the native Unity AR mobile experience.

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| `architecture-specification.md` | System ownership, Unity internals, runtime sequence |
| `bridge-contract.md` | RN ↔ Unity message contracts and gaps |
| `backend-contract.md` | QR resolution, AR metadata, gamification API |
| `combo-interaction.md` | Unity-side combo proximity logic |
| `requirements-baseline.md` | All requirement IDs including mobile prefixes |

---

## A. AR ENTRY

### A-1. Entry Points

**MOB-AR-REQ-001 [TARGET][MUST]** — Users enter AR from `LessonPlayerScreen` via explicit navigation to the `AR` screen route.

**MOB-AR-REQ-002 [TARGET][MUST]** — Navigation params for the `AR` screen are `{ lessonId: string, lessonTitle: string }`.

**MOB-AR-REQ-003 [TARGET][MUST]** — The `AR` screen fetches AR experience data from `GET /api/v1/flashcard/{qrId}` using the `lessonId` as the `qrId` key.

**MOB-AR-REQ-004 [CURRENT][MUST]** — `LessonPlayerScreen` shows an "AR coming soon" placeholder. Navigation to the `AR` screen is not yet wired from this location.

**MOB-AR-REQ-005 [TARGET][SHOULD]** — Users should be able to enter AR from `CourseDetailScreen` for any lesson that has associated AR flashcard content.

**MOB-AR-REQ-006 [TARGET][MAY]** — A future QR-scanner entry point may allow direct AR entry by scanning a physical card, independent of lesson context.

> **Evidence:** `AppNavigator.tsx` defines `RootStackParamList` with `AR` screen receiving `{ lessonId, lessonTitle }`. No `/scan` route exists. `QRScanPrompt.tsx` is a placeholder not rendered anywhere. `LessonPlayerScreen` does not navigate to AR. Entry flow requires explicit navigation wiring.

### A-2. Entry Prerequisites

**MOB-AR-REQ-010 [TARGET][MUST]** — Before entering the AR session, RN MUST verify user authentication state. Unauthenticated users see a sign-in prompt or guest-mode informational message.

**MOB-AR-REQ-011 [TARGET][MUST]** — RN verifies the lesson/flashcard is authorized for this user (per existing entitlement checks — full private-card entitlement is FUTURE per `SEC-REQ-003`).

**MOB-AR-REQ-012 [TARGET][MUST]** — If the lesson has no associated AR content, RN shows a descriptive error and does NOT launch Unity.

### A-3. Back Navigation and Exit

**MOB-AR-REQ-015 [TARGET][MUST]** — Back navigation from the AR screen returns to `LessonPlayerScreen` or `CourseDetailScreen`.

**MOB-AR-REQ-016 [TARGET][MUST]** — Exiting the AR screen triggers `UnityBridge.destroySession()` and cleans up the Unity host lifecycle.

**MOB-AR-REQ-017 [TARGET][MUST]** — Re-entering AR after exit restarts the full AR session flow from `IDLE`.

---

## B. QR SCANNING

### B-1. Scanner States

The QR scanner manages these product states:

```
IDLE
  ↓ (user initiates scan)
REQUESTING_PERMISSION
  ↓ (permission result)
SCANNING
  ↓ (QR code detected)
RESOLVING
  ↓ (backend response)
RESOLVED → AR_SESSION_PREPARING
INVALID_QR → error state
UNAUTHORIZED → error state
NETWORK_ERROR → retry option
```

**MOB-QR-REQ-001 [TARGET][MUST]** — Scanner UI is the `QRScanPrompt` component with kid-friendly scan frame (250×250px, corner brackets, instructional text).

**MOB-QR-REQ-002 [TARGET][MUST]** — Duplicate-scan suppression: the same `qrId` is ignored for 2.5 seconds after first detection. This prevents re-triggering from camera feed noise.

**MOB-QR-REQ-003 [TARGET][MUST]** — On `INVALID_QR`, the user sees a kid-friendly message ("Hmm, this card isn't in our library yet!") with a retry option.

**MOB-QR-REQ-004 [TARGET][MUST]** — On `UNAUTHORIZED`, the user sees a message ("This card belongs to another learner") and is redirected.

**MOB-QR-REQ-005 [TARGET][MUST]** — On `NETWORK_ERROR`, the user sees a retry option ("Check your connection and try again").

**MOB-QR-REQ-006 [TARGET][MUST]** — `RESOLVED` transitions into AR session preparation. The QR code string becomes the `qrId` for `GET /api/v1/flashcard/{qrId}`.

> **Evidence:** `QRScanPrompt.tsx` renders a static UI placeholder with scan frame. `ARExperienceMapper.ts` maps backend response to `UnityARExperiencePayload`. No camera-based QR scanning is implemented yet.

### B-2. QR vs. Lesson-Based Entry

**MOB-QR-REQ-010 [TARGET][MUST]** — When entering AR via lesson navigation (QR code from backend lesson data), the `qrId` comes from `lesson.qr_code` field and NO camera scan is required.

**MOB-QR-REQ-011 [TARGET][SHOULD]** — Lesson-based entry and QR-scan entry converge at the same AR session preparation state after experience resolution.

---

## C. CAMERA / AR PERMISSIONS

### C-1. Permission States

```
NOT_REQUESTED
  ↓
REQUESTING
  ↓
GRANTED → AR_SESSION_PREPARING
DENIED → show_denied_message → settings_option
PERMANENTLY_DENIED → show_settings_required_message
DEVICE_UNSUPPORTED → show_unsupported_message
```

**MOB-PERM-REQ-001 [TARGET][MUST]** — Camera permission is requested by the Unity runtime (via ARCore/ARKit), not by RN. RN delegates to Unity for camera access.

**MOB-PERM-REQ-002 [TARGET][MUST]** — If Unity emits `onError` with code `CAMERA_PERMISSION_DENIED`, RN shows a kid-friendly message with a button to open app settings.

**MOB-PERM-REQ-003 [TARGET][MUST]** — If the device does not support the required AR capability (checked by Unity via ARCore/ARKit subsystem descriptors), RN shows "This device doesn't support AR yet" with a WebAR fallback option if available.

**MOB-PERM-REQ-004 [TARGET][SHOULD]** — `expo-camera` permission is NOT required for the Unity AR path because Unity manages camera access directly.

> **Evidence:** `UnityBridgeModule.ts` has no camera permission calls. Camera access is via ARCore/ARKit at the native Unity layer. `expo-camera` is listed in `package.json` but is not imported anywhere.

### C-2. AR Capability Detection

**MOB-PERM-REQ-010 [TARGET][MUST]** — Unity checks `supportsMutableLibrary` on the AR subsystem descriptor before assuming runtime image library support.

**MOB-PERM-REQ-011 [TARGET][MUST]** — If `supportsMutableLibrary == false`, Unity emits `onError` with code `AR_CAPABILITY_UNSUPPORTED` and RN routes to WebAR fallback if enabled.

---

## D. AR SESSION PREPARATION

### D-1. Preparation States

```
IDLE
  ↓ (experience resolved)
LOADING_EXPERIENCE
  ↓ (UnityBridge.startARSession called)
UNITY_INITIALIZING
  ↓ (onArReady event)
AR_INITIALIZING
  ↓ (CardImageLibraryBuilder.BuildLibrary called)
REFERENCE_IMAGE_LOADING
  ↓ (OnLibraryReady event)
AR_READY
  ↓ (UnityBridge.startImageTracking called)
TRACKING_ACTIVE
  ↓ (onImageDetected event)
TARGET_FOUND
```

**MOB-LOAD-REQ-001 [TARGET][MUST]** — RN shows the `ARLoadingOverlay` with state-appropriate messaging throughout preparation.

**MOB-LOAD-REQ-002 [TARGET][MUST]** — `LOADING_EXPERIENCE` shows "Preparing..." while fetching `GET /api/v1/flashcard/{qrId}`.

**MOB-LOAD-REQ-003 [TARGET][MUST]** — `UNITY_INITIALIZING` shows "Starting AR..." while `UnityBridge.startARSession()` executes.

**MOB-LOAD-REQ-004 [TARGET][MUST]** — `AR_INITIALIZING` shows "Getting ready..." while waiting for `onArReady` from Unity.

**MOB-LOAD-REQ-005 [TARGET][MUST]** — `REFERENCE_IMAGE_LOADING` shows "Loading markers..." with progress indication as the reference image library is built.

**MOB-LOAD-REQ-006 [TARGET][MUST]** — A 10-second timeout on `AR_INITIALIZING` transitions to `AR_ERROR` if Unity does not emit `onArReady` within the window.

**MOB-LOAD-REQ-007 [TARGET][MUST]** — When `onModelLoaded` fires, RN dismisses loading overlay and shows the `FlashcardOverlay` (word + translation + audio).

**MOB-LOAD-REQ-008 [TARGET][MUST]** — RN maps backend response to `UnityARExperiencePayload` via `ARExperienceMapper.mapToUnityPayload()`.

> **Evidence:** `useARSession.ts` defines 9-state machine. `ARLoadingOverlay.tsx` defines states: `initializing`, `loading_model`, `error`, `cached`. `ARExperienceMapper.ts` performs the mapping. `onModelProgress` drives the `ClayProgressBar` with stages: `download → load → instantiate`.

### D-2. Multi-Card Preparation

**MOB-LOAD-REQ-010 [TARGET][MUST]** — For multi-card experiences, RN fetches all `CardDescriptor` data (one `GET /api/v1/flashcard/{qrId}` per card or batched).

**MOB-LOAD-REQ-011 [TARGET][MUST]** — RN sends the list of `CardDescriptor` to Unity via the multi-card bridge method (see Section L — Bridge Contract).

**MOB-LOAD-REQ-012 [TARGET][SHOULD]** — The `ARLoadingOverlay` progress reflects the combined progress of all N reference image downloads and library construction.

---

## E. TRACKING GUIDANCE

### E-1. Target States

```
TRACKING_ACTIVE
  ↓ (no targets found)
TRACKING_WAITING
  ↓ (onImageDetected for card 1)
TARGET_FOUND [cardId=X]
  ↓ (onImageTrackingLost)
TARGET_TEMPORARILY_LOST [cardId=X]
  ↓ (onImageDetected)
TARGET_REACQUIRED [cardId=X]
  ↓ (onMultiImageDetected)
MULTI_CARD_ACTIVE
```

**MOB-TRACK-REQ-001 [TARGET][MUST]** — `TRACKING_WAITING` shows "Point camera at the [cardName] card" with a card preview image.

**MOB-TRACK-REQ-002 [TARGET][MUST]** — `TARGET_FOUND` shows "Got it!" confirmation with the flashcard overlay (word, translation, audio button).

**MOB-TRACK-REQ-003 [TARGET][MUST]** — `TARGET_TEMPORARILY_LOST` shows "Looking for [cardName]..." with the same card preview.

**MOB-TRACK-REQ-004 [TARGET][MUST]** — `TARGET_REACQUIRED` re-shows the flashcard overlay without requiring re-entry.

**MOB-TRACK-REQ-005 [TARGET][MUST]** — Tracking guidance text is localized and kid-friendly.

**MOB-TRACK-REQ-006 [TARGET][MUST]** — Multiple cards are tracked independently. Losing one card does NOT destroy the other card's model (per `TRACK-REQ-005`).

**MOB-TRACK-REQ-007 [TARGET][MUST]** — Card identity is tied to `qrId` / `ar_tag`, NOT to detection order (per `TRACK-REQ-004`).

> **Evidence:** `useARSession.ts` tracks `trackedImages: Map<string, TrackedImage>` with stable `qrId` keys. `MultiCardRegistry` in Unity provides per-card payload lookup. `FlashcardOverlay` shows per-card word/translation. No guidance text exists yet in RN — this is new product behavior.

### E-2. Multi-Card Guidance

**MOB-TRACK-REQ-010 [TARGET][MUST]** — When exactly 1 of N cards is found, guidance shows "Now find the [second card name]".

**MOB-TRACK-REQ-011 [TARGET][MUST]** — When all N cards are found, guidance shows "Both cards found!" or "All cards found!" and the `ComboOverlay` activates if a combo is available.

---

## F. COMBO GUIDANCE

### F-1. Combo States

```
MULTI_CARD_ACTIVE
  ↓ (trackedImages.size >= 2 AND valid combo pair)
COMBO_PROXIMITY_NEAR
  ↓ (cards within proximity threshold)
COMBO_TRIGGERED
  ↓ (dwell time satisfied)
COMBO_COMPLETE
```

**MOB-COMBO-REQ-001 [TARGET][MUST]** — When 2 cards are tracked and a valid combo pair exists, RN shows the `ComboOverlay` with a "COMBO!" button.

**MOB-COMBO-REQ-002 [TARGET][MUST]** — When cards are too far apart for a valid combo, guidance shows "Move the cards closer" with a visual hint.

**MOB-COMBO-REQ-003 [TARGET][MUST]** — Unity emits `onProximityNear` as cards approach combo range. RN shows "Getting closer..." feedback.

**MOB-COMBO-REQ-004 [TARGET][MUST]** — Unity emits `onComboTriggered` when combo conditions are met. RN shows a combo celebration animation.

**MOB-COMBO-REQ-005 [TARGET][MUST]** — Unity emits `onComboComplete` when the combo animation finishes. RN triggers the gamification flow.

**MOB-COMBO-REQ-006 [TARGET][MUST]** — Duplicate combo triggers are suppressed. Once a combo fires, the same pair does not re-fire until the session resets.

**MOB-COMBO-REQ-007 [TARGET][MUST]** — Combo is triggered by proximity dwell time in Unity, NOT by user button press alone. The combo button confirms intent but does not create the combo.

> **Evidence:** `ComboOverlay.tsx` exists with floating animation. `useARSession.ts` subscribes to `onProximityNear`, `onComboTriggered`, `onComboComplete`. Unity `ComboManager` fires these events. Current combo button is visible when `canCombo` (trackedImages.size >= 2). Dwell timing is in `ComboManager.cs` (`proximityHoldTime = 1.0f`).

### F-2. Combo Result Experience

**MOB-COMBO-REQ-010 [TARGET][MUST]** — Combo success triggers immediate visual feedback: Unity plays 3D animation (fly to midpoint, reward model spawn), RN shows a combo banner ("COMBO DISCOVERED!" + "+{bonusXp} XP!").

**MOB-COMBO-REQ-011 [TARGET][MUST]** — Sound effect plays on combo trigger (via `ARAudioPlayer` in Unity).

**MOB-COMBO-REQ-012 [TARGET][MUST]** — Haptic feedback fires on combo trigger (via `Handheld.Vibrate()` in Unity or RN haptic API).

**MOB-COMBO-REQ-013 [TARGET][MUST]** — The combo reward model spawns at the combo center transform (per `center_transform` from backend combo definition).

**MOB-COMBO-REQ-014 [TARGET][SHOULD]** — After combo complete, the original card models remain active so users can form new combos.

---

## G. GAMIFICATION PRESENTATION

### G-1. Gamification Ownership

```
Unity (spatial gameplay event)
  → RN (authenticated mutation)
    → Backend (persistent state)
      → RN (UI update)
```

**MOB-GAME-REQ-001 [TARGET][MUST]** — Unity emits gameplay events only. Unity NEVER calls the backend directly.

**MOB-GAME-REQ-002 [TARGET][MUST]** — RN receives `onComboComplete` and calls `POST /gamification/add-xp` with `action: "combo_discovered"`.

**MOB-GAME-REQ-003 [TARGET][MUST]** — The XP reward is PENDING until the backend confirms. If the backend call fails, RN retries with idempotency.

### G-2. Reward States

```
REWARD_PENDING
  ↓ (POST /gamification/add-xp succeeds)
REWARD_CONFIRMED → show celebration
  ↓ (POST fails)
REWARD_RETRYABLE_FAILURE → retry in 2s
  ↓ (max retries exceeded)
REWARD_FAILED → silently log, do not block UX
```

**MOB-GAME-REQ-010 [TARGET][MUST]** — A successful AR interaction MUST NOT need to replay just because the XP HTTP request failed.

**MOB-GAME-REQ-011 [TARGET][MUST]** — RN maintains `currentStreak` in memory during the AR session (displayed as "🔥 {streak} streak" in `PetStatusOverlay`).

**MOB-GAME-REQ-012 [TARGET][SHOULD]** — Streak and XP are persisted to the backend at session end via `useGamification.ts`, not continuously during AR interaction.

**MOB-GAME-REQ-013 [TARGET][MUST]** — Reward celebration UI (confetti, badge, sticker) is shown on the RN side after `REWARD_CONFIRMED`.

**MOB-GAME-REQ-014 [TARGET][SHOULD]** — Level-up events trigger a full-screen `RewardCelebration` overlay (similar to web `RewardCelebration.tsx`).

> **Evidence:** `useARSession.ts` has `currentStreak: number` in local state, updated via `onComboComplete` and `onFoodFed`. `useGamification.ts` calls `POST /gamification/add-xp`. `PetStatusOverlay` displays streak. `RewardCelebration` overlay exists in web — RN version needed.

### G-3. XP Actions

**MOB-GAME-REQ-020 [TARGET][MUST]** — `flashcard_viewed` is awarded when `onImageDetected` fires (first detection of a card).

**MOB-GAME-REQ-021 [TARGET][MUST]** — `combo_discovered` is awarded when `onComboComplete` fires with a valid combo.

**MOB-GAME-REQ-022 [TARGET][SHOULD]** — `flashcard_3d_interaction` (10 XP) is awarded when a model is loaded and the user interacts with it (via `onObjectPlaced` or `onInteraction`).

---

## H. SESSION LIFECYCLE

### H-1. Lifecycle States

```
SESSION_REQUESTED (user navigates to AR)
  ↓
SESSION_STARTED (UnityBridge.startARSession called)
  ↓
SESSION_READY (onArReady received)
  ↓
INTERACTION_STARTED (first target found)
  ↓
INTERACTION_ACTIVE (AR_INTERACTING state)
  ↓
INTERACTION_COMPLETED (user exits OR session ends)
  ↓
SESSION_COMPLETED (destroySession called, cleanup)
```

**MOB-LIFE-REQ-001 [TARGET][MUST]** — `SESSION_STARTED` calls `UnityBridge.startARSession()` and begins loading the AR experience.

**MOB-LIFE-REQ-002 [TARGET][MUST]** — `SESSION_READY` is achieved when Unity emits `onArReady`. At this point Unity AR is initialized and awaiting targets.

**MOB-LIFE-REQ-003 [TARGET][MUST]** — `INTERACTION_COMPLETED` is triggered by user back navigation, explicit exit action, or the Unity session emitting a terminal error.

**MOB-LIFE-REQ-004 [TARGET][MUST]** — `SESSION_COMPLETED` calls `UnityBridge.destroySession()` and removes the Unity host.

**MOB-LIFE-REQ-005 [TARGET][MUST]** — Target found or model instantiated does NOT automatically trigger `INTERACTION_COMPLETED` or session end. Session persists until explicit exit.

> **Evidence:** `ARScreen.tsx` `useEffect` calls `loadLesson()` on mount and `stopSession()` on unmount. `useARSession.ts` defines `IDLE → AR_INITIALIZING → IMAGE_TRACKING_READY → IMAGE_DETECTED → MODEL_SPAWNING → MODEL_LOADED → AR_INTERACTING` states.

### H-2. App Lifecycle

**MOB-LIFE-REQ-010 [TARGET][MUST]** — When the app goes to background (AppState change), RN calls `UnityBridge.pauseSession()`.

**MOB-LIFE-REQ-011 [TARGET][MUST]** — When the app returns to foreground, RN calls `UnityBridge.resumeSession()`.

**MOB-LIFE-REQ-012 [TARGET][MUST]** — If the app is killed while in AR, the Unity session is cleaned up by the OS. RN should handle this gracefully on next launch.

**MOB-LIFE-REQ-013 [TARGET][MUST]** — Phone interruption (incoming call, Siri) pauses the AR session via `pauseSession()`.

**MOB-LIFE-REQ-014 [TARGET][SHOULD]** — Camera interruption (another app uses camera) is handled by ARCore/ARKit. Unity emits `onError` with `CAMERA_CONFLICT` if detectable.

> **Evidence:** `UnityBridgeModule.ts` exposes `pauseSession()` and `resumeSession()`. These are NOT currently wired to app lifecycle in `ARScreen.tsx`.

### H-3. Unity Lifecycle

**MOB-LIFE-REQ-020 [TARGET][MUST]** — `UnityBridge.startARSession()` initializes the AR session in Unity.

**MOB-LIFE-REQ-021 [TARGET][MUST]** — `UnityBridge.pauseSession()` pauses the AR session in Unity without destroying it.

**MOB-LIFE-REQ-022 [TARGET][MUST]** — `UnityBridge.resumeSession()` resumes a paused AR session, restoring tracking state.

**MOB-LIFE-REQ-023 [TARGET][MUST]** — `UnityBridge.destroySession()` destroys the AR session and releases all Unity resources.

**MOB-LIFE-REQ-024 [TARGET][MUST]** — App background/foreground calls MUST be wired in `ARScreen.tsx` using `AppState` or `useAppState` from `expo-linking` or equivalent.

---

## I. ERROR / RECOVERY

### I-1. Error Taxonomy

| Error Code | Source | User Message | Recovery |
|-----------|--------|-------------|---------|
| `BACKEND_UNAVAILABLE` | RN | "Connection problem — check your internet and try again" | Retry button |
| `QR_INVALID` | RN | "Hmm, this card isn't in our library yet!" | Go back |
| `QR_UNAUTHORIZED` | RN | "This card belongs to another learner" | Go back |
| `REFERENCE_IMAGE_LOAD_FAILED` | Unity → RN | "Couldn't load the card image" | Retry button |
| `MODEL_LOAD_FAILED` | Unity → RN | "The 3D model didn't load" | Retry button |
| `UNITY_INIT_FAILED` | Unity → RN | "AR didn't start properly" | Retry button |
| `AR_INIT_FAILED` | Unity → RN | "AR couldn't start on this device" | WebAR fallback |
| `AR_CAPABILITY_UNSUPPORTED` | Unity → RN | "This device doesn't support AR yet" | WebAR fallback |
| `CAMERA_PERMISSION_DENIED` | Unity → RN | "Camera access is needed for AR" | Open settings |
| `CAMERA_CONFLICT` | Unity → RN | "Camera is in use by another app" | Dismiss and retry |
| `BRIDGE_DISCONNECTED` | RN | "Lost connection to AR" | Retry or go back |
| `TRACKING_TIMEOUT` | RN | "Having trouble finding the card" | Show card preview |

**MOB-ERR-REQ-001 [TARGET][MUST]** — All errors show kid-friendly messaging (emoji + plain language) via `ARLoadingOverlay` error state.

**MOB-ERR-REQ-002 [TARGET][MUST]** — All errors are logged with sufficient context for debugging (see `MOB-ERR-REQ-020`).

**MOB-ERR-REQ-003 [TARGET][MUST]** — Errors from Unity are transmitted via `onError` with a `code` string. RN maps codes to user messages per the taxonomy above.

**MOB-ERR-REQ-004 [TARGET][MUST]** — Retriable failures (network, load) show a "Try Again" button that re-runs the failed step.

**MOB-ERR-REQ-005 [TARGET][MUST]** — Non-retriable failures (unsupported device, unauthorized) show a "Go Back" button.

**MOB-ERR-REQ-006 [TARGET][MUST]** — WebAR fallback is offered for AR-capability failures where WebAR is available and feature-parity conditions are met.

### I-2. AR Foundation Error Mapping

**MOB-ERR-REQ-010 [TARGET][MUST]** — Unity maps AR subsystem errors to bridge `onError` codes:

- `ARFoundationNotInstalled` → `AR_INIT_FAILED`
- `ARCoreNotInstalled` → `AR_CAPABILITY_UNSUPPORTED`
- `CameraPermissionDenied` → `CAMERA_PERMISSION_DENIED`
- `SessionInterrupted` → `AR_SESSION_INTERRUPTED` (RN triggers pause)
- `SessionFailed` → `AR_INIT_FAILED`

### I-3. Retry Behavior

**MOB-ERR-REQ-015 [TARGET][MUST]** — Network retries use exponential backoff with a 2s initial delay, maximum 3 attempts.

**MOB-ERR-REQ-016 [TARGET][MUST]** — Reference image download failures are retried once with a 5s delay before transitioning to error state.

**MOB-ERR-REQ-017 [TARGET][MUST]** — GLB model download failures are retried once with a 5s delay.

**MOB-ERR-REQ-018 [TARGET][MUST]** — After maximum retries, the error state is shown and the session is terminated. No silent retry loops.

### I-4. Logging

**MOB-ERR-REQ-020 [TARGET][SHOULD]** — AR errors are logged via `emitMobileDebug()` to the backend debug endpoint, including: error code, device info, session state, Unity version, and timestamp.

---

## J. WEBAR FALLBACK

### J-1. Fallback Conditions

**MOB-FALLBACK-REQ-001 [TARGET][MUST]** — WebAR fallback is available when:
- Native Unity AR fails with `AR_INIT_FAILED`, `AR_CAPABILITY_UNSUPPORTED`, or `CAMERA_PERMISSION_DENIED`
- AND WebAR feature flag is enabled
- AND the flashcard has MindAR-compatible content (`mind_catalog_id` + `mind_target_index`)

**MOB-FALLBACK-REQ-002 [TARGET][MUST]** — WebAR fallback is NOT available when:
- The failure is non-recoverable (e.g., backend unreachable)
- The flashcard has no MindAR content
- Feature flag disables WebAR fallback

**MOB-FALLBACK-REQ-003 [TARGET][SHOULD]** — When WebAR fallback is offered, RN navigates to the `AR` screen with a mode flag (`useWebAR: true`) that renders the MindAR WebView path instead of Unity.

**MOB-FALLBACK-REQ-004 [TARGET][SHOULD]** — The user is not automatically redirected to WebAR without consent. A prompt is shown: "Having trouble? Try our web AR instead."

### J-2. Fallback Feature Parity

**MOB-FALLBACK-REQ-010 [TARGET][MUST]** — WebAR fallback MUST only be used for features that have feature parity with the MindAR implementation. Native-only features (Unity-specific animations, spatial combo detection) are NOT available in fallback.

**MOB-FALLBACK-REQ-011 [TARGET][SHOULD]** — WebAR fallback sessions track the same backend session lifecycle (`POST /api/v1/sessions/start`, `PATCH /api/v1/sessions/{id}/end`).

---

## K. RN ↔ UNITY BRIDGE CONTRACT

### K-1. RN → Unity Methods

All methods dispatched via `RNMessageReceiver.OnMessageFromRN("methodName|{json}")`.

| Method | Payload | State | Notes |
|--------|---------|-------|-------|
| `startARSession` | none | MOB-LIFE-REQ-001 | Initializes Unity AR session |
| `loadExperience` | `UnityARExperiencePayload` | D-1 | Single-card experience load |
| `startImageTrackingMulti` | `List<CardDescriptorRN>` | D-2 | **New**: multi-card library build |
| `pauseSession` | none | H-2 | Pause AR session on app background |
| `resumeSession` | none | H-2 | Resume AR session on app foreground |
| `destroySession` | none | H-1 | Cleanup on exit |
| `playAudio` | `{ audioUrl: string }` | G | Request Unity to play pronunciation |
| `closeExperience` | none | A-3 | Close current experience |

### K-2. Unity → RN Events

All events sent via `RNEventEmitter.SendEvent("eventName", payload)`.

| Event | Payload | Consumer | State |
|-------|---------|----------|-------|
| `onArReady` | `{ version: string }` | RN | D-1 |
| `onError` | `{ code: string, message: string }` | RN | I-1 |
| `onImageDetected` | `{ imageId: string, qrId: string, transform: Vector3 }` | RN | E-1, G-2 |
| `onImageTrackingLost` | `{ qrId: string }` | RN | E-1 |
| `onMultiImageDetected` | `{ qrIds: string[], count: number }` | RN | F-1 |
| `onModelProgress` | `{ progress: number, stage: string }` | RN | D-1 |
| `onModelLoaded` | `{ modelUrl: string, qrId: string }` | RN | D-1 |
| `onProximityNear` | `{ qrIdA: string, qrIdB: string, distance: number }` | RN | F-1 |
| `onComboTriggered` | `{ qrIdA: string, qrIdB: string, comboId: string }` | RN | F-1 |
| `onComboComplete` | `{ rewardCardId: string, xpAwarded: number }` | RN | F-1, G-2 |
| `onFoodDragging` | `{ foodModelId: string }` | RN | G |
| `onFoodFed` | `{ foodModelId: string, xpAwarded: number }` | RN | G |
| `onPetStateChanged` | `{ state: string }` | RN | G |

### K-3. Payload Types

**CardDescriptorRN (RN → Unity for multi-card)**:
```typescript
interface CardDescriptorRN {
  qrId: string;           // business flashcard ID
  imageUrl: string;        // reference_image_url from backend
  physicalWidthMeters: number;  // physical_width_m from backend
}
```

**UnityARExperiencePayload (RN → Unity for single-card)**:
```typescript
interface UnityARExperiencePayload {
  qrId: string;
  word: string;
  translationVi: string;
  audioUrl: string;
  modelUrl: string;
  animationType: 'rotate' | 'bounce' | 'idle';
  glbSize: number;
  position: string;       // "x y z"
  rotation: string;       // "x y z"
  scale: string;          // "x y z"
}
```

### K-4. Semantic Contract Clarifications

**MOB-ERR-REQ-030 [TARGET][MUST]** — `onObjectPlaced` (existing in bridge) carries plane-tap semantics from a legacy design. For native image tracking, `onImageDetected` is the primary spatial event. `onObjectPlaced` is not the image-tracking anchor event.

**MOB-ERR-REQ-031 [TARGET][MUST]** — `onPlaneDetected` (existing in bridge) carries plane-detection semantics from a legacy design. For native image tracking, this event should be suppressed or treated as informational. Plane detection is optional and controlled via `setPlaneDetection`.

**MOB-ERR-REQ-032 [TARGET][MUST]** — The bridge contract is image-tracking-centric. Plane-based placement is not part of the native AR target architecture.

---

## L. ACCEPTANCE CRITERIA

### Mobile-Specific Gates

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

### XP Persistence — Architectural Notes

There is a tension between two architectural approaches for XP persistence. M7 MUST NOT silently implement one approach while another approach is under consideration.

**Approach A (immediate persistence):** `onComboComplete` → immediately call `POST /gamification/add-xp`. This is what MOB-GAME-REQ-020 and MOB-GAME-REQ-021 describe. Idempotency is handled by `MOB-GAME-REQ-003` (max 3 retries, 2s backoff). The AR interaction is considered complete when the combo fires, and XP is awarded immediately.

**Approach B (session-end persistence):** Accumulate XP events during the AR session; call backend XP API at session end (`SESSION_COMPLETED`). This means retry logic buffers events locally until session end. A failed session-end call would lose buffered XP unless persisted to local storage first.

**Current code evidence:** `useARSession.ts` stores `currentStreak` in local state only. `MOB-GAME-REQ-012` says streak and XP SHOULD be persisted at session end. `MOB-GAME-REQ-003` (retry with idempotency) implies immediate persistence.

**Constraint:** Whatever approach is chosen, retrying XP persistence MUST NOT require replaying the AR interaction (e.g., re-detecting cards, re-triggering combos). If Approach B is chosen, the AR gameplay event is the trigger, and the XP call happens asynchronously and idempotently.

**DECISION_REQUIRED:** MQ-3 — Choose Approach A (immediate) or Approach B (session-end). This decision affects M7 implementation scope, retry strategy, and whether MOB-GAME-REQ-012 is MUST or not implemented.

| # | Question | Blocks | Owner |
|---|----------|--------|-------|
| MQ-1 | Should `startImageTrackingMulti` replace `startImageTracking` (breaking) or be added as parallel? | MOB-LOAD-REQ-011 | Mobile architect |
| MQ-2 | Who owns WebAR fallback rendering — a separate screen or a mode flag? | MOB-FALLBACK-REQ-003 | Mobile architect |
| MQ-3 | Should XP be persisted continuously during AR or only at session end? | MOB-GAME-REQ-012 | Product |
| MQ-4 | What is the exact wording for tracking guidance strings? | E-1 | UX / i18n |
| MQ-5 | Should camera permission be pre-requested by RN before launching Unity, or always delegated to Unity? | C-1 | Mobile architect |
| MQ-6 | Is AR-capability detection done by Unity (ARFoundation subsystem check) or by RN (native module query)? | C-2 | Unity / Mobile |

---

## Evidence Reconciliation

Verified against `mobile/rn/src/` on 2026-08-09. ✅ = confirmed in code; ❌ = NOT found; ⚠️ = partial.

| Evidence item | Verdict | Repository evidence |
|---|---|---|
| `UnityBridgeModule.ts` has `pauseSession`/`resumeSession` methods | ✅ | Lines 91-101: stub methods exist, no native wiring |
| `UnityBridgeModule.ts` has `startImageTrackingMulti` | ❌ | Only `startImageTracking(referenceImageLibraryId?)` stub; multi-card method not yet implemented |
| `AppState` wired to pause/resume in `ARScreen.tsx` | ❌ | No `AppState` import; pause/resume lifecycle not wired |
| `ARScreen.tsx` navigates to AR from `LessonPlayerScreen` | ❌ | `LessonPlayerScreen.tsx` shows "AR coming soon" placeholder; no navigation to AR |
| `RewardCelebration` overlay in RN | ❌ | No `RewardCelebration` component in `src/components/` |
| `PetStatusOverlay` shows streak | ✅ | `PetStatusOverlay` exists; `ARScreen.tsx` passes `currentStreak` prop; streak not persisted to backend |
| `QRScanPrompt` camera scanning wired | ❌ | Static placeholder; `expo-camera` never imported in source |
| Backend `/gamification/add-xp` available | ✅ | `api.ts` `coursesApi.addXp()` calls `POST /gamification/add-xp` |
| Backend session lifecycle endpoints exist | ✅ | `api.ts` has `startLessonSession` and lesson session endpoints |
| Unity bridge methods are stubs | ✅ | `UnityBridgeModule.ts` all methods have empty `catch` blocks or no-op bodies |
| `currentStreak` persisted to backend at session end | ❌ | `useARSession.ts` stores only in local state; no backend call on session end |
| `flashcard_viewed` XP awarded on first detection | ❌ | `onImageDetected` handler updates `trackedImages` only; no XP API call |
| `combo_discovered` XP awarded on combo | ❌ | `onComboComplete` handler only updates local `currentStreak`; no `coursesApi.addXp` call |
| `expo-camera` imported in RN | ❌ | In `package.json` but never imported in source |
| WebAR fallback screen in RN | ❌ | No MindAR or WebView AR rendering in RN |
| `UnityView` component | ✅ | `UnityView.tsx` exists in `src/components/` |
| `ClayProgressBar` with 3 stages | ✅ | Supports `download/load/instantiate` |
| `ComboOverlay` floating animation | ✅ | Button + hint text |
| `UnityARExperiencePayload` has native AR additive fields | ❌ | Missing `referenceImageUrl` and `physicalWidthMeters` |
| `ARExperienceMapper.mapToUnityPayload()` | ✅ | Maps backend response; lacks native AR additive fields |
| Backend has `reference_image_url` / `physical_width_m` | ❌ | Backend contract missing these fields (per `backend-contract.md` + grep confirmed zero matches) |
