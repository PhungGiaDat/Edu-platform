---
name: 2026-08-17-p6a-hardcoded-table-retirement
description: "P6A complete: hardcoded _comboTable removed, InitComboTable removed, ComboDefinition class removed, 294/295 EditMode tests pass (11 tests removed with ComboDefinitionTests)"
metadata:
  type: project
---

# 2026-08-17 — P6A Hardcoded Combo Table Retirement

## What was done

### 1. Removed `_comboTable` field and `InitComboTable()`

Deleted:
- `private readonly Dictionary<(string, string), ComboDefinition> _comboTable`
- `InitComboTable()` call from `Awake()`
- `InitComboTable()` method body (3 hardcoded combo pairs + reverse pairs)

### 2. Removed hardcoded fallback block in `Update()`

Deleted the `_comboTable` lookup fallback that fired when `ResolveSemanticCombo` returned null. Now only semantic combo resolution runs.

### 3. Removed `TriggerCombo` hardcoded path

Rewrote `TriggerCombo` to use semantic resolution:
```csharp
// Reverse lookup qrId → arTag
var arTagA = _qrIdToArTag.TryGetValue(cardA, out var a) ? a : null;
var arTagB = _qrIdToArTag.TryGetValue(cardB, out var b) ? b : null;

if (!string.IsNullOrEmpty(arTagA) && !string.IsNullOrEmpty(arTagB)) {
    combo = ResolveSemanticCombo(cardA, cardB);
}
```

### 4. Added `_qrIdToArTag` reverse lookup

`RegisterArTag(arTag, qrId)` now populates both:
- `_arTagToQrId[arTag] = qrId` — for `ResolveSemanticCombo`
- `_qrIdToArTag[qrId] = arTag` — for `TriggerCombo` (RN passes qrIds, not arTags)

### 5. Added `_qrIdToArTag.Clear()` to `ClearSemanticState()`

### 6. Removed `ComboDefinition` private class

Was only used by the hardcoded table. `SemanticComboDefinition` remains as the single combo DTO type.

### 7. Deleted `ComboDefinitionTests.cs`

11 tests for the now-removed `ComboDefinition` class. No longer applicable.

## Test results

| Suite | Result |
|-------|--------|
| Full EditMode suite | **294/295 passed, 0 failed** (11 tests removed with ComboDefinitionTests) |

## Phase status

- P3: ✅ Verified
- P4: ✅ Verified
- P5: ✅ Verified
- P6: ✅ Verified (infrastructure wired)
- **P6A: ✅ Complete** — hardcoded table fully retired
- P7: ❌ Not started (combo animation from backend data)

## Full semantic combo pipeline (P6+)

```
RN payload (related_combos JSON)
  └─ CardTrackingRequest.GetRelatedCombos(json)
       └─ ComboManager.LoadSemanticCombos(relatedCombos)
            └─ _semanticCombos[comboId] = combo (active only)

Card registered (arTag + qrId)
  └─ ComboManager.RegisterArTag(arTag, qrId)
       ├─ _arTagToQrId[arTag] = qrId
       └─ _qrIdToArTag[qrId] = arTag

Proximity detected (qrIdA, qrIdB)
  └─ ResolveSemanticCombo(qrIdA, qrIdB)
       ├─ for each combo: requiredTags → _arTagToQrId[tag] → qrId
       └─ if {qrIdA, qrIdB} ⊆ requiredQrIds → TriggerSemanticCombo

RN trigger (cardA, cardB as qrIds)
  └─ TriggerCombo(cardA, cardB)
       ├─ _qrIdToArTag reverse lookup
       └─ ResolveSemanticCombo(cardA, cardB)
```
