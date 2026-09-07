# AR Interaction Stabilization Design

**Date:** 2026-09-08  
**Runtime:** `frontend/public/ar-xr.html`  
**Scope:** isolated `/learn-ar-xr` 8th Wall CAT/FISH experience only

## Goal

Make AR usable as soon as camera and CAT are ready, make CAT one-shot actions restore a usable idle state, complete post-combo return yaw, make CAT taps forgiving without becoming global taps, and isolate meow audio failures from animation.

## Non-goals and invariants

- Keep one XR scene, existing `targetInstances`, and one `AnimationMixer` per model.
- Keep `lostGraceMs = 300`, proximity enter `0.72`, exit `0.80`, smoothing `0.25`, fish consume ratio, CAT turn calculation, fish scale, and target assets unchanged.
- Do not touch MindAR, target JSON/files, database, course code, or other AR paths.
- Do not add a second interaction state machine, a second mixer, a global tap target, or unowned delayed action cleanup.

## Root-cause evidence

`triggerComboAnimation()` transitions to `COMBO_CONSUMED` and then creates `interactionState.catReturn`. `evaluateInteraction()` only calls `applyCatReturn(now)` inside its `COMBO_PLAYING` early-return branch. A valid return therefore stops receiving ticks after it is created. The return target is also currently hard-coded to zero although `comboLatch.catOriginalYaw` is captured at arm time.

## Boot contract

```text
cameraReady && catReady -> BOOT_GATE_OPEN -> hide full-screen overlay
```

`bootState` contains `cameraReady`, `catReady`, `arRevealed`, and `fishLastProgress`. Camera readiness is set only on XR `hasVideo`; CAT readiness follows successful CAT GLB parse/model/mixer setup. FISH progress remains telemetry/background loading only. It must not gate reveal, start an eight-second reveal timeout, or produce a blocking `Interaction assets N%` overlay.

FISH combo eligibility remains unchanged: a loaded model and tracked/effectively tracked FISH are both required before arming proximity.

## Shared lifecycle helper

The sole shared production/test module is:

```text
frontend/public/static/ar-assets/js/ar-interaction-lifecycle.js
```

It exports small pure helpers only: reveal predicate, CAT-meow eligibility, tap classification, `smoothstep`, and deterministic CAT-return tween advancement. `ar-xr.html` imports it through its public-relative module path. Vitest imports that exact physical file through a filesystem-relative path. No `src/lib/arInteractionLifecycle.*` production copy is allowed.

The helper owns no XR8, Three renderer, scene, target, mixer, or tracking state.

## CAT one-shot contract

`CAT_MEOW` and `CAT_EAT` reuse the existing CAT mixer. No `mixer.stopAllAction()` is allowed.

Before choosing cleanup behavior, CAT_EAT completion emits:

```text
CAT_ACTION_STATE_AFTER_EAT {
  eatRunning, eatWeight, eatTime, eatClampWhenFinished,
  idleRunning, idleWeight, idleTime
}
```

The minimal cleanup is selected from this evidence. If CAT_EAT retains effective weight, fade/crossfade it out while restoring idle; no raw delayed `setTimeout` may stop/reset an action. If cleanup ever must be delayed, it must verify both a generation/run id and the expected `AnimationAction` owner first. Prefer immediate mixer-native fading with no delayed cleanup.

Required CAT_MEOW order:

```text
CAT_MEOW_START
CAT_MEOW_FINISHED
CAT_IDLE_RESTORED { source: "CAT_MEOW" }
```

Required CAT_EAT order:

```text
COMBO_ANIMATION_FINISHED
CAT_IDLE_RESTORED { source: "CAT_EAT" }
INTERACTION_PHASE { from: "COMBO_PLAYING", to: "COMBO_CONSUMED" }
CAT_RETURN_START
CAT_RETURN_COMPLETE
```

There is no second required `CAT_IDLE_RESTORED` after `CAT_RETURN_COMPLETE`: return affects procedural body yaw only.

## CAT return and post-combo tap

An active current-run `catReturn` ticks before phase branches that may return from `evaluateInteraction()`. On every tick it moves from `fromYaw` to `toYaw`; completion writes the latched `comboLatch.catOriginalYaw`, clears `catReturn`, and emits `CAT_RETURN_COMPLETE`. A stale run is cleared/cancelled with a documented stale event.

Combo rearm and CAT tap eligibility remain separate. `COMBO_CONSUMED` continues until FISH reaches the existing exit distance. CAT_MEOW is nevertheless allowed in `COMBO_CONSUMED` once `catReturn === null` and CAT is model-ready, tracked, and not already meowing. It remains blocked in `COMBO_ARMED`, `COMBO_TURNING`, `COMBO_PLAYING`, or while a return is active.

## Tap contract

Pointer handling first raycasts CAT mesh. On miss it tests a cached, invisible CAT-local interaction proxy derived once after CAT load/pivot normalization. The initial proxy scale is `1.30`, tunable only within `1.25–1.40`. It follows CAT transforms, is never rendered, does not raycast the full scene, and does not recompute `Box3` per pointer event.

```text
mesh hit  -> CAT_TAP { hitSource: "mesh" }
proxy hit -> CAT_TAP { hitSource: "proxy" }
neither   -> CAT_TAP_MISS
```

## Audio contract

CAT animation and media playback are independent branches after a valid tap. Remove `CAT_MEOW_AUDIO_START`. Telemetry semantics are exact:

```text
CAT_MEOW_AUDIO_REQUESTED  // immediately before play()
CAT_MEOW_AUDIO_PLAYING    // play promise resolved or one reliable playing event
CAT_MEOW_AUDIO_PLAY_ERROR // play rejected or throws
```

Audio failure never changes or blocks CAT one-shot state. The existing configured asset is checked for HTTP status, content type, bytes/codec where available, and target Safari/iOS behavior. A valid asset does not justify swallowing a browser playback failure or claiming that playback started.

## Required tests and acceptance

- Pure reveal tests: only camera and CAT readiness determine reveal.
- Real return regression: a `COMBO_CONSUMED` return from `55°` to original yaw advances at intermediate time and completes/clears at duration.
- Source-contract test: active return update appears before phase early-return handling in `ar-xr.html`, using semantic markers rather than line numbers.
- Pure tap classification tests: mesh, proxy, and miss.
- CAT_MEOW eligibility tests for `COMBO_CONSUMED` with and without active return.
- Runtime/source contracts cover exact event names and CAT_EAT ordering.
- One mobile regression proves boot, mesh/proxy tap, CAT_MEOW, CAT_EAT, return completion, and post-combo CAT_MEOW. Physical-device evidence remains separate from unit/build evidence.
