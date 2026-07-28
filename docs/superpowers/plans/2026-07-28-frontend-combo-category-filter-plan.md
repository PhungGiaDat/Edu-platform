# Frontend Combo Category Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend-only category filtering to prevent invalid combo checks when flashcards from different categories are scanned together. This eliminates unnecessary backend API calls and improves UX.

**Architecture:** 
- Frontend filters combo checks at `useMultiFlashcard.ts` level
- Only flashcards with matching `category` trigger backend combo validation
- Flashcard API response already includes `category` field (from `FlashcardSchema`)
- No backend changes required for Phase 1

**Tech Stack:** TypeScript, React hooks, FastAPI backend (existing)

---

## Global Constraints

- Follow existing code patterns in `useMultiFlashcard.ts`
- Keep API backward compatible
- Add debug logging for troubleshooting
- Use existing `comboResolution` state pattern

---

## File Structure

**Files to modify:**
- `frontend-web/src/hooks/useMultiFlashcard.ts` — Primary implementation

**Files to create:**
- `frontend-web/src/data/combo-rules.ts` — Local combo rules for offline/quick validation (optional Phase 2)

---

## Task 1: Update FlashcardData Interface

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:66-75`

**Interfaces:**
- Consumes: None
- Produces: `FlashcardData` with `category` field

**Steps:**

- [ ] **Step 1: Add `category` field to FlashcardData interface**

Locate the `FlashcardData` interface at line 66-75 and add the `category` field:

```typescript
interface FlashcardData {
    qrId: string;
    arTag: string;
    word: string;
    category: string; // NEW: Category for combo filtering
    model3dUrl: string;
    image2dUrl: string;
    textureUrl?: string;
    mindUrl: string;
    detectedAt: number;
}
```

---

## Task 2: Store Category from API Response

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:191-201`

**Interfaces:**
- Consumes: API response with `flashcard.category`
- Produces: `FlashcardData` with `category` populated

**Steps:**

- [ ] **Step 1: Update `flashcardData` object to include category**

In `addFlashcardImpl`, after line 194 (`word: flashcard.word || qrId,`), add:

```typescript
const flashcardData: FlashcardData = {
    qrId,
    arTag: arObject?.ar_tag || flashcard.ar_tag || `tag_${qrId}`,
    word: flashcard.word || qrId,
    category: flashcard.category || 'unknown', // NEW: Extract from API response
    model3dUrl: buildUrl(arObject?.model_3d_url) || '',
    image2dUrl: buildUrl(arObject?.image_2d_url) || '',
    textureUrl: buildUrl(arObject?.texture_url),
    mindUrl: arObject?.nft_base_url || '',
    detectedAt: Date.now()
};
```

- [ ] **Step 2: Add debug logging for category**

Add after line 206 (`emitArDebug('FLASHCARD_RESOLVED', {...})`):

```typescript
emitArDebug('FLASHCARD_RESOLVED', {
    qrId,
    arTag: flashcardData.arTag,
    category: flashcardData.category, // NEW
    mindUrl: flashcardData.mindUrl,
    model3dUrl: flashcardData.model3dUrl,
    image2dUrl: flashcardData.image2dUrl
});
```

---

## Task 3: Update ComboResolutionState for Category Reason

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:96-102`

**Interfaces:**
- Consumes: None
- Produces: Updated `ComboResolutionState` type

**Steps:**

- [ ] **Step 1: Add new reason type for different categories**

Add `different_categories` to the reason tracking (the type already accepts any string for `reason`, so no type change needed). Just document the possible reasons in a comment:

```typescript
interface ComboResolutionState {
    key: string | null;
    status: ComboResolution;
    reason?: string; // Possible values: 
                     // - 'different_categories' = cards from different categories
                     // - 'not_found' = no valid combo
                     // - 'rejected' = combo found but assets failed
                     // - 'error' = API/network error
}
```

---

## Task 4: Implement Category Filter in checkCombo

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:294-446`

**Interfaces:**
- Consumes: `flashcards[].category`
- Produces: Early return with `different_categories` reason

**Steps:**

- [ ] **Step 1: Add category validation at start of checkCombo**

After line 297 (`if (flashcards.length !== 2) return null;`), add category check:

