# Unity AR Project — Mobile AR MVP

A Unity ARFoundation 6 project that renders AR flashcards. The AR experience is orchestrated from React Native — when RN triggers an AR load, Unity receives the experience data, detects planes, places anchors, loads GLB models, plays animations, and streams audio.

## Project Setup

### Opening the Project

1. Open Unity Hub and click **Open**
2. Navigate to `mobile/unity/` and open it as a project
3. Wait for the Package Manager to finish resolving dependencies

### Adding Packages

The required packages are declared in `Packages/manifest.json` and Unity will automatically resolve and install them when you open the project. The current pinned versions are:

| Package | Version | Notes |
|---------|---------|-------|
| `com.unity.xr.arfoundation` | `6.3.5` | AR Foundation runtime (Unity 6.3 LTS line) |
| `com.unity.xr.arkit` | `6.3.5` | Apple ARKit backend (iOS) |
| `com.unity.xr.core-utils` | `2.6.0` | XR core utilities |
| `com.unity.xr.management` | `4.5.4` | XR Plug-in Management |
| `com.atteneder.gltfast` | `6.19.0` | Runtime GLB/GLTF loader (used by `GLBLoader.cs`) — **hosted on OpenUPM, see below** |

If a package fails to resolve, check the Unity Console for the exact error — common causes are missing editor modules (e.g. iOS Build Support) or a pinned version that has been removed from the registry.

### OpenUPM Scoped Registry

