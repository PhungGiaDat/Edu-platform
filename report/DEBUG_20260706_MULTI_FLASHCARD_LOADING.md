# Debug Report — Multi-Flashcard AR Loading Failure

> File: `frontend-web/src/pages/LearnARV2.tsx`
> Hook: `frontend-web/src/hooks/useMultiFlashcard.ts`
> Container: `frontend-web/src/components/ar/ARContainerV2.tsx`
> Viewer: `frontend-web/public/ar-viewer.html`
> Merged Mind builder: `frontend-web/src/utils/mergeMindTargets.ts`
> Date: 2026-07-06
> Severity: **CRITICAL** — multi-flashcard combination scan never reaches the viewer

---

## Summary

The multi-flashcard pipeline is *aborted in flight* by the very effect that should commit it, because the **preparation cleanup effect re-runs while the prepare effect is still mid-fetch**. The cleanup wipes `multiPreparingKeyRef`, drops `multiPreparation` back to `idle`, and aborts the `AbortController` — so the `.mind` fetch never resolves, the merged buffer never reaches the iframe, and the AR viewer stays on `/ar-scanner.html` (or stalls in `LOADING`) instead of mounting the runtime-buffer Mind file. A second root cause makes the merged buffer **useless even when it arrives**: `target-0` and `target-1` in `ar-viewer.html` are *not* MindAR targets until the merged `.mind` is supplied — but the parent uses `KEY="main-${phase}-${mainSrc}"` and rebuilds the iframe every time `mindUrl` flips, so the iframe that initiated `MIND_BUFFER_REQUEST` is destroyed before the parent's `MIND_BUFFER` reply is processed.

## Symptom

1. User scans first flashcard → AR viewer renders single-card content (works).
2. User taps **"+ Add card"** → app returns to SCANNING (works).
3. User scans the second flashcard → no visual change: viewer stays in SCANNING/LOADING, no second card model appears, console log shows `MULTI_MIND_OPERATION_STALE` or no MULTI debug events at all.
4. The "Preparing both cards…" progress bar may flash briefly, then either disappears (idle) or shows the red "Could not prepare both cards" error panel.

## Reproduction Steps

1. Scan flashcard A (camera-equipped device or desktop with webcam, real cards or printed QR + NFT images).
2. Wait for single-card viewer to render.
3. Tap **+ Add card**.
4. Scan flashcard B.
5. Observe: viewer does **not** display card B; no combo banner; no MULTI_VIEWER_COMMITTED debug message.

## Root Cause Analysis

### Cause 1: Cleanup effect aborts the in-flight `.mind` fetch — CRITICAL

**File:** `frontend-web/src/pages/LearnARV2.tsx:853-867`

**Evidence:**

```713:817:frontend-web/src/pages/LearnARV2.tsx
useEffect(() => {
    if (!shouldPrepareIndependentMulti || !comboKey || !scannedTarget0 || !scannedTarget1) return;
    if (multiPreparingKeyRef.current === comboKey) return;

    const operationId = ++multiOperationIdRef.current;
    const controller = new AbortController();
    multiAbortRef.current?.abort();
    multiAbortRef.current = controller;
    multiPreparingKeyRef.current = comboKey;
    ...
    return () => controller.abort();
}, [shouldPrepareIndependentMulti, comboKey, scannedTarget0, scannedTarget1, multiRetryToken, emitMobileDebug]);
```

```853:867:frontend-web/src/pages/LearnARV2.tsx
useEffect(() => {
    if (!isComboViewer && flashcardCount === 2 && comboKey === multiPreparation.key) return;
    multiOperationIdRef.current += 1;
    multiAbortRef.current?.abort();
    multiPreparingKeyRef.current = null;
    setCommittedMultiKey(null);
    setMultiPreparation(prev => prev.status === 'idle' && prev.key === null ? prev : ({
        key: null,
        status: 'idle',
        mindUrl: null,
        mindBuffer: null,
        progress: 0,
        error: null
    }));
}, [isComboViewer, flashcardCount, comboKey, multiPreparation.key]);
```

