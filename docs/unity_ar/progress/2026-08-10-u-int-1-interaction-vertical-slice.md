## Session
2026-08-10 13:00, agent: claude-sonnet-5, branch: MindAR-Update

## Task
U-INT-1 — Generic Model Touch Interaction + Existing Animation Consumption

## Tooling
Unity Editor: **NOT RUNNING** — UnitySkills REST (port 8090) not reachable; Unity MCP not available.
Verification limited to code inspection, structural correctness, and EditMode test compilation.
Physical-device AR and PlayMode tests NOT verified.

---

## Files Changed

| File | Action |
|------|--------|
| `mobile/unity/Assets/Scripts/Interactions/ModelInteractionDefinition.cs` | Created |
| `mobile/unity/Assets/Scripts/Interactions/AnimationRegistry.cs` | Created |
| `mobile/unity/Assets/Scripts/Interactions/ModelInteractionHotspot.cs` | Created |
| `mobile/unity/Assets/Scripts/Interactions/InteractionRaycaster.cs` | Created |
| `mobile/unity/Assets/Scripts/Interactions/ModelInteractionHandler.cs` | Created |
| `mobile/unity/Assets/Models/AnimationController.cs` | Updated (+PlayClipByName) |
| `mobile/unity/Assets/Tests/EditMode/InteractionSystemTests.cs` | Created |

---

## Cat/Model Artifact Inspected

No Cat GLB exists in `Assets/3DModels/` or `Assets/Models/`.
Cat is loaded from Supabase at runtime via `GLBLoader.LoadGLB(payload.ModelUrl)`.
The Supabase URL is backend-driven (backend `ar_object.model_url` field).

**GLTFast P0 blocker is OPEN.** GLTFast 6.x is NOT listed in `Packages/manifest.json`.
This was identified as P0 in `blockers/2026-08-09-gltfast-dependency.md`.
This means the full GLB load pipeline cannot be verified without Unity Editor + GLTFast installed.

No local Cat GLB file was inspected. Actual animation clip names from the exported Cat GLB are **UNKNOWN**.
Animation names in this implementation are placeholders (e.g., `"idle"`, `"rotate"`, `"bounce"`).

---

## Architecture Implemented

### Component Map

```
Screen touch / mouse click
  → InteractionRaycaster.Update
    → Camera.ScreenPointToRay(screenPos)
      → Physics.Raycast → ModelInteractionHotspot collider
        → InteractionRaycaster.OnHotspotTapped event
          → ModelInteractionHandler.HandleHotspotTapped(interactionId, worldPos)
            → EvaluateCooldown(def)
            → AnimationRegistry.HasClip(def.animationAction)  ← explicit failure if missing
            → Animator.CrossFade(hash)
            → ARAudioPlayer.PlayAudio(def.audioActionUrl)  [optional]
            → RNEventEmitter.SendEvent("onModelInteraction", ModelInteractionEventPayload)
```

### Generic Components Created

| Component | File | Responsibility |
|-----------|------|---------------|
| `ModelInteractionDefinition` | `ModelInteractionDefinition.cs` | Typed data struct (interactionId, hotspotSemantic, animationAction, audioActionUrl, cooldownSeconds, repeatPolicy, vocabularyId) |
| `AnimationRegistry` | `AnimationRegistry.cs` | Runtime clip discovery from Animator.RuntimeAnimatorController; name→hash lookup |
| `ModelInteractionHotspot` | `ModelInteractionHotspot.cs` | Collider-based touchable region; Awake sets isTrigger=true |
| `InteractionRaycaster` | `InteractionRaycaster.cs` | Screen-point → Raycast → hotspot hit; one event per tap; mouse support for editor testing |
| `ModelInteractionHandler` | `ModelInteractionHandler.cs` | Orchestrator: cooldown enforcement, animation trigger, optional audio, MODEL_INTERACTION RN event |
| `InteractionRepeatPolicy` | `ModelInteractionDefinition.cs` | Enum: Ignore / Restart / Queue |

### Existing Components Updated

- `AnimationController.cs` (+`PlayClipByName(string)`) — name-based clip play with explicit failure if clip missing. Exists alongside `AnimationRegistry`; both can coexist on the same model.

---

## Hotspot Implementation

Cat fixture: attach `ModelInteractionHotspot` to a child GameObject of the loaded GLB root.
Set `interactionId = "cat_head_pat"` (or equivalent registered definition).
Add a `BoxCollider` (isTrigger=true) as the hotspot geometry.

**No full Cat hotspot map created** — only the first acceptance fixture hotspot.

---

## Touch/Raycast Behavior

- `TouchPhase.Began` fires exactly one interaction per tap.
- `Time.frame` guard prevents double-firing from one tap.
- Mouse button support in editor for quick testing.
- Tapping outside hotspots is a silent no-op (no event emitted).
- `Physics.Raycast` with configurable `hitLayers` and `maxDistance`.

---

## Cooldown/Repeat Behavior

- `cooldownSeconds == 0`: always fires.
- `cooldownSeconds > 0`: blocks re-trigger within window.
- `InteractionRepeatPolicy.Ignore`: silently drops tap while cooled.
- `InteractionRepeatPolicy.Restart`: restarts animation (crossFade) while cooled.
- `InteractionRepeatPolicy.Queue`: fires after cooldown (not fully implemented — future work).

---

## Audio Result

