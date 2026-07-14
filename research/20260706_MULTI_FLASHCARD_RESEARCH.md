# Research — Multi-Flashcard AR Loading Fix Patterns

> Reference: `report/DEBUG_20260706_MULTI_FLASHCARD_LOADING.md`
> Date: 2026-07-06

---

## Executive Summary

1. **Root cause is identity thrashing**, not logic errors. The React data flow is correct; the bug is that per-render object identities break `useEffect` dependency arrays.
2. **Best fix pattern**: stabilize `scannedTarget0/1` by reading them from a stable ref rather than as component-level values, and gate the prepare cleanup effect to never run while `'preparing'` is in-flight.
3. **iframe instability** is a separate concern solved by using a stable iframe `key` and delivering `mindBuffer` through a ref-held handler, not through React props.
4. **`addFlashcard` serialization** needs an async promise chain pattern (like the existing `runtimeBridge.initRef` pattern).
5. **No external libraries required** — all patterns exist in the codebase.

---

## 1. Identity Stabilization Patterns

### The Problem
`useMultiFlashcard.ts` uses `new Map(...)` + `setState` on every update (lines 207, 239, etc.). Every render produces a new `Map` instance with new `FlashcardData` object references. React's `useEffect` dep array uses reference equality, so `scannedTarget0` and `scannedTarget1` (returned by `getFlashcardByIndex`) change identity every tick.

**Affects:**
- `LearnARV2.tsx:817` — `scannedTarget0`, `scannedTarget1` in prepare effect dep array → abort loop
- `LearnARV2.tsx:843` — same for commit effect
- `LearnARV2.tsx:923` — debug emission effect (cosmetic but noisy)

### Pattern A: `useRef` snapshot (recommended)

Read flashcard data from a stable ref instead of component-level state. The ref is only updated when content semantically changes.

```typescript
// In LearnARV2.tsx
const flashcardSnapRef = useRef<{ 0: FlashcardData | null; 1: FlashcardData | null }>({ 0: null, 1: null });

// Keep ref in sync (fires on every render but cheap)
flashcardSnapRef.current[0] = getFlashcardByIndex(0);
flashcardSnapRef.current[1] = getFlashcardByIndex(1);

// Now use flashcardSnapRef.current[0] in useEffect dep arrays.
// It changes reference ONLY when the ref assignment changes — not when
// the surrounding Map changes.
```

**Precedent in codebase**: `useRuntimeBridge.ts` (lines 14-32) uses `initRef` exactly this way — a boolean ref set once on mount, used as a "mounted" sentinel.

**Why better than `useMemo`**: `useMemo` still compares dep arrays; if you pass `state.detectedFlashcards` as a dep, it still recomputes every tick. The ref approach bypasses the dep array entirely.

**Risk**: The ref always holds the latest value even after unmount. Add an `isMountedRef` check in async callbacks (pattern from `useSafeGLTF.ts:266`).

### Pattern B: Memoize by Map content hash

Derive a stable content key and memoize on it:

```typescript
// Derive stable "content fingerprint" from detectedFlashcards
const flashcardFingerprint = useMemo(() => {
    const entries = Array.from(detectedFlashcards.entries())
        .map(([k, v]) => `${k}:${v.qrId}:${v.arTag}`)
        .sort()
        .join('|');
    return entries;
}, [detectedFlashcards]);

// Use fingerprint as useMemo dep for comboTarget0/1
const comboTarget0 = useMemo(() => {
    return getFlashcardByTag(activeCombo?.targetOrder?.[0] ?? '');
}, [flashcardFingerprint, activeCombo, getFlashcardByTag]);
```

**Risk**: JSON serialization of Map may be slow on every render.

### Pattern C: Deep-equality useEffect dep array

Override `useEffect` to use deep equality instead of reference equality. Adds complexity, not recommended for this codebase.

### Recommendation
**Pattern A (`useRef` snapshot)** is simplest and has precedent. Implement as a `useFlashcardSnap` custom hook that reads from `useMultiFlashcard` and returns stable refs.

---

## 2. AbortController Race Fix