```typescript
// Check 1: Validate categories match before backend call
const [card1, card2] = flashcards;
if (card1.category !== card2.category) {
    console.log('[MultiFlashcard] 🔍 Different categories, skipping combo check:', 
        card1.category, 'vs', card2.category);
    emitArDebug('COMBO_CATEGORY_MISMATCH', {
        arTags,
        category1: card1.category,
        category2: card2.category
    });
    setState(prev => prev.comboResolution.key !== comboKey ? prev : ({
        ...prev,
        isCheckingCombo: false,
        comboResolution: { 
            key: comboKey, 
            status: 'not_found', 
            reason: 'different_categories' 
        }
    }));
    return null;
}
```

- [ ] **Step 2: Verify placement**

The category check should be placed **before** the existing duplicate check at line 301. This ensures we reject different-category pairs immediately without any further processing.

**Expected placement (lines 297-320):**
```typescript
if (flashcards.length !== 2) return null;

// Category validation (NEW)
const [card1, card2] = flashcards;
if (card1.category !== card2.category) {
    // ... rejection logic
    return null;
}

// Existing duplicate check (line 301)
const comboKey = [...arTags].sort().join('|');
if (snapshot.comboResolution.key === comboKey && snapshot.comboResolution.status !== 'idle') return null;
```

---

## Task 5: Add Helper for Category Info (Debugging)

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts` — Add new exported helper

**Interfaces:**
- Consumes: `state.detectedFlashcards`
- Produces: Category info object for debugging/UI

**Steps:**

- [ ] **Step 1: Add helper function to get unique categories**

Add near line 640 (after `getArTags` function):

```typescript
/**
 * Get all unique categories from detected flashcards
 */
const getCategories = useCallback((): string[] => {
    const categories = Array.from(state.detectedFlashcards.values()).map(f => f.category);
    return [...new Set(categories)];
}, [state.detectedFlashcards]);
```

- [ ] **Step 2: Export the helper**

Add `getCategories` to the return object at line 676:

```typescript
return {
    // ... existing exports
    getCategories, // NEW: For debugging/UI
    // ... rest
};
```

---

## Task 6: Update Type Export

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:692`

**Interfaces:**
- Consumes: None
- Produces: Type exports

**Steps:**

- [ ] **Step 1: Verify type export**

The existing export at line 692 already exports all types. No changes needed:

```typescript
export type { FlashcardData, ComboData, MultiFlashcardState, ProximityData, ComboResolution, ComboResolutionState };
```

`FlashcardData` now includes `category`, so consumers get the updated type automatically.

---

## Task 7: Test Verification

**Files:**
- No test file exists yet — create if needed

**Steps:**

- [ ] **Step 1: Manual verification checklist**

Test the following scenarios:

| Scenario | Expected Behavior |
|----------|-----------------|
| Cat + Apple (animals + fruits) | Console shows "Different categories", no API call |
| Elephant + Palm (animals + nature) | Backend called, combo check proceeds |
| Apple + Banana (fruits + fruits) | Backend called, combo check proceeds |
| Single card scanned | No combo check triggered |

- [ ] **Step 2: Verify debug output**

Open browser DevTools console, filter for `[MultiFlashcard]` to see:
- `COMBO_CATEGORY_MISMATCH` event when categories differ
- `FLASHCARD_RESOLVED` event with `category` field

---

## Task 8: Commit

**Steps:**

- [ ] **Step 1: Stage changes**

```bash
git add frontend-web/src/hooks/useMultiFlashcard.ts
```

- [ ] **Step 2: Commit with descriptive message**

```bash
git commit -m "feat(frontend): add category filtering to combo detection

- Add category field to FlashcardData interface
- Extract category from API response in addFlashcardImpl
- Skip backend combo check when categories differ
- Add debug logging for category mismatches
- Add getCategories helper for debugging

This prevents unnecessary API calls for invalid cross-category combos
like cat + apple (animals + fruits)."
```

---

## Summary of Changes

| Task | Lines Modified | Change Type |
|------|--------------|-------------|
| 1 | 66-75 | Interface update |
| 2 | 191-201, 203-209 | Data extraction |
| 3 | 98-102 | Documentation |
| 4 | 294-320 | Business logic |
| 5 | 640-650, 676 | Helper function |
| 6 | 692 | Verification |
| 7 | - | Manual test |
| 8 | - | Commit |

**Total estimated lines changed:** ~30 lines

---

## Phase 2 (Optional Future Work)

If offline combo validation is needed:

1. Create `frontend-web/src/data/combo-rules.ts` with local combo rules
2. Implement sorted-key lookup pattern for instant local validation
3. Fall back to backend only for unknown combos

This is out of scope for the current implementation as the backend already handles validation correctly.
