# Task 9: Replace LearnAR Runtime Merge with Catalog Activation

## Plan Reference
`docs/superpowers/plans/2026-08-06-shared-mind-persistent-viewer.md` — Task 9

## Files to Create
- `frontend-web/src/__tests__/LearnARV2.catalogFlow.test.tsx`

## Files to Modify
- `frontend-web/src/hooks/useMultiFlashcard.ts`
- `frontend-web/src/pages/LearnARV2.tsx`
- `frontend-web/src/components/ar/ARContainerV2.tsx`
- `frontend-web/src/config.ts`

## Files to Delete (after all imports removed)
- `frontend-web/src/utils/mergeMindTargets.ts`
- `frontend-web/src/utils/mindTargetMerge.test.ts`

## Goal
Replace runtime merge and combo mind selection with catalog activation. Add card becomes a VIEWING sub-state. No automatic 2D fallback.

## Key Changes

### useMultiFlashcard.ts
Add to FlashcardData:
```ts
mindCatalogId: string;
mindTargetIndex: number;
```

In `addFlashcardImpl`: reject absent catalog fields, load/validate manifest, preflight GLB before adding card. Emit `FLASHCARD_CATALOG_REJECTED` on failure.

### LearnARV2.tsx
Replace `handleAddCardScan`:
```tsx
const handleAddCardScan = useCallback(() => {
  const sessionId = crypto.randomUUID();
  addCardScanSessionRef.current = sessionId;
  setIsAddingCard(true);
  setAddCardStatus('scanning');
  eventBus.emit('AR_BEGIN_ADD_CARD_SCAN' as any, {
    sessionId,
    excludedQrIds: Array.from(detectedFlashcards.keys()),
  });
}, [detectedFlashcards]);
```
Do NOT call `setAppState('SCANNING')` or `AR_SWITCH_TO_SCANNER`. Cancellation emits `AR_CANCEL_ADD_CARD_SCAN` and leaves `appState` as `VIEWING`.

### Derive active targets with independent identities
```ts
const activeTargets: ActiveViewerTarget[] = scannedTargets.map((target, slotIndex) => ({
  slotIndex: slotIndex as 0 | 1,
  mindTargetIndex: target.mindTargetIndex,
  arTag: target.arTag,
  modelUrl: target.model3dUrl,
  textureUrl: target.textureUrl,
  word: target.word,
}));
```

### Remove obsolete paths
Delete: `multiPreparation`, runtime fetch/merge/import, `mindBufferRef`, `MIND_BUFFER` props and handlers in ARContainerV2, `shouldUseComboMindUrl`, viewer selection by `combo_mind_url`, target ordering by `target_order`.

### Feature flag
In `frontend-web/src/config.ts`:
```ts
export function isPersistentMindViewerEnabled(): boolean {
  return import.meta.env.VITE_PERSISTENT_MIND_VIEWER === 'true';
}
```
LearnARV2 must fail closed with `PERSISTENT_VIEWER_DISABLED` when flag absent.

## Test Cases
```tsx
it.each([
  [['ele123', 'dog123'], [
    { slotIndex: 0, arTag: 'elephant_marker_01', mindTargetIndex: 0 },
    { slotIndex: 1, arTag: 'shiba_marker_01', mindTargetIndex: 1 },
  ]],
  [['dog123', 'ele123'], [
    { slotIndex: 0, arTag: 'shiba_marker_01', mindTargetIndex: 1 },
    { slotIndex: 1, arTag: 'elephant_marker_01', mindTargetIndex: 0 },
  ]],
])('keeps scan slots separate from catalog indices', async (qrIds, expected) => {
  const result = await runCatalogFlow(qrIds);
  expect(result.activeTargets.map(...)).toEqual(expected);
  expect(result.viewerSrcChangesAfterFirstCard).toBe(0);
});
```

## Success Criteria
- `LearnARV2.catalogFlow.test.tsx` pass in both scan orders
- `ARContainerV2.persistentViewer.test.tsx` pass
- `arCatalogContract.test.ts` pass
- No runtime merge in new flow
- Feature flag gates new architecture
