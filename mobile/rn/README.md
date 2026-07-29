# React Native App — Mobile AR MVP

The React Native (Expo) frontend for the Mobile AR Education Platform. Handles authentication, course navigation, and AR experience triggering. Communicates with a Unity AR runtime via a native bridge (Phase 2 integration pending).

## Quick Start

```bash
cd mobile/rn

# Install dependencies
npm install

# Set backend API URL (defaults to http://localhost:8000)
export EXPO_PUBLIC_API_URL=https://your-backend.example.com

# Start Metro bundler
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Project Structure

```
src/
├── App.tsx                    # Root — loads auth state, renders navigator
├── bridge/                    # Unity AR bridge abstraction
│   ├── UnityBridgeModule.ts   # Singleton. checkAvailability(), loadExperience(),
│   │                          #   startScanning(), playAudio(), closeExperience(),
│   │                          #   subscribe(eventType, callback)
│   │                          #   Phase 1: placeholder / simulator
│   ├── ARExperienceMapper.ts  # api.ARExperienceResponse → UnityARExperiencePayload
│   └── arMessages.ts          # ARMessageType union + createARMessage factory
├── components/
│   ├── UnityView.tsx          # Placeholder for real AR view (Phase 2)
│   ├── FlashcardOverlay.tsx   # Word + translation overlay on AR
│   ├── ProgressTracker.tsx    # XP bar and level badge
│   └── QRScanPrompt.tsx       # Camera scan frame UI
├── hooks/
│   └── useAuth.ts            # useAuth() — token, loading, saveToken, clearToken,
│                              #   isAuthenticated. Reads JWT from SecureStore on mount.
├── navigation/
│   └── AppNavigator.tsx       # Stack: Auth → Home → AR. Conditionally renders
│                              #   based on isAuthenticated prop from App.tsx.
├── screens/
│   ├── AuthScreen.tsx        # Email/password login form. Calls authApi.login(),
│   │                          #   stores token via useAuth, navigates to Home.
│   ├── HomeScreen.tsx         # FlatList of courses. Tap course → expand lessons.
│   │                          #   Tap lesson → navigate to ARScreen.
│   └── ARScreen.tsx           # AR entry point. Fetches flashcard data via
│                              #   flashcardApi, maps to Unity payload, calls
│                              #   unityBridge.loadExperience(). Shows placeholder.
├── services/
│   └── api.ts                 # Axios instance (base URL, 15s timeout).
│                              #   Interceptors: attaches Bearer token, clears
│                              #   token on 401. Exports: authApi, coursesApi,
│                              #   flashcardApi, arConfigApi.
├── types/
│   ├── api.ts                # Course, Lesson, AuthResponse, ARExperienceResponse
│   └── ar.ts                 # UnityARExperiencePayload, ARStabilityConfig
└── utils/
    ├── glbCache.ts           # GLB download via expo-file-system + cache in
    │                          #   AsyncStorage. getCachedPath(), downloadGLB(),
    │                          #   cacheFile(), clearCache()
    └── secureStorage.ts        # TOKEN_KEY = 'jwt_token'. getToken(), setToken(),
                                #   removeToken() via expo-secure-store.
```

## Key Dependencies

| Package | Purpose |
|--------|---------|
| `expo` (~57) | Framework + build tools |
| `expo-secure-store` | JWT token storage in iOS Keychain |
| `expo-file-system` | File download for GLB caching |
| `expo-camera` | Camera access for QR scanning (future) |
| `@react-navigation/native` + `@react-navigation/native-stack` | Screen navigation |
| `axios` | HTTP client |
| `@react-native-async-storage/async-storage` | GLB URL → local path cache |
| `react-native-safe-area-context` | Safe area insets |
| `react-native-screens` | Native screen components |
| `react-native-svg` | SVG icons (if needed) |

## Auth Flow

```
App.tsx
  └─ useAuth()               # Reads JWT from SecureStore on mount
       └─ isAuthenticated    # Derived from token !== null
            │
            ├─ false → AuthScreen
            │    └─ handleLogin()
            │         ├─ authApi.login(email, password) → JWT
            │         ├─ saveToken(jwt)
            │         └─ onLoginSuccess() → navigator re-renders
            │
            └─ true  → HomeScreen
                 └─ (logout: clearToken() in App.tsx)
