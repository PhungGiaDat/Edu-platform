# Mobile AR Education Platform — MVP

An AR-powered education app that lets students scan QR codes on flashcards to reveal interactive 3D models with audio pronunciation in AR space. Built as a React Native + Unity hybrid, where React Native handles the UI and authentication while Unity renders the AR experience.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App (Expo)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Auth    │  │  Home    │  │   AR     │  │  API Client │ │
│  │  Screen  │  │  Screen  │  │  Screen  │  │  (Axios)    │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────────────┘ │
│       │             │             │                           │
│       └─────────────┴─────┬──────┘                           │
│                           │                                  │
│                    ┌──────▼──────┐                           │
│                    │   Bridge    │                           │
│                    │ UnityBridge │                           │
│                    └──────┬──────┘                           │
└───────────────────────────┼───────────────────────────────────┘
                            │ UnitySendMessage (iOS)
┌───────────────────────────┼───────────────────────────────────┐
│                    Unity AR Runtime                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Swift/RN    │  │     AR       │  │     Bridge         │ │
│  │  Bridge      │  │  Experience  │  │  RNEventEmitter    │ │
│  │  (future)    │  │  Handler     │  │  RNMessageReceiver │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐  │
│  │  AR     │  │  Plane  │  │  Anchor │  │  GLTFast      │  │
│  │  Session│  │ Detection│  │ Manager │  │  (GLB Loader) │  │
│  └─────────┘  └─────────┘  └─────────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### How the Bridge Works

The RN ↔ Unity communication uses `UnitySendMessage` (iOS) as the transport layer:

**RN → Unity** (RN calls Unity):
1. RN creates a message string: `"methodName|{jsonPayload}"`
2. `UnityBridgeModule` (Phase 1 placeholder) passes it to the native Swift layer
3. Swift calls `UnitySendMessage("RNMessageReceiver", "OnNativeEvent", message)`
4. `RNMessageReceiver.cs` parses the string and calls the appropriate method on `ARExperienceHandler`

**Unity → RN** (Unity calls back to RN):
1. Unity C# code calls `RNEventEmitter.Instance.SendEvent("eventName", payload)`
2. `RNEventEmitter` formats it as `"eventName|{json}"` and calls `UnitySendMessage("RNMessageReceiver", "OnNativeEvent", message)`
3. Swift receives it and emits it as an RN native event via `RCTEventEmitter`
4. RN `UnityBridgeModule` `NativeEventEmitter` subscription fires the callback

**Message types** (RN → Unity): `initSession`, `loadARExperience`, `setPlaneDetection`, `pauseSession`, `resumeSession`, `destroySession`

**Event types** (Unity → RN): `onArReady`, `onPlaneDetected`, `onObjectPlaced`, `onAudioComplete`, `onInteraction`, `onError`

### Data Flow for Loading an AR Experience

```
1. User taps a lesson in HomeScreen
2. ARScreen fetches AR data via flashcardApi.getFlashcard(qrId)
3. ARExperienceMapper maps backend snake_case → Unity camelCase
4. UnityBridgeModule.loadExperience(payload) sends to Unity
5. ARExperienceHandler.LoadARExperience(json) parses the payload
6. PlaneDetection enables horizontal plane detection
7. User taps screen → AnchorManager places an anchor
8. GLBLoader downloads and instantiates the 3D model
9. AnimationController plays the animation (rotate/bounce/idle)
10. ARAudioPlayer streams and plays the pronunciation audio
11. onObjectPlaced event fires back to RN
```

## Directory Structure

