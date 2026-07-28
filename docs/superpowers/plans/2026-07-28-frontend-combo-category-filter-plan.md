# Frontend Combo Category Filter + Backend Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category filtering to prevent invalid combo checks when flashcards from different categories are scanned together. Includes both frontend (MindAR) and backend enhancements.

**Architecture:**
- **Frontend:** Filter combos at `useMultiFlashcard.ts` level before backend call
- **Backend:** Add `cross_category_allowed` field to combo model + index on categories
- **Pattern:** Frontend provides UX filtering + backend enforces business rules

**Tech Stack:** TypeScript (Frontend), Python/FastAPI (Backend), MongoDB/Beanie

---

## Global Constraints

- Follow existing code patterns in both `useMultiFlashcard.ts` and `backend/models/ar_combination.py`
- Keep API backward compatible (add optional fields only)
- Add debug logging for troubleshooting
- Use existing `comboResolution` state pattern

---

## Scope

| Component | Included |
|-----------|----------|
| `frontend-web/src/hooks/useMultiFlashcard.ts` | ✅ |
| `backend/models/ar_combination.py` | ✅ |
| `backend/services/ar_service.py` | ✅ |
| `backend/api/combos.py` | ❌ (no changes needed) |
| Mobile RN / Unity | ❌ |

---

# PART 1: BACKEND CHANGES

---

## Task B1: Update ARCombination Model

**Files:**
- Modify: `backend/models/ar_combination.py`

**Interfaces:**
- Consumes: Existing MongoDB schema
- Produces: Updated `ArCombination` Beanie Document with `cross_category_allowed`

**Steps:**

- [ ] **Step 1: Add `cross_category_allowed` field to ArCombination Document**

Find the `ArCombination` class (around line 15-30) and add the new field after `active`:

```python
class ArCombination(Document):
    """
    AR Combination Document - stored in MongoDB
    Collection: ar_combinations
    """
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
    # True = combo works across different categories (e.g., animal + plant)
    # False = only same-category flashcards
    cross_category_allowed: bool = Field(default=False)
    
    # Metadata
    priority: int = Field(default=0)
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
```

- [ ] **Step 2: Update Pydantic schemas for API**

Find `ArCombinationSchema` (around line 60-80) and add the field:

```python
class ArCombinationSchema(BaseModel):
    """Schema for API responses"""
    combo_id: str
    description: str
    required_tags: List[str]
    target_order: Optional[List[str]]
    model_3d_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    texture_url: Optional[str] = None
    combo_mind_url: Optional[str] = None
    bonus_xp: int = Field(default=100, alias="reward_xp")
    
    # Semantic fields
    semantic_result: Optional[str] = None
    animation: Optional[str] = None
    sound: Optional[str] = None
    phrase: Optional[str] = None
    
    # NEW
    cross_category_allowed: bool = Field(default=False)
    
    priority: int = Field(default=0)
    active: bool = Field(default=True)
    flashcard_set: Optional[str] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True
```

- [ ] **Step 3: Add index on required_tags for faster lookups**

Find the `Settings` class and add compound index:

```python
class Settings:
    name = "ar_combinations"
    indexes: list = [
        [("combo_id", 1)],  # Unique
        [("required_tags", 1)],  # For combo lookup
        [("active", 1), ("priority", -1)],  # Active combos sorted by priority
    ]
```

---

## Task B2: Update ARService Combo Check Logic

**Files:**
- Modify: `backend/services/ar_service.py`

**Interfaces:**
- Consumes: `ArCombination` model, flashcard categories
- Produces: Category mismatch detection

**Steps:**

- [ ] **Step 1: Add category validation in check_combo**

Find the `check_combo` method (around line 80-120) and add category checking:

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
    
    # Find combo with matching tags (unordered match)
    query = {
        "required_tags": {"$all": tags},
        "active": True
    }
    
    combos = await ArCombination.find(query).to_list()
    
    if not combos:
        return None
    
    # Sort by priority (highest first)
    combos.sort(key=lambda x: x.priority, reverse=True)
    combo = combos[0]
    
    # NEW: Validate categories
    # Get all flashcards for these tags
    flashcards = await Flashcard.find(
        Flashcard.ar_tag.in_(tags)
    ).to_list()
    
    if not flashcards:
        return None
    
    # Get unique categories
    categories = set(fc.category for fc in flashcards if fc.category)
    
    # Check if cross-category is allowed
    if len(categories) > 1 and not combo.cross_category_allowed:
        logger.info(f"[ARService] Combo {combo.combo_id} rejected: different categories {categories}")
        return None
    
    return combo.model_dump()
