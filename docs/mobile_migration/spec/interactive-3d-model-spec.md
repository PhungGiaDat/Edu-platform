# Interactive 3D Model — Native Touch Interaction Specification

## Status
draft

## Goal
Lock in the architecture for screen-touch interaction with animated 3D learning models in Unity. Specifies: touch → raycast → hotspot → animation → audio → event pipeline, ownership boundaries, and the Cat-as-first-fixture pattern.

This spec covers **native 3D/AR model interaction**, distinct from:
- Flashcard AR (`docs/mobile_migration/spec/native-ar-integration.md`): image tracking + combo
- 3D pet viewer (R9 pets): pet care UI + 3D pet model
- Lesson flashcard UX (`docs/mobile_migration/spec/learner-product-spec.md`): 2D card UI

---

## A. Design Principles

1. **Screen-touch MVP** — interaction via touch on the 3D model rendered in the camera view. No computer-vision hand tracking.
2. **Generic hotspot system** — not hard-coded per model. Cat is the first implementation fixture, not the only model.
3. **Clear ownership** — Unity owns raycast/hit testing/animation/audio; RN owns navigation/reward/product response.
4. **One semantic event per interaction** — Unity emits typed `MODEL_INTERACTION` event; RN maps to reward.
5. **Audio distinction** — vocabulary pronunciation (RN) vs model-local sounds (Unity) vs spatial audio (Unity).

---

## B. Interaction Pipeline

```
Learner taps screen
    ↓
Unity: camera raycast from screen touch
    ↓
Unity: hit test against model colliders / interaction hotspots
    ↓
Unity: resolve hotspot → interaction type
    ↓
Unity: trigger animation (if defined for hotspot)
    ↓
Unity: trigger audio (model sound vs vocabulary pronunciation)
    ↓
Unity: check cooldown / repeat policy
    ↓
Unity: emit MODEL_INTERACTION event to RN
    ↓
RN: map MODEL_INTERACTION → vocabulary event / reward event
    ↓
RN: update XP via backend (if reward event)
    ↓
RN: update pet care / progress state
```

---

## C. ModelInteractionDefinition Schema

```typescript
// Core interaction definition (stored as data, not hard-coded per model)
interface ModelInteractionHotspot {
  hotspotId: string;                    // unique within model (e.g., "head", "body", "food_target")
  bodyPart: string;                     // human-readable label (e.g., "head", "belly")
  interactionType: 'tap' | 'hold' | 'drag';
  animationAction: string;              // Unity Animation trigger name
  audioAction: 'vocabulary' | 'model_sound' | 'reaction' | 'none';
  modelSoundKey?: string;               // e.g., "cat_meow" — references AudioSource in Unity
  vocabularyWord?: string;              // if audioAction === 'vocabulary'
  cooldownMs: number;                   // 0 = fire every time; >0 = minimum interval
  rewardXp: number;                     // XP awarded to learner (0 = no XP)
  rewardEvent?: RewardEventType;        // e.g., 'MODEL_INTERACTION_COMPLETED'
  vocabularyId?: string;                // links to vocabulary item for progress tracking
  unlockRequirement?: {                 // optional unlock condition
    type: 'lesson_complete' | 'level' | 'item_count';
    value: string | number;
  };
}

interface ModelInteractionDefinition {
  modelId: string;                      // business model identifier (e.g., "cat_british_shorthair")
  modelEntityId: string;                // QR code / backend entity ID
  hotspots: ModelInteractionHotspot[];
  defaultAnimation: string;              // idle animation when no interaction
}
```

---

## D. Cat as First Fixture

The Cat model (`cat_british_shorthair`) is the first implementation fixture.

### Cat Interaction Table

| Hotspot | Body Part | Animation | Audio | XP | Notes |
|---------|-----------|-----------|-------|-----|-------|
| `cat_head` | Head | `head_bump` | `vocabulary: "cat"` | 2 | Pet the cat |
| `cat_body` | Body | `body_rub` | `model_sound: "purr"` | 1 | Stroke the cat |
| `cat_tail` | Tail | `tail_swish` | `model_sound: "meow"` | 1 | Pull tail discouraged (just swish) |
| `cat_food_target` | Food bowl | `eating` | `model_sound: "eating"` | 3 | Feed the cat (see FeedThePet GAME-8) |

### Cat Interaction States

```
IDLE → (tap head) → ANIMATING_HEAD → IDLE (2s cooldown)
IDLE → (tap body) → ANIMATING_BODY → IDLE (2s cooldown)
IDLE → (tap food_target) → ANIMATING_EATING → IDLE (5s cooldown) + FEEDING_REWARD
```

### Animation Triggers (Unity)

Unity Animator parameters:
- `Trigger_HeadBump` → Animator.SetTrigger("head_bump")
- `Trigger_BodyRub` → Animator.SetTrigger("body_rub")
- `Trigger_TailSwish` → Animator.SetTrigger("tail_swish")
- `Trigger_Eating` → Animator.SetTrigger("eating")

---

## E. Generic Hotspot Component

