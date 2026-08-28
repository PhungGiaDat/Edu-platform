# Platform Differences — ARKit vs ARCore

> AR Foundation 6.x. iOS via `com.unity.xr.arkit`. Android via
> `com.unity.xr.arcore`. Both providers implement
> `XRImageTrackingSubsystem`.

## At a glance

| Capability | ARKit (iOS) | ARCore (Android) |
|---|---|---|
| Concurrent tracked images | 4 (per Apple docs) | 20+ (varies by device) |
| Mutable runtime library | Yes (iOS 13+) | Yes (most devices) |
| Compile-time library authoring | Requires macOS + Xcode (AR Resource Group) | Editor-friendly; no Xcode needed |
| `ScheduleAddImageWithValidationJob` worker thread | Yes | Yes |
| `XRReferenceImage` runtime metadata | Includes AR Resource Group data | Simpler — texture + size only |
| Tracking jitter (typical, well-lit) | Lower | Higher |
| Low-light tracking | Graceful | Drops earlier |
| Image rotation tracking | Yes | Yes |
| Multi-target (single image with multiple markers) | Yes (via `ARResourceGroupName`) | Limited |
| Camera autofocus during tracking | Yes | Yes |

## Concurrent image tracking budget

**This is the most consequential difference.**

- **ARKit: 4 simultaneous images.** Apple's documentation states this.
  Beyond 4, additional images are detected but not tracked.
- **ARCore: 20+ simultaneous images.** Google does not document a hard
  cap; device memory and CPU are the practical limit.
- **XR Simulation: unlimited** (test convenience only).

If your UX requires more than 4 cards visible at once, **graceful
degradation is required on iOS**:

```csharp
public class ConcurrentTrackingGuard
{
    private const int IOS_MAX = 4;
    private readonly ARTrackedImageManager _manager;

    public int EffectiveMax => Application.platform == RuntimePlatform.IPhonePlayer
        ? IOS_MAX
        : int.MaxValue;

    public bool IsOverBudget() =>
        _manager.trackables.Count(t => t.trackingState == TrackingState.Tracking)
        > EffectiveMax;
}
```

The right pattern is to drop the lowest-priority card from tracking
when the budget is exceeded. Don't depend on the subsystem to enforce
the cap.

## Compile-time vs runtime library

### ARKit compile-time path

```text
1. Open the project on macOS
2. Install Xcode + the ARKit XR Plugin
3. Author an XRReferenceImageLibrary asset (Editor → Create → XR → Reference Image Library)
4. For each entry, set:
   - Texture2D (imported as Default)
   - Specify Physical Size (metres)
   - For ARKit: optionally select AR Resource Group
5. Build the iOS player. Xcode post-process generates the AR Resource Group
6. App loads the library at startup
```

**This path is macOS-only.** On Windows, you cannot edit an
`XRReferenceImageLibrary` asset for ARKit — the AR Resource Group
metadata is opaque and Xcode-generated.

### ARCore compile-time path

Same `XRReferenceImageLibrary` asset, but the ARCore provider does not
need Xcode post-processing. You can author the asset on Windows and
build the Android player directly.

### Runtime path (both providers)

`MutableRuntimeReferenceImageLibrary` works on both providers. This is
the path used by most dynamic-card projects, and the only path
available for cross-platform Editor development.

**Default to runtime unless you need the absolute fastest session start
or you have a fixed production set.**

## Platform-specific ARSession state quirks

### ARKit

| State transition | Notes |
|---|---|
| `None → SessionInitializing` | Camera permission prompt fires here |
| `SessionInitializing → SessionTracking` | Fast (sub-second) once permission is granted |
| `SessionTracking → Paused` | On app background or AR view dismissal |
| `SessionTracking → Unsupported` | Old devices (iPhone 5s and earlier), or ARKit disabled in Settings |

ARKit supports **relocalisation**: if the session is briefly lost and
recovered, the same physical cards get the same `TrackableId`. Use this
when designing grace-period logic.

