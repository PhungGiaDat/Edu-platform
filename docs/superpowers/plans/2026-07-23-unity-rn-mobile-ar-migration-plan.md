# Unity-RN Mobile AR Migration Plan

> **Date:** 2026-07-23
> **Status:** Planning — awaiting user approval
> **Goal:** Build a React Native iOS app (`mobile/`) with Unity AR Foundation replacing the web MindAR stack

---

## Open Questions (must confirm before Phase 1)

| # | Question | Recommendation | Your Answer |
|---|----------|---------------|-------------|
| OQ-1 | **Bridge approach**: Unity as `.xcframework` + custom Swift native module (`UnityBridge`)? | Yes — Approach A | ___ |
| OQ-2 | **Combos/semantic rules** (multi-card proximity combos): in scope for v1 or v2? | Defer to v2; v1 = single-model plane spawn | ___ |
| OQ-3 | **GLB caching**: simple URL cache in v1, robust offline in v2? | Yes — simple URL cache first | ___ |
| OQ-4 | **iOS minimum version**? | iOS 15.0 (covers ~95% of devices, ARKit 5+ required) | ___ |
| OQ-5 | **React Native version**? | Latest stable (0.76+) — New Architecture enabled | ___ |

---

## Architecture Summary

The mobile app is a **React Native shell** that embeds a **Unity-generated `.xcframework`** via CocoaPods. A custom **Swift native module (`UnityBridgeModule`)** handles bidirectional messaging:

- **RN → Unity**: `initSession()` → `loadARExperience(payload)` → `setPlaneDetection(bool)` → `pauseSession()` / `resumeSession()`
- **Unity → RN**: Emits native events (`onArReady`, `onPlaneDetected`, `onObjectPlaced`, `onInteraction`, `onError`) picked up by RN via `NativeEventEmitter`
- **Data format**: JSON payloads matching `ARExperienceResponseSchema` from the existing backend API

The Unity module has **no Unity UI** — it renders a full-screen AR camera view. All overlay UI (flashcard word, audio button, progress) lives in React Native.

**Windows constraint**: All C# scripts and TypeScript code are written on Windows. The `.xcframework` compile and final `.ipa` build happen **once** on a borrowed Mac.

---

## Folder Structure

```
Edu-platform/
├── mobile/
│   ├── rn/                          # React Native shell app (iOS)
│   │   ├── src/
│   │   │   ├── App.tsx              # Root: Navigation + AuthGate
│   │   │   ├── navigation/
│   │   │   │   └── AppNavigator.tsx # Stack: Auth → Home → AR
│   │   │   ├── screens/
│   │   │   │   ├── AuthScreen.tsx   # Login form → JWT storage
│   │   │   │   ├── HomeScreen.tsx   # Course list + lesson cards
│   │   │   │   └── ARScreen.tsx     # Unity view + RN overlay UI
│   │   │   ├── components/
│   │   │   │   ├── UnityView.tsx    # Native view wrapper (requireNativeComponent)
│   │   │   │   ├── FlashcardOverlay.tsx # Word + translation + audio button
│   │   │   │   ├── ProgressTracker.tsx  # Progress ring / XP bar
│   │   │   │   └── QRScanPrompt.tsx  # "Point camera at flashcard" prompt
│   │   │   ├── services/
│   │   │   │   └── api.ts           # Axios instance + typed endpoints
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts       # JWT read/write/clear (SecureStore)
│   │   │   │   ├── useARSession.ts  # UnityBridgeModule wrapper
│   │   │   │   └── useCourses.ts    # Course/lesson fetch
│   │   │   ├── bridge/
│   │   │   │   ├── UnityBridgeModule.ts   # TurboModule / Bridge native module (TS)
│   │   │   │   ├── arMessages.ts     # Shared message type definitions
│   │   │   │   └── ARExperienceMapper.ts  # Maps API response → bridge payload
│   │   │   ├── types/
│   │   │   │   ├── api.ts            # API response types (from backend schemas)
│   │   │   │   └── ar.ts            # RN-side AR state types
│   │   │   └── utils/
│   │   │       ├── secureStorage.ts  # SecureStore wrapper (JWT)
│   │   │       └── glbCache.ts      # Simple URL → File URL cache (v1)
│   │   ├── ios/
│   │   │   ├── LocalPods/
│   │   │   │   └── UnityBridge/      # Swift native module pod
│   │   │   │       ├── UnityBridge.podspec
│   │   │   │       ├── UnityBridgeModule.swift   # TurboModule implementation
│   │   │   │       └── UnityBridgeModule.m       # ObjC bridge header
│   │   │   └── Podfile              # Includes UnityBridge + UnityFramework
│   │   ├── android/                  # Scaffolded (iOS-first; Android deferred)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── babel.config.js
│   │
│   └── unity/                        # Unity C# project (editable on Windows)
│       ├── Assets/
│       │   ├── AR/
│       │   │   ├── ARSessionManager.cs     # ARFoundation session lifecycle
│       │   │   ├── PlaneDetection.cs       # Horizontal plane detection
│       │   │   ├── AnchorManager.cs        # Anchor creation at tap point
│       │   │   └── ARExperienceHandler.cs  # Top-level: plane → anchor → model
│       │   ├── Models/
│       │   │   ├── GLBLoader.cs            # GLTFast runtime GLB loading
│       │   │   ├── ModelSpawner.cs         # Instantiate GLB at anchor
│       │   │   └── AnimationController.cs  # Play rotate/bounce/idle
│       │   ├── Audio/
│       │   │   └── ARAudioPlayer.cs        # UnityWebRequest audio + play
│       │   ├── Gestures/
│       │   │   └── ARGestureHandler.cs     # Tap, pinch-scale, rotate, double-tap
│       │   ├── Bridge/
│       │   │   ├── RNMessageReceiver.cs    # Receive + parse JSON from RN
│       │   │   ├── RNEventEmitter.cs       # Send events back to RN
│       │   │   └── ARPayloadMapper.cs      # Map JSON → Unity objects
│       │   └── UnityServices/
│       │       └── UnityFrameworkLoader.cs  # Embed pattern init
│       ├── ProjectSettings/           # Unity config (iOS Build Target enabled)
│       ├── UnityPackageManager/      # manifest.json with ARFoundation + GLTFast
│       └── build/                    # .xcframework output (Mac-only, committed as zip)
│           └── EduAR.xcframework.zip  # Committed to repo; extracted at RN pod install
│
└── backend/                          # Existing — no changes required
```

