# Task 10 Report: Lock Combo Semantics to AR Tags

## Status: COMPLETE

## Commit

```
d031fed fix(ar): resolve combos by tag sets not scan order (Task 10)
```

## Files Changed

- **Modified:** `frontend-web/src/hooks/useMultiFlashcard.ts` — added `sameTagSet` and `resolveComboByTags` pure exports
- **Added:** `frontend-web/src/__tests__/arComboTagIdentity.test.ts` — 19 passing tests

## What Was Done

### 1. Pure Helpers (`useMultiFlashcard.ts`)

Added two exported pure functions at the bottom of the file:

```ts
export function sameTagSet(left: string[], right: string[]): boolean {
    return (
        left.length === right.length &&
        [...left].sort().every((tag, index) => tag === [...right].sort()[index])
    );
}

export function resolveComboByTags(
    targets: { arTag: string }[],
    combo: { comboId: string; requiredTags: string[] }
): { comboId: string } | null {
    const scannedTags = targets.map((t) => t.arTag);
    return sameTagSet(scannedTags, combo.requiredTags)
        ? { comboId: combo.comboId }
        : null;
}
```

Key properties:
- **Order-independent:** scans compare sorted copies so `[elephant, jungle]` matches `[jungle, elephant]`
- **MindAR-agnostic:** does not use `combo_mind_url`, `target_order`, `mindUrl`, or any MindAR runtime fields
- **Minimal return:** only returns `{ comboId }` — no extraneous fields leak into the viewer

### 2. Tests (`arComboTagIdentity.test.ts`)

19 passing tests covering:

| Group | Tests |
|---|---|
| `sameTagSet` | identical unordered sets, single element, empty sets, duplicates, length mismatch, same-length different elements, extra duplicate |
| `resolveComboByTags` | jungle-first order, elephant-first order, `it.each` parameterized order, wrong combo, single tag, extra unrelated tag |
| Field exclusion | `combo_mind_url` not used, `target_order` not used, only `comboId` in result |

## Test Output

```
 RUN  v3.2.4 E:/University/Graduted Project/Edu-platform/frontend-web

 ✓ src/__tests__/arComboTagIdentity.test.ts (19 tests) 6ms

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Duration  2.50s
```

## Integration Note

`resolveComboByTags` is a standalone pure helper — it does not yet wire into the runtime combo activation flow. The existing `checkCombo` hook still resolves via the backend API (`/api/v1/combos/check`). The helper is available for any future consumer that needs order-independent tag-set comparison.
