# Research Report: Unity AR Loading UX

## Summary

This report investigates best-practice UX patterns for loading 3D GLB models over the RN↔Unity AR bridge, covering progress reporting, loading overlays, cache UX, error states, and Unity initialization. Based on code audit of the existing bridge infrastructure, a **Hybrid Loading Overlay** (RN-first, Unity-minimal) is recommended, with a 7-state finite state machine in `ARScreen.tsx` and granular progress events from `GLBLoader.cs` flowing through the existing `RNEventEmitter`.

---

## 1. Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER FLOW                                           │
│                                                                                 │
│  [QR Scanned]                                                                  │
│       │                                                                        │
│       ▼                                                                        │
│  ┌─────────┐  RN sends initSession  ┌──────────────┐  ARSession Ready         │
│  │  RN:    │ ─────────────────────▶│ Unity:       │ ──────────────────────   │
│  │ ARScreen│                        │ ARSessionMgr │                         │
│  └─────────┘                        └──────────────┘                         │
│       │                                    │                                   │
│       │                         onArReady event                                │
│       │◀──────────────────────────────────┘                                   │
│       │                                                                        │
│       ▼                                                                        │
│  ┌─────────┐                        ┌──────────────┐                           │
│  │  RN:    │ ─────────────────────▶│ Unity:       │ ────────────────────    │
│  │ Loading │  enable plane          │ PlaneDetection│                        │
│  │ Overlay │  detection             └──────────────┘                           │
│  └─────────┘                            │                                     │
│       │                         onPlaneDetected event                         │
│       │◀──────────────────────────────────┘                                   │
│       │                                                                        │
│       ▼                                                                        │
│  ┌─────────┐                        ┌──────────────┐                          │
│  │  RN:    │ ◀─────────────────────│ Unity:       │ ─────────────────────── │
│  │ Tap to  │  show "tap to place"   │ ARExperience │  HandleScreenTap()       │
│  │ Place   │  prompt               │ Handler      │                          │
│  └─────────┘                        └──────────────┘                          │
│       │                                    │                                    │
│       ▼                                    ▼                                    │
│  [User taps screen]                         ▼                                    │
│       │                           ┌──────────────┐                              │
│       │                           │ GLBLoader:  │                              │
│       │                           │ TryDownload  │                              │
│       │◀─────────────────────────────────────────────────────────────          │
│       │  onProgress { phase:"download", progress:0.0-1.0 }                     │
│       │                                                                        │
│       ▼                           ┌──────────────┐                              │
│  [Download complete]              │ GLBLoader:   │                              │
│       │                           │ Load(downloaded_uri)                       │
│       │◀─────────────────────────────────────────────────────────────          │
│       │  onProgress { phase:"load", progress:0.0-1.0 }                        │
│       │                                                                        │
│       ▼                           ┌──────────────┐                              │
│  [Model loaded]                  │ GLBLoader:   │                              │
│       │                           │ Instantiate  │                              │
│       │                           └──────────────┘                              │
│       │                                    │                                    │
│       │◀──────────────────────────────────┘                                    │
│       │  onModelReady { qrId }                                             │
│       ▼                                                                        │
│  ┌─────────┐  Animation + Audio play  ┌──────────────┐                        │
│  │  RN:    │ ──────────────────────▶  │ AnimationCtlr│                        │
│  │ Flashcard│                         │ ARAudioPlayer│                        │
│  │ Overlay  │  onAnimationComplete    │              │                        │
│  └─────────┘ ◀────────────────────────┴──────────────┘                        │
│       │                                                                        │
│       ▼                                                                        │
│  [Interaction Ready]                                                           │
│       │                                                                        │
│       ▼                                                                        │
│  [User taps model]                                                             │
│       │◀─────────────────────────────────────────────────────────────────────  │
│       │  onInteraction { type:"tap", qrId }                                   │
│       ▼                                                                        │
│  [AR Quiz / Next Card]                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Critical Observations from Code Audit

