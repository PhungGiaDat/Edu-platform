# Runtime Library — MutableRuntimeReferenceImageLibrary

> AR Foundation 6.x. `XRReferenceImageLibrary` 6.0.7.
> Use this when you cannot (or don't want to) author an
> `XRReferenceImageLibrary` asset at build time.

## Why runtime

`XRReferenceImageLibrary` (compile-time asset) requires:

- An `XRReferenceImageLibrary` ScriptableObject baked in the Editor
- For ARKit, an `AR Resource Group` (macOS + Xcode only)
- A `Texture2D` with the right import settings

Most projects — especially dynamic content projects — can't satisfy
those constraints. The runtime path exists for this case:

```text
Backend
   ↓ (HTTPS)
Texture2D bytes
   ↓
MutableRuntimeReferenceImageLibrary.ScheduleAddImageWithValidationJob
   ↓
ARTrackedImage (runtime)
```

## When to load

Load this reference when:

- Adding images to a library at runtime (the common case)
- Debugging `ScheduleAddImageWithValidationJob` failures
- Swapping libraries mid-session
- Migrating from compile-time to runtime library
- Optimising parallel image downloads

## The build sequence (canonical)

```text
1. Wait for imageManager.subsystem != null
2. Check imageManager.descriptor.supportsMutableLibrary
3. imageManager.enabled = false
4. imageManager.referenceLibrary = (XRReferenceImageLibrary)imageManager.CreateRuntimeLibrary()
5. For each image: ScheduleAddImageWithValidationJob(texture, name, width)
6. Wait for all job handles to complete
7. Check job.status for each
8. imageManager.enabled = true
```

Each step has constraints. Get any of them wrong and you'll see silent
failures, lost tracking, or null subsystems.

### Step 1: subsystem readiness

`imageManager.subsystem` is null until the underlying provider finishes
initialising. Waiting in a coroutine or on `ARSessionStateChanged`:

```csharp
while (imageManager.subsystem == null) yield return null;
```

### Step 2: capability check

```csharp
if (!imageManager.descriptor.supportsMutableLibrary)
{
    Debug.LogError("Provider does not support mutable runtime library.");
    yield break;
}
```

Some Android OEMs strip mutable library support. Some jailbroken iOS
configurations fail the capability check. Always test, don't assume.

### Step 3: disable before swap

```csharp
imageManager.enabled = false;
```

If you skip this, the manager fires spurious `removed` events for every
currently-tracked card the moment `referenceLibrary` changes. Children
see content blink off and on for one frame.

### Step 4: create + assign

```csharp
var lib = imageManager.CreateRuntimeLibrary() as MutableRuntimeReferenceImageLibrary;
if (lib == null) { /* fatal — supportsMutableLibrary lied */ }
imageManager.referenceLibrary = lib;
```

The cast must succeed. If it doesn't, the provider's capability table
is wrong — log and bail.

### Step 5: schedule validation jobs

```csharp
var handles = new List<AddReferenceImageJobState>();
foreach (var card in cards)
{
    var tex = await DownloadTextureAsync(card.url);
    var job = lib.ScheduleAddImageWithValidationJob(
        tex,
        card.name,             // = qrId
        card.physicalWidthM);  // metres, must match printout
    handles.Add(job);
}
```

**Use `ScheduleAddImageWithValidationJob` (async), not the synchronous
`AddReferenceImage`.** The sync version blocks the main thread for
200ms+ on a 5-card deck. The async version runs validation on a worker
thread.

### Step 6: pump frames

```csharp
while (handles.Any(h => !h.jobHandle.IsCompleted))
    yield return null;

foreach (var h in handles)
    h.jobHandle.Complete();  // safe to call after IsCompleted
```

Calling `Complete()` on a non-completed JobHandle **blocks the main thread**
and stalls Unity. Always check `IsCompleted` first.

### Step 7: check status

```csharp
foreach (var h in handles)
{
    if (h.status == AddReferenceImageJobStatus.ErrorInvalidImage)
        Debug.LogWarning($"Image '{h.imageName}' not suitable for tracking");
    else if (h.status == AddReferenceImageJobStatus.ErrorUnknown)
        Debug.LogWarning($"Image '{h.imageName}' failed: unknown");
}
```

`ErrorInvalidImage` is non-fatal. Common causes:
- Texture format wrong (must be `RGBA32`, readable)
- Resolution too low (≥ 256×256 recommended)
- CMYK or wrong colour profile
- Single-colour or low-contrast image

`ErrorUnknown` is more worrying — usually a subsystem crash. Log
loudly.

### Step 8: enable

```csharp
imageManager.enabled = true;
```

Only after all validation jobs are complete. Enabling earlier means
the manager starts tracking against a partial library, which behaves
unpredictably.

## Texture requirements

The `Texture2D` passed to `ScheduleAddImageWithValidationJob` must:

| Requirement | Why |
|---|---|
| `RGBA32` format | Subsystem expects 8-bit per channel |
| Read/write enabled | Subsystem reads pixel data on worker thread |
| ≥ 256×256 resolution | Smaller images fail `ErrorInvalidImage` |
| High contrast | Subsystem extracts feature points; flat images fail |
| No alpha-channel-only content | Subsystem uses RGB feature extraction |
| mipmaps OFF | Validation job uses raw pixels |

```csharp
var tex = new Texture2D(2, 2, TextureFormat.RGBA32, false, false);
tex.LoadImage(bytes);  // also marks it readable
```

## Parallel downloads

For N cards, downloading in parallel is faster than sequential. Use a
bounded-concurrency downloader:

```csharp
var maxConcurrent = 4;
var pending = new List<Task<Texture2D>>();

foreach (var card in cards)
{
    pending.Add(DownloadTextureAsync(card.url));
    if (pending.Count >= maxConcurrent)
    {
        var finished = await Task.WhenAny(pending);
        pending.Remove(finished);
        ScheduleFromFinished(finished.Result, card);
    }
}
foreach (var p in pending) ScheduleFromFinished(await p, /* card */);
```

Order doesn't matter — `ScheduleAddImageWithValidationJob` does not
depend on insertion order. The library builds itself based on
validation-job completion order, which is non-deterministic.

## Library swap mid-session

When the user picks a new deck (different cards), you need to swap the
library. Sequence:

```text
1. imageManager.enabled = false
2. Remove trackablesChanged listener
3. Clear internal registry (cards → models)
4. Create new library, schedule add jobs, wait
5. imageManager.referenceLibrary = newLibrary
6. imageManager.enabled = true
7. Re-attach trackablesChanged listener
```

Don't skip steps 2 / 7. Listeners attached to the old manager instance
will leak if you swap the manager reference.

## Hot-reload considerations

In Editor with XR Simulation, swapping the library mid-session is a
common test pattern. The hot-reload semantics:

- `imageManager.referenceLibrary = newLib` is allowed while the
  manager is enabled; you'll get spurious `removed` events.
- The proper pattern is `enabled = false`, swap, `enabled = true`.
- The runtime path does NOT support hot-adding images to an
  already-tracked library. The validation job expects the library to
  be in a fresh state.

## Memory

`Texture2D` instances passed to the validation job are kept alive by
the library. Don't destroy them after the job completes — the
subsystem holds references. Use `Object.Destroy(tex)` only when you
also drop the library (session end, scene unload).

## Common failure modes

| Symptom | Root cause | Fix |
|---|---|---|
| `CreateRuntimeLibrary()` returns non-mutable | Provider strips mutable support | Check `supportsMutableLibrary` first; bail if false |
| All jobs return `ErrorInvalidImage` | Wrong texture format or resolution | Use `RGBA32`, ≥ 256×256 |
| `subsystem is null` after assignment | Called too early | Wait for `SessionTracking` |
| Spurious `removed` events after assignment | Manager was enabled during swap | Always `enabled = false` before assignment |
| `ScheduleAddImageWithValidationJob` throws | `Texture2D` was destroyed | Keep textures alive until the session ends |
| Same `name` added twice fails silently | Library deduplicates by name | Assume uniqueness invariant; assert at call site |

## See also

- `references/image-tracking.md` — `ARTrackedImageManager` lifecycle
- `references/project-patterns.md` — registry pattern for runtime IDs
- `references/platform-differences.md` — provider capability matrix
- `references/xr-simulation.md` — Editor testing without real device
