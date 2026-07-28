# Frontend Combo Category Filter + Backend Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 
1. Add `cross_category_allowed` field to backend combo model
2. Implement category filtering on frontend to prevent invalid combo checks
3. Handle cross-category combos explicitly (e.g., Elephant + Tree = Jungle ecosystem)
4. Handle MongoDB schema migration safely

**Tech Stack:** TypeScript (Frontend MindAR), Python/FastAPI (Backend), MongoDB/Beanie

**Note:** 1-shot auto-scan UX (Phase 2) is deferred to later sprint.

---

## Global Constraints

- **MongoDB Data Consistency:** When adding new fields, existing documents have `null` values. Use `Field(default=False)` for backward compatibility.
- **Backward Compatibility:** API responses must not break existing clients
- Follow existing code patterns in `useMultiFlashcard.ts`

---

## Scope

| Component | Included |
|-----------|----------|
| `frontend-web/src/hooks/useMultiFlashcard.ts` | ✅ |
| `backend/models/ar_combination.py` | ✅ |
| `backend/services/ar_service.py` | ✅ |
| `backend/scripts/migrate_cross_category_flag.py` | ✅ |
| `backend/tests/test_ar_service.py` | ✅ |
| `frontend-web/src/pages/LearnARV2.tsx` | ❌ (Phase 2 - deferred) |
| Mobile RN / Unity | ❌ |

---

# PART 1: BACKEND CHANGES

---

## Task B1: Update ARCombination Model

**Files:**
- Modify: `backend/models/ar_combination.py`

- [ ] **Step 1: Add `cross_category_allowed` field with default**

```python
class ArCombination(Document):
    combo_id: Indexed(str, unique=True)
    description: str
    required_tags: List[str] = Field(default_factory=list)
    target_order: Optional[List[str]] = None
    
    # Assets
    model_3d_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    texture_url: Optional[str] = None
    combo_mind_url: Optional[str] = None
    
    # Rewards
    reward_xp: int = Field(default=100)
    
    # Animation & Sound
    animation: Optional[str] = None
    sound: Optional[str] = None
    phrase: Optional[str] = None
    
    # NEW: Allow/disallow cross-category combos
    cross_category_allowed: bool = Field(default=False)
    
    # Metadata
    priority: int = Field(default=0)
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
```

- [ ] **Step 2: Update Pydantic schema (if exists)**

```python
class ArCombinationSchema(BaseModel):
    # ... existing fields ...
    cross_category_allowed: bool = Field(default=False)
    # ... existing fields ...
```

---

## Task B2: Update ARService with Category Validation

**Files:**
- Modify: `backend/services/ar_service.py`

- [ ] **Step 1: Add category validation in check_combo**

```python
async def check_combo(self, tags: List[str]) -> Optional[Dict]:
    """
    Check if the given tags form a valid combo.
    
    Rules:
    1. Combo must exist with matching required_tags
    2. If cross_category_allowed=False, all flashcards must have same category
    3. Target order must be valid
    4. Combo must be active
    """
    if len(tags) < 2:
        return None
    
    query = {
        "required_tags": {"$all": tags},
        "active": True
    }
    
    combos = await ArCombination.find(query).to_list()
    
    if not combos:
        return None
    
    combos.sort(key=lambda x: x.priority, reverse=True)
    combo = combos[0]
    
    # NEW: Validate categories
    flashcards = await Flashcard.find(
        Flashcard.ar_tag.in_(tags)
    ).to_list()
    
    if not flashcards:
        return None
    
    categories = set(fc.category for fc in flashcards if fc.category)
    
    # Handle None (existing docs) as False
    if len(categories) > 1 and not (combo.cross_category_allowed or False):
        logger.info(f"[ARService] Combo {combo.combo_id} rejected: different categories {categories}")
        return None
    
    return combo.model_dump()
```

---

## Task B3: Backend Migration Script

