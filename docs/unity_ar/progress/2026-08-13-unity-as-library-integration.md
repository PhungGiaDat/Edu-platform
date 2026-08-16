# docs/unity_ar/progress/2026-08-13-unity-as-library-integration.md

## Session
2026-08-13, agent: claude, branch: MindAR-Update

## Goal
Integrate Unity as Library vào React Native Android app — Unity chạy bên trong RN app, không phải standalone APK.

## Architecture

```
RN App (Android)
├── app (React Native)
└── unityLibrary (Unity Runtime)
    ├── RNUnityPlayerActivity (custom Activity)
    ├── UnityPlayer.UnitySendMessage (C# ↔ Android JNI)
    └── Assets/bin/Data/ (Unity scenes, scripts)
```

## Changed

### 1. Unity Library Setup
**`mobile/unity/Builds/Android/unityLibrary/`** (NEW - copied from Unity build artifacts)
- `build.gradle` — Android library config
- `gradle.properties` — Unity build properties
- `src/main/java/com/unity3d/player/RNUnityPlayerActivity.java` (NEW)
- `src/main/AndroidManifest.xml` — uses RNUnityPlayerActivity
- `src/main/assets/` — Unity runtime data
- `src/main/jniLibs/arm64-v8a/` — pre-built native libs

### 2. RN Android Native Bridge
**`mobile/rn/android/app/src/main/java/com/rn/UnityBridgeModule.kt`** (NEW)
- `launchUnity()` — launch Unity Activity
- `sendToUnity(methodName, jsonPayload)` — send command via file IPC
- `isUnityRunning()` — check if Unity is running

**`mobile/rn/android/app/src/main/java/com/rn/UnityBridgePackage.kt`** (NEW)
- Registers UnityBridgeModule in React Native

**`mobile/rn/android/app/src/main/java/com/rn/MainApplication.kt`**
- Added `UnityBridgePackage()` to package list

### 3. Gradle Integration
**`mobile/rn/android/settings.gradle`**
```groovy
include ':unityLibrary'
project(':unityLibrary').projectDir = new File(rootProject.projectDir, '../../unity/Builds/Android/unityLibrary')
```

**`mobile/rn/android/app/build.gradle`**
```groovy
implementation project(':unityLibrary')
```

**`mobile/rn/android/gradle.properties`**
```properties
android.minSdkVersion=25          # Unity requires minSdk 25
reactNativeArchitectures=arm64-v8a  # Single arch (Windows path limit)
```

### 4. Unity Bridge (RN side)
**`mobile/rn/src/bridge/UnityBridgeModule.ts`**
- All methods now call `UnityBridge.sendToUnity()` native method

### 5. Unity C# Side
**`mobile/unity/Assets/Plugins/Android/UnityBridgePlugin.cs`** (NEW)
- File-based IPC polling (polls `rn_to_unity_command` file)
- Forwards commands to `RNMessageReceiver.OnMessageFromRN()`

**`mobile/unity/Assets/Bridge/RNEventEmitter.cs`**
- Removed problematic fallback code causing CS0103

## Build Status

### Debug APK Built Successfully
```
mobile/rn/android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Issues Resolved
| Issue | Fix |
|-------|-----|
| minSdk conflict (24 vs 25) | Set `android.minSdkVersion=25` |
| Windows 260-char path limit | Single arch `arm64-v8a` only |
| New Architecture required | Enabled (Reanimated requirement) |
| JAVA_HOME not set | Set to Unity bundled JDK |

## Not Verified
- Unity scene rendering inside RN app
- File IPC working between RN and Unity
- AR camera access
- UNITY_READY → PING/PONG flow

## Blockers
- Windows Long Paths not enabled (requires admin)
- Unity scene needs rebuild to include ARBootstrapScene

## Next Steps
1. Install APK on Android device: `adb install app-debug.apk`
2. Rebuild Unity scene with ARBootstrapScene + file polling
3. Verify UNITY_READY event fires
4. Test PING/PONG command flow
5. Test AR camera and image tracking

## Key Files
| File | Purpose |
|------|---------|
| `unityLibrary/src/.../RNUnityPlayerActivity.java` | Unity Activity with UnitySendMessage |
| `UnityBridgeModule.kt` | RN native module |
| `UnityBridgePlugin.cs` | Unity side IPC receiver |
| `RNMessageReceiver.cs` | Unity command handler |
| `UnityBridgeModule.ts` | RN TypeScript bridge |

## Specs touched
None — integration only, no contract changes.