`com.atteneder.gltfast` is **not** on the public Unity registry — it is distributed via [OpenUPM](https://openupm.com/packages/com.atteneder.gltfast/). The `scopedRegistries` block at the top of `Packages/manifest.json` already points Unity at `https://package.openupm.com` for the `com.atteneder` namespace, so no manual setup is required once the manifest is in place. If you ever copy this project to a fresh machine, do not delete the `scopedRegistries` block — without it Unity will report "Package [com.atteneder.gltfast@6.19.0] cannot be found" and the project will fail to resolve.

### Opening the AR Scene

Open `Assets/Scenes/ARScene.unity`. The scene should contain a root `ARManager` GameObject with the scripts below attached.

## Script Components

### ARExperienceHandler

**File:** `Assets/AR/ARExperienceHandler.cs`

The top-level orchestrator. Receives `loadARExperience` from RN, manages the full AR lifecycle:

```
LoadARExperience(json)
  → ARPayloadMapper.Parse(json)           → ARExperiencePayload
  → PlaneDetection.SetEnabled(true)
  → (wait for onPlaneDetected)
  → HandleScreenTap(screenPosition)
      → AnchorManager.TryPlaceAnchorAt()
      → GLBLoader.LoadGLB(url)
      → ModelSpawner.Spawn()
      → AnimationController.PlayAnimation()
      → ARAudioPlayer.PlayAudio(url)
      → SendEvent("onObjectPlaced", ...)
```

Public methods called by `RNMessageReceiver`:
- `InitSession()` — starts the AR session
- `LoadARExperience(string json)` — entry point for RN-triggered AR
- `SetPlaneDetection(bool enabled)`
- `PauseSession()` / `ResumeSession()` / `DestroySession()`

### ARSessionManager

**File:** `Assets/AR/ARSessionManager.cs`

Manages the ARKit session lifecycle. Uses `ARSession.stateChanged` (ARFoundation 6 API — NOT the deprecated `ARSession.State` polling pattern).

- `InitSession()` — enables the `ARSession` component
- `PauseSession()` / `ResumeSession()` / `StopSession()`
- Emits `onArReady` when `ARSessionState.Ready` is reached
- Emits `onError` on `ARSessionState.SessionFailed`

### PlaneDetection

**File:** `Assets/AR/PlaneDetection.cs`

Enables horizontal plane detection via `ARPlaneManager.planesChanged`. Filters for `PlaneAlignment.Horizontal` only.

- `SetEnabled(bool)` — toggles the `ARPlaneManager` on/off
- Emits `onPlaneDetected` when the first horizontal plane is found

### AnchorManager

**File:** `Assets/AR/AnchorManager.cs`

Places AR anchors at user tap positions using `ARRaycastManager.Raycast()` against detected planes.

- `TryPlaceAnchorAt(screenPosition, onPlaced callback)` — raycasts, creates anchor, fires callback
- `RemoveAnchor(anchorId)` — removes a specific anchor by ID

### ARGestureHandler

**File:** `Assets/Gestures/ARGestureHandler.cs`

Handles user input via Unity's legacy `EventSystem` (`IPointerClickHandler`, `IDragHandler`):

| Gesture | Action |
|---------|--------|
| Single tap | Place anchor, emit `onInteraction tap` |
| Double tap | Reset model scale/rotation, emit `onInteraction double_tap` |
| Single-finger drag | Rotate model on Y axis, emit `onInteraction rotate` |
| Pinch (external) | Scale model — call `ApplyPinchScale(factor)` from external pinch detector |

### ARAudioPlayer

**File:** `Assets/Audio/ARAudioPlayer.cs`

Streams and plays audio from a URL using `UnityWebRequest.GetAudioClip`.

- `PlayAudio(url)` — downloads, starts playback, returns `Task`. Emits `onAudioComplete` when playback finishes (not when download finishes).
- `Stop()` — stops currently playing audio.

### GLBLoader

**File:** `Assets/Models/GLBLoader.cs`

Runtime GLB/GLTF loader built on GLTFast. `ARExperienceHandler` calls `glbLoader.LoadGLB(url, parent, cancellationToken)`, which:

1. Checks local cache (`Application.temporaryCachePath/GLBCache/`)
2. Downloads via `UnityWebRequest` (`DownloadHandlerFile`) if not cached
3. Loads via GLTFast `GltfImport` and instantiates the main scene
4. Returns the loaded `GameObject` (or `null` on failure/cancellation)

Key methods:
- `Task<GameObject> LoadGLB(string url, Transform parent = null, CancellationToken externalToken = default)` — supports caller cancellation via a linked `CancellationTokenSource`.
- `Unload()` — destroys the loaded model and disposes the `GltfImport` to release native memory.

### ModelSpawner

**File:** `Assets/Models/ModelSpawner.cs`

Instantiates and places a loaded model. Handles:
- `Spawn(prefab, position, rotation, scale)` — instantiates and places the model, replacing any existing one
- `SetRotation(euler)` / `SetScale(scale)` — for gesture-driven manipulation
- `Clear()` — destroys the current spawned model

### AnimationController

**File:** `Assets/Models/AnimationController.cs`

Detects and plays animation clips on the model. Handles:
- `DiscoverClips()` — scans the `Animator`'s clips and registers them by hash
- `PlayAnimation(ARAnimationType type)` — cross-fades to rotate / bounce / idle, emits `onAnimationComplete`
- `ResetToIdle()` — returns to the idle animation

## Bridge Scripts

### RNMessageReceiver

**File:** `Assets/Bridge/RNMessageReceiver.cs`

Receives calls from React Native via `UnitySendMessage` (called from Swift). The method format is `"methodName|{jsonPayload}"`.

Handles:
- `initSession` → `ARExperienceHandler.InitSession()`
- `loadARExperience|{...}` → `ARExperienceHandler.LoadARExperience(json)`
- `setPlaneDetection|{"enabled":true}` → `ARExperienceHandler.SetPlaneDetection(enabled)`
- `pauseSession` / `resumeSession` / `destroySession`

Emits `onError` on any exception.

### RNEventEmitter

**File:** `Assets/Bridge/RNEventEmitter.cs`

Singleton that sends events back to React Native via `UnitySendMessage`. Call `RNEventEmitter.Instance.SendEvent(eventName, payload)` from any C# script.

Format sent to Swift: `"eventName|{json}"`.

Events emitted:
- `onArReady` — session initialized
- `onPlaneDetected` — first horizontal plane found
- `onObjectPlaced` — anchor + model placed in AR
- `onAudioComplete` — pronunciation audio finished
- `onInteraction` — user gesture on the model
- `onError` — any error during AR flow

Uses double-checked locking for thread-safe singleton access (critical for ARFoundation callbacks on multiple threads).

### ARPayloadMapper

**File:** `Assets/Bridge/ARPayloadMapper.cs`

Maps JSON from React Native into a strongly-typed `ARExperiencePayload` struct using `JsonUtility.FromJson`. Handles:
- Field name conversion (RN camelCase → Unity struct fields)
- Animation type string → `ARAnimationType` enum
- Vector3 parsing from space-separated strings (`"1.0 2.0 3.0"`)

### UnityFrameworkLoader

**File:** `Assets/UnityServices/UnityFrameworkLoader.cs`

Simple singleton used on iOS to initialize the embedded Unity runtime from Swift. `Initialize()` is called from native Swift code. Also uses double-checked locking.

## iOS Build Notes

1. Set your development team: `Edit → Project Settings → Player → Other → iOS → Signing Team ID`
2. Enable ARKit support in Player Settings if not already enabled
3. `File → Build Settings → iOS → Build` or **Build and Run**
4. For running in the Unity Editor (without a device), ARFoundation will show a "device required" message — connect a physical iOS device for testing

## Swift Integration (Future Phase)

The Swift ↔ Unity bridge is not yet implemented. When adding Swift integration:

1. Create a Swift native module that:
   - Registers as a React Native module (or uses React Native Unity View)
   - Calls `UnitySendMessage("RNMessageReceiver", "OnNativeEvent", message)` to send commands to Unity
   - Listens for `onNativeEvent` messages from `RNEventEmitter` and emits them as RN events via `RCTEventEmitter`
2. The embedded UnityFramework must be initialized before the AR scene loads
3. See `UnityFrameworkLoader.cs` for the Swift-init entry point

## ARFoundation 6 API Notes

This project uses ARFoundation 6. Key API choices:

- `FindFirstObjectByType<T>()` — NOT the deprecated `FindObjectOfType<T>()`
- `ARSession.stateChanged` event — NOT polling `ARSession.State`
- `ARPlaneManager.planesChanged` — for plane detection callbacks
- `ARAnchorManager.AddAnchor()` — for persistent anchor creation

## Error Handling

All async operations are wrapped in `try/catch`. Errors are emitted via `RNEventEmitter.Instance.SendEvent("onError", {...})` with a structured payload:
```json
{
  "code": "SESSION_FAILED | MODEL_LOAD_FAILED | PLANE_DETECTION_ERROR | NETWORK_ERROR",
  "message": "human-readable error"
}
```
