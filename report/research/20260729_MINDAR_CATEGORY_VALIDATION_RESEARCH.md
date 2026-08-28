# Research: MindAR Multi-Target Category Validation

> **Date:** 2026-07-29  
> **Workspace:** `e:/University/Graduted Project/Edu-platform`  
> **Research Query:** MindAR multi-target merge, AR flashcard category validation, .mind file structure

---

## Executive Summary

MindAR multi-target `.mind` file handling is well-understood: the compiler bundles multiple images into a single `.mind` at compile-time. Runtime MessagePack merging (`mergeMindTargetBuffers`) is a valid fallback for ad-hoc combos. The current codebase already implements a **hybrid approach** — pre-compiled `combo_mind_url` for defined combos, runtime merge for others.

**Category validation is the real open question.** The codebase currently has **dual-layer validation** — frontend rejects different categories before calling the backend, and the backend re-validates via `cross_category_allowed`. This redundancy is intentional but worth revisiting.

---

## 1. MindAR Multi-Target File Handling

### 1.1 How MindAR Handles Multi-Target .mind Files

**Key finding from GitHub research:**

The MindAR compiler tool at `https://hiukim.github.io/mind-ar-js-doc/tools/compile` takes multiple images and produces **one bundled `.mind` file**. You do NOT download separate files per image.

