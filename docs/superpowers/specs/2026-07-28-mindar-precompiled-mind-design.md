# MindAR Multi-Card Loading: Pre-Compiled `.mind` Design

> **Status:** Draft
> **Date:** 2026-07-28
> **Author:** Agent (sdlc-orchestrator pipeline)

---

## 1. Problem Statement

The current MindAR multi-card loading flow attempts to **runtime-merge two separate `.mind` files** (`mergeMindTargetBuffers`) into one buffer. This approach:

1. **Does not exist in MindAR's design** — MindAR only accepts ONE `.mind` file per scene; you cannot load 2 separate `.mind` files and expect multi-target tracking to work.
2. **Is a complex race condition** — The React state machine (`LearnARV2.tsx` + `useMultiFlashcard.ts`) fetches 2 `.mind` files, merges them, then passes the buffer via `postMessage` to the iframe. Any re-render during this window aborts the fetch and resets the pipeline.
3. **Has been partially patched but not fixed** — `useFlashcardSnapshot`, serialized `addFlashcard` chain, and `mindBufferRef` bridge are all band-aids over the root architectural problem.

The fix: **pre-compile one `.mind` file per combo pair**, store it in Supabase, and load it via URL — exactly as MindAR is designed to work.

---

## 2. Key Insight

MindAR natively supports **multiple simultaneous image targets** when they are compiled into a **single `.mind` file**:

```
Compiler Tool: https://hiukim.github.io/mind-ar-js-doc/tools/compile/
    ├── elephant.jpg  ──→ targetIndex: 0
    └── jungle.jpg   ──→ targetIndex: 1
                            ↓ Compile
              elephant_jungle.mind (1 file, 2 targets)
                            ↓
            ar-viewer.js: targetIndex: 0 → elephant model
                          targetIndex: 1 → jungle model
```

**Evidence from MindAR community:**
- GitHub issue #462: *"Can we use 2 `.mind` files?"* → **"No. You can use the same mind file for multiple images."**
- Multi-targets example (official docs): `band.mind` contains bear + raccoon, loaded once, tracked simultaneously.

**The backend already supports this pattern:**
- `ARCombination.combo_mind_url` field exists (line 69 of `backend/models/ar_combination.py`)
- Export data shows `combo_mind_url: "/assets/target/combo_targets.mind"` — the design intent was there from the beginning
- `/api/combos/check` response includes `combo_mind_url` via `ArCombinationSchema` (line 140)

The only missing piece: **frontend code to USE `combo_mind_url`** instead of `mergeMindTargetBuffers`.

---

## 3. Design

### 3.1 Architecture

```
User scan card A ("elephant")
    ↓
addFlashcard("animal_elephant_01")
    ↓
useMultiFlashcard detects 2 cards
    ↓
checkCombo(["animal_elephant_01", "tree_palm_02"])
    ↓
Backend /api/combos/check → { found: true, combo: { combo_mind_url: "elephant_jungle.mind", required_tags: [...] } }
    ↓
Frontend:
  - IF combo.combo_mind_url exists → fetch combo_mind_url directly (NEW)
  - ELSE → fallback to mergeMindTargetBuffers (backward compat)
    ↓
Fetch elephant_jungle.mind (1 file, both targets)
    ↓
Pass URL to ARContainerV2 → iframe loads once
    ↓
MindAR tracks both targets simultaneously
    ↓
Proximity detection (ar-viewer.js) → COMBO_PROXIMITY_DETECTED
    ↓
React handler → combo animation + interaction
```

### 3.2 Files to Change

| File | Change |
|------|--------|
| `frontend-web/src/hooks/useMultiFlashcard.ts` | Expose `combo_mind_url` from `checkCombo` result; remove `shouldPrepareIndependentMulti` gating that blocks non-terminal combo status |
| `frontend-web/src/pages/LearnARV2.tsx` | Prepare effect fetches `combo.combo_mind_url` directly instead of fetching 2 separate `.mind` files and merging. If `combo_mind_url` is null, fall back to legacy `mergeMindTargetBuffers` |
| `frontend-web/src/utils/mergeMindTargets.ts` | Keep as fallback for legacy combos without `combo_mind_url`. Add deprecation comment |
| `backend/database/seed/ar_objects.json` | No change |
| `backend/models/ar_combination.py` | No change (field already exists) |
| `backend/api/combos.py` | No change (API already returns `combo_mind_url`) |
| `ar-viewer.js` | No change |
| `ar-viewer.html` | No change |

### 3.3 Key Behavioral Changes