**Files:**
- Create: `backend/scripts/migrate_cross_category_flag.py`

- [ ] **Step 1: Create migration script**

```python
"""
Migration: Set cross_category_allowed=True for existing cross-category combos
Run: python -m backend.scripts.migrate_cross_category_flag
"""
from models.ar_combination import ArCombination

async def migrate_cross_category_combos():
    """Set cross_category_allowed=True for existing jungle/nature combos."""
    print("[Migration] Starting cross_category_allowed migration...")
    
    target_patterns = ['jungle', 'ecosystem', 'nature', 'eco', 'animal', 'plant']
    
    updated_count = 0
    for pattern in target_patterns:
        query = {
            "$or": [
                {"description": {"$regex": pattern, "$options": "i"}},
                {"combo_id": {"$regex": pattern, "$options": "i"}}
            ],
            "$or": [
                {"cross_category_allowed": {"$exists": False}},
                {"cross_category_allowed": None},
                {"cross_category_allowed": False}
            ]
        }
        
        combos = await ArCombination.find(query).to_list()
        
        for combo in combos:
            combo.cross_category_allowed = True
            await combo.save()
            updated_count += 1
            print(f"  Updated: {combo.combo_id}")
    
    print(f"[Migration] Complete. Updated {updated_count} combos.")
```

---

## Task B4: Backend Tests

**Files:**
- Create: `backend/tests/test_ar_service.py`

- [ ] **Step 1: Write test for same-category combo**

```python
async def test_combo_same_category_allowed():
    """Same category combos should work regardless of cross_category_allowed flag"""
    # Create test flashcards
    fc1 = await Flashcard.create(
        qr_id="test_cat1",
        word="test1",
        category="animals",
        ar_tag="tag_animal_1"
    )
    fc2 = await Flashcard.create(
        qr_id="test_cat2", 
        word="test2",
        category="animals",
        ar_tag="tag_animal_2"
    )
    
    combo = await ArCombination.create(
        combo_id="test_combo_same",
        description="Same category test",
        required_tags=["tag_animal_1", "tag_animal_2"],
        cross_category_allowed=False
    )
    
    result = await ar_service.check_combo(["tag_animal_1", "tag_animal_2"])
    assert result is not None
```

- [ ] **Step 2: Write test for cross-category combo rejected**

```python
async def test_combo_cross_category_rejected():
    """Different categories should be rejected when cross_category_allowed=False"""
    fc1 = await Flashcard.create(
        qr_id="test_dog",
        word="dog",
        category="animals",
        ar_tag="tag_dog"
    )
    fc2 = await Flashcard.create(
        qr_id="test_apple",
        word="apple", 
        category="fruits",
        ar_tag="tag_apple"
    )
    
    combo = await ArCombination.create(
        combo_id="test_combo_cross",
        description="Cross category test",
        required_tags=["tag_dog", "tag_apple"],
        cross_category_allowed=False
    )
    
    result = await ar_service.check_combo(["tag_dog", "tag_apple"])
    assert result is None  # Rejected
```

- [ ] **Step 3: Write test for cross-category combo allowed**

```python
async def test_combo_cross_category_allowed():
    """Different categories should be allowed when cross_category_allowed=True"""
    fc1 = await Flashcard.create(
        qr_id="test_elephant",
        word="elephant",
        category="animals",
        ar_tag="tag_elephant"
    )
    fc2 = await Flashcard.create(
        qr_id="test_palm",
        word="palm",
        category="plants",
        ar_tag="tag_palm"
    )
    
    combo = await ArCombination.create(
        combo_id="test_combo_eco",
        description="Eco system combo",
        required_tags=["tag_elephant", "tag_palm"],
        cross_category_allowed=True
    )
    
    result = await ar_service.check_combo(["tag_elephant", "tag_palm"])
    assert result is not None
```

---

## Task B5: Backend Commit

- [ ] **Step 1: Stage backend changes**