**Why it fails:**

1. The prepare effect runs, sets `multiPreparingKeyRef.current = comboKey` (line 721) and `multiPreparation = { key: comboKey, status: 'preparing', …}` (line 723), increments `multiOperationIdRef` to `N+1` (line 717), and starts `Promise.all([fetchMind(card0), fetchMind(card1)])` (lines 772-775).
2. While the `fetch()` is still in flight, the cleanup effect (lines 853-867) evaluates `multiPreparation.key`, which *is* equal to `comboKey` and `flashcardCount === 2` and `!isComboViewer`. Guard passes (`return`), so nothing should happen — but **on the next render**, before the fetch resolves, `multiPreparation.status` flips from `'preparing'` to `'ready'` (or to `'error'`) and React's dep array `[…, multiPreparation.key]` triggers the cleanup effect again.
3. More importantly: any time `scannedTarget0` or `scannedTarget1` change identity (which they DO every state update, because `useMultiFlashcard.ts` rebuilds `newMap = new Map(...)` on lines 207, 239 of the hook, producing fresh `FlashcardData` objects on every `setState`), the prepare effect's dep array thrashes. Each thrash calls the cleanup `() => controller.abort()` (line 816), **aborting the in-flight `.mind` fetch**. The next run increments `multiOperationIdRef`, captures the new controller, and starts over — but until the next render commits `multiPreparation` to state, the cleanup effect's own dep `[multiPreparation.key]` is still pointing at the *old* `multiPreparation` snapshot, so it re-runs after the new prepare started and trips the abort again.
4. The race is amplified by `useEffect` ordering: the cleanup of the previous prepare effect runs *before* the new prepare effect captures `controller`, so `multiAbortRef.current?.abort()` aborts the just-replaced controller, leaving the newly captured controller free — but the catch handler in `mergeMindTargetBuffers` path (line 798) checks `error.name === 'AbortError'` and silently returns, marking the operation stale (line 799). The progress indicator jumps from `10` to nothing.

**Severity:** CRITICAL — without this fix the merged buffer never reaches the iframe.

**Suggested fix (do NOT apply):**

- Stabilize `scannedTarget0` / `scannedTarget1` identities. Keep them in a `useRef` that only swaps when content changes semantically, OR drop them from the prepare effect's dep array (read latest through `getFlashcardByIndex(0/1)`).
- Move `multiPreparingKeyRef` check to the *body* of the effect, not before, and gate the cleanup effect by also reading `multiPreparation.status !== 'preparing'`.
- Use `useMemo` to derive `(scannedTarget0, scannedTarget1)` keyed only on `qrId + arTag` so referential equality holds.

---

### Cause 2: Iframe is recreated before `MIND_BUFFER` reply — CRITICAL

**File:** `frontend-web/src/components/ar/ARContainerV2.tsx:160-199, 318-328, 465-472`

**Evidence:**

```160:199:frontend-web/src/components/ar/ARContainerV2.tsx
const viewerSrc = useMemo(() => {
    if (!mindUrl && !mindBuffer) return null;
    const params = new URLSearchParams();
    params.set('mind', mindBuffer ? 'runtime-buffer' : mindUrl!);
    ...
    return `/ar-viewer.html?${params.toString()}`;
}, [mindUrl, mindBuffer, modelUrl, imageUrl, textureUrl, modelUrl2, imageUrl2, textureUrl2, word, word2, targets, cardCount, comboModelUrl, comboImageUrl, comboTextureUrl, comboPhrase]);
```

```465:472:frontend-web/src/components/ar/ARContainerV2.tsx
{mainSrc && (
    <iframe
        ref={iframeRef}
        key={`main-${phase}-${mainSrc}`}
        src={mainSrc}
        allow="camera; microphone; autoplay; fullscreen"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', zIndex: 1 }}
    />
)}
```