#### `useMultiFlashcard.ts`
- `checkCombo` already returns full combo object. No change needed to hook the API call.
- Add `comboMindUrl` to the return object so `LearnARV2` can read it.
- `shouldPrepareIndependentMulti`: Remove the `['not_found', 'rejected', 'error', 'found'].includes(state.comboResolution.status)` gate. When 2 cards are detected and `comboResolution.key` is set, prepare should start regardless of whether combo status is terminal.

#### `LearnARV2.tsx`
**Before (broken):**
```typescript
// Lines 786-794: fetch 2 separate .mind files
const [first, second] = await Promise.all([
  fetchMind(scannedTarget0.mindUrl, 0),
  fetchMind(scannedTarget1.mindUrl, 1)
]);
const merged = mergeMindTargetBuffers(first, second);
```

**After (correct):**
```typescript
// If backend provided a pre-compiled .mind for this combo, use it
if (activeCombo?.comboMindUrl) {
  const response = await fetch(activeCombo.comboMindUrl, { signal: controller.signal });
  const buffer = await response.arrayBuffer();
  // Use buffer directly — no merge needed
} else {
  // Legacy fallback: merge two single-target .mind files
  const [first, second] = await Promise.all([
    fetchMind(scannedTarget0.mindUrl, 0),
    fetchMind(scannedTarget1.mindUrl, 1)
  ]);
  const merged = mergeMindTargetBuffers(first, second);
}
```

#### `isMultiViewer` simplification
Current line 884: `(comboKey === null || comboKey === multiPreparation.key)` is redundant and blocks `isMultiViewer` when `comboKey` is null. Simplify to just check committed buffer + 2 cards.

### 3.4 Backward Compatibility

- Legacy combos without `combo_mind_url` in DB → `mergeMindTargetBuffers` fallback still works
- Single-card mode (flashcardCount === 1) → unchanged
- All existing interaction events (`COMBO_PROXIMITY_DETECTED`, etc.) → unchanged

### 3.5 Test Strategy

**Unit test:**
- `useMultiFlashcard`: Verify `comboMindUrl` is returned from `checkCombo` result
- `LearnARV2`: Add integration test that mocks `combo.combo_mind_url` and verifies only 1 fetch call (not 2)

**Manual test:**
1. Compile 2 images (elephant + jungle) into `elephant_jungle.mind`
2. Upload to Supabase at known URL
3. Add `combo_mind_url` to one combo record in DB
4. Scan both cards → verify only 1 `.mind` file fetched → both tracked simultaneously
5. Bring cards close → verify `COMBO_PROXIMITY_DETECTED` fires

---

## 4. Interaction System (Already Built)

The proximity interaction system is **already fully implemented** and requires no changes:

| Component | Status |
|----------|--------|
| `ar-viewer.js` proximity detection (`checkTargetProximity`) | ✅ Built |
| `COMBO_PROXIMITY_DETECTED` / `COMBO_PROXIMITY_ENDED` events | ✅ Built |
| `triggerComboEffects(midpoint)` | ✅ Built |
| `loadComboModel` / `removeComboModel` | ✅ Built |
| React handler `handleProximityDetected` in `useMultiFlashcard.ts` | ✅ Built |
| `LearnARV2` combo UI (quiz, game, pronunciation, pet) | ✅ Built |

The infrastructure is complete. Once the `.mind` loading is fixed, interaction will work automatically.

---

## 5. Out of Scope

- Creating/compiling the `.mind` files (user's responsibility — they will use the MindAR compiler tool)
- Changing `required_tags` order in backend
- React Native AR implementation
- Backend combo data population (adding `combo_mind_url` to existing combo records)

---

## 6. Dependencies

- User compiles pre-merged `.mind` files for demo combos using https://hiukim.github.io/mind-ar-js-doc/tools/compile/
- User uploads compiled `.mind` files to Supabase storage
- User adds `combo_mind_url` field to combo records in DB or seed data

---

## 7. Questions Resolved

| Question | Answer |
|----------|--------|
| One `.mind` file per combo or all targets in one? | **One `.mind` per combo pair** — Dynamic approach |
| How to determine target order? | **Scan order** — first scanned card = `targetIndex: 0` |
| How to provide `.mind` URL to frontend? | **Backend `combo_mind_url` field** — already exists in model + API |
| Keep `mergeMindTargetBuffers`? | **Yes, as fallback** for legacy combos without `combo_mind_url` |
| What about combos without pre-compiled `.mind`? | Fall back to `mergeMindTargetBuffers` — no DB changes needed |