```

- [ ] **Step 2: Add category field to flashcard lookup**

Ensure the `Flashcard` model is imported at the top:

```python
from models.flashcard import Flashcard
```

---

## Task B3: Backend Test

**Files:**
- Modify: `backend/tests/test_ar_service.py` (create if not exists)

**Steps:**

- [ ] **Step 1: Write test for same-category combo (allowed)**

```python
async def test_combo_same_category_allowed():
    """Same category combos should work regardless of cross_category_allowed flag"""
    # Create test flashcards
    fc1 = await Flashcard.create(
        qr_id="test_cat1",
        word="test1",
        translation={"en": "test1"},
        category="animals",
        ar_tag="tag_animal_1"
    )
    fc2 = await Flashcard.create(
        qr_id="test_cat2", 
        word="test2",
        translation={"en": "test2"},
        category="animals",
        ar_tag="tag_animal_2"
    )
    
    # Create combo (cross_category_allowed defaults to False)
    combo = await ArCombination.create(
        combo_id="test_combo_same",
        description="Same category test",
        required_tags=["tag_animal_1", "tag_animal_2"],
        cross_category_allowed=False
    )
    
    result = await ar_service.check_combo(["tag_animal_1", "tag_animal_2"])
    assert result is not None
    assert result["combo_id"] == "test_combo_same"
```

- [ ] **Step 2: Write test for cross-category combo (rejected)**

```python
async def test_combo_cross_category_rejected():
    """Different categories should be rejected when cross_category_allowed=False"""
    fc1 = await Flashcard.create(
        qr_id="test_dog",
        word="dog",
        translation={"en": "dog"},
        category="animals",
        ar_tag="tag_dog"
    )
    fc2 = await Flashcard.create(
        qr_id="test_apple",
        word="apple", 
        translation={"en": "apple"},
        category="fruits",
        ar_tag="tag_apple"
    )
    
    # Create combo without cross_category_allowed
    combo = await ArCombination.create(
        combo_id="test_combo_cross",
        description="Cross category test",
        required_tags=["tag_dog", "tag_apple"],
        cross_category_allowed=False
    )
    
    result = await ar_service.check_combo(["tag_dog", "tag_apple"])
    assert result is None  # Should be rejected
```

- [ ] **Step 3: Write test for cross-category combo (allowed)**

```python
async def test_combo_cross_category_allowed():
    """Different categories should be allowed when cross_category_allowed=True"""
    fc1 = await Flashcard.create(
        qr_id="test_elephant",
        word="elephant",
        translation={"en": "elephant"},
        category="animals",
        ar_tag="tag_elephant"
    )
    fc2 = await Flashcard.create(
        qr_id="test_palm",
        word="palm",
        translation={"en": "palm"},
        category="plants",
        ar_tag="tag_palm"
    )
    
    # Create combo with cross_category_allowed=True
    combo = await ArCombination.create(
        combo_id="test_combo_eco",
        description="Eco system combo",
        required_tags=["tag_elephant", "tag_palm"],
        cross_category_allowed=True
    )
    
    result = await ar_service.check_combo(["tag_elephant", "tag_palm"])
    assert result is not None
    assert result["combo_id"] == "test_combo_eco"
```

---

## Task B4: Backend Commit

**Steps:**

- [ ] **Step 1: Stage backend changes**

```bash
git add backend/models/ar_combination.py backend/services/ar_service.py
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(backend): add cross_category_allowed field to AR combos

- Add cross_category_allowed bool field to ArCombination model
- Validate flashcard categories in check_combo service
- Reject cross-category combos when flag is False
- Add index on required_tags for faster lookups
- Update Pydantic schema for API response"
```

---

# PART 2: FRONTEND CHANGES (MindAR)

---

## Task F1: Update FlashcardData Interface

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:66-75`

**Steps:**

- [ ] **Step 1: Add `category` field to FlashcardData interface**

```typescript
interface FlashcardData {
    qrId: string;
    arTag: string;
    word: string;
    category: string; // NEW
    model3dUrl: string;
    image2dUrl: string;
    textureUrl?: string;
    mindUrl: string;
    detectedAt: number;
}
```

---

## Task F2: Store Category from API Response

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:191-201`

**Steps:**

- [ ] **Step 1: Extract category from API response**

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

- [ ] **Step 2: Add debug logging**

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

## Task F3: Implement Category Filter in checkCombo

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:294-320`

**Steps:**