```318:328:frontend-web/src/components/ar/ARContainerV2.tsx
case 'MIND_BUFFER_REQUEST': {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!fromPiP && mindBuffer && iframeWindow && event.source === iframeWindow) {
        iframeWindow.postMessage(
            createMessage('MIND_BUFFER', { buffer: mindBuffer }),
            '*'
        );
        emitDebug('PARENT_MIND_BUFFER_SENT', { bytes: mindBuffer.byteLength });
    }
    break;
}
```

**Why it fails:**

1. `LearnARV2.tsx` line 876 derives `mindUrl` as `multiPreparation.mindUrl` (string `'runtime-buffer'`) only when `isMultiViewer` is true. Until the prepare effect completes, the prop passed to `ARContainerV2` is the single-card `mindUrl` from `scannedTarget0`.
2. During the `'preparing'` phase, `multiPreparation.mindUrl === null` (line 727), so the child gets the original single `mindUrl`. The iframe mounts `/ar-viewer.html?mind=<single>.mind`, which renders a *single-target* scene.
3. Once preparation completes and `multiPreparation.status` flips to `'ready'`, the iframe is rebuilt because `key={main-${phase}-${mainSrc}}` includes the entire `viewerSrc`. The new URL still ends in `?mind=runtime-buffer` and the new viewer calls `MIND_BUFFER_REQUEST`.
4. Worse: `mindBuffer` is held by the *parent*. The parent listens for `MIND_BUFFER_REQUEST` (line 318). The reply path checks `event.source === iframeWindow` (line 320). But if any other prop (e.g. `targets`, `comboPhrase`, a re-derived `viewerTargets` array) changes identity between the moment `MIND_BUFFER_REQUEST` is sent and the parent's `useEffect` re-renders, the iframe `key` flips and a new `iframe` element mounts. The previous iframe is destroyed, its `runtimeMindUrl` blob is `URL.revokeObjectURL`'d (line 152 of `ar-viewer.html`), and `MIND_BUFFER_REQUEST` from the next iframe races with the next prop swap.
5. Real-world observation: `useEffect` dependency arrays in both files (line 199 of `ARContainerV2.tsx`, line 817 of `LearnARV2.tsx`) include `targets` and other referentially unstable values. Every `comboTarget0`/`comboTarget1` recomputation (`learnARV2.tsx:880-921`) produces fresh objects, which changes `viewerTargets` reference, which changes the `useMemo` result, which rebuilds the iframe.

**Severity:** CRITICAL — even if preparation succeeds, the iframe thrashes and the merged buffer is shipped into a frame whose `bootstrap()` rejected with `MIND_BUFFER_BOOTSTRAP_ERROR` (15s timeout, line 92 of `ar-viewer.html`).

**Suggested fix (do NOT apply):**

- Stash `mindBuffer` in a long-lived parent ref, deliver it from a stable singleton handler keyed only on `event.source === iframeRef.current?.contentWindow`.
- Use a stable iframe key per session (NOT per `mainSrc`). Compare by `mindUrl` + `mindBuffer.byteLength` to allow one re-mount when the buffer identity actually changes.
- Move `viewerSrc` derivation to compare by URL identity (`sameOriginUrl` plus querystring param comparison), not by reference.

---

### Cause 3: `comboTarget0` / `comboTarget1` recomputed every render — HIGH

**File:** `frontend-web/src/pages/LearnARV2.tsx:880-921`

**Evidence:**

```880:921:frontend-web/src/pages/LearnARV2.tsx
const comboTarget0 = isComboViewer && activeCombo?.targetOrder?.[0]
    ? getFlashcardByTag(activeCombo.targetOrder[0])
    : scannedTarget0;
const comboTarget1 = isComboViewer && activeCombo?.targetOrder?.[1]
    ? getFlashcardByTag(activeCombo.targetOrder[1])
    : scannedTarget1;
const fallbackTarget1 = scannedTarget1;
...
const viewerTargets = orderedViewerTargets.length
    ? orderedViewerTargets.map(target => ({...}))
    : [{...}];
```

