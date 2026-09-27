# Dog + Bone combo rule

> **Date:** 2026-09-27
> **Status:** Migration committed; NOT yet applied to Supabase

## Symptom

Physical AR Sync report: dog001/bone001 targets load and 8th Wall recognizes both,
but a cat001 session rejects them (`TARGET_FOUND_REJECTED_SESSION`, `not_session_relevant`).
Starting from dog001 would admit only dog001 because no rule contains it.

## Root cause

`20260913_01_add_dog_bone_xr_targets.sql` provisioned flashcards, `ar_objects` and XR
targets but intentionally no `ar_combinations` row. Live DB query confirmed no
`clay_dog_bone`. `resolveSessionTargetAdmission` only expands admission from executable
rules, so bone001 is never admitted.

## Fix

`backend/database/postgres/migrations/20260927_01_add_dog_bone_combo_rule.sql`:
`clay_dog_bone`, target_order `["dog001","bone001"]`, tag_order dog=0/bone=1,
animation `SHIBA_EAT_BONE`, flashcard_set `claymorphic-animals-001`.
Proximity 0.62/0.70/300/0.25 (cat/fish physical values) is required: `evaluateInteraction`
in `ar-xr.html` returns early when a rule has no proximity.

## Verified

- `tests/test_dog_bone_xr_seed_contract.py` + combo rule tests: 8 passed.
- Dry-run against live DB inside a rolled-back transaction, executed twice: one row,
  tags `[dog001, bone001]`, count back to 0 after rollback.

## Pick up next

- Apply the migration to Supabase, then physical retest starting from DOG QR.
- Observed, out of scope: live `clay_cat_fish` proximity is 0.50 (20260921 hotfix not
  applied); elephant/panda/rabbit/tiger rules have NULL proximity, so the runtime never
  evaluates them.