### ARCore

| State transition | Notes |
|---|---|
| `None → Installing` | Common on Android — Google Play Services for AR (ARCore APK) downloads on first use |
| `Installing → SessionInitializing` | After install completes |
| `SessionInitializing → SessionTracking` | Slower than ARKit (2–5s typical) |
| `SessionTracking → Unsupported` | Devices without ARCore support; older or low-end |
| Any state → `Paused` | Less aggressive than ARKit — ARCore keeps warm session in background |

ARCore **does not relocalise** the same way ARKit does. After a session
restart, the same physical card may get a different `TrackableId`.

## Texture requirements

Both providers share the same texture requirements for
`ScheduleAddImageWithValidationJob`:

- `RGBA32` format
- ≥ 256×256 resolution
- High contrast (feature-rich)
- No CMYK, no colour profiles
- Read/write enabled

**ARCore-specific quirk**: ARCore's feature extraction is slightly less
tolerant of low-contrast images than ARKit. Test your deck on real
Android devices, not just iOS.

## Removal event shape (cross-version)

| AR Foundation version | `args.removed` shape |
|---|---|
| 5.x and earlier | `IEnumerable<ARTrackedImage>` |
| 6.0+ | `IEnumerable<KeyValuePair<TrackableId, ARTrackedImage>>` |

If you copy code from older blog posts or Stack Overflow answers, it
will not compile against AR Foundation 6.x. The correct loop:

```csharp
foreach (var kvp in args.removed)
{
    var img = kvp.Value;
    // ...
}
```

## Library capability checks

Different from `supportsMutableLibrary` — `XRImageTrackingSubsystemDescriptor`
exposes:

| Capability | Description |
|---|---|
| `supportsMutableLibrary` | Can the subsystem accept runtime additions? |
| `supportsImageLibrary` | Can the subsystem load `XRReferenceImageLibrary` assets? |
| `supportsMovingImages` | Can the subsystem track moving images (not just stationary)? (ARCore feature) |

Always check at runtime:

```csharp
var desc = imageManager.descriptor;
if (!desc.supportsMutableLibrary) { /* fall back to compile-time library */ }
if (!desc.supportsImageLibrary) { /* provider doesn't support image tracking at all */ }
```

## Physical width measurement

Both providers need the physical width of the printed card to compute
the world-space pose accurately. **Wrong width → wrong pose.**

- ARKit: accurate to within ±5% if width is measured precisely.
- ARCore: accurate to within ±10% in good lighting; degrades faster
  in low light.

Best practice: measure the actual printout (don't trust the design
file). Forgetting this is the most common cause of "tracking works in
the Editor but the model floats off the card on the device."

## Permissions and privacy

| Platform | Permission | Required for |
|---|---|---|
| iOS | `NSCameraUsageDescription` | Camera access; required for ARKit |
| Android | `android.permission.CAMERA` | Camera access; required for ARCore |
| Android | (no special permission) | ARCore install via Google Play Services for AR |
| iOS | (no special permission) | ARKit is built-in |

On Android, the ARCore APK install is **on-demand by default**. Set
`ARCoreInstallMode` to `Required` for production apps.

## Version pinning

Recommended pins (as of AR Foundation 6.0.x):

```json
{
  "com.unity.xr.arfoundation": "6.0.7",
  "com.unity.xr.arkit": "6.0.6",
  "com.unity.xr.arcore": "6.0.6",
  "com.unity.xr.management": "4.5.4",
  "com.unity.xr.core-utils": "2.6.0"
}
```

**Don't bump these casually.** AR Foundation 6.x has subtle API changes
from 5.x (e.g. `args.removed` shape, `maxNumberOfTrackedImages` removal).
Bumping mid-project requires a planned migration, not a casual edit.

## See also

- `references/image-tracking.md` — core concepts, lifecycle
- `references/runtime-library.md` — runtime library build sequence
- `references/xr-simulation.md` — Editor testing
- `references/project-patterns.md` — patterns that work across platforms