- [ ] **Step 1: Add category validation at start of checkCombo**

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

## Task F4: Add Helper Functions

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`

**Steps:**

- [ ] **Step 1: Add getCategories helper**

```typescript
/**
 * Get all unique categories from detected flashcards
 */
const getCategories = useCallback((): string[] => {
    const categories = Array.from(state.detectedFlashcards.values()).map(f => f.category);
    return [...new Set(categories)];
}, [state.detectedFlashcards]);
```

- [ ] **Step 2: Export in return object**

Add `getCategories` to the return object.

---

## Task F5: Frontend Test Verification

**Steps:**

- [ ] **Step 1: Verify debug output**

Open DevTools console, filter `[MultiFlashcard]`:

| Scenario | Expected Console |
|----------|-----------------|
| Animals + Fruits | `COMBO_CATEGORY_MISMATCH` |
| Elephant + Palm | `COMBO_LOOKUP_STARTED` |
| Apple + Banana | `COMBO_LOOKUP_STARTED` |

---

## Task F6: Frontend Commit

**Steps:**

- [ ] **Step 1: Stage frontend changes**

```bash
git add frontend-web/src/hooks/useMultiFlashcard.ts
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(frontend): add category filtering to combo detection

- Add category field to FlashcardData interface
- Extract category from API response
- Skip backend combo check when categories differ
- Add debug logging for category mismatches
- Add getCategories helper for debugging"
```

---

# PART 3: INTEGRATION

---

## Task I1: Update Existing Combos

**Files:**
- Create: `backend/scripts/migrate_combos_cross_category.py`

**Steps:**

- [ ] **Step 1: Create migration script**

```python
"""
Migration: Set cross_category_allowed=True for existing jungle/nature combos
"""
from models.ar_combination import ArCombination

async def migrate():
    # Jungle ecosystem combos (elephant + palm tree)
    jungle_combos = await ArCombination.find(
        ArCombination.description.contains("jungle") |
        ArCombination.description.contains("ecosystem") |
        ArCombination.combo_id.contains("elephant")
    ).to_list()
    
    for combo in jungle_combos:
        combo.cross_category_allowed = True
        await combo.save()
        print(f"Updated: {combo.combo_id}")
    
    print(f"Total updated: {len(jungle_combos)}")
```

- [ ] **Step 2: Run migration**

```bash
python -m backend.scripts.migrate_combos_cross_category
```

---

## Task I2: Final Verification

**Steps:**

- [ ] **Step 1: Test flow**

1. Scan Elephant flashcard (category: animals)
2. Scan Palm flashcard (category: plants)
3. Verify: Backend receives combo check request
4. Verify: Backend returns combo with `cross_category_allowed: true`
5. Verify: Frontend loads combo `.mind` file

- [ ] **Step 2: Test rejection flow**

1. Scan Dog flashcard (category: animals)
2. Scan Apple flashcard (category: fruits)
3. Verify: Frontend skips API call OR backend returns no combo
4. Verify: Console shows `COMBO_CATEGORY_MISMATCH`

---

## Task I3: Final Commit

**Steps:**

- [ ] **Step 1: Stage all changes**

```bash
git add backend/scripts/migrate_combos_cross_category.py
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: add migration script for cross_category_allowed flag"
```

---

# Summary

## Changes by Component

| Component | File | Changes |
|-----------|------|---------|
| **Backend Model** | `backend/models/ar_combination.py` | Add `cross_category_allowed` field, index |
| **Backend Service** | `backend/services/ar_service.py` | Category validation in `check_combo` |
| **Backend Test** | `backend/tests/test_ar_service.py` | 3 test cases |
| **Backend Script** | `backend/scripts/migrate_combos_cross_category.py` | Migration for existing combos |
| **Frontend Hook** | `frontend-web/src/hooks/useMultiFlashcard.ts` | Category filter, debug logging |

## Task Order

| Phase | Task | Description |
|-------|------|-------------|
| 1 | B1-B4 | Backend changes first |
| 2 | F1-F6 | Frontend changes |
| 3 | I1-I3 | Integration + migration |

## Total Estimated Changes

- **Backend:** ~80 lines
- **Frontend:** ~30 lines
- **Tests:** ~60 lines
- **Migration:** ~20 lines

---

## Phase 2 (Optional Future Work)

If offline combo validation is needed:

1. Create `frontend-web/src/data/combo-rules.ts` with local combo rules
2. Implement sorted-key lookup for instant local filtering
3. Fall back to backend for unknown combos

This is out of scope for current implementation.