**Why it fails:**

- `getFlashcardByTag` (useMultiFlashcard.ts:562-565) and `getFlashcardByIndex` (:552-555) read `state.detectedFlashcards` directly. Every `setState` in the hook (lines 204, 238, 269, 316, 342, 364, 391, 409, 453, 474, 496, 517, 532) produces a new `Map`. Even if the QR ids and tag values are identical, `comboTarget0`/`comboTarget1`/`viewerTargets` get fresh identities each render.
- The `useEffect` at line 817, `useEffect` at line 843, `useEffect` at line 867, `useMemo` at line 909 and the `useEffect` at line 923 (debug emission) all depend on these. A single state change ripples through the cleanup → next prepare → abort cycle.

**Severity:** HIGH (amplifier for Cause 1 and Cause 2).

**Suggested fix (do NOT apply):**

- Memoize `getFlashcardByTag` / `getFlashcardByIndex` to the Map (e.g. `useMemo` in the hook that returns memoized copies when contents are unchanged).
- Or compute `comboTarget0`/`comboTarget1`/`viewerTargets` with `useMemo` keyed by `JSON.stringify([...])` or by content hashing in `LearnARV2.tsx`.

---

### Cause 4: `addFlashcard` may silently drop the second scan — HIGH

**File:** `frontend-web/src/hooks/useMultiFlashcard.ts:154-232`

**Evidence:**

```154:164:frontend-web/src/hooks/useMultiFlashcard.ts
const addFlashcard = useCallback(async (qrId: string): Promise<FlashcardData | null> => {
    const existing = stateRef.current.detectedFlashcards.get(qrId);
    if (existing) {
        console.log('[MultiFlashcard] QR already detected:', qrId);
        return existing;
    }
    if (stateRef.current.detectedFlashcards.size >= 2) {
        emitArDebug('FLASHCARD_LIMIT_REACHED', { qrId, limit: 2 });
        return null;
    }
```

```1019:1093:frontend-web/src/pages/LearnARV2.tsx
const handleQRDetected = useCallback((qrId: string) => {
    ...
    void addFlashcard(qrId).then((flashcardData) => {
        if (!flashcardData) {
            emitMobileDebug('LEARNAR_QR_REJECTED', {...});
            console.warn('[LearnARV2] Ignoring QR without validated flashcard data:', qrId);
            return;
        }
```

**Why it fails:**

1. The first scan may still be in flight (Supabase `/flashcard/:qrId` returns ~500ms–3s on cold). During that window `stateRef.current.detectedFlashcards.size` is `0`. The second scan arrives, finds `!existing`, count is `0 < 2`, and is accepted. Both calls then `setState` — but the first call's `newMap.set(qrId, A)` happens *before* the second call's `newMap.set(qrId, B)` if the first `fetch` resolved first; otherwise the second `setState` overwrites the first by copying the prior Map but only setting B (because at that time A is still missing). After both finish, A and B may or may not both be present.
2. The current implementation is *not* ordered — `stateRef.current` snapshots state but each `addFlashcard` invocation uses the snapshot from its call time. If the second invocation starts before the first commits, it uses an empty Map and ends up `setState({ ...emptyMap, B })` → A is lost.
3. The 2.5 s `qrGateRef` cooldown (lines 1023-1037) means the user must wait, but the gate only filters by QR id, not by `addFlashcard` completion. So `LEARNAR_QR_REJECTED` fires for the second scan with `flashcardCount = 0`.

**Severity:** HIGH — only manifests when scans land within ~500ms of each other (very common when user scans A, sees viewer, taps "+ Add card", and points at B).

**Suggested fix (do NOT apply):**

