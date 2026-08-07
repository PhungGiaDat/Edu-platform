# Task 7: Pre-create Catalog Anchors and Bind Revisioned Slots

## Plan Reference
`docs/superpowers/plans/2026-08-06-shared-mind-persistent-viewer.md` — Task 7

## Files to Create
- `frontend-web/public/static/ar-assets/js/ar-target-registry.js`
- `frontend-web/src/__tests__/arTargetRegistry.test.ts`

## Files to Modify
- `frontend-web/public/ar-viewer.html`
- `frontend-web/public/static/ar-assets/js/ar-viewer.js`
- `frontend-web/src/__tests__/arViewerBootstrapContract.test.ts` (add SET_ACTIVE_TARGETS + BEGIN_ADD_CARD_SCAN assertions)

## Goal
Pre-create every catalog anchor before MindAR starts, bind slot content via revisioned SET_ACTIVE_TARGETS messages, and wire Add card QR scanning through the viewer scanner.

## Interfaces

### ar-target-registry.js

Expose `create({catalogId, targetCount})` returning a registry with:

```js
registry.apply(snapshot)   // validates + commits revisioned target set
registry.getByMindIndex(n)  // returns { slotIndex, arTag, modelUrl, word, ... }
registry.getBySlot(i)      // returns { mindTargetIndex, arTag, modelUrl, word, ... }
registry.getByArTag(tag)   // returns { slotIndex, mindTargetIndex, ... }
```

Validation rules:
- catalogId must match
- revision must be strictly increasing (reject stale)
- targetCount 1..2
- unique slotIndex values (no duplicates)
- unique mindTargetIndex values (no duplicates)
- mindTargetIndex in [0, targetCount-1]
- non-empty arTag and modelUrl
- Throws `'ACTIVE_TARGETS_INVALID'` on bad input, `'ACTIVE_TARGETS_STALE'` on old revision

### ensureCatalogAnchors(targetCount)

Before MindAR starts, for each `mindTargetIndex` in `[0, targetCount)`:
- Create `<a-entity id="mind-target-${mindTargetIndex}" mindar-image-target="targetIndex: ${mindTargetIndex}" visible="true">` if not exists
- Append to scene
- Remove hardcoded `<a-entity id="target-0">` and `<a-entity id="target-1">` from the scene template in `ar-viewer.html`

### applyActiveTargets(payload)

Called on `SET_ACTIVE_TARGETS` message:
1. Validate through registry.apply()
2. Load every required GLB model
3. Place `<a-gltf-model>` with id `slot-model-${slotIndex}` under `mind-target-${mindTargetIndex}`
4. Remove slot content not in new snapshot
5. Emit `ACTIVE_TARGETS_APPLIED` only after all model-loaded promises resolve
6. On asset error: emit `ACTIVE_TARGETS_REJECTED` with `MODEL_LOAD_ERROR` — do NOT call `showImageFallbackForTarget`

### Anchor event → identity

When MindAR fires targetFound for index `n`:
1. Look up active registry entry by mindTargetIndex
2. Ignore if no active slot on that anchor
3. Send `TARGET_FOUND` with `{ slotIndex, mindTargetIndex, targetIndex, arTag }`
4. Same for `TARGET_LOST` and `MODEL_CLICKED`

### Add card scanner wiring

In `handleParentMessage`:
- On `BEGIN_ADD_CARD_SCAN`: create scanner with `getVideo: () => document.querySelector('video')`, `decode: globalThis.jsQR`, `emit: sendToParent`
- On `CANCEL_ADD_CARD_SCAN`: cancel the scanner
- Do NOT change MindAR running state

## Test Cases

```ts
it('maps scan slots independently from MindAR indices', () => {
  const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
  const result = registry.apply({ catalogId: 'animals-v2', revision: 1, targets: [
    { slotIndex: 0, mindTargetIndex: 3, arTag: 'elephant_marker_01', modelUrl: '/elephant.glb', word: 'elephant' },
    { slotIndex: 1, mindTargetIndex: 0, arTag: 'cat_marker_01', modelUrl: '/cat.glb', word: 'cat' },
  ]});
  expect(result.byMindTargetIndex.get(3).slotIndex).toBe(0);
  expect(result.byMindTargetIndex.get(0).slotIndex).toBe(1);
});

it('rejects duplicate slots', () => { expect(() => registry.apply({...slotIndex: 0, slotIndex: 0})).toThrow('ACTIVE_TARGETS_INVALID'); });
it('rejects duplicate mindTargetIndex', () => { ... });
it('rejects out-of-range index', () => { ... });
it('rejects catalog mismatch', () => { ... });
it('rejects stale revision', () => { expect(() => registry.apply({revision: 1})).toThrow('ACTIVE_TARGETS_STALE'); });
```

## Bootstrap contract assertions (add to existing test)

```ts
expect(viewerJs).toContain("case 'SET_ACTIVE_TARGETS'");
expect(viewerJs).toContain("case 'BEGIN_ADD_CARD_SCAN'");
expect(viewerJs).not.toContain("showImageFallbackForTarget(0, 'model-0-asset-error')");
expect(viewerJs).not.toContain("showImageFallbackForTarget(1, 'model-1-asset-error')");
```

## From Earlier Tasks (already implemented)
- `jsQR-1.4.0.min.js` vendored at `/static/vendor/jsQR-1.4.0.min.js`
- `ar-add-card-scanner.js` exists at `/static/ar-assets/js/ar-add-card-scanner.js` with `window.ARAddCardScanner.create(options)`
- `activeTargetRevision.ts` exports `requestRevision`, `acknowledgeRevision`, `rejectRevision`, `initialRevisionState`
- `ARMessages.ts` defines: `SET_ACTIVE_TARGETS`, `ACTIVE_TARGETS_APPLIED`, `ACTIVE_TARGETS_REJECTED`, `BEGIN_ADD_CARD_SCAN`, `CANCEL_ADD_CARD_SCAN`, `ADD_CARD_SCAN_STARTED`, `ADD_CARD_SCAN_TIMEOUT`
- A-Frame 1.4.2 and MindAR 1.2.5 loaded locally (not CDN) in bootstrap

## Success Criteria
- `ar-target-registry.js` passes `node --check`
- `ar-viewer.js` passes `node --check`
- `arTargetRegistry.test.ts` all tests pass
- `arViewerBootstrapContract.test.ts` all tests pass
- Pre-create anchors called before MindAR init in bootstrap
- No hardcoded target-0/target-1 anchors remain
