# Task 10: Lock Combo Semantics to AR Tags

## Plan Reference
`docs/superpowers/plans/2026-08-06-shared-mind-persistent-viewer.md` — Task 10

## Files to Create
- `frontend-web/src/__tests__/arComboTagIdentity.test.ts`

## Files to Modify
- `frontend-web/src/pages/LearnARV2.tsx`
- `frontend-web/src/hooks/useMultiFlashcard.ts`

## Goal
Combo activation based on tag sets, independent of scan order and MindAR indices. Never select `combo_mind_url` or `target_order` for tracking.

## Key Changes

### Pure helpers in useMultiFlashcard.ts
```ts
export function sameTagSet(left: string[], right: string[]): boolean {
  return left.length === right.length && [...left].sort().every((tag, index) => tag === [...right].sort()[index]);
}

export function resolveComboByTags(targets: ActiveViewerTarget[], combo: ComboData): ComboData | null {
  return sameTagSet(targets.map((target) => target.arTag), combo.requiredTags) ? combo : null;
}
```

Only acknowledged targets participate. Activating/deactivating combo content sends viewer commands but never changes `mindUrl`, catalog ID, anchor mapping, or iframe key.

## Test Cases
```ts
it.each([
  ['elephant-first', [elephantSlot0, jungleSlot1]],
  ['jungle-first', [jungleSlot0, elephantSlot1]],
])('activates the same combo in %s order', (_label, targets) => {
  expect(resolveComboByTags(targets, jungleCombo)?.comboId).toBe('jungle_scene_v1');
});

it('does not use combo_mind_url or target_order for tracking', () => {
  const result = buildComboDisplayState([elephantSlot0, jungleSlot1], jungleCombo);
  expect(result).not.toHaveProperty('mindUrl');
  expect(result).not.toHaveProperty('targetOrder');
});
```

## Success Criteria
- `arComboTagIdentity.test.ts` pass
- `ARContainerV2.persistentViewer.test.tsx` pass
- Viewer URL stays constant through combo activation
