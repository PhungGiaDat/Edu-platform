# AR Interaction Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement one task at a time. Each task uses RED, GREEN, verification, and a separate review.

**Goal:** Stabilize the isolated 8th Wall CAT/FISH AR interaction without changing tracking architecture.

**Architecture:** `ar-xr.html` remains XR and Three integration owner. A single pure public ESM helper is shared by raw public runtime and Vitest. Existing CAT mixer, target state, procedural yaw, and proximity state machine remain authoritative.

**Tech stack:** raw public ESM, Three.js 0.158, 8th Wall engine binary, Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-08-ar-interaction-stabilization-design.md`

## Global constraints

- Change only `/learn-ar-xr` runtime assets and AR-specific tests/docs.
- Preserve `lostGraceMs = 300`, enter `0.72`, exit `0.80`, smoothing `0.25`, fish consume ratio, and CAT turn math.
- No MindAR, target, DB, course, fish-scale, scene, or mixer architecture changes.
- Use only `frontend/public/static/ar-assets/js/ar-interaction-lifecycle.js` for shared lifecycle logic; never create `frontend/src/lib/arInteractionLifecycle.*`.
- No `mixer.stopAllAction()`, global taps, or unowned delayed action cleanup.
- Never let fish progress or timeout gate `BOOT_GATE_OPEN`.

---

### Task 1: Define public pure lifecycle contracts with RED tests

**Files:**
- Create `frontend/public/static/ar-assets/js/ar-interaction-lifecycle.js`
- Create `frontend/src/__tests__/arInteractionLifecycle.test.ts`

**Produces:** `shouldRevealAR`, `canPlayCatMeow`, `classifyCatTap`, `smoothstep`, and `advanceCatReturnTween` from the same public ESM module consumed later by `ar-xr.html`.

- [ ] Write RED tests importing `../../public/static/ar-assets/js/ar-interaction-lifecycle.js`. Cover false/false/true boot combinations, `COMBO_CONSUMED` meow allowed only when no return, mesh/proxy/miss classification, and a real return state `{ fromYaw: 55 * Math.PI / 180, toYaw: 0.2, startedAt: 1000, durationMs: 400, runId: 4 }`.
- [ ] Verify RED with `cd frontend; npm test -- src/__tests__/arInteractionLifecycle.test.ts`; expected failure is missing module/export.
- [ ] Implement only pure functions. `advanceCatReturnTween(now, returnState)` returns `{ yaw, complete }`; at 1200 its yaw lies strictly between source and target, and at 1401 it returns exactly `toYaw` and `complete: true`.
- [ ] Run the focused test again; expected all assertions pass.
- [ ] Commit only these two files with `git commit -m "test(ar): define interaction lifecycle contracts"`.

### Task 2: Fix return ticking and protect its source boundary

**Files:**
- Modify `frontend/public/ar-xr.html`
- Modify `frontend/src/__tests__/arInteractionLifecycle.test.ts`

**Consumes:** public helpers from Task 1.

- [ ] Add a RED source-contract test that reads `public/ar-xr.html`, finds the active-return marker and the `COMBO_TURNING`/`COMBO_PLAYING` early-return marker, and asserts the former occurs first. It must also assert return construction uses `comboLatch?.catOriginalYaw` and completion is represented by `CAT_RETURN_COMPLETE`.
- [ ] Run focused tests; expected source-contract failure against current phase-bound update.
- [ ] Import the public helper in `ar-xr.html`. Advance a current `catReturn` before phase early returns; apply returned yaw to interaction root, clear on completion, and emit `CAT_RETURN_COMPLETE` with final yaw. Create return after phase transition with `comboLatch?.catOriginalYaw ?? 0`.
- [ ] Remove the old phase-only return update so the updater has one owner.
- [ ] Run focused tests and `npm run build`; expected pass and exit zero.
- [ ] Commit scoped changes with `git commit -m "fix(ar): complete CAT post-combo return"`.

### Task 3: Instrument and prove CAT one-shot mixer state

**Files:**
- Modify `frontend/public/ar-xr.html`
- Modify `frontend/src/__tests__/arInteractionLifecycle.test.ts`

**Produces:** CAT_EAT completion diagnostics and source contract for locked event order.

- [ ] Write a RED source-contract test for `COMBO_ANIMATION_FINISHED`, `CAT_IDLE_RESTORED`, transition to `COMBO_CONSUMED`, then `CAT_RETURN_START`, in that exact order; assert no `CAT_IDLE_RESTORED` is emitted by return completion.
- [ ] Run focused tests; expected failure because current runtime lacks `CAT_IDLE_RESTORED` and order.
- [ ] Add `CAT_ACTION_STATE_AFTER_EAT` telemetry after CAT_EAT finishes, recording action and idle state. Add no timeout cleanup in this task.
- [ ] Add the source-visible CAT_IDLE restoration event at CAT_EAT completion before changing phase, and the analogous CAT_MEOW restoration event after `CAT_MEOW_FINISHED`.
- [ ] Run focused tests and build; commit `test(ar): instrument CAT one-shot restoration`.

### Task 4: Apply minimal generation-safe one-shot cleanup

**Files:**
- Modify `frontend/public/ar-xr.html`
- Modify `frontend/src/__tests__/arInteractionLifecycle.test.ts` only if helper behavior changes.

**Consumes:** Task 3 diagnostics and event-order contract.

- [ ] Run one local/manual CAT_EAT reproduction and capture `CAT_ACTION_STATE_AFTER_EAT` before choosing cleanup.
- [ ] If finished action has effective weight, add only mixer-native fade/crossfade needed to remove dominance while idle restores. Do not schedule a raw timeout. If a delayed cleanup is unavoidable, add generation and expected-action ownership checks and test stale cleanup cannot affect a newer action.
- [ ] Use the same safe restoration path for EAT and MEOW; combo cancellation invalidates active MEOW and removes visual dominance without stopping a newer action.
- [ ] Run focused tests and build; commit `fix(ar): restore CAT idle after one-shot animations` when source changes.

### Task 5: Add cached child-friendly CAT proxy hit testing

**Files:**
- Modify `frontend/public/ar-xr.html`
- Modify `frontend/src/__tests__/arInteractionLifecycle.test.ts`

**Consumes:** `classifyCatTap` and `canPlayCatMeow` from Task 1.

- [ ] Extend RED tests for classification and consumed-phase eligibility; run them first.
- [ ] Cache an invisible CAT-local bounding sphere after CAT load/pivot setup; enlarge radius by `1.30`. Transform ray/bounds at pointer time without recomputing `Box3`.
- [ ] Preserve direct mesh raycast priority. Only after a mesh miss test proxy; emit `CAT_TAP` with `hitSource` or `CAT_TAP_MISS`.
- [ ] Block meow while return is active; allow it in consumed phase after return null. Do not raycast scene or make empty space tap CAT.
- [ ] Run focused tests and build; commit `fix(ar): enlarge CAT interaction hit target`.

### Task 6: Reveal after camera and CAT only

**Files:**
- Modify `frontend/public/ar-xr.html`
- Modify `frontend/src/__tests__/arInteractionLifecycle.test.ts`

**Consumes:** `shouldRevealAR` from Task 1.

- [ ] Add RED source contract asserting explicit `cameraReady`, `hasVideo` assignment, `shouldRevealAR`, and absence of fish percentage/timeout reveal predicates and blocking `Interaction assets` copy.
- [ ] Run focused tests; expected failure against current warmup gate.
- [ ] Set `cameraReady` on `hasVideo`, reveal only when CAT and camera are ready, remove fish threshold/timeout watchdog and its blocking overlay state. Preserve progress telemetry/background fish load.
- [ ] Run focused tests, `npm run lint`, and `npm run build`; commit `fix(ar): reveal experience when camera and CAT are ready`.

### Task 7: Correct audio telemetry and validate asset without coupling animation

**Files:**
- Modify `frontend/public/ar-xr.html`
- Modify `frontend/src/__tests__/arInteractionLifecycle.test.ts`

- [ ] Add RED source contract requiring `CAT_MEOW_AUDIO_REQUESTED`, `CAT_MEOW_AUDIO_PLAYING`, and `CAT_MEOW_AUDIO_PLAY_ERROR`, and forbidding `CAT_MEOW_AUDIO_START`.
- [ ] Run focused tests; expected failure against old event semantics.
- [ ] Emit REQUESTED before `play()`, PLAYING only on promise resolution (or one reliable browser event), and PLAY_ERROR on synchronous or promise failure. Preserve independent animation completion.
- [ ] Inspect the configured asset HTTP status/type/bytes and decoder metadata where tooling permits; record target-device result without inventing a replacement URL.
- [ ] Run focused tests, lint, and build; commit `fix(ar): clarify CAT meow audio telemetry`.

### Task 8: Full verification, device evidence, and whole-branch review

**Files:** no production edits unless a verified reviewer finding requires a focused fix.

- [ ] Run fresh `cd frontend; npm run lint; npm run build; npm test` and read all exit codes/counts.
- [ ] Run one real mobile `/learn-ar-xr` regression. Capture boot with camera+CAT, mesh/proxy/miss tap behavior, one MEOW audio success/error branch, CAT_EAT event order, return completion, and post-combo MEOW before rearm.
- [ ] Inspect scoped git status/diff/log and dispatch whole-branch review. Fix Critical/Important findings, rerun their covering tests, and re-review.
- [ ] Report device evidence separately if physical execution is unavailable; do not treat unit/build evidence as mobile proof.