- **`onPlaneDetected` fires but ARExperienceHandler does NOT emit it to RN.** Line 90 in `ARExperienceHandler.cs` receives the plane event but only logs it. The `onPlaneDetected` event is emitted by `PlaneDetection.cs` (line 50) directly — so RN will receive it, but `HandlePlaneDetected` is dead code for the RN bridge.
- **`onObjectPlaced` does NOT exist** in the existing event stubs listed in the task. The task mentions `onAnimationComplete` but not `onObjectPlaced`. `ARExperienceHandler` fires `onObjectPlaced` at line 148 — this is a new event that needs to be added to the RN subscription list.
- **`RNEventEmitter` only sends on iOS** (`#if UNITY_IOS` at line 43-44). Android path is stubbed.
- **`GLBLoader.TryDownload` has no progress reporting** — it only awaits `operation.isDone` in a busy loop (lines 116-118), so download progress is invisible to both RN and Unity.
- **`GLTFast.Load()` and `InstantiateMainSceneAsync()` have no progress callbacks** — they are fire-and-forget awaits.

---

## 2. Approach Comparison: Loading Overlay

### 2.1 Progress Events from Unity (Option A)

| Dimension | Finding |
|-----------|---------|
| **Accuracy** | GLBLoader currently has NO progress instrumentation. `UnityWebRequest.Get().SendWebRequest()` has a `.progress` property, but the current busy-wait loop ignores it. GLTFast's `Load()` and `InstantiateMainSceneAsync()` expose no public progress callbacks in their API. |
| **Latency** | Unity → RN via `UnitySendMessage` → Swift → RN NativeEventEmitter adds ~1-2 frame latency per event. Acceptable for progress (not acceptable for per-frame data). |
| **Reliability** | `RNEventEmitter.SendEvent` catches exceptions but does not retry. Progress events can be lost if emitted during session teardown. |
| **Granularity** | Two distinct phases: download (trackable via `UnityWebRequest.progress`) and load (GLTFast — no public progress API). |

### 2.2 RN Tracks Progress via HTTP HEAD (Option B)

| Dimension | Finding |
|-----------|---------|
| **Accuracy** | `flashcardApi.getFlashcard()` already exists. RN could issue a `HEAD` request to get `Content-Length`, then track download via RN's HTTP client with per-byte progress. This is MORE accurate than Unity-side tracking since Unity's GLTFast has no load progress. |
| **Complexity** | Requires RN to know the file size upfront. Only works if the backend serves correct `Content-Length` headers. Requires parallel tracking (RN for download, Unity for load). |
| **Benefit** | RN owns the loading UX entirely; Unity becomes a pure renderer. Consistent with the RN-first architecture already in `ARScreen.tsx`. |

### 2.3 Unity Built-in Loading (Option C)

| Dimension | Finding |
|-----------|---------|
| **Accuracy** | `ARSession.stateChanged` provides session state but no asset load progress. No Unity-side progress API for GLTFast loading. |
| **UX Control** | Unity rendering inside a transparent or semi-transparent overlay view is technically possible, but conflicts with the existing claymorphic RN design system in `ProgressTracker.tsx`, `QRScanPrompt.tsx`, and `FlashcardOverlay.tsx`. |

### 2.4 Comparison Matrix

| Criteria | A: Unity Events | B: RN HTTP Track | C: Unity Render |
|----------|----------------|------------------|-----------------|
| Download progress | Needs implementation | ✅ Available | ❌ Not available |
| Load/instantiate progress | ❌ GLTFast no API | ✅ RN shows completion | ❌ Not available |
| UX consistency (claymorphic) | ✅ RN renders | ✅ RN renders | ❌ Unity renders |
| Code complexity | Medium (add events) | Medium (parallel HTTP) | Low |
| Accuracy | Partial (download only) | High (RN owns UX) | None |
| Cache differentiation | Hard (needs cache signal) | Easy (can check cache first) | Hard |
| Error granularity | ✅ Unity can report errors | ✅ RN can handle retries | ✅ Unity error overlay |

