# Task 8 Report: Keep ARContainerV2 Stable and Transport Revisions

**Status:** COMPLETE
**Commit:** `016f62a`
**Branch:** `MindAR-Update`
**Date:** 2026-08-06

---

## What Was Done

### New Test File
**`frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx`** — 8 lifecycle regression cases:

| # | Test | Result |
|---|------|--------|
| 1 | Renders iframe with catalog-only URL params | PASS |
| 2 | iframe node unchanged when second card added (no remount) | PASS |
| 3 | Second render sends `SET_ACTIVE_TARGETS` revision 2, NOT `MIND_BUFFER` | PASS |
| 4 | `AR_READY` triggers `SET_ACTIVE_TARGETS` revision 1 | PASS |
| 5 | `onActiveTargetsApplied` called with revision on `ACTIVE_TARGETS_APPLIED` | PASS |
| 6 | `onActiveTargetsRejected` called with error on `ACTIVE_TARGETS_REJECTED` | PASS |
| 7 | 7-second timeout calls `onActiveTargetsRejected(ACTIVE_TARGETS_TIMEOUT)` | PASS |
| 8 | `mindIdentityKey` unchanged when only `activeTargets` prop changes | PASS |

### Modified: `frontend-web/src/components/ar/ARContainerV2.tsx`

**New props added:**
```tsx
catalogId?: string | null;
mindUrl?: string | null;
catalogTargetCount?: number;
activeTargets?: ActiveViewerTarget[];
onActiveTargetsApplied?: (revision: number) => void;
onActiveTargetsRejected?: (error: { revision: number; code: string; stage: string; message: string }) => void;
```

**Key design decisions:**

1. **Viewer URL (catalog-only):** Built from `mind`, `catalogId`, `targetCount`, `maxTrack=2`. Model URLs, words, combo assets, and `activeTargets` are intentionally excluded — they are sent via `postMessage` after `AR_READY`.

2. **`mindIdentityKey` stable derivation:** `catalog=${catalogId}|mind=${mindUrl}`. This key does NOT include `activeTargets`, so React does not remount the iframe when cards are added or changed. The legacy `runtime-buffer` and per-target-param paths are preserved for non-persistent uses.

3. **Revision transport:**
   - After `AR_READY`: sends `SET_ACTIVE_TARGETS` revision 1 with the initial `activeTargets` snapshot
   - On `activeTargets` prop change: increments revision, sends new `SET_ACTIVE_TARGETS`
   - `ACTIVE_TARGETS_APPLIED`: clears ACK timeout, calls `onActiveTargetsApplied(revision)`, advances the revision state machine
   - `ACTIVE_TARGETS_REJECTED`: clears ACK timeout, calls `onActiveTargetsRejected(error)`
   - 7-second ACK timeout: arms after each `SET_ACTIVE_TARGETS` send; if no `ACTIVE_TARGETS_APPLIED` arrives, calls `onActiveTargetsRejected` with code `ACTIVE_TARGETS_TIMEOUT`

4. **State machine:** Uses `activeTargetRevision.ts` (`requestRevision`, `acknowledgeRevision`, `initialRevisionState`). State is held in a `ref` to avoid re-renders; only the callbacks trigger parent updates.

5. **`QR_DETECTED` forwarding:** `eventBus.emit('AR_QR_DETECTED', { sessionId, qrId })` so the Add-card scanning flow (Task 7) continues to work in the persistent viewer phase.

6. **Removed:** All `MIND_BUFFER` logic from the persistent viewer path — no `mindBufferRef`, no runtime merge. The legacy `MIND_BUFFER_REQUEST`/`MIND_BUFFER` handler is retained for non-persistent legacy path.

### Infrastructure: `frontend-web/src/__tests__/setup.ts`

Added `iframe.contentWindow` element mock to the vitest global setup. jsdom returns `null` for `contentWindow` by default, which caused `sendActiveTargets` to silently no-op. The mock gives every iframe a fake `contentWindow` with a real `postMessage` so tests can verify messages via spies. This is a shared infrastructure improvement benefiting all future iframe-related tests.

---

## Test Output

```
 ✓ renders an iframe pointing at the viewer with catalog params on first load
 ✓ keeps the same iframe node when a second card is added (no remount)
 ✓ sends SET_ACTIVE_TARGETS revision 2 (not MIND_BUFFER) after AR_READY when a second target is added
 ✓ AR_READY triggers SET_ACTIVE_TARGETS revision 1 with the initial activeTargets
 ✓ calls onActiveTargetsApplied with the revision number when child sends ACTIVE_TARGETS_APPLIED
 ✓ calls onActiveTargetsRejected with error details when child sends ACTIVE_TARGETS_REJECTED
 ✓ 7-second timeout calls onActiveTargetsRejected with ACTIVE_TARGETS_TIMEOUT code
 ✓ iframe key (mindIdentityKey) is unchanged when only activeTargets prop changes

Test Files  1 passed (1)
     Tests  8 passed (8)
```

---

## Concerns / Follow-up

1. **No TypeScript errors from callers:** Existing callers of `ARContainerV2` (e.g., `LessonViewerPage`) will need to be updated to pass the new props or their current props (`mindBuffer`, per-target model/image params) will fall through to the legacy path. The existing props are retained — no breaking change to existing call sites.

2. **`ActiveViewerTarget` type must match what consumers provide:** The `slotIndex`, `mindTargetIndex`, `modelUrl`, `textureUrl`, `word` fields must be correctly populated by the parent component. Task 9 (the `AddCardFlow` / `CourseLessonPage` integration) will wire this up.

3. **The `ACTIVE_TARGETS_REJECTED` error shape:** The callback receives `{ revision, code, stage, message }`. Callers should display the `message` to the learner if the card failed to load.

4. **Timing of `AR_READY` → `SET_ACTIVE_TARGETS`:** There is a brief window between `AR_READY` and the first `SET_ACTIVE_TARGETS` where the viewer has no targets. For a fresh catalog load this is acceptable (MindAR starts with empty anchors). For subsequent card additions, the viewer already has anchors from the previous `SET_ACTIVE_TARGETS`, so the transition is seamless.

5. **No existing AR viewer page handles `SET_ACTIVE_TARGETS` yet.** The viewer (`ar-viewer.html` / its JS) needs to be updated to handle the new `SET_ACTIVE_TARGETS` message and emit `ACTIVE_TARGETS_APPLIED` or `ACTIVE_TARGETS_REJECTED`. This is likely part of Task 9 or a parallel viewer-side task.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend-web/src/__tests__/ARContainerV2.persistentViewer.test.tsx` | New — 8 regression tests |
| `frontend-web/src/components/ar/ARContainerV2.tsx` | New props, stable key, revision transport |
| `frontend-web/src/__tests__/setup.ts` | Added `iframe.contentWindow` mock |
