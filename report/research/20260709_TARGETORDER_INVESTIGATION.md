# Research Report: `activeCombo.targetOrder` Index Mismatch — BACKLOG-002

**Date:** 2026-07-09
**Task:** BACKLOG-002 Investigation
**Status:** Complete

---

## Summary

The `targetOrder` field in the combo API is **NOT derived from MindAR's internal target index order** — it is a **developer-audited permutation of `required_tags`** stored in MongoDB, established via physical card-in-hand testing of the compiled `.mind` file. Because there is no programmatic link between the MongoDB `target_order` value and MindAR's actual internal indexing, using `targetOrder` to remap model URLs to MindAR target indices was inherently unreliable and caused cross-loading of 3D models onto wrong markers. The correct fix is to remove all `targetOrder`-based remapping logic and let MindAR's native detection order drive the model-to-marker mapping.

---

## Research Questions

1. How does MindAR assign target indices internally?
2. How is `targetOrder` populated in the combo API?
3. Is `targetOrder` reliable for remapping model URLs to MindAR target indices?
4. What should be done — deprecate or fix?

---

## Findings

### 1. How MindAR Assigns Target Indices

MindAR's `aframe-mindar-image-system` assigns target indices **based on the order images appear in the compiled `.mind` file**, not on any tag or filename convention. This is determined at `.mind` compilation time (via `marker training` / `aframe-mindar-image-image-target` compile step).

**Evidence — `ar-viewer.js` lines 81–87:**

```javascript
const targetConfigs = Array.from({ length: targetCount }, (_, index) => ({
    index,
    modelUrl: normalizeViewerAssetUrl(getIndexedParam('model', index)),
    imageUrl: normalizeViewerAssetUrl(getIndexedParam('image', index)),
    textureUrl: normalizeViewerAssetUrl(getIndexedParam('textureUrl', index)),
    word: getIndexedParam('word', index) || ''
}));
```

The viewer constructs `targetConfigs` with indices **0, 1, 2…** in order — these map directly to MindAR's `targetIndex`. The A-Frame entity attribute `mindar-image-target="targetIndex: ${target.index}"` (line 199) binds each DOM element to the corresponding MindAR internal target.

**MindAR events use `targetIndex` as reported by MindAR's internal order**, not any tag:

```javascript
target.addEventListener('targetFound', () => {
    activeTargets.set(index, { ... });  // index is the A-Frame/MindAR targetIndex
    sendToParent('TARGET_FOUND', { targetIndex: index, confidence: 1.0 });
});
```

**There is no API in MindAR to query "which tag is at targetIndex 0?"** The MindAR runtime only knows about numeric target indices. The only way to know which physical card corresponds to targetIndex 0 or 1 is to test with physical cards.

---

### 2. How `targetOrder` Is Populated

`targetOrder` is **NOT derived from the `.mind` file programmatically**. It is an **explicit, manually-audited ordering** stored in MongoDB, established by physically placing each card in front of the camera and observing which MindAR target index each card triggers.

**Evidence — `backend/database/migrations/backfill_ar_combination_target_order.py` lines 21–25:**

```python
# Physical test confirmed jungle => index 0 and elephant => index 1 for the
# hosted combo_targets.mind asset (the inverse of required_tags in MongoDB).
AUDITED_TARGET_ORDERS = {
    "jungle_scene_v1": ["jungle_marker_01", "elephant_marker_01"],
}
```

The comment says "the **inverse** of required_tags" — meaning the developer physically tested and found that the `.mind` file assigns:
- `jungle_marker_01` → MindAR targetIndex **0**
- `elephant_marker_01` → MindAR targetIndex **1**

Whereas `required_tags` in MongoDB was `["elephant_marker_01", "jungle_marker_01"]` (or similar, not the same order).

The migration script (`backfill_ar_combination_target_order.py`) applies this audited mapping to the MongoDB `target_order` field. It validates that the audited order is a valid permutation of `required_tags` but has **no programmatic connection to the `.mind` file itself**.

**Evidence — `backend/models/ar_combination.py` lines 23–26:**

```python
target_order: List[str] = Field(
    ...,
    description="AR tags in the exact order used to compile combo_mind_url",
)
```

The Pydantic model documents the **intended contract**: `target_order[i]` should equal the tag at MindAR's target index `i` in the compiled `.mind` file. However, this contract is only as good as the manual auditing.

---

### 3. Why `targetOrder` Was Unreliable for Remapping

The root cause of the cross-loading bug was a **logical mismatch** between how `targetOrder` was used and how MindAR actually works:

#### The Bug Pattern

`LearnARV2.tsx` lines 909–915 (before fix):

```typescript
const comboTarget0 = isComboViewer && activeCombo?.targetOrder?.[0]
    ? getFlashcardByTag(activeCombo.targetOrder[0])
    : scannedTarget0;

const comboTarget1 = isComboViewer && activeCombo?.targetOrder?.[1]
    ? getFlashcardByTag(activeCombo.targetOrder[1])
    : scannedTarget1;

const modelUrl = comboTarget0?.model3dUrl || arData?.targets?.[0]?.model_3d_url;
```

This assumed:
> `targetOrder[0]` = the tag at MindAR targetIndex 0 → therefore, look up that tag's model URL → that model belongs on MindAR targetIndex 0.

**This reasoning is correct in principle**, but it was applied to the **wrong data flow**:

- `getFlashcardByTag(tag)` returns the flashcard object for that tag (with its associated model URL)
- But the **viewer** sends models to MindAR target indices via **URL params** (`model0`, `model1`), not via the combo API
- The `comboTarget0` / `comboTarget1` values were then used to construct `modelUrl` / `modelUrl2`, which were passed as separate props to the viewer