### The Problem
`LearnARV2.tsx:816` cleanup calls `controller.abort()`. But the **same `multiAbortRef.current?.abort()`** is also called by the cleanup effect at line 869. These two abort calls race. Additionally, `LearnARV2.tsx:717-720` increments `multiOperationIdRef` and replaces the controller *before* the previous cleanup runs, but the catch handler at line 798 checks `error.name === 'AbortError'` and silently returns — hiding the fact that the operation was aborted rather than failed.

### Pattern from `useSafeGLTF.ts` (lines 203-429) — BEST PRECEDENT

`useSafeGLTF.ts` shows the correct pattern:

```typescript
// useSafeGLTF.ts:255-256 — create once, use ref
abortControllerRef.current = new AbortController();
const signal = abortControllerRef.current.signal;

// useSafeGLTF.ts:266 — check in EVERY async callback
if (signal.aborted) return;

// useSafeGLTF.ts:425-428 — cleanup
return () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
};
```

**Key differences from current code**:
1. `useSafeGLTF` checks `signal.aborted` INSIDE callbacks, not just in the catch block.
2. Cleanup nulls the ref after abort (`abortControllerRef.current = null`).
3. The `url` dep array only changes when the URL actually changes — not on every render.

**Application to LearnARV2**:
- Add `signal.aborted` checks inside `fetchMind`'s `.then()` callbacks and `mergeMindTargetBuffers` call.
- Null the controller ref after abort: `multiAbortRef.current = null`.
- Don't increment `multiOperationIdRef` in the cleanup effect; use it only in the prepare effect to detect stale operations.

### Recommended: Staged Abort Guards

```typescript
// Inside the prepare effect's async IIFE (LearnARV2.tsx ~line 770):
void (async () => {
    try {
        ensureCurrent(); // throws if stale
        
        const [first, second] = await Promise.all([
            fetchMind(scannedTarget0.mindUrl, 0),
            fetchMind(scannedTarget1.mindUrl, 1)
        ]);
        
        ensureCurrent(); // throws if stale after awaits
        
        const { mergeMindTargetBuffers } = await import('@/utils/mergeMindTargets');
        const merged = mergeMindTargetBuffers(first, second);
        
        ensureCurrent(); // throw if stale after merge
        
        setMultiPreparation({ /* ready */ });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return; // silent — operation was superseded, not failed
        }
        // Only reach here for genuine errors
        multiPreparingKeyRef.current = null;
        setMultiPreparation({ status: 'error', error: message });
    }
})();
```

---

## 3. Iframe Stability — MindBuffer Delivery

### The Problem
`ARContainerV2.tsx:468` uses `key={main-${phase}-${mainSrc}}`. Every change to `targets`, `modelUrl2`, `comboPhrase`, etc. rebuilds the iframe. The `MIND_BUFFER_REQUEST` → `MIND_BUFFER` handshake (lines 318-328) is sensitive: the viewer polls every 300ms for 15s waiting for the buffer. If the iframe is recreated mid-wait, the old iframe's Blob URL is revoked and the new iframe starts a fresh 15s countdown.

### Pattern from `ARContainer.tsx` (lines 72, 321)

The OLDER `ARContainer.tsx` uses:

```typescript
// ARContainer.tsx:72 — Date.now() key (mounts once, never changes)
const [remountKey] = useState(Date.now);

// ARContainer.tsx:321 — stable key
<iframe key={remountKey} ... />
```

This is the most stable iframe pattern: the key is set once and never changes. Props are delivered via `postMessage` after mount, not via iframe URL params.

### Pattern B: Ref-based MindBuffer delivery

Hold the `mindBuffer` in a long-lived handler that survives iframe remounts:

```typescript
// In ARContainerV2 — new stable handler
const mindBufferHolderRef = useRef<Uint8Array | null>(null);

useEffect(() => {
    mindBufferHolderRef.current = mindBuffer;
}, [mindBuffer]);

// Separate stable listener (runs once, never re-subscribes)
useEffect(() => {
    const handler = (event: MessageEvent) => {
        const msg = normalizeMessage(event.data);
        if (!msg || msg.type !== 'MIND_BUFFER_REQUEST') return;
        
        const iframeWindow = iframeRef.current?.contentWindow;
        if (!iframeWindow || event.source !== iframeWindow) return;
        
        if (mindBufferHolderRef.current) {
            iframeWindow.postMessage(
                createMessage('MIND_BUFFER', { buffer: mindBufferHolderRef.current }),
                '*'
            );
        }
    };
    
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
}, []); // empty deps — never re-subscribes
```