```bash
git add backend/models/ar_combination.py backend/services/ar_service.py
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(backend): add cross_category_allowed field with migration

- Add cross_category_allowed bool field (default False)
- Handle None from MongoDB as False (backward compatibility)
- Validate flashcard categories in check_combo service
- Add migration script for existing combos
- Add 3 test cases"
```

---

# PART 2: FRONTEND CATEGORY FILTER

---

## Task F1: Add Category Field to FlashcardData

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`

- [ ] **Step 1: Add `category` field to FlashcardData interface**

```typescript
interface FlashcardData {
    qrId: string;
    arTag: string;
    word: string;
    category: string; // NEW - from API response
    model3dUrl: string;
    image2dUrl: string;
    textureUrl?: string;
    mindUrl: string;
    detectedAt: number;
}
```

- [ ] **Step 2: Store category from API response**

```typescript
const flashcardData: FlashcardData = {
    qrId,
    arTag: arObject?.ar_tag || flashcard.ar_tag || `tag_${qrId}`,
    word: flashcard.word || qrId,
    category: flashcard.category || 'unknown', // NEW
    model3dUrl: buildUrl(arObject?.model_3d_url) || '',
    image2dUrl: buildUrl(arObject?.image_2d_url) || '',
    textureUrl: buildUrl(arObject?.texture_url),
    mindUrl: arObject?.nft_base_url || '',
    detectedAt: Date.now()
};
```

---

## Task F2: Implement Category Filter Logic

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`

- [ ] **Step 1: Add category validation before combo check**

After `if (flashcards.length !== 2) return null;`, add:

```typescript
// Check 1: Validate categories match
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

---

## Task F3: Add Helper Functions

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`

- [ ] **Step 1: Add getCategories helper**

```typescript
const getCategories = useCallback((): string[] => {
    const categories = Array.from(state.detectedFlashcards.values()).map(f => f.category);
    return [...new Set(categories)];
}, [state.detectedFlashcards]);
```

- [ ] **Step 2: Add hasSameCategory helper**

```typescript
const hasSameCategory = useCallback((): boolean => {
    const categories = getCategories();
    return categories.length === 1;
}, [getCategories]);
```

- [ ] **Step 3: Export in return object**

```typescript
return {
    // ... existing exports ...
    getCategories,
    hasSameCategory,
    // ... existing exports ...
};
```

---

## Task F4: Frontend Commit

- [ ] **Step 1: Stage frontend changes**

```bash
git add frontend-web/src/hooks/useMultiFlashcard.ts
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(frontend): add category filter for combo validation

- Add category field to FlashcardData interface
- Store category from API response
- Skip combo check when categories differ
- Add getCategories and hasSameCategory helpers
- Add COMBO_CATEGORY_MISMATCH debug event"
```

---

# Summary

## Changes by Component

| Component | File | Changes |
|-----------|------|---------|
| **Backend Model** | `ar_combination.py` | `cross_category_allowed` field (default False) |
| **Backend Service** | `ar_service.py` | Category validation in `check_combo()` |
| **Backend Migration** | `migrate_cross_category_flag.py` | Set flag for existing combos |
| **Backend Tests** | `test_ar_service.py` | 3 test cases |
| **Frontend Hook** | `useMultiFlashcard.ts` | Category filter + helpers |

## Implementation Order

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | B1-B5 | Backend: Model, Service, Migration, Tests |
| 2 | F1-F4 | Frontend: Category filter + helpers |

## Debug Events

| Event | When | Data |
|-------|------|------|
| `COMBO_CATEGORY_MISMATCH` | Categories differ | `{category1, category2}` |

---

# Phase 2 (Deferred - Future Sprint)

## 1-Shot Auto-Scan UX

- Update LearnARV2.tsx state machine
- Remove "+ Add card" button
- Auto-transition when 2 cards detected
- Show scanning progress overlay

**Status:** Deferred to later sprint.
