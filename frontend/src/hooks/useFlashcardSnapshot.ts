import { useRef } from 'react';
import type { FlashcardData } from '@/hooks/useMultiFlashcard';

export interface FlashcardSnapshot {
    readonly card0: FlashcardData | null;
    readonly card1: FlashcardData | null;
    readonly version: number;
    readonly keys: { 0: string | null; 1: string | null };
}

/**
 * Read-only, reference-stable snapshot of the latest two flashcards.
 *
 * The `useMultiFlashcard` hook rebuilds its `detectedFlashcards` Map on every
 * `setState` (the hook never memoizes), so reading `getFlashcardByIndex(i)`
 * directly in JSX produces a fresh `FlashcardData` reference per render. That
 * reference churn causes downstream `useEffect` deps to thrash — most damaging
 * in the multi-flashcard prepare effect (`LearnARV2.tsx:713`), where
 * `scannedTarget0/1` change identity often enough to abort the in-flight
 * `.mind` fetch before it resolves (see
 * `report/DEBUG_20260706_MULTI_FLASHCARD_LOADING.md`, Cause 1 + 3).
 *
 * This hook holds a single ref to the current snapshot and returns the SAME
 * ref unless the qrId at index 0 or 1 changes. Consumers can therefore pass
 * `snapshot.version` to effect dep arrays and keep effect identity stable.
 *
 * Note on limitation (per reviewer mitigation): `version` only increments on
 * qrId change, not on async-populated fields like `model3dUrl`. The prepare
 * effect still reads the latest card objects via the snapshot — if a field
 * populates after the qrId is set, the prepare effect will not re-fire on its
 * own; the user-facing Retry button (`multiRetryToken`) is the recovery path.
 */
export function useFlashcardSnapshot(
    getCardByIndex: (i: number) => FlashcardData | null
): FlashcardSnapshot {
    const snapshotRef = useRef<FlashcardSnapshot>({
        card0: null,
        card1: null,
        version: 0,
        keys: { 0: null, 1: null }
    });

    const card0 = getCardByIndex(0);
    const card1 = getCardByIndex(1);

    const prev = snapshotRef.current;
    const key0 = card0?.qrId ?? null;
    const key1 = card1?.qrId ?? null;
    const versionChanged =
        prev.keys[0] !== key0 || prev.keys[1] !== key1;

    if (versionChanged) {
        snapshotRef.current = {
            card0,
            card1,
            version: prev.version + 1,
            keys: { 0: key0, 1: key1 }
        };
    } else {
        // Refresh card contents in-place so consumers reading `snapshot.card0`
        // get the latest populated fields without bumping the version. Identity
        // of the OUTER snapshot object stays stable.
        if (snapshotRef.current.card0 !== card0) {
            snapshotRef.current = { ...snapshotRef.current, card0, card1 };
        }
    }

    return snapshotRef.current;
}