This decouples the buffer delivery from React prop flow. The `MIND_BUFFER_REQUEST` handler fires when ANY iframe (new or old) requests the buffer, as long as `mindBufferHolderRef.current` is non-null.

### Pattern C: Stable iframe key

Change the key from `mainSrc` to a session-stable identifier:

```typescript
// Use a ref that increments only on phase changes (SCANNING ↔ VIEWING), not on every prop
const iframePhaseKeyRef = useRef(0);

useEffect(() => {
    if (phase === 'VIEWING') {
        iframePhaseKeyRef.current += 1;
    }
}, [phase]);

// iframe key:
key={`ar-iframe-${phase}`}
// Instead of:
key={`main-${phase}-${mainSrc}`}
```

### Recommendation
**Combine Pattern B + C**: Use a stable iframe `key` based on `phase` only, plus a ref-held `mindBuffer` handler that never re-subscribes. This solves the race without removing the ability to deliver updated content.

---

## 4. addFlashcard Serialization

### The Problem
Two `addFlashcard` calls in flight simultaneously both read `stateRef.current` (which captures state at their respective call time). If call 2 starts before call 1 commits, call 2's `setState` may overwrite call 1's entry.

### Pattern from `useRuntimeBridge.ts` (lines 14-32)

The `initRef` pattern prevents double initialization:

```typescript
const initRef = useRef(false);
useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    runtimeBridge.init();
}, []);
```

### Pattern: Promise Chain Queue

```typescript
// In useMultiFlashcard.ts
const addFlashcardChainRef = useRef<Promise<void>>(Promise.resolve());

const addFlashcard = useCallback(async (qrId: string): Promise<FlashcardData | null> => {
    // Chain onto existing promise so setStates are sequential
    const chained = addFlashcardChainRef.current.then(async () => {
        // Now we're in a safe serialized context
        const existing = stateRef.current.detectedFlashcards.get(qrId);
        if (existing) return existing;
        if (stateRef.current.detectedFlashcards.size >= 2) return null;
        
        // fetch + setState happen here
        const result = await fetchFlashcardData(qrId);
        if (result) {
            setState(prev => {
                if (prev.detectedFlashcards.has(qrId)) return prev;
                const newMap = new Map(prev.detectedFlashcards);
                newMap.set(qrId, result);
                return { ...prev, detectedFlashcards: newMap, /* ... */ };
            });
        }
        return result;
    });
    
    addFlashcardChainRef.current = chained.catch(() => {}); // swallow to keep chain alive
    return chained;
}, [buildUrl]);
```

**Key**: `addFlashcardChainRef.current` always points to the previous promise. The next call chains onto it. Each link in the chain awaits the previous `setState` before running, ensuring ordered, non-clobbering updates.

**Risk**: If one `fetchFlashcardData` fails, the chain continues (swallowed error), but the result is `null`. Caller handles this at `LearnARV2.tsx:1042`.

---

## 5. isMultiViewer Independence Fix

### The Problem
`LearnARV2.tsx:845-851` requires `committedMultiKey === comboKey`. But `comboKey` can be `null` if the combo API hasn't returned yet. This blocks `isMultiViewer` from becoming true even when preparation is complete.

### Recommended Fix

```typescript
const isMultiViewer = Boolean(
    multiPreparation.status === 'committed' &&
    multiPreparation.mindBuffer &&
    flashcardCount === 2 &&
    !isComboViewer
);
```

Remove the `committedMultiKey === comboKey` check. The `committedMultiKey` is a user-observable state; the real gate is `multiPreparation.status === 'committed'`. Once preparation is committed, the multi-viewer should render regardless of combo API status.

---

## 6. Combo Check Debounce Fix

### The Problem
The `setTimeout` for combo checking (lines 431-434 of `useMultiFlashcard.ts`) is cleared on every dep change (the `useEffect` dep array includes `state.detectedFlashcards`, `state.activeCombo`, `state.comboResolution.status`). Any state change restarts the timer, meaning the 500ms delay can stretch indefinitely.