---

## 3. Recommended Approach

### **Recommended: Hybrid — RN Owns Loading UX, Unity Reports Cache/Phase Signals**

**Rationale:** The existing RN design system uses claymorphic UI components. For consistency, RN should render the loading overlay. Unity should be modified to emit phase-change signals (not per-tick progress) so RN can drive the UX accurately.

**Key insight:** GLTFast has no public progress API for the actual GLB parsing/instantiation phase. Therefore, per-byte download progress (which Unity CAN track via `UnityWebRequest.progress`) should be reported by Unity, while the load/instantiate phase should be communicated as discrete steps by Unity.

**Implementation plan:**

1. **Modify `GLBLoader.cs`** to:
   - Report download progress via `onProgress { phase: "download", progress: 0.0-1.0 }` using `request.downloadProgress`
   - Report load phase via `onProgress { phase: "load", progress: 0.0 }` (start) and `onProgress { phase: "load", progress: 1.0 }` (complete)
   - Check cache and emit `onProgress { phase: "cache_hit" }` instead of download events when serving from cache

2. **Modify `ARExperienceHandler.cs`** to:
   - Emit `onPlaneDetected` (fix the dead code at line 90-91)
   - Emit `onObjectPlaced` (already implemented but not documented in task event stubs)
   - Add `onLoadPhase { phase: "downloading" | "loading" | "ready" | "animating" }`

3. **Redesign `ARScreen.tsx`** as a 7-state machine driving the overlay

4. **RN distinguishes cache vs network** by receiving `phase: "cache_hit"` — for cache hits, skip progress bar and show a brief 200ms shimmer then immediate model load.

---