From the official GitHub issues ([#162](https://github.com/hiukim/mind-ar-js/issues/162), [#578](https://github.com/hiukim/mind-ar-js/issues/578)):

> *"You only download one target.mind file, then when you're processing it in your code, you can use the `targetIndex` property to select which image you're targeting with an entity."*

```javascript
// Single .mind file with 2 targets
<a-scene mindar-image="imageTargetSrc: ./combo.mind; maxTrack: 2">

  <!-- targetIndex 0 = first image uploaded to compiler -->
  <a-entity mindar-image-target="targetIndex: 0">
    <a-gltf-model src="#modelA" />
  </a-entity>

  <!-- targetIndex 1 = second image uploaded to compiler -->
  <a-entity mindar-image-target="targetIndex: 1">
    <a-gltf-model src="#modelB" />
  </a-entity>

</a-scene>
```

**Critical ordering invariant:** The `dataList` array inside the `.mind` file has a fixed order matching the upload order to the compiler. `dataList[0]` → `targetIndex: 0`, `dataList[1]` → `targetIndex: 1`. The current `mergeMindTargetBuffers` in `frontend-web/src/utils/mergeMindTargets.ts` preserves this ordering.

### 1.2 Pre-Compiled vs Runtime Merge

| Approach | Pros | Cons |
|----------|------|------|
| **Pre-compiled** (upload combo `.mind` to Supabase) | Faster AR init (~1-2s saved), simpler iframe lifecycle (no MIND_BUFFER handshake) | Requires compilation step for each combo, storage overhead |
| **Runtime merge** (MessagePack encode at runtime) | Works for any two flashcards, no pre-compilation needed | Slower (~500ms merge + handshake), more complex iframe communication |
| **Hybrid** (current) | Best of both: use pre-compiled when available, fall back to runtime | Some complexity in decision logic |

**Your codebase already uses the hybrid approach** — see `useMultiFlashcard.ts:729-737`:

```typescript
// Use pre-compiled combo_mind_url when found
shouldUseComboMindUrl: state.comboMindUrl !== null && status === 'found',

// Fall back to runtime merge when no pre-compiled URL
shouldPrepareIndependentMulti: state.comboMindUrl === null && ['not_found', 'rejected', 'error'].includes(status)
```

### 1.3 Memory/Performance Considerations

- MindAR max track = 5 targets (currently hard-coded to 2)
- `.mind` files are MessagePack v2 binary, typically 50-200KB per target
- Pre-compiled files should use `Cache-Control: max-age=31536000, immutable` (never changes)
- Runtime merge is fast: ~10-50ms for MessagePack encode/decode

---

## 2. Category Validation Location

### 2.1 Current Architecture

The codebase has **two-layer category validation**:

**Frontend layer** (`useMultiFlashcard.ts:304-324`):
```typescript
// Check 1 - Validate categories match before checking combo
const [card1, card2] = flashcards;
if (card1.category !== card2.category) {
    console.log('[MultiFlashcard] 🔍 Different categories, skipping combo check');
    setState({ ...comboResolution: { status: 'not_found', reason: 'different_categories' }});
    return null;  // Never calls backend
}
```

**Backend layer** (`ar_service.py:88-111`):
```python
cross_category_allowed = combo.get("cross_category_allowed", False)
if not cross_category_allowed:
    # Fetch flashcards to check their categories
    flashcards = []
    for tag in ar_tags:
        fc = await self.flashcard_repo.get_by_ar_tag(tag)
        if fc:
            flashcards.append(fc)
    
    categories = set(fc.get("category") for fc in flashcards if fc.get("category"))
    if len(categories) > 1:
        logger.info(f"[ARService] Combo {combo.get('combo_id')} rejected: different categories")
        return None
```

### 2.2 Dual Validation: Redundant or Defensive?

The redundancy exists because:

| Layer | When it runs | Purpose |
|-------|-------------|---------|
| **Frontend** | Before backend call | UX optimization — avoid unnecessary network call, immediate feedback |
| **Backend** | After backend call | Security/auth — backend is source of truth, frontend can be bypassed |

**The frontend guard is an optimization, not validation.** A malicious or buggy client could skip it. The backend validation is the real enforcement.

### 2.3 Schema Design for Cross-Category Combos

The `ar_combinations` model already has the right field:

```python
cross_category_allowed: bool = Field(
    default=False,
    description="Whether this combo allows flashcards from different categories"
)
```

**Recommended schema design:**

| Scenario | `cross_category_allowed` | Behavior |
|----------|---------------------------|----------|
| Same-category combo (e.g., jungle + elephant) | `False` | Only matches if both flashcards have same `category` |
| Cross-category combo (e.g., animal + plant) | `True` | Matches regardless of categories |
| Default for new combos | `False` | Safe by default — cross-category is opt-in |

---

## 3. Approaches for MindAR Multi-Target

### Approach A: Pre-Compiled Combo .mind Files Only

**Strategy:** Every combo in MongoDB must have `combo_mind_url` pre-compiled and uploaded to Supabase.

```typescript
// Decision: only use combo if pre-compiled .mind exists
shouldUseComboMindUrl: Boolean(activeCombo?.comboMindUrl),
shouldPrepareIndependentMulti: false,  // Never runtime merge
```

**Pros:**
- Fastest AR initialization (~50% faster per July 2026 research)
- Simpler iframe lifecycle (no MIND_BUFFER postMessage handshake)
- Single code path

**Cons:**
- Requires compilation pipeline for new combos
- Storage overhead per combo
- No runtime discovery of ad-hoc combinations

**Best for:** Stable, curated combo sets (e.g., Jungle Scene v1, Ocean Combo)

---

### Approach B: Runtime Merge Only

**Strategy:** Never use pre-compiled `.mind` files. Always merge at runtime.

```typescript
// Decision: always runtime merge
shouldUseComboMindUrl: false,
shouldPrepareIndependentMulti: detectedFlashcards.size === 2,
```

**Pros:**
- Works for any two flashcards
- No compilation pipeline needed
- Discovery of new combos at runtime

**Cons:**
- Slower initialization (~3.5-8s cold vs 1.8-4s with pre-compiled)
- More complex iframe communication (MIND_BUFFER handshake)
- Potential reliability issues with blob URLs

**Best for:** Experimental features, user-generated combos, early-stage development

---

### Approach C: Hybrid with Smart Pre-Warming (Current/Recommended)

**Strategy:** Use pre-compiled when available, fall back to runtime merge. Pre-warm likely combos on first card detection.

This is your **current implementation** and it's the right approach:

```typescript
// useMultiFlashcard.ts logic
shouldUseComboMindUrl: state.comboMindUrl !== null && status === 'found',
shouldPrepareIndependentMulti: state.comboMindUrl === null && ['not_found', 'rejected', 'error'].includes(status)
```

**Enhancement opportunity:** Add pre-warming from the July 2026 research doc:

```typescript
// On first card detection, prefetch likely combo assets
useEffect(() => {
    if (detectedFlashcards.size !== 1) return;
    const firstCard = Array.from(detectedFlashcards.values())[0];
    
    fetch(`/api/v1/combos/candidates?tag=${firstCard.arTag}`)
        .then(r => r.json())
        .then(data => {
            data.candidates?.forEach(combo => {
                // Prefetch .mind and .glb files
                if (combo.combo_mind_url) {
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.as = 'fetch';
                    link.href = combo.combo_mind_url;
                    document.head.appendChild(link);
                }
            });
        });
}, [detectedFlashcards.size]);
```

---

## 4. Category Validation Approaches

### Approach 1: Frontend-First (Current)

**Strategy:** Frontend checks categories before calling backend.

```typescript
// useMultiFlashcard.ts
if (card1.category !== card2.category) {
    return null;  // Skip backend call entirely
}
```

**Pros:**
- Faster rejection (no network roundtrip)
- Reduces backend load for obvious mismatches
- Better UX (immediate feedback)

**Cons:**
- Redundant with backend validation
- Category data must be available on frontend (already is via `/api/v1/flashcard/:qrId`)

---

### Approach 2: Backend-First

**Strategy:** Remove frontend guard. Always call backend, let it decide.

```typescript
// Simplified: always check combo
const response = await fetch(`/api/v1/combos/check?tags=${arTags.join(',')}`);
```

**Backend handles:**
- Category validation based on `cross_category_allowed`
- Returns `not_found` or combo data
- Source of truth for business rules

**Pros:**
- Single source of truth
- Simpler frontend logic
- Business rules centralized in backend

**Cons:**
- Network roundtrip for every combo attempt
- Slightly worse UX for mismatched categories

---

### Approach 3: Optimized Hybrid (Recommended)

**Strategy:** Keep frontend guard for UX, but add a backend `/combos/candidates` endpoint for pre-warming.

```typescript
// Frontend: quick client-side check for immediate feedback
if (card1.category !== card2.category && !allowCrossCategory) {
    showFeedback('Cards must be from the same category');
    return null;
}

// Still call backend for proper validation and combo lookup
const response = await fetch(`/api/v1/combos/check?tags=${arTags.join(',')}`);
```

**Backend enhancement:** Add a new endpoint for pre-warming:

```python
@router.get("/candidates")
async def get_combo_candidates(tag: str):
    """Return all active combos containing this AR tag for pre-warming."""
    combos = await ARCombination.find(
        ARCombination.required_tags == tag,
        ARCombination.active == True
    ).to_list()
    
    return {
        "candidates": [
            {
                "combo_id": c.combo_id,
                "combo_mind_url": c.combo_mind_url,
                "combo_model_url": c.model_3d_url,
                "missing_tags": [t for t in c.required_tags if t != tag]
            }
            for c in combos
        ]
    }
```

---

## 5. Similar Projects Research

### Academic Papers

From Indonesian thesis research (Universitas Lampung, 2025):

> *"Produk media pembelajaran Flashcard dengan marker menggunakan Mind-AR telah memenuhi kriteria validitas... hasil uji efektifitas menunjukkan nilai rata-rata pre-test sebesar 31,85 meningkat menjadi 78,15 pada post-test"*

This confirms MindAR + flashcards is a validated educational approach with measurable learning outcomes.

### Open Source

No dedicated AR flashcard apps found on GitHub. Most MindAR projects are:
- Marketing/advertising focused
- Single-target image recognition
- Proof-of-concept demos

Your codebase (`useMultiFlashcard.ts` + `ar_service.py`) is more sophisticated than typical open-source MindAR projects.

---

## 6. Recommendation Summary

### For .mind File Handling

**Use Approach C (Hybrid with Pre-Warming):**
- Keep current logic for `shouldUseComboMindUrl` / `shouldPrepareIndependentMulti`
- Add pre-warming via `/api/v1/combos/candidates` endpoint
- Consider CDN pre-connect for Supabase storage domain

### For Category Validation

**Use Approach 3 (Optimized Hybrid):**
- Keep frontend guard for immediate UX feedback
- Backend remains source of truth
- Add backend `/candidates` endpoint for pre-warming

### Schema Recommendations

| Field | Recommendation |
|-------|----------------|
| `flashcard.category` | Keep at flashcard level — it's a property of the card, not the AR target |
| `ar_combinations.cross_category_allowed` | Keep — controls whether category mismatch is allowed per combo |
| `ar_combinations.combo_mind_url` | Keep — enables fast-path pre-compiled loading |

### Implementation Priority

1. **High:** Add `/api/v1/combos/candidates` endpoint for pre-warming
2. **Medium:** Add `<link rel="prefetch">` for combo assets on first card detection
3. **Low:** Consider pre-compilation pipeline for new combos (CI/CD integration)

---

## 7. References

- [MindAR GitHub - Multi-target issue #578](https://github.com/hiukim/mind-ar-js/issues/578)
- [MindAR GitHub - Build band.mind #162](https://github.com/hiukim/mind-ar-js/issues/162)
- [MindAR Official Examples - Multi-Targets](https://hiukim.github.io/mind-ar-js-doc/examples/multi-targets/)
- [Stack Overflow - Load Multiple Gltf with Single Mind file](https://stackoverflow.com/questions/76346832/how-to-load-multiple-gltf-with-single-mind-file)
- [MindAR Official Docs](https://hiukim.github.io/mind-ar-js-doc/)
- [WebAR DevTools](https://github.com/carlosreinamcr/webar-devtools) - Browser diagnostic extension for MindAR
- Academic paper: Universitas Lampung 2025 - MindAR flashcard effectiveness study

---

## Appendix: Current Codebase Architecture

```
Frontend (React)
├── useMultiFlashcard.ts
│   ├── Stores category from /api/v1/flashcard/:qrId response
│   ├── Frontend guard: rejects different categories before backend call
│   ├── checkCombo(): calls /api/v1/combos/check
│   └── Decision logic:
│       ├── shouldUseComboMindUrl → use pre-compiled .mind
│       └── shouldPrepareIndependentMulti → runtime merge
│
└── mergeMindTargets.ts
    └── mergeMindTargetBuffers(): MessagePack v2 merge

Backend (FastAPI)
├── /api/v1/combos/check
│   └── ARService.check_combo()
│       ├── Finds combos by required_tags
│       ├── Validates cross_category_allowed
│       └── Returns combo or null
│
├── ar_combinations model
│   ├── required_tags: List[str]
│   ├── cross_category_allowed: bool
│   ├── combo_mind_url: Optional[str]
│   └── target_order: Optional[List[str]] (deprecated)
│
└── ARCombinationRepository
    └── find_by_tags(): MongoDB $all query
```
