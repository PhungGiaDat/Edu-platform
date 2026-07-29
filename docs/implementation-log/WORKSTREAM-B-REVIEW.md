# Workstream B Phases 2+3 Review

## Verdict: NEEDS_FIXES

---

## Critical Issues (block merge)

### C-1: ARAudioPlayer.PlayAudio has no try/catch — errors silently swallowed
**File:** `Assets/Audio/ARAudioPlayer.cs`, lines 24–58

`PlayAudio` is declared `async void`, which means:
- Its internal `try/catch` at line 50 only catches synchronous code paths.
- Any exception that escapes an `await` expression (e.g. network failure inside `SendWebRequest`, or an exception thrown by `DownloadHandlerAudio.GetContent`) will be unobserved and will **crash the application** — it will not be caught by the `catch (Exception ex)` block, and it will not call `RNEventEmitter.Instance.SendEvent("onError", ...)`.
- `async void` is only acceptable for event handlers; `async void` methods rethrow exceptions on a "fire-and-forget" context and crash the Unity player.

**Fix:** Change `public async void PlayAudio` to `public async Task PlayAudio` and update the single call-site in `ARExperienceHandler.SpawnAndAnimate` to `await audioPlayer?.PlayAudio(...)`.

### C-2: GLBLoader.Unload does not dispose GltfImport — memory leak
**File:** `Assets/Models/GLBLoader.cs`, line 129

`_gltf` is assigned on line 48 but `_gltf = null` on line 129 just drops the reference without calling `Dispose()`. GLTFast's `GltfImport` implements `IDisposable` and holds native GLTF parser state, meshes, textures, and animation data. Setting the field to `null` leaves all that native memory allocated until GC runs — in an AR session this is a guaranteed leak that will cause OOM over repeated loads.

**Fix:** Before `_gltf = null`, add `await _gltf.DisposeAsync()` or `_gltf.Dispose()` (both available on `GltfImport`).

---

## Important Issues (should fix)

### I-1: ARExperienceHandler.SpawnAndAnimate async void problem
**File:** `Assets/AR/ARExperienceHandler.cs`, lines 109–152

`SpawnAndAnimate` is `async Task` but is called from a non-awaited callback at line 105 inside `TryPlaceAnchorAt`. This means:
- Exceptions inside `SpawnAndAnimate` (e.g. from `glbLoader.LoadGLB`) are unobserved — no crash, but silent failure with no `onError` emitted.
- The task is fire-and-forget; if Unity destroys the component mid-flight the task keeps running against potentially-null references.

**Fix:** At minimum add `.ContinueWith(t => { if (t.IsFaulted) { ... emit onError ... } }, TaskScheduler.Default)` after the call, or refactor `TryPlaceAnchorAt`'s callback signature to be `async void` / `Func<Task>` so it can be properly awaited.

### I-2: ARAudioPlayer.PlayAudio — fires onAudioComplete immediately after download, not after playback
**File:** `Assets/Audio/ARAudioPlayer.cs`, line 49

`RNEventEmitter.Instance.SendEvent("onAudioComplete", ...)` is called synchronously right after `Play()` starts, before the audio finishes. The `onAudioComplete` event name implies playback completion. The caller (RN side) will receive the event before hearing any audio.

**Fix:** Register a callback on `_audioSource` (e.g. via `AudioSource.PlayScheduled` or a coroutine) and emit `onAudioComplete` only when `AudioSource.isPlaying` becomes false, or use `AudioSource.clip.length` with a coroutine delay.

### I-3: PlaneDetection has no try/catch — ARPlanesChangedEventArgs callback can throw
**File:** `Assets/AR/PlaneDetection.cs`, lines 35–53