### Pattern: Ref-captured timer

```typescript
// useMultiFlashcard.ts — replace setTimeout with a ref-captured timer
const pendingComboCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const comboCheckTriggeredRef = useRef(false);

useEffect(() => {
    if (state.detectedFlashcards.size !== 2) return;
    if (state.activeCombo) return;
    if (state.comboResolution.status !== 'idle') return;
    
    if (pendingComboCheckRef.current) {
        clearTimeout(pendingComboCheckRef.current);
    }
    
    pendingComboCheckRef.current = setTimeout(() => {
        comboCheckTriggeredRef.current = true;
        checkCombo();
    }, 500);
    
    return () => {
        if (pendingComboCheckRef.current) {
            clearTimeout(pendingComboCheckRef.current);
            pendingComboCheckRef.current = null;
        }
    };
}, [state.detectedFlashcards.size, state.activeCombo, state.comboResolution.status, checkCombo]);
```

Wait — the deps are still `state.detectedFlashcards.size` etc. The issue is that every `addFlashcard` setState changes the object reference, re-running the effect and clearing the timer.

**Better approach**: Derive the "should trigger" check outside the effect and compare against a ref:

```typescript
const comboCheckStateRef = useRef({
    size: 0,
    status: 'idle' as ComboResolution,
    activeCombo: null as ComboData | null
});

useEffect(() => {
    const current = {
        size: state.detectedFlashcards.size,
        status: state.comboResolution.status,
        activeCombo: state.activeCombo
    };
    
    const shouldTrigger = (
        current.size === 2 &&
        !current.activeCombo &&
        current.status === 'idle'
    );
    
    const prev = comboCheckStateRef.current;
    const shouldRestart = (
        shouldTrigger &&
        (!prev ||
         prev.size !== current.size ||
         prev.status !== current.status ||
         prev.activeCombo !== current.activeCombo)
    );
    
    comboCheckStateRef.current = current;
    
    if (shouldRestart) {
        if (pendingComboCheckRef.current) clearTimeout(pendingComboCheckRef.current);
        pendingComboCheckRef.current = setTimeout(() => checkCombo(), 500);
    }
}, [state.detectedFlashcards.size, state.comboResolution.status, state.activeCombo, checkCombo]);
```

This only restarts the timer when the *meaningful* values change, not when `state` object identity changes.

---

## Precedent Summary from Codebase

| Pattern | File | Lines | Quality |
|---------|------|-------|---------|
| AbortController with `signal.aborted` checks | `useSafeGLTF.ts` | 255-429 | EXCELLENT — use as template |
| Stable iframe key (once-set) | `ARContainer.tsx` | 72, 321 | GOOD — template for V2 |
| `initRef` sentinel pattern | `useRuntimeBridge.ts` | 14-32 | GOOD — apply to addFlashcard |
| Ref-based audio cache | `useARAudio.ts` | 32 | GOOD — template for mindBuffer holder |
| postMessage to iframe | `ARContainer.tsx` | 82-90 | GOOD — message delivery pattern |
| eventBus for cross-component | `useARAudio.ts` | 144-146 | EXCELLENT — already used for combo |
| Promise map cache (modelCache) | `useSafeGLTF.ts` | 165 | GOOD — template for operation queue |

---

## Risks and Open Questions

1. **MindAR `maxTrack` cap**: Viewer uses `Math.min(targetCount, 5)` — what if Supabase combo assets include >2 targets in the future?
2. **Memory**: Each merged `mindBuffer` is held in state. After viewing, should it be cleared? Currently no cleanup path.
3. **Blob URL revocation**: `ar-viewer.html:152` revokes on unload, but React state holds the `Uint8Array`. The browser GC handles it, but explicit cleanup after transition away from multi-viewer would be cleaner.
4. **Cold start latency**: `/flashcard/:qrId` on Supabase can take 1-3s. The second scan's `addFlashcard` might timeout. Consider pre-fetching combo data when first card is detected.
5. **Mobile WebView**: `URL.createObjectURL` and `postMessage` behavior differs across Android WebViews (especially older Chrome versions). No evidence of this in current codebase.
