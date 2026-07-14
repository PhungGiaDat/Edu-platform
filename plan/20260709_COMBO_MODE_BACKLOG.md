# Multi-Flashcard Combo Mode Backlog

**Created:** 2026-07-09  
**Status:** Backlog  
**Related Work:** Commit `cf1b7d2` (fixed target order remapping issue)

---

## Summary

This document tracks pending improvements for the multi-flashcard combo mode feature. The core combo detection is functional (models correctly mapped to MindAR detection order after commit `cf1b7d2`), but several enhancements and investigations remain.

---

## Backlog Items

### BACKLOG-001: Multi-Card Target Switching

**Priority:** High  
**Status:** Pending

#### Description

When in combo mode, after the user scans 2 cards and the combo is detected, the user should be able to see individual card AR models (not just the combo scene). Currently the models are correctly mapped to MindAR indices, but there's no way to toggle back to individual view while keeping the combo mind file active.

#### Scope

- Add a toggle/UI mechanism to switch between combo scene view and individual card views within the same MindAR session
- Preserve the active combo session when switching views
- Ensure AR models load correctly for both views

#### Dependencies

- None (independent of BACKLOG-002)

#### Technical Notes

- The MindAR session can remain active while switching visibility of 3D models
- Consider using a state toggle (e.g., `viewMode: 'combo' | 'individual'`)
- Individual card views may need to remap to their original single-card mind file if separate models exist per card

---

### BACKLOG-002: `targetOrder` Index Mismatch Investigation

**Status: RESOLVED** (research complete — fix already applied, deprecate recommended)

### Root Cause (Confirmed)
`targetOrder` is **NOT derived from the `.mind` file programmatically**. It is a **developer-audited permutation** stored in MongoDB, established by physically placing each card in front of the camera. The only combo audited is `jungle_scene_v1` → `["jungle_marker_01", "elephant_marker_01"]` in `backend/database/migrations/backfill_ar_combination_target_order.py`.

MindAR assigns target indices based on image order in the **compiled** `.mind` file — there is no runtime API to query "which tag is at targetIndex 0?". The viewer sends models via numeric URL params (`model0`, `model1`) with no knowledge of tags. The mismatch between the manually-audited `targetOrder` and MindAR's file-internal order caused cross-loading.

### Fix Applied
Commit `cf1b7d2` already removed the `targetOrder`-based remapping from `LearnARV2.tsx`. `modelUrl`/`modelUrl2` now come directly from `scannedTarget0`/`scannedTarget1` — which reflect MindAR's native detection order.

### Recommendation: Deprecate `target_order`
- **No automatic derivation possible** — requires physical card testing per combo
- **Single point of failure** — human must update `AUDITED_TARGET_ORDERS` for every new combo
- **Current viewer doesn't need it** — `scannedTarget0`/`scannedTarget1` already reflect MindAR's detection order
- **If kept**: requires explicit write-once audit policy + validation that all combos have been audited before any feature uses it

### Full Research Report
See `research/20260709_TARGETORDER_INVESTIGATION.md`

---

## BACKLOG-003: Multi-Card Target Switching

**Priority:** High  
**Status:** Pending - Requires Investigation

#### Description

The `activeCombo.targetOrder` was removed from `LearnARV2.tsx` because it caused cross-loading of models onto wrong markers. Need to determine whether the combo API's `targetOrder` field actually represents MindAR's file-internal target index order, or if it's a different ordering scheme.

#### Investigation Tasks

1. **Inspect `combo_targets.mind` file structure**
   - Examine the mind file format to understand how target indices are assigned
   - Determine if there's a manifest or header that defines target ordering

2. **Check backend combo API response**
   - Review the `GET /api/combos/{id}` endpoint response
   - Document the exact contract of the `targetOrder` field
   - Determine what `targetOrder[i]` represents (MindAR index? DB insert order? UI order?)

3. **Document findings**
   - Create a technical reference explaining the targetOrder contract
   - Determine if `targetOrder` should be deprecated or corrected

#### Possible Outcomes

| Scenario | Resolution |
|----------|------------|
| `targetOrder` = MindAR internal index | Deprecate field; models must map to MindAR detection order directly |
| `targetOrder` = DB insertion order | Map to correct MindAR indices by finding each tag in the mind file |
| `targetOrder` = UI display order | Coordinate with frontend team on expected behavior |

#### Dependencies

- None (investigation can proceed independently)

#### Deliverables

- Technical note documenting the `targetOrder` contract
- Recommendation: deprecate or correct

---

### BACKLOG-003: Multi-Flashcard Independent Mode Stability

**Priority:** Medium  
**Status:** Pending - Validation Needed

#### Description

Continue validating that the merged mind buffer flow (the `isMultiViewer` path) works correctly for all scan sequences. The current implementation supports combo detection, but edge cases may still exist.

#### Scope

- Integration testing of multi-card scanning with various card orderings
- Verify that `onTargetFound` callbacks fire correctly for all detected targets
- Test rapid sequential scanning (scan card A → scan card B quickly)
- Test out-of-order scanning (scan card B before card A)
- Verify that mind file loads consistently across sessions

#### Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Scan A then B | Both models visible, combo detected |
| Scan B then A | Both models visible, combo detected (order-independent) |
| Scan A, remove, scan B | Single model visible until B detected |
| Rapid scan (A→B within 1s) | Both models eventually visible, combo detected |
| Scan A, close app, reopen | Re-detection triggers combo |

#### Dependencies

- BACKLOG-001 (UI toggle needed for manual testing)

#### Notes

- Consider adding debug logging to track scan sequences
- The `isMultiViewer` path uses a merged mind buffer — verify buffer is constructed correctly

---

## Priority Summary

| Priority | Item | ID |
|----------|------|-----|
| High | Multi-Card Target Switching | BACKLOG-001 |
| High | targetOrder Index Mismatch Investigation | BACKLOG-002 |
| Medium | Independent Mode Stability | BACKLOG-003 |

---

## Implementation Notes

### Already Fixed (Commit cf1b7d2)

- Removed the `activeCombo.targetOrder` remapping from `comboTarget0`/`comboTarget1` in `LearnARV2.tsx`
- Models now stay mapped to MindAR's detection order (index 0 = first card scanned = first marker in mind file)
- This fix ensures consistent model loading regardless of scan order

### Key Files

- `frontend/src/components/ar/LearnARV2.tsx` — Main AR component with combo logic
- `backend/app/api/combos.py` — Backend combo API (for targetOrder contract investigation)

---

## Next Steps

1. **Immediate:** Complete BACKLOG-002 investigation to understand targetOrder semantics
2. **Short-term:** Implement BACKLOG-001 (UI toggle for combo/individual views)
3. **Medium-term:** Complete BACKLOG-003 integration testing
4. **Ongoing:** Monitor combo mode stability in production