## 4. RN State Machine

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ARScreen State Machine                                  │
│                                                                               │
│  ┌─────────────┐  initSession()  ┌────────────────────┐  onArReady          │
│  │   IDLE     │ ──────────────▶ │  AR_INITIALIZING  │ ─────────────────┐  │
│  │ (no camera)│                 │  (RN spinner only) │                   │  │
│  └─────────────┘                 └────────────────────┘                   │  │
│       ▲                                                           ┌─────────▼──┐
│       │  onError(SESSION_FAILED) or user back                    │  SCANNING   │
│       │                                                           │ (AR camera  │
│       │                                                           │  + QR scan  │
│       │                                                           │  overlay)   │
│       │                                                           └─────────┬───┘
│       │                                                                     │
│       │                                        onPlaneDetected               │
│       │◀────────────────────────────────────────────────────────────────────┘
│       │
│       │
│  ┌────▼──────────────────┐  user tap screen
│  │  TAP_TO_PLACE         │ ───────────────────▶  ┌──────────────────────────┐
│  │  (model + anchor      │                      │  LOADING                 │
│  │   icon overlaid on    │                      │  (RN overlay, claymorphic │
│  │   AR camera)         │                      │   progress bar + phase   │
│  └───────────────────────┘                      │   label)                  │
│                                                 │                           │
│                                                 │ onProgress (cache_hit)    │
│                                                 │ ▶ skip to LOAD_COMPLETE  │
│                                                 │ onProgress (downloading) │
│                                                 │ ▶ show download %         │
│                                                 │ onProgress (loading)     │
│                                                 │ ▶ show "Loading model..."│
│                                                 └───────────┬──────────────┘
│                                                             │
│                                               onModelReady   │
│                                               onLoadPhase=ready
│                                                             ▼
│  ┌──────────────────────┐              ┌──────────────────────────┐
│  │  TAP_TO_PLACE        │              │  LOAD_COMPLETE           │
│  │  (AR anchor placed,  │◀─────────────│  (brief 200ms checkmark  │
│  │   anchor icon       │ onObjectPlaced│   animation)             │
│  │   visible)          │              └───────────┬──────────────┘
│  └──────────────────────┘                        │
│                                                    │ auto (100ms)
│  ┌──────────────────────┐              ┌─────────▼──────────────┐
│  │  INTERACTION_READY  │◀─────────────│  PLAYING                │
│  │  (AR model visible, │ onAnimation-  │ (model animating +     │
│  │   flashcard overlay  │ Complete      │  audio playing,         │
│  │   at bottom,         │              │  "Tap the [word]"      │
│  │   progress tracker)   │              │  prompt)               │
│  └──────────────────────┘              └─────────┬──────────────┘
│       ▲                                              │
│       │                                              │ user taps model
│       │                                              ▼
│       │                                    ┌──────────────────────┐
│       │                                    │  QUIZ_RESPONSE       │
│       │                                    │  (RN overlay:        │
│       │                                    │   correct/incorrect   │
│       │                                    │   + XP animation)    │
│       │                                    └──────────┬───────────┘
│       │                                               │
│       │                                    ┌──────────▼───────────┐
│       │                                    │  back to IDLE or    │
│       └────────────────────────────────────│  next card (loop)   │
│                 onError / user back        └─────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘
```

### State Definitions

| State | Description | RN UI | Unity State |
|-------|-------------|-------|-------------|
| `IDLE` | Screen opened, AR not yet started | Empty/dark screen | Unity paused |
| `AR_INITIALIZING` | `initSession()` called, waiting for AR | RN spinner overlay | ARSession starting |
| `SCANNING` | AR camera active, searching for surfaces | `QRScanPrompt` overlay | Plane detection enabled |
| `TAP_TO_PLACE` | Surface detected, awaiting user tap | Anchor placement icon | Show surface indicator |
| `LOADING` | User tapped, GLB downloading/loading | Claymorphic progress bar | GLBLoader active |
| `LOAD_COMPLETE` | Model loaded into scene, about to animate | Brief checkmark | Model at anchor, hidden |
| `PLAYING` | Animation + audio playing | `FlashcardOverlay` + `ProgressTracker` | Animation playing |
| `INTERACTION_READY` | User can tap model for quiz | Full overlay with quiz prompts | Model idle |
| `QUIZ_RESPONSE` | User answered quiz | Result + XP animation | — |
| `ERROR` | Any failure along the path | Error card with retry/fallback | Session paused |

---

## 5. Existing Code Audit — Required Changes

### 5.1 `GLBLoader.cs` — 5 changes needed

| Change | Location | Description |
|--------|----------|-------------|
| **Progress loop** | `TryDownload()`, lines 115-118 | Replace busy-wait with `request.downloadProgress` tracking; emit `onProgress { phase: "download", progress }` every 5% change |
| **Cache signal** | `GetCachedPath()`, line 93-94 | After cache hit, emit `onProgress { phase: "cache_hit", progress: 1.0 }` |
| **Load phase start** | `LoadGLB()`, line 59 | After successful download, emit `onProgress { phase: "loading", progress: 0.0 }` |
| **Load phase end** | `LoadGLB()`, line 71 | After `InstantiateMainSceneAsync`, emit `onProgress { phase: "loading", progress: 1.0 }` |
| **Cancellation guard** | `LoadGLB()`, line 74-76 | Already handles `OperationCanceledException` — fine |

**Code snippet — progress reporting in TryDownload:**

```csharp
// Around line 116-118, replace busy-wait loop:
float lastReported = -1f;
var operation = request.SendWebRequest();
while (!operation.isDone && !token.IsCancellationRequested) {
    await Task.Delay(100, token);
    float prog = request.downloadProgress;
    if (prog - lastReported >= 0.05f) {
        lastReported = prog;
        RNEventEmitter.Instance.SendEvent("onProgress", new {
            phase = "download",
            progress = prog
        });
    }
}
```

### 5.2 `ARExperienceHandler.cs` — 3 changes needed

| Change | Location | Description |
|--------|----------|-------------|
| **Fix `HandlePlaneDetected`** | Line 87-92 | Currently dead code — add `RNEventEmitter.Instance.SendEvent("onPlaneDetected", ...)` |
| **Load phase tracking** | `SpawnAndAnimate()`, line 123 | Emit `onProgress { phase: "loading", progress: 0.0 }` before `LoadGLB`, and `onModelReady` after load |
| **Document `onObjectPlaced`** | Line 148 | Already fires — add to RN subscription list; add a corresponding RN event type in `arMessages.ts` |

**Code snippet — load phase tracking:**

```csharp
private async Task SpawnAndAnimate(Vector3 position) {
    // ...
    try {
        RNEventEmitter.Instance.SendEvent("onProgress", new {
            phase = "loading",
            progress = 0.0f
        });

        var modelPrefab = await glbLoader.LoadGLB(payload.ModelUrl);
        // GLBLoader emits its own progress events during download/load
        if (modelPrefab == null) return;

        RNEventEmitter.Instance.SendEvent("onModelReady", new {
            qrId = payload.QrId
        });
        // ...rest of spawn logic
    }
}
```

### 5.3 `RNEventEmitter.cs` — 1 change needed

| Change | Location | Description |
|--------|----------|-------------|
| **Android support** | Line 43-44 | The `#if UNITY_IOS` guard means Android receives no events. For cross-platform, add Android message passing via `UnityPlayer.UnitySendMessage` or a similar bridge. |