```

**Token storage**: JWT stored via `expo-secure-store` under key `'jwt_token'`. Axios interceptor reads it on every request and attaches `Authorization: Bearer <token>`. On 401 response, the token is deleted automatically.

## API Client

All API calls go through the configured `EXPO_PUBLIC_API_URL/api/v1/`. The Axios instance in `services/api.ts` is the single source of truth.

```typescript
import { authApi, coursesApi, flashcardApi, arConfigApi } from '../services/api';

// Login
const { data } = await authApi.login(email, password);
await saveToken(data.access_token);

// Fetch courses
const { data: courses } = await coursesApi.getCourses();

// Fetch lessons for a course
const { data: lessons } = await coursesApi.getLessons(courseId);

// Fetch AR experience data for a QR code
const { data: arData } = await flashcardApi.getFlashcard(qrId);

// Fetch AR stability config
const { data: config } = await arConfigApi.getStabilityConfig();
```

## GLB Cache

`glbCache` in `utils/glbCache.ts` handles downloading and caching 3D model files (`.glb`). It uses `expo-file-system` for downloads and `AsyncStorage` for URL → local path mapping.

```typescript
import { glbCache } from '../utils/glbCache';

// Download (or get cached) a GLB file
const localPath = await glbCache.downloadGLB('https://cdn.example.com/models/apple.glb');

// Check if already cached
const cached = await glbCache.getCachedPath('https://cdn.example.com/models/apple.glb');

// Clear all cached GLBs
await glbCache.clearCache();
```

## Unity Bridge (Phase 1 Placeholder)

`UnityBridgeModule` simulates Unity AR communication. In Phase 2, it will be backed by a real native module (React Native Unity View or custom Swift bridge).

```typescript
import { unityBridge } from '../bridge/UnityBridgeModule';
import { mapToUnityPayload } from '../bridge/ARExperienceMapper';

// Check availability (Phase 1 always returns false in simulator)
unityBridge.checkAvailability();

// Subscribe to Unity events
const unsubscribe = unityBridge.subscribe('onObjectPlaced', (msg) => {
  console.log('Model placed at:', msg.payload);
});

// Load AR experience
const result = await unityBridge.loadExperience(mappedPayload);

// Play audio in AR
await unityBridge.playAudio('https://cdn.example.com/audio/apple.mp3');

// Close experience
await unityBridge.closeExperience();

// Clean up
unsubscribe();
```

## Navigation

```
AuthScreen (unauthenticated)
    ↓ (login success)
HomeScreen (authenticated)
    ├─ Course list (FlatList)
    └─ Lesson list (expandable, nested FlatList)
         ↓ (tap lesson)
    ARScreen
         ├─ Fetch flashcard data
         ├─ Map to Unity payload
         ├─ Load into Unity (placeholder in Phase 1)
         └─ Show placeholder AR view
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |

## Phase 1 vs Phase 2

| Feature | Phase 1 (MVP) | Phase 2 (Future) |
|---------|---------------|------------------|
| Auth | ✅ JWT + SecureStore | ✅ Same |
| Course navigation | ✅ Full | ✅ Same |
| Unity bridge | Placeholder (simulates calls) | Real native Swift integration |
| AR rendering | Placeholder UI | Unity ARFoundation |
| QR scanning | Static UI placeholder | expo-camera + QR detection |
| 3D models | None | GLTFast GLB loading |
| Audio playback | None | ARAudioPlayer |

## TypeScript

Strict mode enabled. Key types in `types/`:
- `Course`, `Lesson` — from backend API
- `AuthResponse` — `{ access_token, token_type }`
- `ARExperienceResponse` — backend shape (snake_case)
- `UnityARExperiencePayload` — Unity shape (camelCase, after mapper)
- `ARMessage` — bridge message envelope with type + timestamp
