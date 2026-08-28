# Image Tracking — Core Concepts

> AR Foundation 6.x. Targets `ARTrackedImageManager`, `ARTrackedImage`,
> `trackablesChanged`, and the surrounding lifecycle.

## The component

`ARTrackedImageManager` is the Unity-side component that owns one image
library and emits tracking events. It requires:

| Dependency | Why |
|---|---|
| `ARSession` | Owns the device session lifecycle |
| `XROrigin` (formerly `ARSessionOrigin`) | Anchors the camera and world |
| `ARCameraManager` | Provides the camera texture |
| A valid XR Plug-in provider (ARKit / ARCore / Simulation) | Implements the platform-specific tracker |

Without these four, `ARTrackedImageManager.enabled = true` either does
nothing or throws at startup.

## The two library types

### `XRReferenceImageLibrary` (compile-time asset)

- Authored in the Editor via an `XRReferenceImageLibrary` ScriptableObject.
- `XRReferenceImage` entries require a Texture2D, a physical size, and
  per-platform metadata.
- For ARKit, this requires macOS + Xcode (the `AR Resource Group` is
  generated at build time, not in the Editor).
- Best for: known, fixed marker sets; production iOS builds.

### `MutableRuntimeReferenceImageLibrary` (runtime-built)

- Created via `imageManager.CreateRuntimeLibrary()` and cast to the
  mutable subtype.
- Populated by `ScheduleAddImageWithValidationJob(texture, name, widthMeters)`.
- Validated on a worker thread; status reported via `AddReferenceImageJobState`.
- Best for: dynamic card sets, networked targets, A/B test decks.

**Default to mutable runtime unless you are doing a fixed production
iOS build.** See `references/runtime-library.md` for the full
sequence.

## The trackable

`ARTrackedImage` is the runtime representation of one physical card
the subsystem is currently tracking. Fields:

| Field | Type | Notes |
|---|---|---|
| `trackableId` | `TrackableId` | Runtime-only guid. Stable within session, ephemeral across sessions. |
| `referenceImage` | `XRReferenceImage` | The library entry. `name` is the routing key. |
| `trackingState` | `TrackingState` | `None` / `Limited` / `Tracking`. Always check before reading pose. |
| `transform` | `Transform` | World-space pose of the card centre. |
| `size` | `Vector2` | Physical size of the detected card (metres). |

The `referenceImage` is shared across all currently-tracked instances of
the same card — don't mutate it.

## The events

`imageManager.trackablesChanged` is a `UnityEvent` with payload type
`ARTrackablesChangedEventArgs<ARTrackedImage>`. Three sub-collections:

| Sub-collection | When it fires | Lifetime of the entry |
|---|---|---|
| `args.added` | Subsystem first sees this physical card this session | Until `args.removed` fires for the same `trackableId` |
| `args.updated` | Subsystem has a new pose for a card already in `args.added` | Until `args.removed` |
| `args.removed` | Subsystem lost the card (occlusion, glare, out-of-frame, low light) | n/a — the entry is gone |

**Important: AR Foundation 6.0+ changed `args.removed`'s shape.** It is
now `IEnumerable<KeyValuePair<TrackableId, ARTrackedImage>>`, not a
plain `IEnumerable<ARTrackedImage>`. Older code samples are wrong on
this point.

```csharp
private void OnTrackedImagesChanged(ARTrackablesChangedEventArgs<ARTrackedImage> args)
{
    foreach (var img in args.added)                 // ARTrackedImage
        HandleAdded(img);
    foreach (var img in args.updated)               // ARTrackedImage
        HandleUpdated(img);
    foreach (var kvp in args.removed)               // KeyValuePair<TrackableId, ARTrackedImage>
        HandleRemoved(kvp.Value);
}
```

## Lifecycle: enable, disable, reset

`ARTrackedImageManager` can be enabled and disabled many times per session
(when entering/leaving an AR view, when swapping libraries, when the app
is backgrounded).

| Phase | What you should do |
|---|---|
| `Awake` | Cache the `ARTrackedImageManager` reference. Do not subscribe. |
| `OnEnable` | Subscribe to `trackablesChanged`. |
| `OnDisable` | Unsubscribe from `trackablesChanged`. |
| `OnDestroy` | Clear any internal registries. Subscriptions are gone already. |