---

## Phase Breakdown

### Phase 1: React Native Shell — Windows ✅
**Goal:** Scaffolding, navigation, auth, API integration — no AR yet.

| Item | Detail |
|------|--------|
| **Deliverables** | `mobile/rn/` scaffolded; login flow works; courses/lessons fetched from FastAPI |
| **Dependencies** | None (greenfield) |
| **Complexity** | Low |
| **Mac required?** | No |

**Tasks:**
1. Initialize Expo app (with `npx create-expo-app mobile/rn`) or React Native CLI — **Recommendation: Expo** for faster iOS scaffolding via `expo prebuild` + `xcodebuild`
2. Install dependencies: `axios`, `@react-native-async-storage/async-storage` (Simple JWT), `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-safe-area-context`, `react-native-svg` (icons)
3. Write `App.tsx` + `AppNavigator.tsx` with AuthGate (unauthenticated → AuthScreen, authenticated → HomeScreen)
4. Write `AuthScreen.tsx` → calls `POST /api/v1/auth/login` → stores JWT in AsyncStorage
5. Write `useAuth.ts` hook: `getToken()`, `saveToken()`, `clearToken()`, `isAuthenticated`
6. Write `api.ts`: Axios instance with Bearer token interceptor + typed endpoints (`getCourses`, `getLessons`, `getARExperience`)
7. Write `HomeScreen.tsx`: fetches and displays course list; tap lesson → navigate to ARScreen
8. Write `ARScreen.tsx` shell: static placeholder (RN UI only, no Unity view yet)
9. Write `FlashcardOverlay.tsx` + `ProgressTracker.tsx`: static placeholder UI
10. Commit

---

### Phase 2: Unity C# Scripts (Shell) — Windows ✅
**Goal:** Unity project with stub C# scripts that can be edited on Windows. No real AR yet — stubs log to console.

| Item | Detail |
|------|--------|
| **Deliverables** | `mobile/unity/` with all C# files present; project opens in Unity on Windows; stub methods log calls |
| **Dependencies** | Unity 6 LTS (6000.x) installed locally; ARFoundation 6.0.7 + GLTFast via Unity Package Manager |
| **Complexity** | Medium |
| **Mac required?** | No |

**Tasks:**
1. Create Unity project at `mobile/unity/` (Unity Hub → 3D template → no need to import Universal RP)
2. Add via Window → Package Manager → `+` → add from git URL:
   - `com.unity.xr.arfoundation@6.0.7` (ARFoundation)
   - `com.unity.xr.arkit@6.0.6` (ARKit)
   - `com.atteneder.gltfast` (GLTFast — free, MIT)
