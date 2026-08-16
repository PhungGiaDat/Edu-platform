---
name: unity-rn-bridge
description: Wire the React Native shell to the Unity .xcframework for the LearnAR mobile AR platform. Use when implementing RN↔Unity messaging, Unity TurboModule surface, AR session init from RN, payload DTOs, or two-way event channels. Covers the LearnAR-specific bridge contract (loadARExperience, initSession, onArReady, etc.) and the rule that the same backend contracts power both web and native.
---

# LearnAR RN↔Unity Bridge

This skill covers the React Native ↔ Unity bridge for the LearnAR mobile
education platform. The same backend (`/api/v1/ar/*`) serves both the
Web AR path (MindAR + A-Frame) and the Native AR path (Unity 6 LTS +
AR Foundation 6.0.7 + React Native shell). This skill is for the
Native path only.

## When to load this skill

Load this skill when:

- Adding a new RN↔Unity message (RN → Unity or Unity → RN)
- Implementing a new AR session control from RN
- Touching the Unity TurboModule surface (e.g. `loadARExperience`)
- Modifying the payload DTOs between RN and Unity
- Debugging message-type mismatches between RN and Unity
- Optimising the bridge round-trip latency

Do NOT load this skill for:

- AR Foundation API pattern (use `unity-arfoundation-image-tracking`)
- Web AR (MindAR + A-Frame) — it has its own `mindar-image-tracking` skill
- Backend API design — see `api-design` skill
- React Native UI components — see `react-native-patterns`

## Architecture

```text
┌──────────────────────────┐
│ React Native (TypeScript)│
│  mobile/rn/src/bridge/   │
│                          │
│  arMessages.ts           │ ← payload DTOs (TS types)
│  ARExperienceMapper.ts   │ ← RN → Unity payload builder
│  RNBridgeTurboModule.ts  │ ← native module surface
└──────────────────────────┘
              │  ▸ JSON over iOS Swift bridge
              ▼
┌──────────────────────────┐
│ Unity (C#)               │
│  mobile/unity/Assets/    │
│                          │
│  Bridge/                 │
│  ├─ RNMessageReceiver.cs │ ← receives RN → Unity
│  ├─ RNEventEmitter.cs    │ ← sends Unity → RN
│  └─ ARPayloadMapper.cs   │ ← Unity-side DTOs
│                          │
│  AR/                     │
│  ├─ ARSessionManager.cs  │ ← consumes messages, drives AR
│  ├─ ARExperienceHandler.cs │ ← handles loadARExperience
│  └─ RuntimeImageTrackingPOC.cs
└──────────────────────────┘
              │
              ▼
┌──────────────────────────┐
│ Backend (FastAPI)        │
│  /api/v1/ar/             │
│  ├─ stability-config     │
│  ├─ semantic-rules       │
│  └─ combo-triggered      │
└──────────────────────────┘
```

## Bridge contract

### RN → Unity

| Method | Payload | Effect |
|---|---|---|
| `initSession()` | `{}` | Start a basic AR session (no image tracking) |
| `loadARExperience(payload)` | `ARExperiencePayload` | Set up image tracking with the given cards |
| `setPlaneDetection(bool)` | `{ enabled: boolean }` | Toggle plane detection |
| `pauseSession()` | `{}` | Pause the AR session |
| `resumeSession()` | `{}` | Resume the AR session |
| `destroySession()` | `{}` | Tear down the AR session |

### Unity → RN

| Event | Payload | When |
|---|---|---|
| `onArReady` | `{ version: string }` | AR session reaches `SessionTracking` |
| `onPlaneDetected` | `{ planeId, transform }` | New plane detected |
| `onObjectPlaced` | `{ cardId, transform }` | Model instantiated for a tracked card |
| `onTrackingStateChanged` | `{ state }` | `Tracking` / `Limited` / `NotTracking` |
| `onError` | `{ code, message }` | Fatal error |
| `onImageDetected` | `{ imageId, imageName, transform }` | Card first detected |
| `onImageTrackingLost` | `{ imageId }` | Card lost (after grace period) |
| `onMultiImageDetected` | `{ imageIds, count }` | Multiple cards detected simultaneously |

