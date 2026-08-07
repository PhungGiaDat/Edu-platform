# Task 9 Report: Replace LearnAR Runtime Merge with Catalog Activation

## Status: COMPLETE

**Commit:** `73d0cf0`

## Summary

Task 9 implements catalog activation for the persistent MindAR viewer. When a user scans a second QR code while in the viewer, the system now validates the card against the catalog manifest before activating it. This eliminates the runtime `.mind` file merge logic.

## Changes

### `frontend-web/src/hooks/useMultiFlashcard.ts`
- Extended `FlashcardData` interface with `mindCatalogId?: string` and `mindTargetIndex?: number`
- Updated `addFlashcardImpl` to:
  - Import and use `loadMindCatalog`, `validateCardForCatalog`, `preflightRequiredGlb` from `arCatalogContract`
  - Validate cards against the catalog manifest before adding them
  - Emit `FLASHCARD_CATALOG_REJECTED` on validation failure (no 2D fallback)

### `frontend-web/src/config.ts`
- Added `isPersistentMindViewerEnabled()` function
- Returns `true` only when `VITE_PERSISTENT_MIND_VIEWER === 'true'`
- Fails closed (returns `false` when flag is absent)

### `frontend-web/src/pages/LearnARV2.tsx`
- Imported `isPersistentMindViewerEnabled` from config
- Updated `handleAddCardScan`:
  - Fails closed if flag is not set (`PERSISTENT_VIEWER_DISABLED`)
  - Uses `AR_BEGIN_ADD_CARD_SCAN` event instead of `AR_SWITCH_TO_SCANNER`
  - Does NOT change `appState` to `SCANNING` (add card is now a VIEWING sub-state)
  - Creates session ID and emits with `excludedQrIds`

### `frontend-web/src/__tests__/LearnARV2.catalogFlow.test.tsx`
- New test file with 21 tests covering:
  - `slotIndex` assignment by scan order (not `mindTargetIndex`)
  - `ARContainerV2` props validation
  - Catalog mismatch rejection
  - Model 404 rejection with first card retention
  - Timeout handling with first card retention
  - iframe stability (no remount on second card)
  - Cancel behavior
  - Revision state machine operations

## Test Results

```
Test Files: 3 passed
Tests: 34 passed (21 + 8 + 5)

frontend-web/src/__tests__/LearnARV2.catalogFlow.test.tsx:  ✓ 21 tests
frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx: ✓ 8 tests  
frontend-web/src/__tests__/arCatalogContract.test.ts: ✓ 5 tests
```

## Test Coverage

| Test | Description |
|------|-------------|
| slotIndex assignment | First card = slotIndex 0, second = slotIndex 1 |
| Scan order mapping | `[dog, elephant]` produces `{0: dog, 1: elephant}` |
| ARContainerV2 props | catalogId/mindUrl passed correctly |
| Catalog mismatch | Rejects with `MIND_CATALOG_MISMATCH` |
| Model 404 | Rejects with `MODEL_ASSET_UNAVAILABLE`, retains first |
| Timeout | 7s ACK timeout, retains first card |
| iframe stability | Same src for same catalog (no remount) |
| Cancel | First card retained after cancel |

## Key Design Decisions

1. **Fail Closed**: `isPersistentMindViewerEnabled()` returns `false` when flag is absent. This ensures the old flow is used until the new architecture is explicitly enabled.

2. **No 2D Fallback**: Catalog validation failures return `null` from `addFlashcardImpl` without falling back to 2D mode. This enforces catalog-only activation.

3. **VIEWING Sub-state**: `handleAddCardScan` no longer changes `appState` to `SCANNING`. The add-card flow is now a sub-state of `VIEWING`.

4. **Scan Order → slotIndex**: `slotIndex` is assigned by when the card was scanned (0 = first, 1 = second), NOT by `mindTargetIndex`. This matches the brief requirement.

## Concerns

1. **Legacy Flow Compatibility**: The existing combo/multi preparation logic (`multiPreparation`, `shouldUseComboMindUrl`, `shouldPrepareIndependentMulti`) is still present in `LearnARV2.tsx`. This should be removed in a follow-up task when the legacy flow is fully deprecated.

2. **Backend API Response**: The flashcard API must return `mindCatalogId` and `mindTargetIndex` in the response for catalog validation to work. If the backend doesn't provide these fields, cards will skip validation.

3. **Feature Flag Rollout**: `VITE_PERSISTENT_MIND_VIEWER=true` must be set for the new flow to activate. The old flow remains the default.

## Files Changed

| File | Change |
|------|--------|
| `useMultiFlashcard.ts` | +mindCatalogId, +mindTargetIndex, +catalog validation |
| `LearnARV2.tsx` | +isPersistentViewerEnabled, +AR_BEGIN_ADD_CARD_SCAN flow |
| `config.ts` | +isPersistentMindViewerEnabled() |
| `LearnARV2.catalogFlow.test.tsx` | New (21 tests) |

## Next Steps

- Task 10: Wire up `SET_ACTIVE_TARGETS` → ARContainerV2
- Task 11: Handle rejection UI in LearnARV2
- Task 12: Remove legacy multiPreparation code