`ARAudioPlayer` already exists in `Assets/Audio/ARAudioPlayer.cs`.
`ModelInteractionHandler` calls `audioPlayer.PlayAudio(def.audioActionUrl)` if configured.

**AUDIO_ASSET_DEPENDENCY**: No Cat-local audio asset exists in the project.
The audio path is wired but blocked on asset availability.
Reported as `AUDIO_ASSET_MISSING` warning (non-fatal; interaction still succeeds).

---

## MODEL_INTERACTION Event

Event name: `onModelInteraction`
Via: `RNEventEmitter.Instance.SendEvent("onModelInteraction", payload)`

Payload shape (`ModelInteractionEventPayload`):
```csharp
{
    interactionId: string,     // registered interaction ID
    hotspotSemantic: string,   // e.g. "head", "body"
    action: string,            // animation clip name triggered
    vocabularyId: string,      // optional vocabulary association
    worldX: float,
    worldY: float,
    worldZ: float,
    timestamp: float
}
```

**Not verified**: RN-side listener for `onModelInteraction` does not yet exist.
RN bridge currently has no handler for `onModelInteraction` — needs a follow-up task to wire it.

---

## Tests / Editor Verification

EditMode tests created in `InteractionSystemTests.cs`:
- `ModelInteractionDefinition_StructIsSerializable`
- `ModelInteractionDefinition_DefaultsToZeroAndNull`
- `InteractionRepeatPolicy_HasExpectedValues`
- `AnimationRegistry_Discover_WithNullAnimator_ClearsClips`
- `AnimationRegistry_HasClip_CaseInsensitive`
- `AnimationRegistry_ResolveHash_ReturnsCorrectHash`
- `AnimationRegistry_ResolveHash_MatchesAnimatorStringToHash`
- `ModelInteractionEventPayload_IsSerializable`
- `ModelInteractionEventPayload_EmptyVocabularyId_IsSerializable`
- `ModelInteractionEventArgs_PropertiesSetCorrectly`
- `ModelInteractionHotspot_Awake_SetsColliderAsTrigger`
- `ModelInteractionHotspot_GetInteractionId_ReturnsConfiguredValue`
- `ModelInteractionHotspot_GetSemanticLabel_ReturnsConfiguredValue`
- `Cooldown_Enforce_ZeroCooldown_AlwaysFires`
- `Cooldown_Enforce_PositiveCooldown_BlocksWithinWindow`
- `Cooldown_Enforce_NegativeCooldown_AlwaysFires`
- `ErrorCodes_AreDistinct`

**NOT verified** (requires Unity Editor running):
- PlayMode touch/raycast (InteractionRaycaster.Update)
- Actual GLB load with real Cat model
- Runtime animation clip discovery from exported GLB
- Actual clip names from Cat GLB
- MODEL_INTERACTION event reaching RN bridge
- Cooldown in real play context
- Cross-fade animation playback

---

## Asset/Export Blockers

| Blocker | Severity | Status |
|---------|----------|--------|
| GLTFast 6.x not in `Packages/manifest.json` | P0 | OPEN — `blockers/2026-08-09-gltfast-dependency.md` |
| No Cat GLB in `Assets/3DModels/` (loaded from Supabase at runtime) | P1 | URL is backend-driven; real clip names unknown |
| Actual Cat GLB animation clip names unknown | P1 | Cat animation clip names NOT verified from asset |
| RN bridge has no `onModelInteraction` handler | P2 | RN side needs a follow-up task |

---

## Spec/Plan Corrections from Implementation Evidence

| Issue | Correction |
|-------|-------------|
| `AnimationController.PlayAnimation` only supports 3 hard-coded types (Idle/Rotate/Bounce) | Added `PlayClipByName(string)` for generic action-by-name support |
| No animation discovery mechanism existed | Created `AnimationRegistry` using `Animator.RuntimeAnimatorController.animationClips` |
| No generic interaction system existed | Created 5 new components following the `ModelInteractionDefinition` pattern |
| No cooldown/repeat policy existed | Implemented `InteractionRepeatPolicy` enum + `EvaluateCooldown` logic |
| `Packages/manifest.json` missing GLTFast | Raised as P0 blocker (open); not fixed in this task |
| RN bridge missing `onModelInteraction` listener | RN side needs follow-up — NOT fixed in this task (out of scope) |

---

## What Was NOT Done (Out of Scope)

- No XP/reward persistence
- No MongoDB/Supabase access from Unity
- No full Cat hotspot map
- No Blender animation authoring
- No AR image tracking integration
- No RN bridge `onModelInteraction` wiring
- No physical device verification
- No GLTFast installation (P0 blocker open)

---

## Recommended Next Unity Task

**U-INT-2 — Wire RN `onModelInteraction` listener + EditMode PlayClipByName test**

Priority rationale:
1. The `onModelInteraction` RN listener is the last integration gap within the interaction system itself.
2. After that, the full vertical slice (Unity interaction → RN event → RN UI feedback) is end-to-end complete for the Cat fixture.
3. The P0 GLTFast blocker must be resolved (install GLTFast 6.x + verify EditMode tests compile) before any PlayMode/physical verification is possible.

Secondary: resolve GLTFast P0 blocker to enable EditMode test execution.

---

## STOP

All files written. Unity Editor not running — no compile verification possible.
EditMode tests require GLTFast to be installed (P0) before they can be executed.
Actual Cat GLB animation clip names are unknown — no animation names treated as runtime truth.
RN bridge `onModelInteraction` wiring is a follow-up task.