`HandlePlanesChanged` has no `try/catch`. If any exception escapes (e.g. `RNEventEmitter.Instance.SendEvent` throws because the singleton hasn't been created yet), the exception propagates to the ARFoundation event dispatcher. Depending on the Unity version this can corrupt the session state or silently stop plane detection events from firing.

**Fix:** Wrap the body of `HandlePlanesChanged` in a `try/catch` and emit `onError` on failure.

### I-4: RNEventEmitter singleton created lazily without thread-safety
**File:** `Assets/Bridge/RNEventEmitter.cs`, lines 13–21

The `Instance` getter has no thread-safety. In Unity, `MonoBehaviour` events (ARFoundation callbacks, gesture callbacks, network completion callbacks) can fire on multiple threads simultaneously. If two threads call `RNEventEmitter.Instance` concurrently before the instance is created, both may create `GameObject`s and register components — or worse, `_instance` may be assigned from thread A while thread B reads it as null.

**Fix:** Use `System.Threading.Lock` or a `static readonly object _lock = new()` around the null-check-and-create path, or use Unity's `[RuntimeInitializeOnLoadMethod]` to eagerly initialize the singleton.

### I-5: UnityFrameworkLoader singleton has same thread-safety issue
**File:** `Assets/UnityServices/UnityFrameworkLoader.cs`, lines 12–21

Identical lazy initialization pattern to `RNEventEmitter` without thread-safety. Same race condition risk.

**Fix:** Same as I-4.

### I-6: GLBLoader uses `async void` pattern via Task.Delay without CancellationToken propagation in TryDownload
**File:** `Assets/Models/GLBLoader.cs`, lines 102–105

The busy-wait loop:
```csharp
while (!operation.isDone && !token.IsCancellationRequested) {
    await Task.Delay(100, token);
}
```
`Task.Delay` with a cancellation token is correct. However, `CancellationTokenSource` is created locally (`tokenSource`) and its `token` is passed to both `Load()` and `InstantiateMainSceneAsync` in the calling method, but `TryDownload` has its own local `CancellationTokenSource` and never exposes a cancel mechanism to callers. If `LoadGLB` is called a second time before the first completes, the first `tokenSource` is dropped (GC-eligible but the background operation continues until it self-reports via the local token).

More critically, `tokenSource` is declared `var tokenSource = new System.Threading.CancellationTokenSource()` inside `LoadGLB` — this creates a new token source each call but the download operation in `TryDownload` is a separate local token. If `LoadGLB` is cancelled or exits early, the `TryDownload` internal token is unrelated and the web request continues until completion or failure, wasting bandwidth.

**Fix:** Single `CancellationTokenSource` in `LoadGLB`, passed into `TryDownload` and used consistently across all async ops.

---

## Minor Issues (note only)

### M-1: No XML docstring on `ARPayloadMapper.Parse` return value / exceptions
**File:** `Assets/Bridge/ARPayloadMapper.cs`, line 13

`Parse` has the opening `/// <summary>` but the method block is not closed with `/// </summary>` and no `/// <returns>` or `/// <exception>` tags are present. This is inconsistent with the stated checklist requirement. Several other public methods (`MapToPayload`, `ParseVector3`) also lack `/// <summary>` documentation.

### M-2: AnimationController.PlayAnimation fires onAnimationComplete on every play
**File:** `Assets/Models/AnimationController.cs`, line 54

`onAnimationComplete` suggests the animation finished, but it fires immediately when `CrossFade` is called. The naming is misleading; `onAnimationStart` or `onAnimationTriggered` would be accurate. This is a naming-semantics issue, not a bug.

### M-3: ARSessionManager.OnError and OnArReady events are never unsubscribed
**File:** `Assets/AR/ARSessionManager.cs`

`OnArReady` and `OnError` are `public event Action<string>` fields but there is no `RemoveAllListeners` call in `OnDisable` or `OnDestroy`. If `ARSessionManager` is destroyed and recreated, old subscribers still hold references to the old instance. Unlikely to cause production bugs given the singleton-like usage but is a latent memory leak source.

### M-4: AnchorManager uses `qrId = ""` in onObjectPlaced payload
**File:** `Assets/AR/AnchorManager.cs`, line 49

The `qrId` field is always an empty string when placed via `TryPlaceAnchorAt`, while `ARExperienceHandler` correctly sends `payload.QrId`. This is inconsistent. Either the anchor-placed event should include the QR ID (passed in from the caller) or the field should be renamed/removed to avoid confusing the RN consumer.

### M-5: ARGestureHandler.HandleTap raycasts but discards the result
**File:** `Assets/Gestures/ARGestureHandler.cs`, lines 55–63

`HandleTap` calls `anchorManager.TryPlaceAnchorAt` but ignores the callback result (anchor position). The method logs "Anchor placed" inside the callback but the tap handler itself has no visibility into whether placement succeeded or failed. If the raycast misses, no event is emitted to RN. Consider also emitting `onInteraction` with type `"tap_missed"` or similar when placement fails.

---

## Strengths

1. **ARFoundation 6 API compliance — fully correct.** All scripts use `FindFirstObjectByType<T>()` (lines 19 of ARSessionManager, line 19 of PlaneDetection, lines 21–23 of AnchorManager, etc.). No deprecated `FindObjectOfType<T>()` or `FindObjectsOfType<T>()` found anywhere.

2. **`#if UNITY_IOS` guards on UnitySendMessage — correct and consistent.** Both `SendEvent` and `SendRaw` in `RNEventEmitter` correctly gate `UnitySendMessage` behind `#if UNITY_IOS`. No bare `UnitySendMessage` calls exist in the codebase.

3. **Singleton patterns largely correct.** Both `RNEventEmitter` and `UnityFrameworkLoader` correctly implement `DontDestroyOnLoad` and the duplicate-destruction guard (`if (_instance != null && _instance != this)`). The `Awake` pattern is standard and correct.

4. **RNMessageReceiver switch covers all expected methods.** The switch statement handles `initSession`, `loadARExperience`, `setPlaneDetection`, `pauseSession`, `resumeSession`, and `destroySession`. `default:` case is present with a warning log. Error cases emit `onError` via `RNEventEmitter`.

5. **GLTFast usage is correct.** `GltfImport` is instantiated, `Load()` is called with the URI and cancellation token, `InstantiateMainSceneAsync()` is used for scene instantiation — all as per the GLTFast 5.x API.

6. **Package manifest versions are all correct and consistent:**
   - `com.unity.xr.arfoundation`: **6.0.7** ✓
   - `com.unity.xr.arkit`: **6.0.6** ✓
   - `com.atteneder.gltfast`: **5.0.5** ✓

7. **Good error hygiene in most async paths.** `GLBLoader.LoadGLB`, `ARExperienceHandler.LoadARExperience`, `AnchorManager.TryPlaceAnchorAt`, and `GLBLoader.TryDownload` all have `try/catch` with `RNEventEmitter.SendEvent("onError", ...)` emission. Error reporting is consistent.

8. **Resource cleanup in ARExperienceHandler.DestroySession is thorough.** `modelSpawner.Clear()`, `glbLoader.Unload()`, and `sessionManager.StopSession()` are all called, and state is reset. State flags `_awaitingPlane` and `_awaitingTap` are properly reset.

9. **Event subscription lifecycle is correct in ARExperienceHandler.** Both `OnPlaneDetected` and `OnInteraction` are subscribed in `Awake` and unsubscribed in `OnDestroy` — no risk of null-reference on repeated Destroy/Create cycles.

10. **ARPayloadMapper is a clean, reusable static mapper.** Separation of the DTO (anonymous JSON shape) from the internal struct (`ARExperiencePayload`) is a solid pattern. The `ParseVector3` helper handles malformed input gracefully (returns `Vector3.zero` on failure).

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Important | 6 |
| Minor | 5 |

**APPROVED_WITH_MINOR_ISSUES** is not available — the two critical issues (C-1 and C-2) must be resolved before merge. C-1 is a guaranteed crash path for any audio network failure. C-2 is a progressive memory leak that will cause OOM in sustained AR sessions.

After fixing C-1 and C-2, the codebase is production-ready. The important issues are real but lower urgency (I-1 is the next most concerning, followed by I-2).

---

## Fix Agent Report

**Date:** 2026-07-23
**Workstream:** B (Unity/AR Phases 2+3)
**Mode:** YOLO

All Critical and Important issues from the review have been resolved.

### Critical Issues — RESOLVED

| ID | File | Fix Applied |
|----|------|-------------|
| **C-1** | `Assets/Audio/ARAudioPlayer.cs` | Changed `PlayAudio` from `async void` to `async Task`. All exceptions from `await` expressions (network failures, `DownloadHandlerAudio.GetContent`) are now observable and will emit `onError`. Call site in `ARExperienceHandler` updated to `await` the task. |
| **C-2** | `Assets/Models/GLBLoader.cs` | `Unload()` now calls `_gltf.Dispose()` before setting `_gltf = null`, guarded by a null check. `GltfImport` native memory is released immediately rather than waiting for GC. |

### Important Issues — RESOLVED

| ID | File | Fix Applied |
|----|------|-------------|
| **I-1** | `Assets/AR/ARExperienceHandler.cs` | `HandleScreenTap` lambda now uses `.ContinueWith(t => { if (t.IsFaulted) { emit onError } }, TaskScheduler.Default)` instead of `async void`. This ensures unobserved exceptions are caught and reported. `SpawnAndAnimate` is `async Task` with `await audioPlayer.PlayAudio(...)` inside. |
| **I-2** | `Assets/Audio/ARAudioPlayer.cs` | Added `WaitForPlaybackEnd()` helper that polls `_audioSource.isPlaying` before emitting `onAudioComplete`. Event now fires only after playback finishes, not after download. |
| **I-3** | `Assets/AR/PlaneDetection.cs` | `HandlePlanesChanged` body wrapped in `try/catch`. Exceptions emit `onError` with code `PLANE_DETECTION_ERROR` and propagate the exception message. |
| **I-4** | `Assets/Bridge/RNEventEmitter.cs` | Added `private static readonly object _lock = new()` and double-checked locking pattern in `Instance` getter. Safe for concurrent access from ARFoundation callbacks and network completion handlers on multiple threads. |
| **I-5** | `Assets/UnityServices/UnityFrameworkLoader.cs` | Same double-checked locking pattern applied to `Instance` getter. |
| **I-6** | `Assets/Models/GLBLoader.cs` | Replaced per-call local `CancellationTokenSource` with a single instance-level `_cts` field. Each `LoadGLB` call cancels and disposes the previous `_cts` before creating a new linked token source (combining any `externalToken` argument). `TryDownload` and GLTFast operations all share the same token. `OperationCanceledException` is now caught explicitly, returning `null` without emitting an error. |

### Minor Issues — NOT ADDRESSED

M-1 through M-5 are cosmetic/documentation/memory-leak-in-waiting issues. They are noted for awareness but do not block merge.

### Final Status

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | **RESOLVED** |
| Important | 6 | **RESOLVED** |
| Minor | 5 | Not addressed |

**STATUS: READY FOR FINAL APPROVAL**