## Payload DTOs

### `ARExperiencePayload` (RN → Unity)

```typescript
interface ARExperiencePayload {
  experienceId: string;
  cards: CardDescriptor[];
  stabilityConfig: {
    graceMs: number;
    hysteresis: number;
    maxConcurrentImages: number;
  };
  semanticRules: SemanticRule[];
  startScreen: 'ar' | 'card-picker';
}

interface CardDescriptor {
  qrId: string;            // stable identity
  imageUrl: string;        // HTTPS, public bucket
  physicalWidthMeters: number;  // 0.08 default (8cm card)
  previewImageUrl?: string;
  modelUrl?: string;
}

interface SemanticRule {
  ruleId: string;
  comboName: string;
  requiredCardIds: string[];  // set, all required
  animation?: string;
  audioUrl?: string;
}
```

### Unity-side mirror (C#)

```csharp
[Serializable]
public class ARExperiencePayload
{
    public string experienceId;
    public List<CardDescriptor> cards;
    public StabilityConfig stabilityConfig;
    public List<SemanticRule> semanticRules;
    public string startScreen;
}

[Serializable]
public class CardDescriptor
{
    public string qrId;
    public string imageUrl;
    public float physicalWidthMeters = 0.08f;
    public string previewImageUrl;
    public string modelUrl;
}

[Serializable]
public class StabilityConfig
{
    public int graceMs = 900;
    public float hysteresis = 0.85f;
    public int maxConcurrentImages = 4;
}

[Serializable]
public class SemanticRule
{
    public string ruleId;
    public string comboName;
    public List<string> requiredCardIds;
    public string animation;
    public string audioUrl;
}
```

## TypeScript ↔ C# naming

The two sides use slightly different conventions. The mapper
(`ARPayloadMapper.cs` ↔ `ARExperienceMapper.ts`) handles the conversion.

| TS | C# | Notes |
|---|---|---|
| `camelCase` | `PascalCase` | Fields renamed via mapper |
| `string[]` | `List<string>` | Arrays become Lists |
| `number` | `float` (default) | Doubles are explicit |
| `boolean` | `bool` | |
| `null` | `null` (nullable) | C# needs `?` for reference types |
| nested objects | `[Serializable]` | |

When adding a new field:

1. Add to the TS interface in `mobile/rn/src/bridge/arMessages.ts`.
2. Add the C# DTO in `mobile/unity/Assets/Bridge/ARPayloadMapper.cs`.
3. Add the conversion in `mobile/rn/src/bridge/ARExperienceMapper.ts`.
4. Update `ARExperienceHandler.cs` to consume the new field.
5. Add a Unity test fixture in `Assets/Tests/EditMode/` (if it has logic).

## Anti-patterns (rejected by reviewer)

- **Hardcoding card IDs or model URLs in Unity.** They come from the
  payload, which comes from the backend.
- **Adding a new message without updating both sides.** A one-sided
  message type causes silent failures on the other side.
- **Sending the entire payload on every state change.** Use events
  with small payloads; reserve full payloads for `loadARExperience`.
- **Trusting `Time.unscaledTime` on the Unity side.** This can drift
  from RN's `Date.now()`. If you need cross-side timestamping, use a
  shared monotonic clock from the platform.
- **Polling from RN.** The bridge is event-driven; polling wastes
  battery and adds latency.
- **Unity → RN events without a subscriber check.** Always emit
  events via a singleton emitter that no-ops if the bridge is not
  initialised.

## Implementation patterns

### Pattern: typed emitter

```csharp
public class RNEventEmitter : MonoBehaviour
{
    private static RNEventEmitter _instance;
    public static RNEventEmitter Instance => _instance ??= new RNEventEmitter();

    public void SendEvent(string eventName, object payload)
    {
        if (!IsBridgeReady) return;  // no-op if RN not connected
        UnityMessageManager.Instance.SendMessageToRN(eventName, payload);
    }

    private bool IsBridgeReady => /* TODO: check bridge state */;
}
```

