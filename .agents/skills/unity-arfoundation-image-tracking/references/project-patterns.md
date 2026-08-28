# Project Patterns — Registry, Invariants, Multi-Image

> Patterns that emerge once you build more than a hello-world image-tracking
> scene. These are derived invariants, not API rules.

## The problem with one global `currentTarget`

The naive image-tracking code:

```csharp
// WRONG
public GameObject currentModel;

void OnAdded(ARTrackedImage img)
{
    if (currentModel != null) Destroy(currentModel);
    currentModel = SpawnModel(img.referenceImage.name);
}
```

breaks the moment two cards are tracked simultaneously. The second
`OnAdded` destroys the first card's model.

This pattern emerges from tutorials that assume "one card at a time."
Real applications — flashcards, educational toys, multi-marker
museum exhibits — need multi-card support from day one.

## The CardRegistry pattern

The right pattern is a per-`TrackableId` registry:

```csharp
public sealed class CardRegistry
{
    private readonly Dictionary<TrackableId, BoundCard> _byTrackable = new();
    private readonly Dictionary<string, BoundCard> _byCardId = new();

    public void Bind(ARTrackedImage img, GameObject model, object payload = null)
    {
        var entry = new BoundCard
        {
            cardId = img.referenceImage.name,
            trackableId = img.trackableId,
            image = img,
            model = model,
            payload = payload,
            boundAt = Time.time,
        };
        _byTrackable[img.trackableId] = entry;
        _byCardId[entry.cardId] = entry;
    }

    public BoundCard? LookupByTrackable(TrackableId id) =>
        _byTrackable.TryGetValue(id, out var entry) ? entry : null;

    public BoundCard? LookupByCardId(string cardId) =>
        _byCardId.TryGetValue(cardId, out var entry) ? entry : null;

    public void Unbind(TrackableId id)
    {
        if (!_byTrackable.TryGetValue(id, out var entry)) return;
        _byTrackable.Remove(id);
        _byCardId.Remove(entry.cardId);
    }

    public IReadOnlyCollection<BoundCard> All() => _byTrackable.Values;
    public int Count => _byTrackable.Count;
}

public sealed class BoundCard
{
    public string cardId;             // Stable: == XRReferenceImage.name
    public TrackableId trackableId;   // Runtime-only, ephemeral
    public ARTrackedImage image;      // May go null on removed
    public GameObject model;          // Owned by the registry
    public object payload;            // Application-specific data
    public float boundAt;             // Time.time when Bind was called
    public float lostAt;              // 0 if still tracking
}
```

The registry is the single source of truth for "what's on screen
right now." Application code (combo evaluators, UI overlays,
sound effects) reads from the registry, never from raw event
arguments.

## Two-map invariant

The registry keeps two maps: `_byTrackable` and `_byCardId`. Both
must stay in sync. When you `Bind` or `Unbind`, update both — never
just one.

```csharp
// WRONG: only updates one map
public void Unbind(TrackableId id)
{
    _byTrackable.Remove(id);
    // _byCardId still has the entry → stale lookup
}

// CORRECT
public void Unbind(TrackableId id)
{
    if (!_byTrackable.TryGetValue(id, out var entry)) return;
    _byTrackable.Remove(id);
    _byCardId.Remove(entry.cardId);
}
```

## The grace-period sweep

AR subsystems lose cards briefly all the time: child looks away,
hand occludes the marker, glare from a window. The first
`args.removed` is rarely "really gone."

The pattern:

```csharp
private readonly HashSet<TrackableId> _inGracePeriod = new();

private void OnTrackedImagesChanged(ARTrackablesChangedEventArgs<ARTrackedImage> args)
{
    foreach (var img in args.added)
    {
        if (_registry.LookupByTrackable(img.trackableId).HasValue) continue;
        var model = _spawner.SpawnForCard(img.referenceImage.name);
        _registry.Bind(img, model);
    }

    foreach (var kvp in args.removed)
    {
        var img = kvp.Value;
        if (_registry.LookupByTrackable(img.trackableId) is BoundCard entry)
        {
            entry.lostAt = Time.time;
            _inGracePeriod.Add(img.trackableId);
        }
    }
}

private void Update()
{
    if (_inGracePeriod.Count == 0) return;

    var graceSeconds = _config.GracePeriodMs / 1000f;
    var toCleanUp = new List<TrackableId>();

    foreach (var id in _inGracePeriod)
    {
        if (_registry.LookupByTrackable(id) is not BoundCard entry) continue;
        if (Time.time - entry.lostAt < graceSeconds) continue;

        if (entry.model != null) Object.Destroy(entry.model);
        _registry.Unbind(id);
        toCleanUp.Add(id);
    }

    foreach (var id in toCleanUp) _inGracePeriod.Remove(id);
}
```

Typical grace periods:

