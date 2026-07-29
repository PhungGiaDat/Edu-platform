# PHASE 2 RESEARCH: AR Image Tracking (Not Plane Detection)

**Author:** Researcher Agent  
**Date:** July 23, 2026  
**Status:** Complete

---

## Executive Summary

The current Unity stubs use `ARPlaneManager` and fire `onPlaneDetected`. For a flashcard AR experience, the correct approach is **image tracking AR**: ARKit/ARCore detect a printed physical flashcard and anchor a 3D model to it. This is fundamentally different from surface/plane detection. The good news: **runtime image addition is supported by both ARKit 14+ and ARCore via AR Foundation's `MutableRuntimeReferenceImageLibrary`**, meaning the DB migration is NOT a hard blocker — the app can download flashcard images at runtime from Supabase after the migration completes.

---

## 1. Platform Comparison: ARKit vs ARCore Image Tracking

| Capability | ARKit (iOS) | ARCore (Android) | Notes |
|---|---|---|---|
| **Min iOS version** | iOS 11 (basic), iOS 14 (runtime add) | ARCore 1.0+ | Runtime image addition requires iOS 14+ |
| **Reference image library size** | Up to **100** images | Up to **1,000** images | ARCore is more generous |
| **Simultaneous tracking** | Up to **4 images** at full quality | Up to **20 images** concurrent | ARKit is more precise (0.29° offset vs ARCore's 0.65°) |
| **Runtime image addition** | `MutableRuntimeReferenceImageLibrary` — YES | `MutableRuntimeReferenceImageLibrary` — YES | Both supported since AR Foundation 4.x |
| **Image removal at runtime** | **Not supported** | **Not supported** | Must swap entire library |
| **Physical size specification** | Strongly recommended | Mandatory for best results | ARCore needs it for distance estimation |
| **Min physical size** | ~5–8 cm (depends on texture quality) | 25% of camera frame minimum | ARKit detects from wider angles |
| **Tracking accuracy** | Higher precision (0.29° offset) | Lower precision (0.65° offset) | ARKit maintains stability longer |
| **Tracking when image out of view** | Drift can occur | Drift can occur | **Solution: use ARAnchorManager to pin content** |
| **Moving image tracking** | Supported ("Max Number of Moving Images" setting) | Supported | Combo flashcard feature is viable |

**Key Finding:** Both platforms fully support runtime image addition via `MutableRuntimeReferenceImageLibrary`. This is the recommended approach.

---

## 2. Recommended Reference Image Strategy

### Approach B (Runtime Download + Add) — Recommended

The app downloads flashcard image from Supabase at lesson load time, then adds it to the mutable library:

1. RN requests flashcard image URL from Supabase
2. RN downloads PNG → passes bytes to Unity via RNMessageReceiver
3. Unity converts bytes to `Texture2D`
4. Unity calls `MutableRuntimeReferenceImageLibrary.ScheduleAddImageWithValidationJob()`
5. On job completion → image is trackable
6. AR system detects flashcard → fires `onImageDetected`

**Advantages:**
- No app rebuild when flashcard content changes
- Scales to any number of flashcards
- Works with DB migration (images stored in Supabase Storage)

**Disadvantages:**
- Download latency before AR can detect image (mitigation: prefetch during lesson intro)
- Need to handle mutable library not supported on some older devices

### Approach A (Pre-bundled) — Fallback/Initial)

Bundle core flashcard images in `StreamingAssets/ARResources/` for offline capability and instant detection. Use this for:
- Demo/booth mode (no network)
- Free-tier lesson images that rarely change

### Implementation Sketch (Runtime Addition)

```csharp
// ImageTrackingManager.cs — replaces PlaneDetection.cs
using System;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;

public class ImageTrackingManager : MonoBehaviour
{
    [SerializeField] private ARTrackedImageManager trackedImageManager;

    private MutableRuntimeReferenceImageLibrary _mutableLibrary;
    private bool _libraryReady = false;

    public event Action<string, Vector3, Quaternion> OnImageDetected;
    public event Action<string> OnImageTrackingLost;
    public event Action<string, Vector3, Quaternion> OnImageUpdated;
    public event Action OnLibraryReady;
    public event Action<string> OnError;

    private void Awake() {
        if (trackedImageManager == null)
            trackedImageManager = FindFirstObjectByType<ARTrackedImageManager>();
    }

    private void OnEnable() {
        trackedImageManager.trackablesChanged += OnTrackablesChanged;

        // Check if image tracking is supported
        if (trackedImageManager.descriptor.supportsImageTracking) {
            UnityEngine.Debug.Log("[ImageTrackingManager] Image tracking supported");
            CreateMutableLibrary();
        } else {
            UnityEngine.Debug.LogError("[ImageTrackingManager] Image tracking NOT supported on this device");
            OnError?.Invoke("IMAGE_TRACKING_UNSUPPORTED");
        }
    }

    private void OnDisable() {
        if (trackedImageManager != null)
            trackedImageManager.trackablesChanged -= OnTrackablesChanged;
    }

    private async void CreateMutableLibrary() {
        try {
            // Convert existing library (if any) to mutable runtime library
            var runtimeLib = trackedImageManager.CreateRuntimeLibrary();

            if (runtimeLib is MutableRuntimeReferenceImageLibrary mutable) {
                _mutableLibrary = mutable;
                _libraryReady = true;
                UnityEngine.Debug.Log("[ImageTrackingManager] Mutable library ready");
                OnLibraryReady?.Invoke();
            } else {
                UnityEngine.Debug.LogError("[ImageTrackingManager] Platform does not support mutable libraries");
                OnError?.Invoke("MUTABLE_LIBRARY_UNSUPPORTED");
            }
        } catch (Exception ex) {
            UnityEngine.Debug.LogError($"[ImageTrackingManager] Failed to create mutable library: {ex.Message}");
            OnError?.Invoke($"LIBRARY_INIT_FAILED: {ex.Message}");
        }
    }

    /// <summary>
    /// Add a flashcard image at runtime from downloaded Texture2D.
    /// Call this after receiving image bytes from RN (via Supabase download).
    /// </summary>
    /// <param name="texture">The downloaded flashcard image as Texture2D</param>
    /// <param name="imageName">Identifier for this flashcard (e.g., qrId)</param>
    /// <param name="physicalWidthMeters">Real-world width of the printed flashcard in meters</param>
    public void AddReferenceImage(Texture2D texture, string imageName, float physicalWidthMeters = 0.08f) {
        if (!_libraryReady || _mutableLibrary == null) {
            UnityEngine.Debug.LogError("[ImageTrackingManager] Library not ready");
            OnError?.Invoke("LIBRARY_NOT_READY");
            return;
        }

        UnityEngine.Debug.Log($"[ImageTrackingManager] Adding image: {imageName}, size: {physicalWidthMeters}m");

        var jobState = _mutableLibrary.ScheduleAddImageWithValidationJob(
            texture,
            imageName,
            physicalWidthMeters
        );

        // Poll for completion (simplified; could use JobHandle in production)
        StartCoroutine(WaitForImageAdd(jobState, imageName));
    }

    private System.Collections.IEnumerator WaitForImageAdd(AddReferenceImageJobState jobState, string imageName) {
        yield return new WaitUntil(() => jobState.jobHandle.IsCompleted);

        if (jobState.status == AddReferenceImageStatus.Success) {
            UnityEngine.Debug.Log($"[ImageTrackingManager] Image added successfully: {imageName}");
            RNEventEmitter.Instance.SendEvent("onImageLibraryUpdated", new {
                imageName = imageName,
                status = "added"
            });
        } else {
            UnityEngine.Debug.LogError($"[ImageTrackingManager] Failed to add image: {imageName}, status: {jobState.status}");
            OnError?.Invoke($"IMAGE_ADD_FAILED: {imageName}");
        }
    }

    private void OnTrackablesChanged(ARTrackablesChangedEventArgs<ARTrackedImage> eventArgs) {
        // Handle newly detected images
        foreach (var trackedImage in eventArgs.added) {
            HandleImageAdded(trackedImage);
        }

        // Handle tracking updates
        foreach (var trackedImage in eventArgs.updated) {
            HandleImageUpdated(trackedImage);
        }

        // Handle images that are no longer tracked
        foreach (var trackedImage in eventArgs.removed) {
            HandleImageRemoved(trackedImage);
        }
    }

    private void HandleImageAdded(ARTrackedImage trackedImage) {
        string imageName = trackedImage.referenceImage.name;
        Vector3 position = trackedImage.transform.position;
        Quaternion rotation = trackedImage.transform.rotation;

        UnityEngine.Debug.Log($"[ImageTrackingManager] Image detected: {imageName} at {position}");

        RNEventEmitter.Instance.SendEvent("onImageDetected", new {
            imageName = imageName,
            trackableId = trackedImage.trackableId.ToString(),
            position = new { x = position.x, y = position.y, z = position.z },
            rotation = new { x = rotation.x, y = rotation.y, z = rotation.z, w = rotation.w },
            trackingState = trackedImage.trackingState.ToString()
        });

        OnImageDetected?.Invoke(imageName, position, rotation);
    }

    private void HandleImageUpdated(ARTrackedImage trackedImage) {
        string imageName = trackedImage.referenceImage.name;
        Vector3 position = trackedImage.transform.position;
        Quaternion rotation = trackedImage.transform.rotation;

        RNEventEmitter.Instance.SendEvent("onImageTrackingUpdated", new {
            imageName = imageName,
            trackableId = trackedImage.trackableId.ToString(),
            position = new { x = position.x, y = position.y, z = position.z },
            rotation = new { x = rotation.x, y = rotation.y, z = rotation.z, w = rotation.w },
            trackingState = trackedImage.trackingState.ToString()
        });

        if (trackedImage.trackingState == UnityEngine.XR.ARSubsystems.TrackingState.Tracking) {
            OnImageUpdated?.Invoke(imageName, position, rotation);
        }
    }

    private void HandleImageRemoved(ARTrackedImage trackedImage) {
        string imageName = trackedImage.referenceImage.name;

        UnityEngine.Debug.Log($"[ImageTrackingManager] Image tracking lost: {imageName}");

        RNEventEmitter.Instance.SendEvent("onImageTrackingLost", new {
            imageName = imageName,
            trackableId = trackedImage.trackableId.ToString()
        });

        OnImageTrackingLost?.Invoke(imageName);
    }

    /// <summary>
    /// Enable/disable the tracked image manager.
    /// </summary>
    public void SetEnabled(bool enabled) {
        if (trackedImageManager != null) {
            trackedImageManager.enabled = enabled;
        }
    }
}
```

---

## 3. New Unity Event Signatures

### Event Payloads

**`onImageDetected`** — fires when a flashcard is first detected

```json
{
  "event": "onImageDetected",
  "payload": {
    "imageName": "flashcard_001",
    "trackableId": "abc123-def456",
    "position": { "x": 0.5, "y": 0.0, "z": -1.2 },
    "rotation": { "x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0 },
    "trackingState": "Tracking",
    "physicalWidthMeters": 0.08
  }
}
```

**`onImageTrackingUpdated`** — fires every frame while image is tracked (throttle recommended: every 3–5 frames)

```json
{
  "event": "onImageTrackingUpdated",
  "payload": {
    "imageName": "flashcard_001",
    "trackableId": "abc123-def456",
    "position": { "x": 0.5, "y": 0.0, "z": -1.2 },
    "rotation": { "x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0 },
    "trackingState": "Tracking"
  }
}
```

**`onImageTrackingLost`** — fires when tracking is lost

```json
{
  "event": "onImageTrackingLost",
  "payload": {
    "imageName": "flashcard_001",
    "trackableId": "abc123-def456",
    "reason": "image_out_of_view"
  }
}
```

**`onImageLibraryUpdated`** — fires when runtime image addition completes

```json
{
  "event": "onImageLibraryUpdated",
  "payload": {
    "imageName": "flashcard_001",
    "status": "added"
  }
}
```

**`onMultiImageDetected`** — fires when 2+ images detected simultaneously (for combo feature)

```json
{
  "event": "onMultiImageDetected",
  "payload": {
    "detectedImages": [
      { "imageName": "flashcard_001", "trackableId": "abc123" },
      { "imageName": "flashcard_002", "trackableId": "def456" }
    ],
    "comboId": "combo_001"
  }
}
```

### Event Name Changes (Breaking Changes)

| Old Event (Plane) | New Event (Image) |
|---|---|
| `onPlaneDetected` | `onImageDetected` |
| `onObjectPlaced` | Keep as-is (after tap-to-confirm flow) |
| *(new)* | `onImageTrackingLost` |
| *(new)* | `onImageTrackingUpdated` |
| *(new)* | `onImageLibraryUpdated` |
| *(new)* | `onMultiImageDetected` |

---

## 4. Updated ARSessionManager Changes

The `ARSessionManager` itself needs minimal changes — it manages the `ARSession` lifecycle which is agnostic to tracking mode. The key change is in **how the session is configured**:

### Option A: Single Session with Image Tracking (Recommended)

```csharp
// In ARSessionManager.cs or a new ImageTrackingConfigurator.cs
// Configure ARSessionManager to use ARTrackedImageManager instead of ARPlaneManager

using UnityEngine.XR.ARFoundation;

public void ConfigureForImageTracking() {
    // ARSessionManager already handles ARSession lifecycle
    // The change is that the ARTrackedImageManager component must be present
    // on the same GameObject or a child, alongside the ARSession

    var imageManager = GetComponent<ARTrackedImageManager>();
    if (imageManager != null) {
        UnityEngine.Debug.Log("[ARSessionManager] Image tracking mode configured");
        // ARTrackedImageManager must have a non-null reference image library
        // either pre-set in inspector or set via CreateRuntimeLibrary() at runtime
    }
}
```

### Key Changes Required

1. **Remove** `ARPlaneManager` component from scene (or disable it)
2. **Add** `ARTrackedImageManager` component to the AR Session Origin
3. **Disable** `PlaneDetection.cs` — replace with `ImageTrackingManager.cs`
4. **No change needed** to `ARSessionManager.cs` itself (session lifecycle is the same)

---

## 5. Model Anchoring to Tracked Images

### Spawn Model as Child of Tracked Image Transform

The model should be parented to `trackedImage.transform` so it moves with the flashcard:

```csharp
// In ARExperienceHandler.cs — HandleImageDetected replaces HandlePlaneDetected

private void HandleImageDetected(string imageName, Vector3 position, Quaternion rotation) {
    if (_currentPayload == null) return;
    if (_currentPayload.Value.QrId != imageName) return;

    UnityEngine.Debug.Log($"[ARExperienceHandler] Flashcard detected: {imageName}");

    // The model spawns directly at the tracked image position — no tap needed
    // But we may want a confirmation tap for better UX (see UX Decision below)
    SpawnModelAtImage(position, rotation);
}

private async Task SpawnModelAtImage(Vector3 position, Quaternion rotation) {
    if (_currentPayload == null) return;
    var payload = _currentPayload.Value;

    try {
        var modelPrefab = await glbLoader.LoadGLB(payload.ModelUrl);
        if (modelPrefab == null) return;

        // Parent model to tracked image transform for automatic tracking
        var modelInstance = Instantiate(modelPrefab, _currentTrackedImage.transform);

        // Apply offset so model appears ABOVE the flashcard
        modelInstance.transform.localPosition = new Vector3(0, 0.05f, 0); // 5cm above
        modelInstance.transform.localRotation = Quaternion.Euler(0, payload.Rotation, 0);
        modelInstance.transform.localScale = Vector3.one * payload.Scale;

        // Play animation + audio
        if (animationController != null) {
            animationController.DiscoverClips();
            animationController.PlayAnimation(payload.AnimationType);
        }

        if (audioPlayer != null) {
            await audioPlayer.PlayAudio(payload.AudioUrl);
        }

        RNEventEmitter.Instance.SendEvent("onObjectPlaced", new {
            qrId = payload.QrId,
            imageName = imageName,
            modelPosition = "anchored_to_image"
        });

    } catch (Exception ex) {
        RNEventEmitter.Instance.SendEvent("onError", new {
            code = "MODEL_LOAD_FAILED",
            message = ex.Message
        });
    }
}
```

### Anchor Offset Strategy

| Offset Axis | Recommended Value | Notes |
|---|---|---|
| Y (height above flashcard) | 0.03–0.08 m | Depends on flashcard thickness and desired effect |
| X/Z | 0 | Centered on flashcard |
| Rotation | Match flashcard rotation | Model auto-rotates with flashcard |

### Tracking Loss Behavior

When tracking is lost (image goes out of view):
- **Option A:** Model disappears with image (default behavior — simplest)
- **Option B:** Use `ARAnchorManager.TryAddAnchorAsync()` to pin model in world space even if image is lost. Model stays visible but may drift.

**Recommendation for MVP:** Let model disappear with image tracking loss. For combo feature, use Option B.

---

## 6. Multi-Image Tracking (Combo Feature)

### Feasibility

| Platform | Max Simultaneous | Notes |
|---|---|---|
| ARKit | 4 images at full quality | Combo feature is viable on both |
| ARCore | 20 images concurrent | More generous for large lesson sets |

### Tracking Multiple Flashcards

1. Add all combo flashcard images to the mutable library at lesson load
2. Subscribe to `trackablesChanged` — `eventArgs.added` fires for each detected image
3. Maintain a `HashSet<string>` of currently detected image names
4. When `added.Count == 2` and both are in the combo set → fire `onMultiImageDetected`

```csharp
private HashSet<string> _detectedImages = new HashSet<string>();
private HashSet<string> _comboTargetImages;

private void HandleImageAdded(ARTrackedImage trackedImage) {
    string imageName = trackedImage.referenceImage.name;
    _detectedImages.Add(imageName);

    // Check for combo
    if (_comboTargetImages != null && _comboTargetImages.Count >= 2) {
        int comboMatches = 0;
        foreach (var target in _comboTargetImages) {
            if (_detectedImages.Contains(target)) comboMatches++;
        }
        if (comboMatches >= 2) {
            RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
                detectedImages = _detectedImages.ToArray(),
                comboTargets = _comboTargetImages.ToArray()
            });
        }
    }

    OnImageDetected?.Invoke(imageName, trackedImage.transform.position, trackedImage.transform.rotation);
}
```

### Distinguishing Flashcard A vs Flashcard B

Use `trackedImage.referenceImage.name` as the identifier. This is the string name passed to `ScheduleAddImageWithValidationJob()` — set it to the flashcard's QR ID or database ID from Supabase.

---

## 7. Hard Blockers vs What's Doable Now

### Hard Blockers (DB Migration Dependency)

| Blocker | Severity | Resolution |
|---|---|---|
| Supabase image URL not available | **HIGH** | DB migration needed to add `image_url` column to flashcards table |
| No image to download | **HIGH** | Same as above |

**Without the DB migration**, Approach A (pre-bundled images) is the only option. Approach B requires Supabase image URLs.

### Doable Now (No DB Migration Needed)

| Task | Status | Notes |
|---|---|---|
| Replace `PlaneDetection.cs` with `ImageTrackingManager.cs` | **READY** | AR Foundation API is well-documented |
| Replace `ARPlaneManager` with `ARTrackedImageManager` | **READY** | Remove/disable plane manager component |
| Implement `MutableRuntimeReferenceImageLibrary` workflow | **READY** | Supported by ARKit 14+ and ARCore |
| Wire `trackablesChanged` → RN events | **READY** | Uses existing `RNEventEmitter` pattern |
| Update `ARExperienceHandler.cs` flow | **READY** | `HandleImageDetected` replaces `HandlePlaneDetected` + tap flow |
| Pre-bundle sample flashcard images | **READY** | `StreamingAssets/ARResources/` for initial testing |
| Update RN bridge event types | **READY** | Add new event types to `arMessages.ts` |

### Recommended Approach

1. **Now:** Implement full image tracking pipeline using pre-bundled placeholder images in `StreamingAssets/ARResources/`. This proves the entire flow works end-to-end.
2. **After DB migration:** Swap image addition from pre-bundled to `ScheduleAddImageWithValidationJob()` from downloaded Supabase PNGs.

---

## 8. Physical Flashcard Size Specification

| Parameter | Recommended Value | Notes |
|---|---|---|
| Physical width (standard flashcard) | **0.08 m (8 cm)** | Standard playing card size |
| Physical width (large flashcard) | **0.15 m (15 cm)** | Better tracking at distance |
| Aspect ratio | Match actual print aspect ratio | Important for accuracy |
| Physical size column in DB | Recommended | Add `physical_width_cm` column to flashcards table |

The physical size is passed to `ScheduleAddImageWithValidationJob(texture, name, widthInMeters)`. For pre-bundled images, set in Unity Inspector under the reference image library.

---

## 9. Open Questions for Product Owner

### Critical
1. **What is the target physical flashcard size?** We need this to configure the reference image library and for `ScheduleAddImageWithValidationJob()`. A standard 3×5 inch (7.6×12.7 cm) card is a safe default.

2. **Is the tap-to-confirm flow still desired?** Currently: detect plane → tap to place → model appears. With image tracking: model can auto-appear when flashcard is detected. Tap could be kept as an optional confirmation step. Which UX is preferred?

3. **Should the model disappear when tracking is lost?** When the flashcard goes out of camera view, the model can disappear or stay anchored in world space. Which behavior matches the intended UX?

4. **DB Migration Timeline:** When will the `image_url` and `physical_width_cm` columns be added to the flashcards table? This determines when Approach B (runtime download) can be enabled.

### Nice to Have
5. **Combo feature priority:** How important is simultaneous 2-flashcard detection for the initial launch vs a future update?

6. **Offline mode:** Should the app work offline with pre-bundled images, or is network connectivity always expected during AR lessons?

7. **Maximum simultaneous tracked images:** Should we support tracking up to 4 (ARKit limit) or limit to 2 for combo detection?

---

## 10. Implementation Sketch: RN → Unity Flow

```
RN Side (TypeScript)
┌─────────────────────────────────────────────────────────────┐
│ ARScreen.tsx                                                │
│   1. User taps "Start AR"                                   │
│   2. Supabase.getFlashcard(qrId) → gets metadata + imageUrl │
│   3. (After DB migration) Download PNG via imageUrl          │
│   4. Pass image bytes to Unity via RNMessageReceiver         │
│   5. Subscribe to AR events (onImageDetected, etc.)         │
└─────────────────────────────────────────────────────────────┘
        │
        │ NativeModules.loadImageAndStartTracking(imageBytes, qrId, widthMeters)
        ▼
Unity Side (C#)
┌─────────────────────────────────────────────────────────────┐
│ RNMessageReceiver.cs                                         │
│   1. Receive image bytes from RN                            │
│   2. Texture2D.LoadImage(bytes)                            │
│   3. Call ImageTrackingManager.AddReferenceImage()          │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ ImageTrackingManager.cs                                      │
│   1. MutableRuntimeReferenceImageLibrary.AddImage()         │
│   2. Job completes → image is trackable                     │
│   3. AR system detects flashcard → fires OnImageDetected     │
│   4. ARExperienceHandler.HandleImageDetected()              │
│   5. GLBLoader → ModelSpawner → model parented to image    │
│   6. RNEventEmitter.onImageDetected → RN                    │
└─────────────────────────────────────────────────────────────┘
        │
        │ RNEventEmitter (Swift → RN TurboModule)
        ▼
RN Side (TypeScript)
┌─────────────────────────────────────────────────────────────┐
│ ARScreen.tsx                                                │
│   1. onImageDetected callback fires                         │
│   2. Show success UI / play confirmation sound              │
│   3. onObjectPlaced confirms model is visible               │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Files to Modify

| File | Action | Changes |
|---|---|---|
| `Assets/AR/PlaneDetection.cs` | **Delete or disable** | Replaced by ImageTrackingManager |
| `Assets/AR/ImageTrackingManager.cs` | **Create** | New — replaces PlaneDetection |
| `Assets/AR/ARExperienceHandler.cs` | **Modify** | Replace HandlePlaneDetected + tap flow with HandleImageDetected |
| `Assets/AR/ARSessionManager.cs` | **No change** | Session lifecycle is agnostic |
| `Assets/Bridge/RNMessageReceiver.cs` | **Modify** | Add `ReceiveImageForTracking(bytes, name, width)` method |
| `Assets/AR/AnchorManager.cs` | **Review** | May be replaced by direct image transform parenting |
| `src/bridge/arMessages.ts` | **Modify** | Add new event types: onImageDetected, onImageTrackingLost, etc. |
| `src/bridge/UnityBridgeModule.ts` | **Modify** | Add `loadImageForTracking()` method |
| `src/screens/ARScreen.tsx` | **Modify** | Update event subscriptions and flow |

---

*Research complete. Ready for implementation handoff.*