### 5.4 `ARScreen.tsx` — Complete redesign needed

Current `ARScreen.tsx` is a placeholder with a single `loading` boolean and `placeholder` text. Replace with a state machine:

```typescript
type ARScreenState =
  | 'IDLE'
  | 'AR_INITIALIZING'
  | 'SCANNING'
  | 'TAP_TO_PLACE'
  | 'LOADING'
  | 'LOAD_COMPLETE'
  | 'PLAYING'
  | 'INTERACTION_READY'
  | 'ERROR';

// State machine implementation:
// - useEffect subscribes to all RN bridge events
// - switch/case on state + event => next state
// - render overlay based on current state
// - ProgressTracker shows XP (loaded from context)
// - QRScanPrompt shown in SCANNING state
// - FlashcardOverlay shown in INTERACTION_READY state
```

### 5.5 `UnityView.tsx` — Minimal change needed

Current placeholder needs to be replaced with actual Unity view rendering. For Expo + Unity integration, this typically requires:
- `react-native-unity-view` or a custom native view manager
- Passing the `UnityARExperiencePayload` to the native module
- The view should always render (it's the AR camera feed), with RN overlays on top

### 5.6 `ProgressTracker.tsx` — Already well-structured

The existing `ProgressTracker` component is already claymorphic-styled and ready for XP animation. No structural changes needed — just wire up real `currentXP` and `level` from a shared context or props.

### 5.7 New Event Types Needed in `arMessages.ts`

```typescript
// Add to ARMessageType:
export type ARMessageType =
  | 'LOAD_EXPERIENCE'
  | 'EXPERIENCE_LOADED'
  | 'EXPERIENCE_ERROR'
  | 'SCAN_START'
  // New types:
  | 'AR_READY'
  | 'PLANE_DETECTED'
  | 'OBJECT_PLACED'
  | 'MODEL_READY'
  | 'ANIMATION_COMPLETE'
  | 'LOAD_PROGRESS'    // new
  | 'CACHE_HIT'       // new
  | 'INTERACTION';
```

---

## 6. Error and Retry States

| Error Code | Source | RN UX |
|-----------|--------|-------|
| `SESSION_FAILED` | `ARSessionManager` or `RNMessageReceiver` | Full-screen error: "AR not available on this device" + "Try 2D mode" button |
| `MODEL_LOAD_FAILED` | `GLBLoader` or `ARExperienceHandler` | "Failed to load 3D model" + Retry button + "Use 2D flashcard" fallback |
| `PLANE_DETECTION_ERROR` | `PlaneDetection` | "Having trouble finding a surface" + tips: "Move your device slowly" + Retry |
| Network timeout | RN `flashcardApi` | Standard error with Retry |
| Cache corruption | `GLBLoader` (file exists but corrupted) | Auto-retry from network, single retry only |

**Retry UX:** The loading state machine should support a `retryCount` (max 2). After 2 failures, show the 2D fallback card. The 2D fallback renders the same `FlashcardOverlay` without AR — the word, translation, and audio still work.

---

## 7. Cache UX

| Scenario | RN Behavior |
|----------|-------------|
| **Cache miss (network download)** | Show full loading overlay with download progress bar + "Downloading model..." label |
| **Cache hit** | `GLBLoader` emits `phase: "cache_hit"`. RN receives it and shows: brief shimmer (200ms) → immediate transition to `TAP_TO_PLACE`. Total perceived delay: ~200-500ms. |
| **Stale cache** | Not applicable — `Application.temporaryCachePath` is cleared on app restart. No stale cache concern. |
| **Cache size** | `Application.temporaryCachePath` is limited. For a vocabulary app with 50-200 words, each GLB at ~1-5MB, total cache ~50-1000MB. Acceptable. No explicit cache eviction needed for MVP. |

---

## 8. Unity Initialization — Pre-AR State

When the AR screen first opens, the user sees a RN-only loading state before the AR camera starts:

1. **User taps "Start AR"** in the lesson screen
2. **RN navigates to `ARScreen`** in `AR_INITIALIZING` state
3. **RN shows a claymorphic overlay**: "Starting AR..." with spinner + brief tip ("Point at a flat surface")
4. **RN calls `initSession()`** via `unityBridge`
5. **Unity's `ARSessionManager`** initializes `ARSession` and fires `onArReady`
6. **RN receives `onArReady`** → transitions to `SCANNING`
7. **RN hides the initialization overlay** → shows `QRScanPrompt` overlay while camera is active

**Rationale:** AR session initialization on mobile can take 1-4 seconds. Showing the camera before initialization completes results in a blank/black screen, which is a poor UX. The RN overlay provides immediate feedback.

---

## 9. Open Questions for Product Owner

1. **Animation completion UX**: The task lists `onAnimationComplete` but `ARExperienceHandler` already fires `onObjectPlaced` immediately after the model spawns — before animation starts. Should `onAnimationComplete` trigger the flashcard overlay appearance, or should the flashcard appear as soon as the model is placed (overlapping with animation)?

2. **XP award timing**: Should XP be awarded at `onObjectPlaced` (model placed), `onAnimationComplete` (animation finished), or `INTERACTION_READY` (user taps model for quiz)?

3. **Loading timeout**: What should the timeout be for GLB download + load? Suggested: 30 seconds before showing the "Slow connection" error with Retry.

4. **Offline behavior**: If the user has no network and the GLB is not cached, should the app: (a) show "Download required" with a one-time download button, (b) fall back to 2D immediately, or (c) show a queued download option?

5. **Multiple AR cards per lesson**: The current flow assumes one AR experience per lesson. If a lesson has 5 flashcards, does the user scan 5 QR codes, or does RN orchestrate a sequence? This affects whether `ARScreen` handles one experience or loops through multiple.

6. **Android parity**: `RNEventEmitter` currently only sends events on iOS. Should Android be prioritized for MVP, or is iOS-only acceptable for Phase 2?

7. **GLB file size awareness**: The `UnityARExperiencePayload.glbSize` field exists but is not used by RN. Should RN show an estimated download time based on `glbSize`, or is this premature optimization?

---

## References

- GLTFast API: `GltfImport.Load()`, `GltfImport.InstantiateMainSceneAsync()` — no public progress API
- Unity `UnityWebRequest.downloadProgress`: available on the `AsyncOperation` returned by `SendWebRequest()`
- ARFoundation `ARSession.stateChanged`: `ARSessionState.Ready` → `onArReady` event
- RN↔Unity bridge: `UnitySendMessage` (iOS) via `RNMessageReceiver.OnMessageFromRN()` / `RNEventEmitter.SendEvent()`
- Existing RN design system: `ProgressTracker`, `QRScanPrompt`, `FlashcardOverlay` — claymorphic styling
