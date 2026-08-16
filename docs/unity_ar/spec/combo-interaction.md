## Status
draft

## Goal
Lock in the multi-card combo interaction architecture: proximity detection, dwell timing, hysteresis, combo trigger, and animation sequencing.

---

## Design Invariants

1. **Combo logic SEPARATED from tracking** — `ComboManager` is independent of `ARTrackedImageManager` / `HandleTrackedImagesChanged`.
2. **Identity explicit, not positional** — each card's identity is `qrId` / `referenceImage.name`, not detection order.
3. **Hysteresis required** — enter and exit thresholds are different values.
4. **Dwell timing** — combo fires only after sustained proximity, not on first cross-threshold.
5. **One-shot per approach** — combo does not re-fire while cards remain near; resets on exit.
6. **Per-card proximity tracking** — `NearStartTime` tracked per card, not globally.

---

## Runtime Flow

```
ComboManager.Update()
  → pairwise distance loop over _trackedImages
  → if dist < proximityThreshold:
       if NearStartTime < 0: set NearStartTime = Time.time
       if (Time.time - NearStartTime) > proximityHoldTime:
           fire OnProximityNear (once per pair per approach)
  → else (dist >= proximityThreshold):
       reset NearStartTime = -1 for both cards
```

---

## Hysteresis Values (Design Examples — Must Be Physically Tested)

| Parameter | Design value | Notes |
|-----------|-------------|-------|
| `proximityThreshold` | 0.5 m | Trigger distance |
| `proximityHoldTime` | 1.0 s | Dwell before combo fires |
| Exit hysteresis | ~0.6–0.8 m | Cards must move well apart to reset |

**IMPORTANT:** These are design placeholders. Physical testing on target devices is required to determine actual values.

---

## CURRENT: Card Identity in Combo Context

**Status: CURRENT (technical debt — to be removed)**

`ComboManager._trackedImages` keys cards by `referenceImage.name` (= `qrId`).

The current `InitComboTable()` implementation uses a hardcoded table:

```csharp
_comboTable[("flashcard_chicken", "flashcard_egg")] = new ComboDefinition {
    ComboId = "chicken_egg_reward",
    CardA = "flashcard_chicken",
    CardB = "flashcard_egg",
    ArTag = "",  // placeholder — real value from backend (P6)
    RewardCardId = "reward_baby_chicken",
    XpReward = 25
};
```

**This is CURRENT technical debt.** The hardcoded table maps `qrId` pairs directly to `ComboDefinition` values (containing `RewardCardId`, `XpReward`).

The table was added in `P0-T002` / `E4-E6` fixes to unblock EditMode testing. It does NOT reflect the target architecture.

---

## TARGET: Semantic Combo Resolution

**Status: TARGET (planned — Phase P6)**

The target combo-resolution path is backend-driven:

```
tracked physical card
        ↓
referenceImage.name
        ↓
qrId                           (runtime/business card identity)
        ↓
MultiCardRegistry[qrId]
        ↓
registered payload
        ↓
arTag                          (semantic AR content identity)
        ↓
backend-provided related_combos
        ↓
required_tags matching          (list of arTag values)
        ↓
comboId / combo definition      (backend-defined combo identity)
```

**Key identity separation:**

| Identity | Scope | Examples |
|----------|-------|----------|
| `qrId` | Business flashcard / runtime participant | `flashcard_chicken`, `ele123` |
| `arTag` | Semantic AR / combo identity | `chicken_marker`, `apple_marker` |
| `comboId` | Backend-defined combo | `chicken_egg_reward` |
| `TrackableId` | Ephemeral AR Foundation instance | `guid-xxx-yyy` |

**`required_tags` contains `arTag` values, not `qrId` values.** Unity resolves `arTag → qrId` via `MultiCardRegistry` to find the correct `CardDescriptor` for each participant. Detection order does NOT determine card identity.

---

## Backend Combo Consumption

**Status: TARGET (Phase P6)**

Backend `ARCombination` documents provide the canonical combo definitions:
- `required_tags`: list of `ar_tag` values (NOT `qr_id` values)
- `bonus_xp`: XP awarded
- `semantic_result`: effect type
- `animation`: animation to play

**Current:** `ComboManager` does NOT consume `related_combos` from the `GET /api/v1/flashcard/{qr_id}` response. The hardcoded table is used as a fallback.

**Target (P6):** `ComboManager` consumes `ComboDefinition[]` dynamically from `related_combos` in the AR experience payload. The hardcoded table is removed in Phase 6A.

**Gap:** No bridge method exists yet to send `related_combos` from RN to Unity. This is in scope for P6.

---

## Combo Animation Sequence

Current implementation (`ComboAnimationSequence`):
1. Get both card model positions
2. Lerp models to midpoint (0.8 s)
3. Hide originals
4. Spawn reward primitive (bounce scale animation)
5. Fire `OnComboComplete` → `RNEventEmitter.onComboComplete`

Future: load combo reward model from `center_transform` + backend `model_3d_url`.

---

## Food / Pet Interaction (Separate System)

`FoodInteraction` and `PetController` are a **separate** interaction system from `ComboManager`.

This system is distinct from the planned **In-AR Game Mode** feature. Food/Pet uses `UnityEngine.EventSystems` for drag input and does not involve the AR camera. In-AR Game Mode (future) is an overlay/3D game experience that runs while the AR camera remains active.

**Note:** `ComboManager` and `GameModeManager` have distinct responsibilities:
- `ComboManager`: proximity detection + combo trigger + Unity combo events
- `GameModeManager`: game button, game canvas/3D root, game lifecycle, game result events

A combo may later launch a game, but that is orchestration between features, not identity equivalence.

- `FoodInteraction`: drag food model via `IDragHandler`, checks pet proximity radius
- `PetController`: state machine (Idle → Anticipating → Eating → Satisfied), emits `onFoodFed` events
- This system uses `UnityEngine.EventSystems` (not AR tracking) for drag input

---

## Open questions

| # | Question | Status |
|---|----------|--------|
| CQ-1 | Should `ComboManager` consume backend `related_combos` dynamically, or continue with hardcoded table? | **Resolved** — Backend consumption. P6 scope. |
| CQ-2 | Should combo reward models load from backend `model_3d_url` or continue with primitive fallback? | Yes — P7 scope |
| CQ-3 | What are the physically measured hysteresis values for the actual printed flashcards? | No (needs physical test) |
| CQ-4 | Should In-AR Game Mode launch a combo-triggered game or a standalone game? | Future design decision |