### Pattern: receiver with explicit handler

```csharp
public class RNMessageReceiver : MonoBehaviour
{
    private void OnEnable()
    {
        UnityMessageManager.Instance.OnMessageReceived += HandleMessage;
    }

    private void OnDisable()
    {
        UnityMessageManager.Instance.OnMessageReceived -= HandleMessage;
    }

    private void HandleMessage(Message message)
    {
        switch (message.Name)
        {
            case "initSession":        ARSessionManager.Instance.InitSession(); break;
            case "loadARExperience":   HandleLoadARExperience(message.Payload); break;
            case "setPlaneDetection":  HandlePlaneDetection(message.Payload); break;
            case "pauseSession":       ARSessionManager.Instance.PauseSession(); break;
            case "resumeSession":      ARSessionManager.Instance.ResumeSession(); break;
            case "destroySession":     ARSessionManager.Instance.StopSession(); break;
            default: Debug.LogWarning($"[RN→Unity] Unknown message: {message.Name}"); break;
        }
    }
}
```

### Pattern: payload deserialisation

```csharp
private void HandleLoadARExperience(string payloadJson)
{
    var payload = JsonUtility.FromJson<ARExperiencePayload>(payloadJson);
    if (payload == null) {
        RNEventEmitter.Instance.SendEvent("onError", new {
            code = "INVALID_PAYLOAD",
            message = "loadARExperience payload could not be parsed"
        });
        return;
    }
    ARExperienceHandler.Instance.Handle(payload);
}
```

`JsonUtility` is the built-in Unity JSON parser. It handles
`[Serializable]` types but has limitations:

- No nullable types (use defaults / sentinel values)
- No `Dictionary<,>` (use parallel Lists)
- No dictionary-like JSON (objects must map to `[Serializable]` classes)

For complex payloads, consider a more capable parser (Newtonsoft.Json
via the included package, or `System.Text.Json`).

## Build configuration

The RN shell + Unity output is built into a `.xcframework` (iOS) or
`.aar` (Android). The build path is:

- iOS: `mobile/unity/build/iOS/UnityFramework.framework`
- Android: `mobile/unity/build/Android/unityLibrary.aar`

The RN shell references this via:

- iOS: `mobile/rn/ios/UnityIntegration/`
- Android: `mobile/rn/android/unityLibrary/`

Build these locally only when you change Unity code. The CI handles
production builds on a Mac (iOS) and Linux (Android).

## Windows dev constraint

`com.unity.xr.arfoundation` works on Windows, but **ARKit's
compile-time `XRReferenceImageLibrary` asset requires macOS + Xcode**.
The Windows dev path uses `MutableRuntimeReferenceImageLibrary` —
never hardcode the compile-time path. See
`unity-arfoundation-image-tracking/references/runtime-library.md`.

## Testing the bridge

### EditMode tests (no Unity Editor)

- `Assets/Tests/EditMode/ARSessionManagerRegressionTests.cs` exists
  for AR state lifecycle tests.
- Add bridge tests by:
  1. Inject a mock `IMessageReceiver` interface.
  2. Construct a `RNMessageReceiver` with the mock.
  3. Fire messages and assert on the AR state.

### PlayMode tests (Unity Editor)

- Use XR Simulation to drive image-tracking events.
- Inject a fake `RNEventEmitter` that records events to a list.
- Assert the list contents after triggering AR events.

### RN-side tests

- `mobile/rn/__tests__/bridge/ARExperienceMapper.test.ts` for DTO
  conversion.
- Use the MockBridge module to record emits.

## Backwards compatibility

When adding a new field to the payload:

- C# DTOs must default-initialise missing fields (use default values).
- TS DTOs must use `?` for optional fields.
- New fields are additive; old fields stay.
- Don't remove fields without a deprecation cycle.

## See also

- `unity-arfoundation-image-tracking` — Unity-side AR Foundation API
- `mindar-image-tracking` — Web AR alternative
- `react-native-patterns` — RN UI patterns
- `api-design` — backend API design