Unity implements a reusable `ModelInteractionHotspot` MonoBehaviour component:

```csharp
// mobile/unity/Assets/Scripts/Interactions/ModelInteractionHotspot.cs
public class ModelInteractionHotspot : MonoBehaviour
{
    public string hotspotId;
    public string bodyPart;
    public string interactionType = "tap";
    public string animationTrigger;
    public AudioAction audioAction = AudioAction.None;
    public string modelSoundKey;
    public string vocabularyWord;
    public float cooldownSeconds = 2f;
    public int rewardXp = 0;
    public RewardEventType rewardEvent = RewardEventType.None;
    public string vocabularyId;

    private float _lastTriggerTime = -999f;

    public bool CanTrigger() {
        return Time.time - _lastTriggerTime >= cooldownSeconds;
    }

    public void Trigger() {
        if (!CanTrigger()) return;
        _lastTriggerTime = Time.time;

        // Trigger animation
        if (!string.IsNullOrEmpty(animationTrigger)) {
            _animator.SetTrigger(animationTrigger);
        }

        // Trigger audio
        TriggerAudio();

        // Emit event to RN
        EmitModelInteractionEvent();

        // Apply reward (RN decides persistence)
    }

    void TriggerAudio() {
        switch (audioAction) {
            case AudioAction.Vocabulary:
                // Emit vocabulary audio request to RN via bridge
                RNEventEmitter.SendEvent("onPlayVocabularyAudio", vocabularyWord);
                break;
            case AudioAction.ModelSound:
                _audioSource.PlayOneShot(_soundLibrary[modelSoundKey]);
                break;
            case AudioAction.Reaction:
                _audioSource.PlayOneShot(_reactionLibrary[modelSoundKey]);
                break;
        }
    }

    void EmitModelInteractionEvent() {
        var payload = new ModelInteractionPayload {
            hotspotId = hotspotId,
            modelId = _parentModelId,
            animationTrigger = animationTrigger,
            xpAwarded = rewardXp,
            rewardEvent = rewardEvent,
            vocabularyId = vocabularyId,
            vocabularyWord = vocabularyWord
        };
        RNEventEmitter.SendEvent("onModelInteraction", payload);
    }
}
```

### Touch Raycast System

```csharp
// mobile/unity/Assets/Scripts/Interactions/ModelTouchRaycaster.cs
public class ModelTouchRaycaster : MonoBehaviour
{
    private Camera _arCamera;
    private List<ModelInteractionHotspot> _registeredHotspots = new();

    void Update() {
        // Mobile touch input
        if (Input.touchCount > 0) {
            var touch = Input.GetTouch(0);
            if (touch.phase == TouchPhase.Began) {
                TryRaycast(touch.position);
            }
        }
        // Editor mouse for testing
        if (Input.GetMouseButtonDown(0)) {
            TryRaycast(Input.mousePosition);
        }
    }

    void TryRaycast(Vector2 screenPos) {
        Ray ray = _arCamera.ScreenPointToRay(screenPos);
        if (Physics.Raycast(ray, out RaycastHit hit)) {
            var hotspot = hit.collider.GetComponent<ModelInteractionHotspot>();
            if (hotspot != null) {
                hotspot.Trigger();
            }
        }
    }
}
```

---

## F. RN ↔ Unity Bridge Events

### Unity → RN Events (existing + new)

| Event | Payload | Usage |
|-------|---------|-------|
| `onModelInteraction` | `{ hotspotId, modelId, animationTrigger, xpAwarded, rewardEvent, vocabularyId, vocabularyWord }` | **NEW**: generic model interaction |
| `onFoodFed` | existing | Pet feeding (exists) |
| `onComboComplete` | existing | AR combo (exists) |

### RN → Unity Methods (existing)

| Method | Usage |
|--------|-------|
| `playAudio` | Request Unity to play pronunciation (existing bridge) |

### Vocabulary Audio Flow

Two paths for vocabulary pronunciation during model interaction:

**Path A (RN-owned)**: RN has audio URL from lesson data → RN plays audio directly.
**Path B (Unity requests)**: Unity hotspot with `audioAction: 'vocabulary'` → Unity emits `onPlayVocabularyAudio(vocabularyWord)` → RN plays audio via `AudioPlayer`.

**Decision**: Path B is preferred for model interactions (Unity coordinates animation + audio timing). RN manages the audio URL lookup and playback.

---

## G. Ownership Matrix

| Concern | Owner | Evidence |
|---------|-------|----------|
| Touch raycast | Unity | `ModelTouchRaycaster.cs` |
| Hotspot resolution | Unity | `ModelInteractionHotspot.cs` |
| Animation triggering | Unity | Animator.SetTrigger |
| Model-local sound | Unity | AudioSource.PlayOneShot |
| Spatial/audio | Unity | AudioSource + 3D position |
| Vocabulary audio | RN | AudioPlayer API |
| Vocabulary audio request | Unity | `onPlayVocabularyAudio` event |
| Interaction cooldown | Unity | `ModelInteractionHotspot.cooldownSeconds` |
| XP calculation | Unity | `rewardXp` per hotspot |
| XP persistence | RN + Backend | `POST /gamification/add-xp` (idempotent) |
| Pet state update | RN + Backend | `POST /gamification/pet/feed` |
| Vocabulary progress | RN + Backend | Backend tracks word learned |
| Product navigation | RN | Screen flow |