3. Configure iOS Build Support in Unity: Edit → Project Settings → iOS → enable ARKit
4. Write all C# files from the folder structure above — stub implementations that `Debug.Log()` on every method call
5. In `RNMessageReceiver.cs`: stub `ReceiveMessage(string json)` that parses JSON and logs payload
6. In `RNEventEmitter.cs`: stub `SendEvent(string eventName, string payload)` that logs to console
7. Add all `*.meta` files (Unity generates these; they are required for the repo)
8. Commit C# scripts + `.meta` files; `.unity` scene files are binary — add to `.gitattributes` LFS

> **Note on Unity scene files:** The Unity scene (`.unity`) is a text YAML file and can be committed directly. Prefabs, materials, and the `ScriptableObject` for AR config are also text YAML. Only compiled assets (DLLs, textures) need LFS. See Unity docs on text serialization.

---

### Phase 3: Unity AR Logic — Windows ✅
**Goal:** Implement all real AR logic in C#. Communicates via stub bridge (logging on Windows).

| Item | Detail |
|------|--------|
| **Deliverables** | Full AR session: plane detection, tap-to-place anchor, GLB spawn, gesture handling, animation, audio — all wired to `RNMessageReceiver`/`RNEventEmitter` |
| **Dependencies** | Phase 2 complete |
| **Complexity** | High |
| **Mac required?** | No |

