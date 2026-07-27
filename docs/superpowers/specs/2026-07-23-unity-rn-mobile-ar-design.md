# Unity-RN Mobile AR — Design Spec

> **Date:** 2026-07-23
> **Status:** For review before implementation
> **Approach:** Approach A — Unity as `.xcframework` + custom Swift native module

---

## 1. Architecture

### 1.1 High-Level Composition

The mobile app is a **React Native shell** that embeds a **Unity-generated `.xcframework`** via CocoaPods. A custom **Swift native module (`UnityBridgeModule`)** bridges the two:

```
React Native (TypeScript)
    │
    ├─ UI: AuthScreen, HomeScreen, ARScreen
    │       FlashcardOverlay, ProgressTracker, QRScanPrompt
    │
    └─ UnityBridgeModule (Swift / TurboModule)
            │
            ├─ Methods (RN → Unity):
            │     initSession()
            │     loadARExperience(payload)
            │     setPlaneDetection(bool)
            │     pauseSession() / resumeSession() / destroySession()
            │
            └─ Events (Unity → RN, via NativeEventEmitter):
                  onArReady, onPlaneDetected, onObjectPlaced,
                  onInteraction, onAnimationComplete, onAudioComplete, onError

Unity (C#) — ARFoundation + ARKit + GLTFast
    │
    ├─ ARSessionManager    — ARKit lifecycle
    ├─ PlaneDetection       — Horizontal plane detection
    ├─ AnchorManager       — Tap-to-place anchors
    ├─ GLBLoader           — Runtime GLB via GLTFast
    ├─ ModelSpawner         — Instantiate model at anchor
    ├─ AnimationController  — rotate / bounce / idle
    ├─ ARAudioPlayer        — Audio playback
    ├─ ARGestureHandler     — Tap, pinch, rotate, double-tap
    └─ RNMessageReceiver    — Receive JSON from Swift
                              RNEventEmitter        — Send events to Swift
```

**Key design decisions:**

1. **No Unity UI**: Unity renders a full-screen AR camera view only. All overlays (word, translation, audio button, progress) are React Native components sitting above the native Unity view.
2. **Stateless Unity**: Unity has no concept of "current user" or "current course" — it receives all state as JSON payloads from RN and acts as a pure AR rendering engine.
3. **Async bridge**: `loadARExperience()` is async on the Swift side. Unity emits `onArReady` before processing; `onObjectPlaced` signals the model is on screen.
4. **Single-session**: One ARKit session at a time. `destroySession()` / `initSession()` cycle for switching flashcards.

### 1.2 Authentication

Reuse the existing FastAPI `POST /api/v1/auth/login` endpoint. Flow:
1. User enters email + password on `AuthScreen`
2. RN sends credentials → backend returns JWT
3. RN stores JWT in **AsyncStorage** (not Keychain — AsyncStorage is sufficient for JWT stored as opaque token; upgrade to `react-native-keychain` in v2 if needed)
4. Axios interceptor attaches `Authorization: Bearer <token>` to all API requests
5. On app launch, `useAuth` checks AsyncStorage — if valid token exists, skip auth screen

### 1.3 GLB Caching

**v1 (simple)**: `glbCache.ts` — before loading, check if the GLB URL is already in `FileSystem.cacheDirectory`. If cached, use local path instead of re-downloading. Simple `URL → File path` map in AsyncStorage.

**v2 (robust)**: Use `react-native-blob-util` for resumable downloads + LRU eviction policy. Out of scope for v1.

### 1.4 Scopes Deferred to v2

- Multi-card / proximity combo detection (requires ARKit multi-anchor tracking)
- Offline mode (robust caching + sync queue)
- Android build
- LiDAR / people occlusion features
- Push notifications

---

## 2. RN ↔ Unity Message Contract

### 2.1 RN → Unity (Swift method calls)

#### `initSession()` → `void`
Starts ARKit session. Unity emits `onArReady` when ready.

#### `loadARExperience(jsonPayload: string)` → `void`
Called after QR scan + API fetch. Payload shape:

```typescript
interface UnityARExperiencePayload {
  qrId: string;              // "apple_001"
  word: string;               // "Apple"
  translationVi: string;      // "Quả táo"
  audioUrl: string;           // full HTTPS URL
  modelUrl: string;           // full HTTPS URL to .glb
  animationType: "rotate" | "bounce" | "idle";
  glbSize: number;           // meters
  position: string;           // "0 0 0" (Vector3 string)
  rotation: string;           // "0 0 0" (Vector3 string)
  scale: string;              // "1 1 1" (Vector3 string)
}
```