| Use case | Grace period |
|---|---|
| Educational apps (children looking away) | 900ms |
| Museum exhibits (slow walk-through) | 1200ms |
| Industrial (operator must not lose context) | 2000ms |
| Single-frame confirmation (no grace) | 0ms (don't do this) |

Always make grace period **configurable**, not a constant. Different
deployments tune this differently.

## Multi-image policy

When 2+ cards are tracked simultaneously, the application has
several decisions to make:

### Decision 1: independent content per card

Each card gets its own model, no interaction between them.

```csharp
foreach (var entry in _registry.All())
    entry.model.transform.position = entry.image.transform.position;
```

### Decision 2: combo / fusion content

The combination of cards triggers something (combo logic, proximity
effects, semantic rules).

```csharp
public void EvaluateCombos()
{
    var presentCardIds = _registry.All()
        .Where(e => e.image != null && e.image.trackingState == TrackingState.Tracking)
        .Select(e => e.cardId)
        .ToHashSet();

    foreach (var rule in _config.SemanticRules)
    {
        if (!presentCardIds.SetEquals(rule.requiredCardIds)) continue;
        if (!StableForGracePeriod(rule)) continue;
        FireCombo(rule.comboName);
    }
}
```

### Decision 3: shared content (one model follows multiple cards)

One model (e.g. a "scene root") follows the average pose of all tracked
cards.

```csharp
var sum = Vector3.zero;
var count = 0;
foreach (var entry in _registry.All())
{
    if (entry.image.trackingState != TrackingState.Tracking) continue;
    sum += entry.image.transform.position;
    count++;
}
if (count > 0)
    sharedSceneRoot.position = sum / count;
```

Pick **one** decision per project. Don't mix independent content for
some cards with shared content for others — the UX becomes confusing.

## Pose smoothing

Direct pose read from `img.transform.position` is jittery. Lerp:

```csharp
foreach (var entry in _registry.All())
{
    if (entry.image == null) continue;
    if (entry.image.trackingState != TrackingState.Tracking) continue;
    if (entry.model == null) continue;

    var t = Time.deltaTime * 12f;  // 12 = "snappy but not instant"
    entry.model.transform.position = Vector3.Lerp(
        entry.model.transform.position,
        entry.image.transform.position,
        t);
    entry.model.transform.rotation = Quaternion.Slerp(
        entry.model.transform.rotation,
        entry.image.transform.rotation,
        t);
}
```

Tune the `12f` factor to taste. Higher = snappier; lower = smoother.

## Invariants (NEVER violate)

| Invariant | Why it matters |
|---|---|
| Route by `referenceImage.name`, never `index` | Index shifts across rebuilds |
| Per-`TrackableId` registry, never global current | Multi-card is the default case |
| Subscribe in `OnEnable` / unsubscribe in `OnDisable` | Session can pause/resume many times |
| Don't destroy on first `removed` event | Subsystems lose cards briefly — grace period applies |
| Gate AR API calls on `ARSession.state` | Subsystem not ready during initialisation |
| Persist `qrId`, not `TrackableId` | TrackableId is ephemeral across sessions |
| `TrackableId → { cardId, modelRef }` | Many-to-many mapping; one card can have multiple models |
| Trigger combos from `MultiImageDetected`, not single `added` | Combos are multi-card semantic events |
| Disable manager before `referenceLibrary =` assignment | Otherwise spurious `removed` events fire |
| Update registry maps in pairs | `_byTrackable` and `_byCardId` must stay in sync |

## Anti-patterns to reject in code review

### Routing by index

```csharp
// REJECT
foreach (var img in args.added)
    SpawnModel(prefabs[img.referenceImage.index]);
```

### Global state

```csharp
// REJECT
public GameObject currentModel;
public ARTrackedImage currentTarget;
```

### Subscribing in Awake

```csharp
// REJECT
void Awake() { manager.trackablesChanged.AddListener(OnChanged); }
void OnDestroy() { manager.trackablesChanged.RemoveListener(OnChanged); }
```

### Hardcoded constants

```csharp
// REJECT
const float GRACE_PERIOD_MS = 900f;
const string CAT_ID = "cat_001";
```

These come from configuration.

### Blind destruction

```csharp
// REJECT
foreach (var kvp in args.removed)
{
    var img = kvp.Value;
    if (_registry.LookupByTrackable(img.trackableId) is BoundCard entry)
    {
        if (entry.model != null) Destroy(entry.model);
        _registry.Unbind(img.trackableId);
    }
}
```

This destroys models on the first `removed`, causing flicker.

## Performance budget

| Concurrent images | Per-model triangle budget |
|---|---|
| 1 | 50k tris |
| 2 | 30k tris each |
| 4 | 20k tris each |

When concurrent image count exceeds 4 (iOS limit), gracefully
degrade:

1. Reduce per-model triangle counts.
2. Disable idle animations on lowest-priority cards.
3. Queue model instantiation (1 per frame) instead of all at once.

```csharp
private readonly Queue<Func<Coroutine>> _spawnQueue = new();

private void Update()
{
    if (_spawnQueue.Count == 0) return;
    var spawn = _spawnQueue.Dequeue();
    StartCoroutine(spawn());
}
```

## Testable boundary

The registry pattern separates nicely from the manager:

```csharp
public interface ICardRegistry
{
    void Bind(ARTrackedImage img, GameObject model);
    void Unbind(TrackableId id);
    BoundCard? LookupByTrackable(TrackableId id);
    BoundCard? LookupByCardId(string cardId);
    IReadOnlyCollection<BoundCard> All();
    int Count { get; }
}
```

`CardRegistry` is the production implementation. Tests can use a
mock registry or a real `CardRegistry` with fake `ARTrackedImage`
instances.

## Summary

| Pattern | When to use |
|---|---|
| `CardRegistry` with two-map invariant | Always, for any non-trivial multi-card app |
| Grace-period sweep | Always; configurable grace period |
| Pose smoothing (Lerp/Slerp) | Always |
| Combo evaluation from registry | Multi-card semantic apps |
| Testable boundary (`IImageTracker`) | When unit-testing the manager pipeline |
| Configurable grace period | Always |

## See also

- `references/image-tracking.md` — `trackablesChanged` lifecycle
- `references/runtime-library.md` — building a library at runtime
- `references/platform-differences.md` — provider quirks
- `references/xr-simulation.md` — Editor testing
