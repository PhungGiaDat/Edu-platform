# Generic Rule-Driven Multi-Target AR Interaction Plan

**Spec:** `docs/superpowers/specs/2026-09-10-generic-rule-driven-multi-target-ar-design.md`

## Global constraints

Keep current 8th Wall flow, model assets/scales, target registry, one mixer per
model, `lostGraceMs=300`, CAT/FISH `0.52/0.60/300/0.25`. No performance,
network, CDN, GLB, MindAR, target JSON, physical-width, course, or schema
redesign. Do not create/move branch, use worktrees, reset hard, push, or merge.
Stage only owned paths.

## Execution ledger

- [x] 1. Stabilize evaluator binding and independent target-loss processing.
  Completed before this plan in `0383aa43`, `74a543e1`; retain regression
  contract, do not duplicate fix.
- [x] 2. Expose existing `target_order` and `priority` through `/combos/rules`
  with focused backend response-contract test.
- [x] 3. Add pure generic rule normalization to shared public lifecycle helper,
  RED then GREEN.
- [x] 4. Add matching plus deterministic priority/`combo_id` selection, RED
  then GREEN.
- [x] 5. Normalize backend rules once in runtime and select active rule from
  effectively tracked names. Convert resilience fallback only at this boundary.
- [x] 6. Replace global-secondary distance with actor/partner pair distance and
  per-rule proximity state/configuration.
- [x] 7. Make consume, rearm, reset, delayed callbacks participant scoped.
- [x] 8. Generalize turn and animation execution to selected actor/rule;
  missing clip is diagnostic and safe.
- [x] 9. Gate CAT gestures behind CAT model animation capabilities; generic
  path never requires `CAT_MEOW`.
- [x] 10. Remove obsolete CAT/FISH selectors/resolvers from generic runtime and
  align module-probe exports/source contracts.
- [ ] 11. Run focused/full frontend/backend verification, false-green review,
  read-only whole-branch review, document device-browser evidence/status.

  Focused AR lifecycle tests (37), backend combo/AR tests (19), lint, static
  module parse, source contracts, and diff checks passed. The full frontend
  build is currently blocked before Vite by unrelated dirty-worktree errors in
  `src/pages/games/DragMatchGame.tsx` and `src/pages/GamesPage.tsx`; the broad
  backend selector is blocked at collection by unrelated Momo seed/asset
  imports. Physical-device verification remains required after deployment.

## Test contract

Each pure helper lands only after a test fails for missing behavior. Tests import
the same physical public module runtime uses. Source contracts apply only to
8th-Wall wiring and must be mutation-sensitive.

## Required final checks

```powershell
cd frontend
npm run lint
npm run build
npm test
cd ..
pytest backend/tests/test_combo_rules_runtime_contract.py -q
pytest backend/tests -q -k "combo or ar_combination"
git diff --check
git status --short
git diff --stat
git log --oneline -15
```

Physical mobile verification is reported separately; Vitest/build cannot prove
device-browser behavior.