**Tasks:**
1. `ARSessionManager.cs`: lifecycle `Start()`, `Pause()`, `Resume()`, `Stop()`, emit `onArReady` via `RNEventEmitter`
2. `PlaneDetection.cs`: `XRPlaneManager` component; detect horizontal planes; emit `onPlaneDetected` with plane bounds
3. `AnchorManager.cs`: `ARRaycastManager` + tap gesture → create `ARAnchor` at hit point; emit `onObjectPlaced` with anchor position
4. `GLBLoader.cs`: GLTFast `GltfImport`; download from URL via `UnityWebRequest`; cache locally (Phase 1's `glbCache.ts` can supplement this — but Unity also caches in `Application.temporaryCachePath`)
5. `ModelSpawner.cs`: `Instantiate()` GLB as child of `ARAnchor`; apply `position`, `rotation`, `scale` from config
6. `AnimationController.cs`: detect animation clips in GLB (idle, rotate, bounce); `CrossFade()` on tap
7. `ARAudioPlayer.cs`: `UnityWebRequest.GetAudioClip()`; `AudioSource.Play()` on `audio_url`
8. `ARGestureHandler.cs`: `OnPointerClick` (tap → place or interact), `OnPinch` (scale), `OnRotate` (rotate model), double-tap → reset; emit `onInteraction` events
9. `ARExperienceHandler.cs`: orchestrates the flow — `ReceiveMessage(load)` → `EnablePlaneDetection()` → wait `onPlaneDetected` → show "tap to place" → wait tap → `CreateAnchor()` → `LoadGLB()` → `SpawnModel()` → `PlayAnimation()` + `PlayAudio()`
10. `UnityFrameworkLoader.cs`: initialize `UnityFramework` singleton; forward all RN calls through it
11. Commit

---

### Phase 4: Swift Native Bridge — Windows (design) + Mac (compile) ⚠️
**Goal:** `UnityBridgeModule` (Swift) that RN calls and that routes to Unity `.xcframework`.

| Item | Detail |
|------|--------|
| **Deliverables** | `UnityBridgeModule.swift` (TurboModule) + `UnityBridge.podspec`; UnityFramework `.xcframework` built on Mac |
| **Dependencies** | Phase 1 + Phase 3 complete |
| **Complexity** | High |
| **Mac required?** | **Yes — for `.xcframework` compile only** |

**This is the single Mac-only phase. All other work is Windows.**

**Windows-side tasks (design the podspec and Swift files — they compile on Mac):**
1. Write `UnityBridge.podspec`:
   - Sources: `UnityBridgeModule.swift` + `UnityBridgeModule.m` (ObjC bridging header)
   - Dependency: `UnityFramework` (local xcframework)
   - React-Core / TurboModules dependency
2. Write `UnityBridgeModule.swift` (TurboModule implementation):
   - Methods: `initSession()`, `loadARExperience(payload)`, `setPlaneDetection(bool)`, `pauseSession()`, `resumeSession()`, `destroySession()`
   - Calls `UnityFrameworkLoader.Instance` methods
   - `startUnityFramework()` at init
3. Write `UnityBridgeModule.m` (ObjC → Swift bridging)
4. Write `RNUnityEvents.m` (Objective-C): subclass `RCTEventEmitter`; register `onArReady`, `onPlaneDetected`, `onObjectPlaced`, `onInteraction`, `onError` — RN listens via `NativeEventEmitter`
5. Update `Podfile` in `mobile/rn/ios/` to include:
   ```ruby
   pod 'UnityBridge', :path => './LocalPods/UnityBridge'
   pod 'UnityFramework', :path => '../unity/build/EduAR.xcframework'  # or zip + extract
   ```

**Mac-side task (one-time, ~30 min):**
1. Open `mobile/unity/` in Unity on Mac → File → Build Settings → iOS → Build → generates `build/EduAR.xcframework`
2. Zip and commit `EduAR.xcframework.zip` to the repo
3. Run `pod install` in `mobile/rn/ios/`
4. Open `ios/*.xcworkspace` in Xcode → verify UnityFramework linked

> **Pipeline note**: For future iterations, set up **Unity Cloud Build** or a Mac CI runner so the `.xcframework` rebuilds automatically when C# scripts change, without needing manual Mac access.

---

### Phase 5: RN ↔ Unity Integration — Windows ✅
**Goal:** Wire RN components to the real `UnityBridgeModule`. App is feature-complete.

| Item | Detail |
|------|--------|
| **Deliverables** | Full AR flow: QR scan → API call → Unity AR experience → RN overlay UI → progress update |
| **Dependencies** | Phase 1 + Phase 4 (Mac) complete |
| **Complexity** | Medium |
| **Mac required?** | No |

**Tasks:**
1. Write `UnityBridgeModule.ts`: TypeScript wrapper around native module — typed method signatures matching the Swift implementation
2. Write `arMessages.ts`: shared message type definitions (can mirror the TypeScript types from `frontend-web/src/core/types/ARMessages.ts`, adapted for RN)
3. Write `ARExperienceMapper.ts`: maps `ARExperienceResponseSchema` JSON → `UnityARExperiencePayload` JSON (the shape Unity expects)
4. Write `useARSession.ts`: React hook wrapping `UnityBridgeModule`; exposes `{ initSession, loadExperience, pauseSession, onArReady, onPlaneDetected, onObjectPlaced, onInteraction, onError }`
5. Write `UnityView.tsx`: `requireNativeComponent('UnityView')` — renders the Unity camera view as a native view in RN
6. Write `QRScanPrompt.tsx`: shows camera overlay prompting user to point at flashcard (RN uses device camera via `expo-camera` or `react-native-camera`)
7. Write `ARScreen.tsx` full implementation:
   - On mount: call `initSession()` → listen for `onArReady`
   - Camera button: activate QR scanner → decode `qr_id`
   - On `qr_id`: call `GET /api/v1/flashcard/{qr_id}` → map → `loadARExperience(payload)`
   - Listen for `onPlaneDetected` → show "Tap to place" overlay
   - Listen for `onObjectPlaced` → show `FlashcardOverlay` with word + translation
   - Audio button → calls `audio_url` playback
   - Listen for `onInteraction` → update progress/XP
8. Write `glbCache.ts`: simple `fetch` → `FileSystem.cacheDirectory` cache; on load, check cache first
9. Write `ProgressTracker.tsx`: XP bar / progress ring (updates on `onInteraction` events)
10. Commit

---

### Phase 6: Integration Testing + Bug Fixes — Windows ✅
**Goal:** App runs end-to-end; all flows tested.

| Item | Detail |
|------|--------|
| **Deliverables** | Working `.ipa` on a real iOS device (via Mac borrow); all major flows verified |
| **Dependencies** | Phase 5 complete |
| **Complexity** | Medium |
| **Mac required?** | **Yes — final `.ipa` build + device testing** |

**Tasks:**
1. On Mac: `cd mobile/rn/ios && pod install && xcodebuild -workspace *.xcworkspace -scheme * -configuration Debug -destination 'platform=iOSOS,id=<device-id>' archive`
2. Copy `.ipa` to device via Xcode Orgs → test on physical device (AR requires real hardware; no simulator)
3. Test flow: Login → Course → Lesson → AR Screen → QR scan → plane detected → tap → model placed → audio plays → word overlay shows
4. File bugs; **fix** bugs (Windows code fixes + rebuild on Mac)
5. Commit all fixes

---

### Phase 7: Documentation — Windows ✅
**Goal:** Project is handoff-ready for future maintainers.

| Item | Detail |
|------|--------|
| **Deliverables** | `mobile/README.md` with setup, build, and contribution guide |
| **Dependencies** | Phase 6 complete |
| **Complexity** | Low |
| **Mac required?** | No |

**Tasks:**
1. Write `mobile/README.md`: Windows dev setup (Unity Hub, VS Code + C# extension), Mac build instructions, RN dev server, environment variables, directory tree
2. Write inline C# docstrings for all public methods
3. Commit

---

## RN ↔ Unity Message Contract

### RN → Unity (Swift method calls → Unity)

All calls are Swift methods on `UnityBridgeModule`. Unity receives via `RNMessageReceiver.ReceiveMessage(string json)`.

#### `initSession()`

No payload. Starts ARKit session. Unity emits `onArReady` when ready.

#### `loadARExperience(string jsonPayload)`

Payload shape (serialized JSON string):

```typescript
interface UnityARExperiencePayload {
  qrId: string;            // "apple_001"
  word: string;             // "Apple"
  translationVi: string;   // "Quả táo"
  audioUrl: string;         // "https://<supabase>/audio/apple.mp3"
  modelUrl: string;         // "https://<supabase>/models/apple.glb"
  animationType: "rotate" | "bounce" | "idle";  // from target.animation_type
  glbSize: number;          // 0.5
  position: string;         // "0 0 0"
  rotation: string;         // "0 0 0"
  scale: string;            // "1 1 1"
}
```

This is derived from `GET /api/v1/flashcard/{qr_id}` → `ARExperienceResponseSchema` by `ARExperienceMapper`.

#### `setPlaneDetection(boolean enabled)`

Enable/disable horizontal plane detection.

#### `pauseSession()` / `resumeSession()`

Pause and resume the ARKit session.

#### `destroySession()`

Stop and tear down the session.

---

### Unity → RN (Swift events → RN via NativeEventEmitter)

Swift emits these events; RN listens via `NativeEventEmitter`.

| Event Name | Payload | When |
|-----------|---------|------|
| `onArReady` | `{ version: string }` | ARKit session initialized |
| `onPlaneDetected` | `{ planeId: string, bounds: { x: number, y: number } }` | First horizontal plane found |
| `onObjectPlaced` | `{ qrId: string, worldX: number, worldY: number, worldZ: number }` | Anchor created at tap |
| `onInteraction` | `{ type: "tap" \| "pinch" \| "rotate" \| "double_tap", qrId?: string }` | User gesture on model |
| `onAnimationComplete` | `{ clip: string, qrId: string }` | Animation finished |
| `onAudioComplete` | `{ url: string }` | Audio playback finished |
| `onError` | `{ code: "CAMERA_PERMISSION" \| "SESSION_FAILED" \| "MODEL_LOAD_FAILED" \| "NETWORK_ERROR", message: string }` | Any error |

---

## Definition of Done — AR v1 Milestone

- [ ] User can log in with existing FastAPI credentials
- [ ] User sees course list and lesson cards from backend
- [ ] Tapping a lesson opens the AR screen
- [ ] ARKit session initializes without crash (`onArReady` fires)
- [ ] Horizontal plane is detected and "Tap to place" prompt appears
- [ ] Tapping the plane creates an anchor and spawns the GLB model
- [ ] Model appears at correct position, rotation, and scale from API
- [ ] Model plays the correct animation (`rotate` / `bounce` / `idle`)
- [ ] Audio plays from the `audio_url`
- [ ] Pinch gesture scales the model
- [ ] Rotate gesture rotates the model
- [ ] Double-tap resets model to original scale/rotation
- [ ] Word + Vietnamese translation overlay displays correctly
- [ ] Progress/XP updates on interaction events
- [ ] App builds to `.ipa` and runs on a physical iOS device
- [ ] All C# scripts have docstrings; `mobile/README.md` exists

---

## Dependencies Between Phases

```
Phase 1 (RN Shell)          ──┐
                               ├──► Phase 5 (RN ↔ Unity Integration)
Phase 2 (Unity Stub)        ──┤           │
                               │           │
Phase 3 (Unity AR Logic)    ──┤──► Phase 4 (Swift Bridge + xcframework) ──► Phase 6 (Testing)
                               │           │
                               └──► Phase 7 (Documentation)
```

> Phase 3 C# scripts are written on Windows, then compiled on Mac in Phase 4. Phase 2 produces the stub that Phase 3 grows into. Phase 5 wires the RN side to the bridge once Phase 4 produces the `.xcframework`.
