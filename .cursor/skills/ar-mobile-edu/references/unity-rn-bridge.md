# Unity ↔ React Native Bridge Reference

> Source of truth: `docs/superpowers/specs/2026-07-23-unity-rn-mobile-ar-design.md`
> + `mobile/rn/src/bridge/` + `mobile/unity/Assets/Bridge/`.

## Architecture

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
              onTrackingStateChanged, onError
```

The bridge is **Approach A** (locked 2026-07-23): Unity as `.xcframework`
+ custom Swift native module. RN communicates via TurboModule, Unity receives
via `RNMessageReceiver.cs`.

## Method surface

| Method                 | Args                            | When to call                |
| ---------------------- | ------------------------------- | --------------------------- |
| `initSession()`        | none                            | On `ARScreen` mount         |
| `loadARExperience(p)`  | `{ sessionId, flashcards, ...}` | After `onArReady`           |
| `setPlaneDetection(b)` | bool                            | On UX toggle / object placed |
| `pauseSession()`       | none                            | On app background           |
| `resumeSession()`      | none                            | On app foreground           |
| `destroySession()`     | none                            | On `ARScreen` unmount       |

## Event surface (Unity → RN)

| Event                      | Payload                                  |
| -------------------------- | ---------------------------------------- |
| `onArReady`                | null                                     |
| `onPlaneDetected`          | `{ planeId, alignment: 'H' \| 'V' }`     |
| `onObjectPlaced`           | `{ modelId, anchorId }`                  |
| `onTrackingStateChanged`   | `{ state: 'normal' \| 'limited' \| 'none' }` |
| `onError`                  | `{ code, message }`                      |

## Payload contract

Built in TypeScript by `mobile/rn/src/bridge/ARExperienceMapper.ts` from
the flashcards fetched from `/api/v1/courses/{id}/flashcards`. Consumed in
C# by `mobile/unity/Assets/Bridge/ARPayloadMapper.cs`.

```typescript
// mobile/rn/src/bridge/arMessages.ts
export interface ARExperiencePayload {
  sessionId: string;
  flashcards: Array<{
    id: string;
    imageTargetUrl: string;       // PNG/JPG for ARKit runtime addReferenceImage
    modelUrl: string;             // .glb from Supabase
    stabilization: {
      gracePeriodMs: number;      // from /api/v1/ar/stability-config
      smoothingFactor: number;    // 0..1
    };
  }>;
  semanticRules: SemanticRule[]; // from /api/v1/ar/semantic-rules
}
```

```csharp
// mobile/unity/Assets/Bridge/ARPayloadMapper.cs
[Serializable]
public class ARExperiencePayload
{
    public string sessionId;
    public FlashcardPayload[] flashcards;
    public SemanticRule[] semanticRules;
}

[Serializable]
public class FlashcardPayload
{
    public string id;
    public string imageTargetUrl;
    public string modelUrl;
    public Stabilization stabilization;
}
```

## Sequencing rules

1. **Mount:** `ARScreen` mounts → `initSession()` → wait for `onArReady`.
2. **Fetch:** fetch flashcards + `/api/v1/ar/*` configs in parallel (see
   `vercel-react-best-practices` parallelization rule).
3. **Load:** `loadARExperience(payload)` only after `onArReady`. Calling
   earlier drops events because Unity receivers aren't bound yet.
4. **Lifecycle:** `pauseSession()` on app background, `resumeSession()` on
   foreground. Don't `destroySession()` mid-experience — `initSession()`
   again instead, which is faster.
5. **Unmount:** `destroySession()` on screen unmount to release ARKit
   resources. Skipping this leaks the ARSession and breaks the next mount.

## Common mistakes

- **Calling `loadARExperience` before `onArReady`.** Events fire into the
  void. Always sequence.
- **Not pausing on background.** iOS suspends the AR session anyway, but
  Unity's `OnApplicationPause` hook must mirror this or RN state goes
  stale.
- **Sending events without a registered listener.** Use `NativeEventEmitter`
  in the screen, not in App root — otherwise the listener outlives the
  screen and tries to update unmounted components.