```
mobile/
├── README.md              ← This file
├── rn/                    # React Native (Expo) app
│   ├── README.md          # RN-specific documentation
│   ├── src/
│   │   ├── App.tsx       # Root component
│   │   ├── bridge/       # Unity bridge abstraction
│   │   │   ├── UnityBridgeModule.ts   # Singleton, event sub/unsub
│   │   │   ├── ARExperienceMapper.ts  # Backend→Unity payload mapping
│   │   │   └── arMessages.ts          # ARMessage type + factory
│   │   ├── components/   # Reusable UI components
│   │   │   ├── UnityView.tsx          # Placeholder for AR view
│   │   │   ├── FlashcardOverlay.tsx   # Word + translation overlay
│   │   │   ├── ProgressTracker.tsx    # XP / level display
│   │   │   └── QRScanPrompt.tsx       # Camera scan frame UI
│   │   ├── hooks/
│   │   │   └── useAuth.ts             # Auth state + SecureStore
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx        # Stack navigator (Auth/Home/AR)
│   │   ├── screens/
│   │   │   ├── AuthScreen.tsx         # Email + password login
│   │   │   ├── HomeScreen.tsx          # Course + lesson list
│   │   │   └── ARScreen.tsx            # AR entry point
│   │   ├── services/
│   │   │   └── api.ts                  # Axios instance + endpoint funcs
│   │   ├── types/
│   │   │   ├── api.ts                  # Course, Lesson, AuthResponse, ARExperienceResponse
│   │   │   └── ar.ts                   # UnityARExperiencePayload, ARStabilityConfig
│   │   └── utils/
│   │       ├── glbCache.ts             # GLB download + cache via expo-file-system
│   │       └── secureStorage.ts        # JWT token persistence via expo-secure-store
│   ├── package.json
│   ├── app.json
│   └── tsconfig.json
│
└── unity/                  # Unity ARFoundation project
    ├── README.md          # Unity-specific documentation
    ├── .gitignore
    ├── UnityPackageManager/
    │   └── manifest.json  # UPM dependencies (ARFoundation 6.0.7, GLTFast 5.0.5)
    ├── Assets/
    │   ├── Scenes/
    │   │   └── ARScene.unity
    │   ├── AR/
    │   │   ├── ARSessionManager.cs     # ARKit session lifecycle
    │   │   ├── PlaneDetection.cs       # Horizontal plane detection
    │   │   ├── AnchorManager.cs        # Anchor creation at tap positions
    │   │   └── ARExperienceHandler.cs # Top-level AR experience orchestrator
    │   ├── Audio/
    │   │   └── ARAudioPlayer.cs       # Stream + play audio from URL
    │   ├── Bridge/
    │   │   ├── RNMessageReceiver.cs   # Receives calls from RN via Swift
    │   │   ├── RNEventEmitter.cs       # Sends events back to RN via Swift
    │   │   └── ARPayloadMapper.cs      # JSON → ARExperiencePayload struct
    │   ├── Gestures/
    │   │   └── ARGestureHandler.cs    # Tap, drag (rotate), pinch (scale)
    │   └── UnityServices/
    │       └── UnityFrameworkLoader.cs # UnityFramework singleton for Swift init
    └── ProjectSettings/
```

## Prerequisites

| Requirement | Version | Notes |
|------------|---------|-------|
| Node.js | 18+ | For Expo CLI and npm |
| Unity | 2022.3 LTS or newer | ARFoundation requires a modern Unity version |
| Xcode | 15+ | For iOS builds and ARKit support |
| CocoaPods | Latest | For RN iOS dependency resolution |
| Unity Packages | See below | |

**Unity Packages (via Unity Package Manager):**

```json
{
  "dependencies": {
    "com.unity.xr.arfoundation": "6.0.7",
    "com.unity.xr.arkit": "6.0.6",
    "com.atteneder.gltfast": "5.0.5"
  }
}
```

Add these via `Window → Package Manager → Add package from git URL...` in the Unity Editor.

**React Native packages (`mobile/rn`):**

Installed via `npm install` from `package.json`:
- `expo` (~57.0.8)
- `expo-secure-store` (JWT storage)
- `expo-file-system` (GLB caching)
- `expo-camera` (QR scanning future work)
- `@react-navigation/native` + `@react-navigation/native-stack`
- `axios` (HTTP client, 15s timeout)
- `@react-native-async-storage/async-storage`

## Setup Instructions

### React Native (Expo)

```bash
cd mobile/rn

# Install dependencies
npm install

# Set the backend API URL (optional — defaults to http://localhost:8000)
export EXPO_PUBLIC_API_URL=https://your-backend.example.com

# Start the Metro bundler
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android
npx expo run:android
```

For local development, you may also need to install CocoaPods:

```bash
cd ios
pod install
cd ..
npx expo run:ios
```

### Unity AR Project

1. Open Unity Hub and open the `mobile/unity/` folder as a project
2. Wait for the Package Manager to resolve dependencies (ARFoundation, GLTFast)
3. Open `Assets/Scenes/ARScene.unity`
4. In the Hierarchy, ensure an `ARSession` GameObject exists (ARFoundation creates one automatically)
5. Attach the following scripts to a root GameObject (e.g. "ARManager"):
   - `ARExperienceHandler`
   - `ARSessionManager`
   - `PlaneDetection`
   - `AnchorManager`
   - `ARGestureHandler`
   - `ARAudioPlayer`
   - `RNMessageReceiver`
6. The auto-wire `FindFirstObjectByType` pattern means most dependencies resolve automatically, but you can also drag references in the Inspector
7. Add an `Animator` component to the ARManager or a child for animation support

**Build for iOS:**

1. `File → Build Settings → iOS`
2. Select your development team in `Project Settings → Player → Other → iOS`
3. `Build` or `Build and Run`

## API Endpoints Consumed

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Authenticate and receive JWT |
| `/api/v1/courses/` | GET | List available courses |
| `/api/v1/courses/{id}/lessons/` | GET | List lessons in a course |
| `/api/v1/flashcard/{qrId}` | GET | Fetch AR experience data for a QR code |
| `/api/v1/ar/config` | GET | Fetch AR stability configuration |

## Unity AR Event Flow

```
ARExperienceHandler.LoadARExperience(json)
  → ARPayloadMapper.Parse(json)          → ARExperiencePayload struct
  → PlaneDetection.SetEnabled(true)      → horizontal plane detection ON
  → (wait for plane detected)
  → HandleScreenTap(screenPos)
  → AnchorManager.TryPlaceAnchorAt()     → anchor created
  → GLBLoader.LoadGLB(url)              → download/cached → GameObject
  → ModelSpawner.Spawn()                → place model at anchor
  → AnimationController.PlayAnimation()  → rotate | bounce | idle
  → ARAudioPlayer.PlayAudio(url)        → stream + play pronunciation
  → RNEventEmitter.SendEvent("onObjectPlaced", {...})
```

## iOS Bridge Notes

The Swift ↔ Unity layer is a **future Phase 2 task**. Currently:

- `UnityBridgeModule.ts` is a **Phase 1 placeholder** that simulates the bridge
- `RNMessageReceiver.cs` and `RNEventEmitter.cs` are **written and ready** for Swift integration
- A Swift native module will be needed to:
  - Receive `UnitySendMessage` calls and emit RN events via `RCTEventEmitter`
  - Expose `UnityBridge` as a native module so RN can call into Unity
  - Initialize the embedded UnityFramework

## Known Limitations (MVP)

- **No real Swift bridge**: Unity ↔ RN communication is stubbed. Unity runs standalone in the Editor but is not yet integrated with the RN native layer.
- **No QR scanning**: `QRScanPrompt` and `expo-camera` are wired but QR code detection logic is not yet implemented.
- **No real 3D content**: The Unity scene has no actual GLB models or AR content loaded — the AR scene is a skeleton.
- **GLBLoader and ModelSpawner not yet written**: The Models/ folder scripts referenced in the flow are stubbed in the implementation log but the actual `.cs` files are not yet created.
- **Android not targeted**: ARFoundation/iOS is the MVP focus.
- **No logout UI**: The logout button exists in `App.tsx` logic but is not rendered in any screen.
- **No Expo prebuild for native modules**: When the Swift bridge is added, you'll need `npx expo prebuild` to generate the iOS native project.

## Backend Requirements

The RN app expects a backend conforming to the API endpoints listed above. A compatible backend should expose:

- JWT-based authentication
- Course and lesson CRUD
- A flashcard AR endpoint that returns: `qr_id`, `word`, `translation_vi`, `audio_url`, `model_url`, `animation_type`, `glb_size`, `position`, `rotation`, `scale`

## Contributing

This is an MVP on the `feature/mobile-ar-mvp` branch. See `docs/implementation-log/` for the full development history.