Subscribing in `Awake` and unsubscribing in `OnDestroy` leaks: the manager
can be disabled (`imageManager.enabled = false`) and re-enabled without
the GameObject being destroyed, leaving stale listeners attached.

## ARSession state gating

`ARSession.state` reports:

| State | Meaning |
|---|---|
| `None` | No session exists |
| `SessionInitializing` | Subsystem is loading; APIs may return null |
| `SessionTracking` | Active tracking; APIs are valid |
| `Paused` | User paused (e.g. app backgrounded briefly) |
| `Unsupported` | Device can't run AR (no provider, no permission) |
| `Installing` | ARCore install-on-demand |
| `Ready` | Equivalent to `Tracking` in newer versions |

**Never** call `imageManager.referenceLibrary = ...` while in
`SessionInitializing` or `None`. The subsystem is null. Always gate on
`ARSession.state == SessionTracking` or wait on a `stateChanged` event.

## The pattern: library swap

To swap the library mid-session (e.g. user picks a new deck):

```text
1. imageManager.enabled = false
2. Remove old listener (call from OnDisable-equivalent path)
3. imageManager.referenceLibrary = newLibrary
4. Wait for new library's job handles (ScheduleAddImageWithValidationJob)
5. imageManager.enabled = true
6. Add new listener (call from OnEnable-equivalent path)
```

**Always do this in this order.** If you re-enable the manager while
the old library is still assigned, you will see spurious `removed`
events for every previously-tracked card — even though no actual
tracking change happened.

## Tracking states and pose validity

`ARTrackedImage.trackingState` has three values:

| State | Pose valid? | Use it? |
|---|---|---|
| `Tracking` | Yes | Yes |
| `Limited` | Yes, but with caveats | Yes, but apply extra smoothing |
| `None` | No | No — guard with `if (img.trackingState == TrackingState.Tracking)` |

`Limited` usually means the subsystem has lost its high-confidence pose
but is still returning best-effort data. Don't rely on it for precise
placement; lerp toward the new pose over several frames.

## Concurrent image budget

The maximum number of simultaneously-tracked images is **provider-controlled**:

| Provider | Concurrent max |
|---|---|
| ARKit (iOS) | 4 simultaneous images (per ARKit docs) |
| ARCore (Android) | 20+ simultaneous images (varies by device) |
| XR Simulation | No hard limit (test convenience) |

AR Foundation 6.0+ removed the `maxNumberOfTrackedImages` setter on the
manager. You cannot change this from script. If your UX needs more
than the provider's limit, gracefully degrade.

## The `referenceImage.name` contract

`XRReferenceImage.name` is the only stable identifier that flows from
the library into runtime code:

- Library entry authored → `XRReferenceImage.name`
- `ARTrackedImage.referenceImage.name` at runtime
- Pass this string to your content layer (model spawner, registry, etc.)

Use it as your routing key. Don't use `XRReferenceImage.index` — index
is the position in the library at build time and shifts on rebuild.

## Common failure modes

| Symptom | Root cause | Fix |
|---|---|---|
| `imageManager.subsystem == null` | Subsystem not initialised | Wait for `ARSessionState.SessionTracking` |
| `trackablesChanged` fires repeatedly for the same card | Stale internal list not cleared between sessions | Implement a per-`TrackableId` registry (see `project-patterns.md`) |
| Models snap to wrong location | Reading `img.transform` while `trackingState == Limited` | Guard on `TrackingState.Tracking` |
| Pose jitters at edge of view | Subsystem returns noisy poses at low confidence | Lerp/slerp toward target pose over multiple frames |
| `args.removed` is empty even after card lost | Subsystem uses internal grace period before firing `removed` | Don't depend on `removed` for immediate UX; poll `trackingState` if you need faster feedback |
| `XRReferenceImageLibrary` asset cannot be edited on Windows | ARKit-specific authoring requires macOS + Xcode | Use `MutableRuntimeReferenceImageLibrary` runtime path on Windows |

## See also

- `references/runtime-library.md` — how to build a runtime library
- `references/project-patterns.md` — registry, invariants, multi-card
- `references/platform-differences.md` — ARKit vs ARCore specifics
- `references/xr-simulation.md` — Editor testing
