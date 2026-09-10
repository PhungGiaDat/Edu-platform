# Generic Rule-Driven Multi-Target AR Interaction Design

**Date:** 2026-09-10  
**Repository:** `PhungGiaDat/Edu-platform`  
**Branch:** `10-days-quick-run`  
**Runtime:** `frontend/public/ar-xr.html`  
**Scope:** 8th Wall `/learn-ar-xr` only

## Goal

Replace CAT/FISH-specific interaction selection with generic, data-driven pair
rules over the existing N-target registry. Runtime flow:

```text
N tracked targets -> matching backend rules -> deterministic winner
-> actor + partner resolution -> pair proximity -> rule animation/action
```

Examples are `cat001 + fish001 -> CAT_EAT`, `dog001 + bone001 -> DOG_EAT`,
and `cat001 + ball001 -> CAT_PLAY`. Unrelated tracked targets must have no
effect on a selected pair.

## Locked constraints

- Preserve existing target registry, XR scene, one `AnimationMixer` per model,
  8th Wall target registration, `/learn-ar-xr`, and target-loss grace.
- `lostGraceMs=300` remains independent of interaction evaluation.
- CAT/FISH stays data-driven at enter `0.52`, exit `0.60`, stable `300ms`,
  smoothing `0.25`, consume ratio `0.65`.
- Preserve FISH `scale=0.30`, `fish_mobile_v1.glb`, CAT GLB, and no GLB
  reload/disposal on target reacquire.
- No performance, network, CDN, asset, MindAR, course, physical-width, or
  database-schema work. Do not create a new rule store or endpoint.
- Generic interaction core must not branch on `cat001`, `fish001`, `CAT_EAT`,
  or `CAT_MEOW`. CAT mascot behavior is a separate capability layer. Temporary
  CAT/FISH fallback is allowed only at configuration boundary as normalized rule.

## Correctness baseline

Evaluator identifier failure and independent target-loss lifecycle landed in
`74a543e1`. All generic work preserves this frame order:

```text
processPendingTargetLosses(now)
evaluateInteractions(now)
updatePerModelBehaviors(now)
```

`IMAGE_LOST` remains pending for less than 300ms, may emit
`TARGET_REACQUIRED_WITHIN_GRACE` only in that interval, and otherwise emits
`TARGET_LOST_CONFIRMED` and `MODEL_HIDDEN_TARGET_LOST`. Interaction failure
must not prevent that lifecycle.

## Rule boundary

`/combos/rules` backed by existing `ar_combinations` is source of truth. The
runtime needs existing fields represented as `tags`, `target_order`,
`combo_id`, `animation_trigger`, `priority`, and `proximity`.

Normalize every rule to:

```js
{
  id,
  requiredTargets,
  actorTarget,
  partnerTargets,
  animation,
  action: {
    consumePartners,
    facePrimaryPartner,
    consumeAtRatio,
  },
  priority,
  proximity: { enterDistance, exitDistance, stableMs, smoothingAlpha } | null,
  actorSource: 'target_order' | 'required_tags_fallback',
  source: 'backend' | 'fallback',
  executable,
}
```

Actor is `target_order[0]`, otherwise `required_tags[0]`; remaining required
targets are partners. Emit `RULE_ACTOR_RESOLVED` with source. Only exactly two
participants execute now. Loaded rules with more than two participants emit
`INTERACTION_RULE_UNSUPPORTED` and are skipped.

## Selection, execution, and isolation

Rules match only when all required targets are effectively tracked. Selection
is highest `priority`, then ascending lexical `combo_id`; emit selection and
clear events only on changes. One active execution object owns `ruleId`,
`actorTarget`, `partnerTargets`, phase, filtered distance, proximity timestamp,
run id, latch, turn, and return state.

Distance uses only anchor poses via `computeTargetPairDistance(actorInst,
partnerInst)`. It is never visual model bounds/scale. Proximity, turn,
animation, consume, rearm, reset, and delayed callbacks use latched rule
participants. A CAT/FISH interaction may only consume/rearm `fish001`, never a
tracked dog/bone or other target. Missing actor animation emits
`INTERACTION_ANIMATION_MISSING` and clears safely without ending tracking.

## Observability and acceptance

Required events: `INTERACTION_RULES_LOADED`, `INTERACTION_RULE_NORMALIZED`,
`RULE_ACTOR_RESOLVED`, `INTERACTION_RULE_SELECTED`,
`INTERACTION_RULE_CLEARED`, `INTERACTION_RULE_UNSUPPORTED`, generic
`PROXIMITY_SAMPLE`, and generic animation events. Avoid per-frame spam.

Tests cover CAT/FISH matching and hysteresis, DOG/BONE without CAT assumptions,
priority/ties, unknown targets, unsupported three-target rules, missing
animation, scoped consume/rearm, and target-loss isolation. Device verification
is separate from code/test verification.
