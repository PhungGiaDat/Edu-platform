# AR Tracking Patterns (Pose Stabilization, Freeze-Pose, Combos)

> Source of truth: `research/AR_TRACKING_RESEARCH_20260721.md` +
> `docs/implementation-log/PHASE2-RESEARCH-AR-IMAGE-TRACKING.md` +
> `docs/superpowers/specs/2026-07-28-mindar-precompiled-mind-design.md`.

## Why stabilization matters for kids

Children move fast, occlude markers, look away mid-experience. A naïve
tracker flickers the 3D model in/out of view, ruining the lesson. The system
needs **frame-counted confirmation** + **grace-period hold** before exposing
state to the rest of the app.

## The four triggers

| Trigger                | When                                        |
| ---------------------- | ------------------------------------------- |
| `TARGET_FOUND`         | N consecutive frames show the marker        |
| `TARGET_LOST`          | No marker for `gracePeriodMs` (default 900) |
| `FREEZE_POSE`          | Semantic rule requests snapshot of model    |
| `PROXIMITY_TRIGGER`    | Two tracked targets within threshold        |

All four flows through `StabilizationManager` (web) / `ComboManager.cs`
(Unity). They never bypass it.

## Stabilization config (single source of truth)

Sourced from `/api/v1/ar/stability-config` — **never hardcoded**:

```json
{
  "consecutiveFramesForFound": 5,
  "gracePeriodMs": 900,
  "smoothingFactor": 0.6,
  "comboProximityThreshold": 0.15
}
```

Unity reads it via `ARPayloadMapper.cs` and stores in `ComboManager`.
Web reads it via the same `/api/v1/ar/stability-config` fetch used by RN.

## Freeze-pose semantic rule

When a semantic rule fires `FREEZE_POSE`, the current 3D transform is
captured and held until the rule releases it. Used for "Hold the pose!" or
"Do this gesture!" interactions where jitter would confuse the learner.

```typescript
// Web (StabilizationManager)
freezePose(targetIndex: number): void {
  const target = this.trackedTargets.get(targetIndex);
  if (!target) return;
  const pose = target.object3D.matrix.clone();
  this.frozenPoses.set(targetIndex, pose);
}

unfreezePose(targetIndex: number): void {
  this.frozenPoses.delete(targetIndex);
}
```

```csharp
// Unity (ComboManager.cs)
public void FreezePose(string targetId)
{
    if (!_anchors.TryGetValue(targetId, out var anchor)) return;
    _frozenPoses[targetId] = anchor.transform;
    anchor.transform.SetPositionAndRotation(
        anchor.transform.position, anchor.transform.rotation);
    // detach from tracking while frozen
}

public void UnfreezePose(string targetId)
{
    _frozenPoses.Remove(targetId);
}
```

## Semantic combos

Two tracked targets within `comboProximityThreshold` (e.g., 0.15 normalized
image space) trigger a combo animation. Combos are listed in
`/api/v1/ar/semantic-rules`:

```json
{
  "rules": [
    { "id": "feed_pet",  "triggers": ["apple_target", "pet_target"], "animation": "feed_combo" },
    { "id": "play_pet",  "triggers": ["ball_target", "pet_target"], "animation": "play_combo" }
  ]
}
```

`ComboManager` (Unity) and `StabilizationManager` (web) both consume the same
rules list. Same combo produces same animation on both paths — feature
parity.

## Proximity detection

Compute distance between two anchors per frame:

```csharp
// Unity
void Update()
{
    foreach (var rule in _semanticRules)
    {
        if (rule.triggers.Length != 2) continue;
        var a = _anchors[rule.triggers[0]];
        var b = _anchors[rule.triggers[1]];
        if (a == null || b == null) continue;

        var dist = Vector3.Distance(a.transform.position, b.transform.position);
        if (dist < _proximityThreshold && !_activeCombos.Contains(rule.id))
        {
            TriggerCombo(rule);
        }
    }
}
```

Throttle `Update()` calls to every 100ms if performance becomes an issue
(compares are cheap but combos can trigger expensive animation chains).

## Pose smoothing

While not frozen, smooth the anchor pose via lerp/slerp:

```csharp
void LateUpdate()
{
    foreach (var (id, anchor) in _anchors)
    {
        if (_frozenPoses.ContainsKey(id)) continue;
        var target = anchor.transform;
        target.position = Vector3.Lerp(
            target.position, _rawTargetPositions[id],
            Time.deltaTime * (1f - _smoothingFactor));
    }
}
```

`smoothingFactor` near 1.0 = nearly no smoothing (jittery), near 0.0 =
heavy smoothing (laggy). Default 0.6 is a good balance.

## Common mistakes

- **Hardcoding `gracePeriodMs = 900`.** Always read from config.
- **Triggering combos without proximity threshold check.** Spurious combos
  fire from frame jitter.
- **Calling `freezePose` while `TARGET_LOST` is pending.** Causes a one-frame
  visual snap. Always wait for stable state first.
- **Updating anchor transforms in `Update()`.** Conflicts with ARKit's
  internal pose updates. Use `LateUpdate()` for smoothing.