---

## H. Reward Integration

### Reward Event Flow

```
Unity: ModelInteractionHotspot.Trigger()
  → animation plays
  → audio plays
  → xpAwarded calculated
  → emit onModelInteraction({ xpAwarded, rewardEvent, ... })
  → RN receives onModelInteraction
  → RN calls POST /gamification/add-xp { action: "model_interaction", metadata: { hotspotId, modelId, vocabularyId } }
  → idempotency: same hotspotId within cooldown = same event ID
  → RN shows XP toast (+{xp} XP)
  → if vocabularyId: update vocabulary progress
```

### XP Values (Design Defaults — Configuration)

| Interaction | XP | Notes |
|-------------|-----|-------|
| Tap head | 2 | |
| Tap body | 1 | |
| Feed pet | 3 | Also triggers pet care XP |
| Combo (AR) | 10 | Per existing MOB-GAME-REQ |

XP amounts are design defaults; backend owns final XP calculation.

---

## I. Requirements

### MOB-3DINT-REQ-001 — Hotspot Registration
**Product behavior**: On model load, Unity registers all `ModelInteractionHotspot` components with the touch raycaster. Hotspots are data-driven (not hard-coded per model).
**Ownership**: Unity.
**Verification**: Cat model + Dog model → same hotspot system handles both.

### MOB-3DINT-REQ-002 — Touch Raycast
**Product behavior**: Screen touch → camera raycast → hotspot hit → interaction trigger. Works on mobile touch and editor mouse.
**Ownership**: Unity.
**Verification**: tap cat's head → head_bump animation plays exactly once per cooldown.

### MOB-3DINT-REQ-003 — Animation Triggering
**Product behavior**: Hotspot trigger → correct animation plays → idle resumes after animation completes.
**Ownership**: Unity.
**Verification**: animation plays without overlap; no double-animation.

### MOB-3DINT-REQ-004 — Audio Triggering
**Product behavior**: Hotspot trigger → correct audio plays (model sound OR vocabulary word via RN). Audio synchronized with animation start.
**Ownership**: Unity + RN (vocabulary via bridge request).
**Verification**: tap cat body → purr sound + body rub animation simultaneous.

### MOB-3DINT-REQ-005 — Cooldown Enforcement
**Product behavior**: Same hotspot cannot fire twice within cooldown period. Excess taps are ignored.
**Ownership**: Unity.
**Verification**: rapid tap head × 5 → only 1 head_bump animation + 1 XP award.

### MOB-3DINT-REQ-006 — MODEL_INTERACTION Event
**Product behavior**: Unity emits `onModelInteraction` after each valid interaction with: hotspotId, modelId, animationTrigger, xpAwarded, rewardEvent, vocabularyId.
**Ownership**: Unity.
**Verification**: bridge event captures all fields correctly.

### MOB-3DINT-REQ-007 — RN Reward Processing
**Product behavior**: RN receives `onModelInteraction` → calls `POST /gamification/add-xp` with idempotency → shows XP toast.
**Ownership**: React Native (R8/R9).
**Verification**: tap head → +2 XP → toast shown → reload → XP persists.

### MOB-3DINT-REQ-008 — Vocabulary Progress
**Product behavior**: If `onModelInteraction` carries `vocabularyId`, RN updates vocabulary progress (word seen/practiced).
**Ownership**: React Native (R5).
**Verification**: tap cat → "cat" vocabulary marked as PRACTICING.

---

## J. Existing Unity Code Reference

| File | Role |
|------|------|
| `mobile/unity/Assets/Scripts/Interactions/ComboManager.cs` | Combo proximity logic (reference) |
| `mobile/unity/Assets/Scripts/Interactions/FoodInteraction.cs` | Food drag → pet proximity (reference for drag system) |
| `mobile/unity/Assets/Scripts/Interactions/PetController.cs` | Pet state machine (reference) |
| `docs/unity_ar/spec/bridge-contract.md` | Bridge event contract (do not alter) |
| `docs/unity_ar/spec/combo-interaction.md` | Combo interaction spec (related) |

The `ModelInteractionHotspot` system is inspired by the existing `FoodInteraction` drag pattern but adapted for tap-based interaction.

---

## K. Deferred Decisions

| # | Decision | Blocks | Owner |
|---|----------|--------|-------|
| 3D-DQ-1 | Physical hysteresis values for food proximity (same as combo CQ-3 — deferred) | Food target interactions | Product / UX |
| 3D-DQ-2 | Hold interaction duration threshold | MOB-3DINT-REQ-001 | Unity architect |
| 3D-DQ-3 | Drag interaction for food (extends tap system) | GAME-8 FeedThePet | Unity architect |
