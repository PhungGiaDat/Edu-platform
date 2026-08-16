---
name: unity-arfoundation-image-tracking
description: Build image-tracking AR features with Unity AR Foundation 6.x — ARTrackedImageManager, MutableRuntimeReferenceImageLibrary, ScheduleAddImageWithValidationJob, XR Simulation, multi-image tracking, and ARCore/ARKit platform differences. Use when implementing AR marker detection, runtime image library, flashcard/QR target tracking, marker-based anchors, or pose-driven content on Unity. Targets AR Foundation 6.0+ on iOS and Android.
---

# Unity AR Foundation Image Tracking

This skill covers image-based AR tracking on Unity AR Foundation 6.x. It is
the canonical entry point for any feature that involves recognising a real-world
image (printed card, poster, QR, label) and attaching 3D content to it.

## When to load this skill

Load this skill when:

- Adding AR marker / image / QR target detection
- Configuring `ARTrackedImageManager`
- Using `MutableRuntimeReferenceImageLibrary` for runtime-added targets
- Calling `ScheduleAddImageWithValidationJob`
- Working with `trackablesChanged` events (`added`, `updated`, `removed`)
- Handling multi-card simultaneous tracking
- Setting up XR Simulation for image-tracking testing
- Debugging ARCore vs ARKit differences

Do NOT load this skill for:

- Plane detection (use `ARPlaneManager` patterns)
- Face tracking (use `ARFaceManager` patterns)
- Object tracking (use `ARTrackedObjectManager` patterns)
- XR Interaction Toolkit (XRI) — see `unity-xr` (XRI-focused)
- Web-based AR (MindAR, WebXR) — separate stack

## When to load references

Don't read all of `references/` upfront. Pick what fits the task.

| If you're working on…                            | Load                                |
| ------------------------------------------------ | ----------------------------------- |
| Core image-tracking concepts, lifecycle, events | `references/image-tracking.md`      |
| Runtime library, validation jobs, dynamic add    | `references/runtime-library.md`     |
| Editor testing, mock detectors, XR Simulation   | `references/xr-simulation.md`       |
| iOS vs Android provider differences              | `references/platform-differences.md`|
| Multi-card, registries, invariants, anti-patterns | `references/project-patterns.md`  |

## Core principles

1. **Use `referenceImage.name` for routing, never `index`.** The
   `XRReferenceImage.index` is the position within the library at build
   time — it shifts when cards are added in non-deterministic order,
   when `ErrorInvalidImage` skips a card, or when the library is
   rebuilt.
2. **Use `TrackableId` for runtime identity, `qrId` (== `name`) for stable identity.** TrackableId is ephemeral across sessions; never persist it. Persist `qrId` and re-derive TrackableId from the new session's tracking events.
3. **Subscribe in `OnEnable` / unsubscribe in `OnDisable`.** `ARTrackedImageManager` is enabled/disabled many times within a session. Listeners attached in `Awake` leak across swap operations.
4. **Don't destroy on the first `removed` event.** AR subsystems lose track frequently (occlusion, glare, head movement). Use a stabilisation layer (typically 600–900ms grace period) before destroying models.
5. **Gate AR API calls on `ARSession.state`.** Direct calls during `SessionInitializing` return null subsystems.
6. **ARCore vs ARKit are not identical.** Tracking budgets, mutable library support, removal event signatures, and `XRReferenceImageLibrary` authoring all differ.

## Quick start — runtime path (no Xcode required)

```csharp
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

public class RuntimeImageTracker : MonoBehaviour
{
    [SerializeField] private ARTrackedImageManager imageManager;
    [SerializeField] private Texture2D referenceImage;
    [SerializeField] private string cardId = "card_001";
    [SerializeField] private float physicalWidthMeters = 0.08f; // 8cm card

    private void OnEnable()
    {
        if (imageManager != null)
            imageManager.trackablesChanged.AddListener(OnTrackedImagesChanged);
    }

    private void OnDisable()
    {
        if (imageManager != null)
            imageManager.trackablesChanged.RemoveListener(OnTrackedImagesChanged);
    }

    private IEnumerator Start()
    {
        // Wait for the subsystem to be ready.
        while (imageManager == null || imageManager.subsystem == null)
            yield return null;

        if (!imageManager.descriptor.supportsMutableLibrary)
        {
            Debug.LogError("Provider does not support mutable runtime library.");
            yield break;
        }

        // Build a fresh mutable library, then disable the manager before
        // assignment so the subsystem doesn't fire spurious `removed` events.
        var lib = imageManager.CreateRuntimeLibrary() as MutableRuntimeReferenceImageLibrary;
        if (lib == null) yield break;

        imageManager.enabled = false;
        imageManager.referenceLibrary = lib;

        var job = lib.ScheduleAddImageWithValidationJob(
            referenceImage, cardId, physicalWidthMeters);

        // Pump frames until the validation job completes.
        while (!job.jobHandle.IsCompleted) yield return null;
        job.jobHandle.Complete();

        if (job.status != AddReferenceImageJobStatus.Success)
        {
            Debug.LogError($"Add image failed: {job.status}");
            yield break;
        }

        imageManager.enabled = true;
    }

    private void OnTrackedImagesChanged(ARTrackablesChangedEventArgs<ARTrackedImage> args)
    {
        foreach (var img in args.added)  OnAdded(img);
        foreach (var img in args.updated) OnUpdated(img);
        foreach (var kvp in args.removed) OnRemoved(kvp.Value);
    }

    private void OnAdded(ARTrackedImage img)    { /* spawn content by img.referenceImage.name */ }
    private void OnUpdated(ARTrackedImage img)  { /* update content pose */ }
    private void OnRemoved(ARTrackedImage img)  { /* start grace-period timer — do not destroy yet */ }
}
```

