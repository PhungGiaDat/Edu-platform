# Task 8: Keep ARContainerV2 Stable and Transport Revisions

## Plan Reference
`docs/superpowers/plans/2026-08-06-shared-mind-persistent-viewer.md` — Task 8

## Files to Create
- `frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx`

## Files to Modify
- `frontend-web/src/components/ar/ARContainerV2.tsx`

## Goal
Replace model query parameters with catalog-only viewer identity. Keep iframe stable across card additions. Transport revisions after AR_READY and on active-target changes.

## Interfaces

### New ARContainerV2 Props
```tsx
interface ARContainerV2Props {
  catalogId?: string | null;
  mindUrl?: string | null;
  catalogTargetCount?: number;
  activeTargets?: ActiveViewerTarget[];
  onActiveTargetsApplied?: (revision: number) => void;
  onActiveTargetsRejected?: (error: { revision: number; code: string; stage: string; message: string }) => void;
  // retain existing non-catalog callbacks
}
```

### Viewer URL construction
Build URL only from: `mind`, `catalogId`, `targetCount`, `maxTrack=2`, debug flags.
Set `mindIdentityKey` to `catalogId|mindUrl`.
Model URLs, words, combo assets, active count, revisions must NOT affect the key or URL.

### Revision transport
1. After viewer emits `AR_READY`, send the latest desired snapshot via `SET_ACTIVE_TARGETS`
2. On prop changes, request the next revision and send to the same iframe
3. Arm a 7-second ACK timeout; on timeout call rejection with `ACTIVE_TARGETS_TIMEOUT` while preserving last acknowledged set
4. Store revision state in a ref/reducer

### Viewer scanner messages
Accept `QR_DETECTED` from the active viewer while phase is `VIEWING` and Add card scanning is active:
```tsx
eventBus.on('AR_QR_DETECTED' as any, ({ sessionId, qrId }) =>
  handleQRDetected(qrId, sessionId));
```

## Test Cases

```tsx
it('does not remount or change viewer src when the second target is added', async () => {
  const first = [elephantTarget];
  const view = render(<ARContainerV2 ... initialPhase="VIEWING" catalogId="animals-v2" mindUrl={mindUrl} catalogTargetCount={2} activeTargets={first} />);
  const iframeBefore = view.container.querySelector('iframe')!;
  const srcBefore = iframeBefore.getAttribute('src');
  dispatchViewerMessage(iframeBefore, 'AR_READY', { targetCount: 2, catalogId: 'animals-v2' });
  view.rerender(<ARContainerV2 ... activeTargets={[elephantTarget, shibaTarget]} />);
  const iframeAfter = view.container.querySelector('iframe')!;
  expect(iframeAfter).toBe(iframeBefore);
  expect(iframeAfter.getAttribute('src')).toBe(srcBefore);
});
```

Assert: second render sends `SET_ACTIVE_TARGETS` revision `2`, not `MIND_BUFFER`.

## From Earlier Tasks
- `ARMessages.ts` defines: `SET_ACTIVE_TARGETS`, `ACTIVE_TARGETS_APPLIED`, `ACTIVE_TARGETS_REJECTED`, `QR_DETECTED`
- `activeTargetRevision.ts` exports: `requestRevision`, `acknowledgeRevision`, `initialRevisionState`
- Task 7: `ar-target-registry.js` will expose registry on window

## Success Criteria
- `ARContainerV2.persistentViewer.test.tsx` all tests pass
- iframe node and URL remain identical across card addition
- No `MIND_BUFFER` props sent in new flow