#### `setPlaneDetection(enabled: boolean)` → `void`
Enable/disable horizontal plane detection.

#### `pauseSession()` / `resumeSession()` / `destroySession()` → `void`
Session lifecycle management.

### 2.2 Unity → RN (Swift events via NativeEventEmitter)

| Event | Payload | When |
|-------|---------|------|
| `onArReady` | `{ version: string }` | ARKit session initialized |
| `onPlaneDetected` | `{ planeId: string, bounds: { x: number, y: number } }` | Horizontal plane found |
| `onObjectPlaced` | `{ qrId: string, worldX: number, worldY: number, worldZ: number }` | Anchor + model spawned |
| `onInteraction` | `{ type: "tap" \| "pinch" \| "rotate" \| "double_tap", qrId?: string }` | User gesture |
| `onAnimationComplete` | `{ clip: string, qrId: string }` | Animation finished |
| `onAudioComplete` | `{ url: string }` | Audio finished |
| `onError` | `{ code: "CAMERA_PERMISSION" \| "SESSION_FAILED" \| "MODEL_LOAD_FAILED" \| "NETWORK_ERROR", message: string }` | Any error |

---

## 3. UI/UX

### 3.1 Screen Flow

```
App Launch
    │
    ├─ Has valid JWT in AsyncStorage?
    │       ├─ YES → HomeScreen
    │       └─ NO  → AuthScreen
    │
AuthScreen
    │  (email + password → POST /auth/login → AsyncStorage JWT)
    ▼
HomeScreen
    │  (course list → lesson cards)
    ▼
ARScreen
       │
       ├─ Camera activates (AR session starts → onArReady)
       ├─ Plane detection active
       ├─ QRScanPrompt: "Point camera at flashcard"
       │
       ├─ QR decoded → GET /flashcard/{qr_id} → loadARExperience()
       │
       ├─ onPlaneDetected → "Tap to place" overlay
       │
       ├─ User taps plane → onObjectPlaced → FlashcardOverlay appears
       │       │
       │       ├─ Word: "Apple" (large, top)
       │       ├─ Translation: "Quả táo" (smaller, below)
       │       ├─ Audio button (speaker icon) → plays audioUrl
       │       └─ ProgressTracker (XP ring, bottom-right)
       │
       ├─ User gestures (pinch / rotate / double-tap) → onInteraction
       │
       └─ Back → HomeScreen (pauseSession)
```

### 3.2 Visual Design

- **FlashcardOverlay**: Semi-transparent card at top of screen; word in large bold font, translation below, audio button (speaker icon) right-aligned
- **QRScanPrompt**: Full-screen semi-transparent overlay with "Point camera at flashcard" text + animated scan line
- **ProgressTracker**: Circular XP ring in bottom-right corner; fills on interaction events
- **Error states**: Inline toast for `onError` events (e.g., "Camera permission required" with button to open Settings)

---

## 4. Platform Constraints

| Constraint | Impact |
|-----------|--------|
| **Windows dev machine** | All C# scripts + TypeScript written on Windows. `.xcframework` compile + `.ipa` build require Mac. |
| **macOS required (one-time)** | Phase 4 builds `.xcframework` on Mac. Commit as `EduAR.xcframework.zip`. |
| **Physical iOS device required** | ARKit needs real hardware; no simulator testing possible |
| **iOS 15.0 minimum** | ARKit 5+ features; ~95% device coverage |
| **No backend changes** | Backend is untouched; mobile consumes existing API endpoints |

---

## 5. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `.xcframework` + TurboModule + CocoaPods interaction complexity | High | Use Bridge Native Module first (simpler than TurboModule); upgrade to TurboModule in v2 |
| GLTFast + ARFoundation compatibility on iOS | Medium | Test on Mac early (Phase 4); use specific package versions from context/unity-ar-architecture.md |
| Camera permission UX on iOS | Medium | `Camera` permission prompt handled in ARScreen with graceful fallback |
| Unity scene file conflicts in git | Low | `.unity` files are YAML text; add binary asset types to `.gitattributes` LFS |
| JWT token expiry not handled | Low | Add token refresh logic in v2; acceptable for v1 prototype |

---

## 6. Open Questions (confirm before Phase 1)

See top of the plan document for the full list. Key ones:
1. Bridge approach: Unity as `.xcframework` + Swift native module ✅ **confirmed by user**
2. Combos: v1 or v2? (recommend: defer to v2)
3. GLB caching: simple URL cache in v1?
4. iOS minimum version? (recommend: iOS 15.0)
5. React Native version? (recommend: latest stable with New Architecture)