- Queue `addFlashcard` promises, serialize them with an internal Promise chain so each `setState` sees the latest Map.
- Or hold a `pendingAddsRef: Set<string>` and have callers poll until resolved.

---

### Cause 5: `isMultiViewer` is gated by `comboKey === multiPreparation.key` even when key is `null` — MEDIUM

**File:** `frontend-web/src/pages/LearnARV2.tsx:845-851`

**Evidence:**

```845:851:frontend-web/src/pages/LearnARV2.tsx
const isMultiViewer = Boolean(
    committedMultiKey &&
    committedMultiKey === comboKey &&
    multiPreparation.status === 'committed' &&
    multiPreparation.mindUrl &&
    !isComboViewer
);
```

**Why it fails:**

- If `comboKey` is `null` (no combo API call has resolved yet because `useMultiFlashcard` debounces 500ms before `checkCombo`), then `committedMultiKey === null` is false — `isMultiViewer` stays false even though preparation completed and the buffer is ready.
- Also requires `!isComboViewer`. If proximity detection fires (changing `mode` to `PROXIMITY_COMBO` in `useMultiFlashcard.ts:461`) but `hasCombo === false` (no `activeCombo` set yet because the API call hasn't returned), neither `isComboViewer` nor `isMultiViewer` becomes true → viewer keeps showing single-card data while two are detected.

**Severity:** MEDIUM.

**Suggested fix (do NOT apply):**

- Make `isMultiViewer` independent of `comboKey`. Once `multiPreparation.status === 'committed' && multiPreparation.mindUrl && mindBuffer && flashcardCount === 2`, it's a multi-viewer.
- Don't gate on `!isComboViewer`; let `isComboViewer` take precedence in the mindUrl derivation instead (already done at line 874).

---

### Cause 6: `MAX_AR_TRACKS = 2` is duplicated and inconsistent with the viewer — LOW

**File:** `frontend-web/src/pages/LearnARV2.tsx:61` and `frontend-web/src/components/ar/ARContainerV2.tsx:189`

**Evidence:**

```61:frontend-web/src/pages/LearnARV2.tsx
const MAX_AR_TRACKS = 2;
```

```189:frontend-web/src/components/ar/ARContainerV2.tsx
params.set('maxTrack', String(Math.max(1, Math.min(targetCount, 5))));
```

**Why it matters:**

- MindAR supports up to 5 targets. The parent hard-caps at 2 with `scannedTargets.slice(0, MAX_AR_TRACKS)` (line 711 of `LearnARV2.tsx`). The viewer's cap is 5. If the API ever expands to 3-5 combos, the iframe can handle them but the parent drops the extras.
- Not the current blocker, but worth flagging for the fix sweep.

**Severity:** LOW.

---

## Evidence Trail

### Key code excerpts

#### LearnARV2.tsx — multi-prep prepare effect (lines 713-817)
Provides: fetches both `.mind` files, merges, prefights, sets `multiPreparation.status = 'ready'`. Cleanup aborts on dependency change.

#### LearnARV2.tsx — multi-prep cleanup (lines 853-867)
Wipes `multiPreparation` to idle whenever `!(!isComboViewer && flashcardCount === 2 && comboKey === multiPreparation.key)`. This means: AS SOON AS `comboKey` changes OR `multiPreparation.key` changes, the cleanup wipes state.

#### useMultiFlashcard.ts — `shouldPrepareIndependentMulti` (line 609)
Requires `comboResolution.status` to be in `['not_found', 'rejected', 'error']`. While the debounced `checkCombo()` is pending (`'idle'` or `'checking'`), `shouldPrepareIndependentMulti` is false → prepare effect skips → preparation never starts.

#### useMultiFlashcard.ts — combo auto-check (lines 423-441)
```useEffect(() => {
  if (state.detectedFlashcards.size === 2 && !state.activeCombo && state.comboResolution.status === 'idle') {
    if (comboCheckTimeoutRef.current) clearTimeout(comboCheckTimeoutRef.current);
    comboCheckTimeoutRef.current = setTimeout(() => { checkCombo(); }, 500);
  }
  return () => { if (comboCheckTimeoutRef.current) clearTimeout(comboCheckTimeoutRef.current); };
}, [state.detectedFlashcards, state.activeCombo, state.comboResolution.status, checkCombo]);
```

This 500 ms debounce means prepare cannot begin before 500 ms after the second card was added, *and* it cannot begin until `comboResolution.status` is `not_found`, `rejected`, or `error` — but the hook resets `comboResolution` to `{ key: comboKey, status: 'idle' }` every time `addFlashcard` runs (lines 222 in the hook). So the debounce timer restarts on every `setState`. **Practical implication:** if any other state update (e.g. proximity, AR_DEBUG postMessage from a previous scan, an unrelated re-render) triggers within those 500 ms, `setTimeout` is cleared. There is no timeout that survives across renders.

**Severity:** MEDIUM.

**Suggested fix:**

- Use a ref-captured timer that runs only the latest pending check.
- Run `checkCombo` immediately and use `'checking'` to gate, rather than clearing on every state change.

---

## Suggested Fix Strategy (ordered)

1. **Stabilize identities** (Causes 1, 3): memoize `comboTarget0`/`comboTarget1`/`scannedTarget0`/`scannedTarget1` by content. Use a custom hook that returns stable refs until the underlying Map actually mutates.
2. **Make the prepare effect idempotent** (Cause 1): hold an in-flight `Map<comboKey, Promise<void>>`. Concurrent calls with the same key await the same promise; different keys queue.
3. **Ship `mindBuffer` reliably** (Cause 2): set a long-lived handler in `ARContainerV2` that captures `mindBuffer` via ref and listens for `MIND_BUFFER_REQUEST` regardless of prop churn. Use a stable iframe key based on `phase` + `mindIdentityKey`.
4. **Serialize `addFlashcard`** (Cause 4): chain all `addFlashcard` invocations through a single in-flight queue.
5. **Decouple `isMultiViewer` from `comboKey`** (Cause 5).
6. **Fix the combo check debounce** to use a ref-captured timer.

## Verification Plan

1. Add `vitest` coverage for `useMultiFlashcard` simulating 2 rapid `addFlashcard` calls (Promise.all) and asserting `detectedFlashcards.size === 2`, `mode === 'MULTI'`.
2. Add a Playwright/Cypress E2E for the second-card scan path; assert `MULTI_VIEWER_COMMITTED` debug label is emitted within 3s, `isMultiViewer === true`, and the iframe loads `/ar-viewer.html?mind=runtime-buffer`.
3. Add a render-count probe on `LearnARV2`'s prepare effect: assert it runs ≤ 1 per (comboKey) under stable inputs.
4. Verify iframe `key` stability: assert `<iframe>` instance count ≤ 2 across the multi-card bootstrap.

## Open Questions

- Does the useMultiFlashcard hook's `stateRef.current` actually carry the latest state between rapid `addFlashcard` calls? (Likely yes, but worth verifying with `getSnapshot`-style test.)
- Is the `+ Add card` button (line 1398) reachable after first scan? Confirm appState transitions: `'SCANNING' → 'LOADING' → 'VIEWING'`. The button render gate at line 1397 (`!isComboViewer && flashcardCount < MAX_AR_TRACKS`) is required for the flow to begin.
- Does the iframe's `bootstrap()` 15s timeout ever trip in production? `ar-viewer.html` lines 89-93.

## Related Skill Files / Docs

- `docs/LEARN_AR_V2_ARCHITECTURE.md` (lines 333-334 describe the MIND_BUFFER_REQUEST / MIND_BUFFER contract)
- `docs/plan/20260623_simultaneous_dual_card_ar_rendering_v4.md` (line 17: "In non-combo MULTI mode, page passes two model configs but only one single-target mindUrl, so target index 1 never tracks.")