## Workflow

### Implementing a new image-tracking feature

1. Check whether the device provider supports mutable libraries via
   `imageManager.descriptor.supportsMutableLibrary`. Fall back to a
   precompiled `XRReferenceImageLibrary` only when this returns `false`.
2. Build the library BEFORE enabling `imageManager`:
   - `CreateRuntimeLibrary()` returns `XRReferenceImageLibrary`; cast to
     `MutableRuntimeReferenceImageLibrary` for runtime additions.
   - Disable `imageManager`, assign `referenceLibrary`, re-enable.
3. Add images with `ScheduleAddImageWithValidationJob(texture, name, widthMeters)`.
   Wait for `jobHandle.IsCompleted` before reading `job.status`.
4. Subscribe to `trackablesChanged` in `OnEnable`, unsubscribe in `OnDisable`.
5. Use `referenceImage.name` as the routing key to your content layer.
6. Add a stabilisation layer for `removed` events (typical: 600–900ms grace).

### Modifying existing tracking behaviour

1. Trace the change through both `added`, `updated`, and `removed` flows.
2. Verify that your routing uses `referenceImage.name` (not `index`).
3. If you change grace period or stability thresholds, surface them as
   configuration (not constants).
4. Test with XR Simulation before requesting device validation.

### Setting up XR Simulation (Editor testing)

1. Install the XR Simulation package via `com.unity.xr.core-utils` (already
   shipped with AR Foundation).
2. Open `Window → XR Plug-in Management`.
3. Enable `XR Simulation` for the Editor tab.
4. Use the XR Simulation view (Window → XR → XR Simulation) to feed mock
   images into the running session.

See `references/xr-simulation.md` for the full test recipe.

## Anti-patterns (rejected by reviewer)

- **Routing by `XRReferenceImage.index`.** Index shifts across rebuilds.
- **One global `currentTarget` / `currentModel` field.** Breaks multi-card tracking.
- **Subscribing in `Awake` / `Start` and unsubscribing in `OnDestroy`.** Subscriptions leak across enable/disable cycles.
- **Destroying on first `removed` event.** Causes flicker when the camera briefly loses a card.
- **Hardcoded card IDs, model URLs, grace periods.** All must come from configuration or backend.
- **Calling `imageManager.referenceLibrary =` while the manager is enabled.** Triggers spurious `removed` events for previously-tracked images.
- **Persisting `TrackableId` to disk.** It is ephemeral across sessions.
- **Using `XRReferenceImageLibrary` (compile-time asset) on Windows.** `XRReferenceImageLibrary` requires macOS + Xcode authoring. Use the runtime path on Windows.

## References

- `references/image-tracking.md` — `ARTrackedImageManager`, `ARTrackedImage`, `trackablesChanged`, lifecycle.
- `references/runtime-library.md` — `MutableRuntimeReferenceImageLibrary`, `ScheduleAddImageWithValidationJob`, library swap patterns.
- `references/xr-simulation.md` — Editor mock image detector, PlayMode test recipe.
- `references/platform-differences.md` — ARKit vs ARCore provider differences, version pins, capabilities matrix.
- `references/project-patterns.md` — TrackableId ↔ qrId registry, multi-image policy, invariants, performance budgets.

## External references

- **Unity AR Foundation manual:** https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0/manual/
- **AR Foundation Samples (canonical examples):** https://github.com/Unity-Technologies/arfoundation-samples
- **Apple ARKit developer docs:** https://developer.apple.com/documentation/arkit
- **Google ARCore developer docs:** https://developers.google.com/ar
