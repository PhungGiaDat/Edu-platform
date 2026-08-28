# Unity ARFoundation Reference

> Source of truth: `context/unity-ar-architecture.md` + Unity 6 LTS,
> ARFoundation 6.0.7, Apple ARKit XR Plugin 6.0.6.

## Scene setup (canonical pattern)

AR scenes in this project follow the **runtime image tracking** path because
ARKit's `XRReferenceImageLibrary` requires a macOS-Xcode compile step that
the Windows dev environment can't perform.

```
Assets/
├── AR/
│   ├── ARSessionManager.cs        # owns ARSession, ARSessionOrigin lifecycle
│   ├── RuntimeImageTrackingPOC.cs # runtime addReferenceImage workflow
│   ├── PlaneDetection.cs          # horizontal/vertical plane toggles
│   └── ARExperienceHandler.cs     # receives RN payload, configures scene
├── Bridge/
│   ├── RNMessageReceiver.cs       # Unity-side entry from RN TurboModule
│   ├── RNEventEmitter.cs          # sends onArReady / onPlaneDetected / ...
│   └── ARPayloadMapper.cs         # payload DTOs from arMessages.ts
├── Gestures/
│   └── ARGestureHandler.cs        # tap-to-place, drag, pinch
├── XR/Loaders/
│   ├── ARKitLoader.asset          # iOS provider
│   └── SimulationLoader.asset     # Editor simulation
└── Scripts/Interactions/
    ├── ComboManager.cs            # proximity + semantic combo evaluation
    └── FoodInteraction.cs         # example semantic interaction
```

## Runtime image tracking (Windows-friendly path)

```csharp
// RuntimeImageTrackingPOC.cs — DO NOT use XRReferenceImageLibrary here
public class RuntimeImageTrackingPOC : MonoBehaviour
{
    [SerializeField] ARTrackedImageManager trackedImageManager;

    public async Task AddImageTarget(string name, Texture2D image)
    {
        if (trackedImageManager == null || trackedImageManager.subsystem == null)
            throw new InvalidOperationException("ARSession not ready");

        // Runtime addReferenceImage works on iOS via ARKit, but requires
        // the image to be added BEFORE the subsystem starts tracking.
        trackedImageManager.subsystem.CreateRuntimeLibrary();
        trackedImageManager.subsystem.AddReferenceImage(name, image);
    }
}
```

> **Note:** `XRReferenceImageLibrary` compile-time path is reserved for the
> one-time MacBook Air M4 build that produces the production `.ipa`. The
> runtime path above is what every other commit must use.

## ARSession lifecycle

`ARSessionManager.cs` owns three states and never lets a transition happen
without checking the previous one:

```csharp
public enum ARSessionState { Idle, Initializing, Tracking, Paused, Error }

void Start()
{
    ARSession.stateChanged += OnARSessionStateChanged;
}

void OnARSessionStateChanged(ARSessionStateChangedEventArgs args)
{
    switch (args.state)
    {
        case ARSessionState.SessionInitializing:
            emitter.Send("onArReady", null);
            break;
        case ARSessionState.SessionTracking:
            // safe to enable gesture handler here
            break;
        case ARSessionState.NotTracking:
            // emit onTrackingStateChanged for stabilization layer
            emitter.Send("onTrackingStateChanged", new { state = "limited" });
            break;
    }
}
```

**Always check `ARSession.state` before calling AR APIs.** Direct calls during
`SessionInitializing` return null subsystems and crash.

## Plane detection

Toggleable from RN via `setPlaneDetection(bool)`:

```csharp
public void SetPlaneDetection(bool enabled)
{
    var planeManager = GetComponent<ARPlaneManager>();
    planeManager.enabled = enabled;
    if (!enabled) planeManager.trackables.ForEach(p => p.gameObject.SetActive(false));
}
```

Default: enabled on entry, disabled once an object is placed (UX feedback
to "lock" the scene). Re-enable via long-press.

## Loading `.glb` models

`.glb` URLs come from the backend's flashcard data, hosted on Supabase
Storage bucket `learnar-assets`:

```
{SUPABASE_URL}/storage/v1/object/public/learnar-assets/{path}
```

Download via `UnityWebRequest`, parse with **GLTFast** package (locked choice
— see `context/unity-ar-architecture.md`):

```csharp
public async Task<GameObject> LoadModel(string url)
{
    using var req = UnityWebRequest.Get(url);
    await req.SendWebRequest();
    var gltf = new GltfImport();
    await gltf.Load(req.downloadHandler.data);
    return gltf.InstantiateMainSceneAsync().Result;
}
```

**Cache downloaded models** via `mobile/rn/src/utils/glbCache.ts` (RN-side
LRU). Unity uses an in-memory `Dictionary<string, GameObject>` keyed by URL.

## Animation & audio

- Animations: `Animation`/`Animator` components on the model root. Trigger
  by name from `ComboManager.cs`.
- Audio: `Assets/Audio/ARAudioPlayer.cs` wraps `AudioSource` 3D-spatial
  playback. Triggered alongside animations.

## UI overlay (UGUI)

`context/unity-ar-architecture.md` locks UGUI (Canvas/Image) for in-AR
overlays. URP is **not** required. Built-in pipeline is sufficient for
AR overlay UI.

- World-space Canvas anchored to tracked image
- Screen-space Canvas for HUD (loading, error, hint)
- Claymorphic style — see `references/mobile-ar-performance.md` for material
  budget guidance