**The disconnect**: The viewer (`ar-viewer.js`) creates `targetConfigs` from URL params `model0`, `model1`, `image0`, `image1` etc. It has **no knowledge of tags** — it only knows indices 0 and 1. The `targetOrder`-based lookup in `LearnARV2.tsx` was supposed to remap which flashcard's model URL goes to which index, but:

1. The `targetOrder` values were hardcoded for only **one combo** (`jungle_scene_v1`)
2. For any other combo, `target_order` in MongoDB was either `null` or unvalidated
3. The backend `combos.py` `_to_combo_response()` sanitizes `target_order` to `null` if it doesn't match `required_tags` exactly
4. This caused the remapping to be applied inconsistently or not at all, leading to the wrong model being assigned to the wrong index

**Evidence of backend sanitization — `backend/api/combos.py` lines 50–56:**

```python
if (
    not isinstance(target_order, list)
    or len(target_order) != len(required_tags)
    or len(set(target_order)) != len(target_order)
    or set(target_order) != set(required_tags)
):
    target_order = None
```

When `target_order` is `null` in the API response, `useMultiFlashcard.ts` falls back to the MULTI path:

```typescript
if (!hasValidTargetOrder || !targetOrder) {
    setState(prev => ({
        ...prev,
        activeCombo: null,
        comboMindUrl: null,
        mode: prev.detectedFlashcards.size >= 2 ? 'MULTI' : 'SINGLE',
        ...
    }));
}
```

---

### 4. The Current State

The problematic `targetOrder`-based remapping **has already been removed** from `LearnARV2.tsx`. The current code (lines 909–946) uses:

```typescript
const comboTarget0 = scannedTarget0;
const comboTarget1 = scannedTarget1;
const modelUrl = comboTarget0?.model3dUrl || arData?.targets?.[0]?.model_3d_url;
const modelUrl2 = comboTarget1?.model3dUrl || arData?.targets?.[1]?.model_3d_url;
```

The `orderedViewerTargets` / `viewerTargets` still use `targetOrder` to construct an array of targets for the viewer, but this is **no longer used to set `modelUrl`/`modelUrl2`** — those now come directly from `scannedTarget0`/`scannedTarget1`.

The `targetOrder` is still passed to the viewer as part of `activeCombo` (line 963), and `orderedViewerTargets` is built from it, but **the viewer itself does not use tag names at all** — it only uses numeric indices.

---

## Comparison: `required_tags` vs `target_order`

| Property | `required_tags` | `target_order` |
|---|---|---|
| **Source** | Set by frontend when combo is created | Physically audited, manually entered |
| **Meaning** | The tags that form the combo | Which tag is at which MindAR index |
| **Order significance** | No (it's a set, order is arbitrary) | Yes (maps to MindAR targetIndex 0, 1, …) |
| **Derived from .mind** | No | No (manual test) |
| **Can be computed automatically** | No | No (requires physical card testing) |
| **Used by frontend viewer** | No | Only indirectly via `orderedViewerTargets` |
| **Can cause cross-loading** | No | Yes, if mis-audited or misapplied |

---

## Recommendation

### Deprecate `target_order` entirely

**Rationale:**

1. **No automatic derivation possible** — there is no API to inspect a `.mind` file's internal target index order. Every new combo requires physical card testing.
2. **Single point of failure** — the entire system depends on a human remembering to update the `AUDITED_TARGET_ORDERS` dict and run the migration script after each new combo is added. This does not scale.
3. **Current code path doesn't need it** — the viewer uses MindAR's native index ordering. The `orderedViewerTargets` constructed from `targetOrder` is not consumed by the viewer in any way that affects model loading.
4. **MindAR index order IS accessible** — the QR/detection order from `scannedTarget0`/`scannedTarget1` (from `onQRDetected`) corresponds to MindAR's detection order because the cards are scanned sequentially. The first card detected → MindAR targetIndex 0, second card → targetIndex 1.

### Alternative: Keep `target_order` with a new contract

If `target_order` is needed for future features (e.g., combo visualization), it should be kept but with an explicit **write-once, physical-audit required** policy and a migration script that validates all combos have been audited before enabling any feature that depends on it.

### If fixing (not recommended):

To correctly fix `target_order` for all combos, you would need to either:
1. **Parse the `.mind` file** — MessagePack format; the `dataList` array order corresponds to MindAR target indices. But the `dataList` stores image data/hashes, not tag names, so you'd need to match by image content.
2. **Physical audit for every combo** — Run the card in front of the camera and record which MindAR target index fires for each tag. Update `AUDITED_TARGET_ORDERS` and run the migration.

Approach #1 is theoretically possible (the `.mind` format is MessagePack with a `dataList` array), but requires downloading and parsing the binary file and matching image hashes to stored image URLs.

---

## References

- `backend/database/migrations/backfill_ar_combination_target_order.py` — Physical audit migration script
- `backend/models/ar_combination.py` — Pydantic model, documents `target_order` contract
- `backend/api/combos.py` — API sanitization of `target_order` to `null` on mismatch
- `frontend-web/src/hooks/useMultiFlashcard.ts` lines 337–346 — `hasValidTargetOrder` validation
- `frontend-web/src/pages/LearnARV2.tsx` lines 909–946 — Current model URL assignment (no `targetOrder` remapping)
- `frontend-web/public/static/ar-assets/js/ar-viewer.js` lines 81–87 — `targetConfigs` from URL params only
- `frontend-web/public/static/ar-assets/js/ar-viewer.js` lines 819–833 — MindAR `targetFound` event with `targetIndex`
- `research/20260606_MINDAR_MULTI_TARGET_RESEARCH.md` — Previous research confirming `.mind` format and MessagePack structure
- `plan/20260709_COMBO_MODE_BACKLOG.md` — BACKLOG-002 task definition
