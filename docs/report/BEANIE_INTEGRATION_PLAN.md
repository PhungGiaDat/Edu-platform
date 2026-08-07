# Beanie ODM Integration Plan
**Date:** 2026-07-22
**Status:** Planned

## Audit Summary

| Item | Status |
|------|--------|
| Beanie version | 1.30.0 (Pydantic v2 compatible) |
| Existing DB driver | Motor async + Beanie ODM |
| `init_beanie()` call | `database/connection.py` → `init_mongodb()` |
| Existing Beanie Documents | 12 models already registered |
| `ARCombination` model | Plain `Pydantic BaseModel` (no schema enforcement on write) |
| Repository layer | `BaseRepository` + raw Motor `find()` |
| API layer | `api/combos.py` → `ARService` → `ARCombinationRepository` |
| Existing tests | 22/22 pass |

## Target Architecture

```
FastAPI lifespan startup
    └── connect_to_database()
            └── init_mongodb(mongo_url, db_name, document_models)
                    └── init_beanie(database, document_models=[ARCombination, ...])
                            └── Motor client + Beanie Document registry

api/combos.py
    └── ARService.check_combo()        ← dict-based (unchanged API)
            └── ARCombinationRepository  ← Beanie queries (same public API)

models/ar_combination.py
    └── ARCombination (Beanie Document) ← schema enforced on insert/update
    └── ArCombinationSchema (Pydantic) ← DTO for API responses (unchanged)
```

## File Changes

| File | Action | Notes |
|------|--------|-------|
| `models/ar_combination.py` | Convert `ArCombinationSchema` → `ARCombination(BeanieDocument)` | Keep schema class as DTO |
| `models/__init__.py` | Export new `ARCombination` | |
| `database/connection.py` | Add `ARCombination` to `document_models` list | |
| `repositories/ar_combination_repository.py` | Replace raw Motor with Beanie queries | Same method signatures |
| `api/combos.py` | Remove `_to_combo_response()` dict mapping, use Beanie directly | |
| `services/ar_service.py` | Unchanged (dict return types preserved) | |
| `tests/test_beanie_odm.py` | New test file | |
| `database/README.md` | New how-to guide | |

## Beanie Model Design

```
class ARCombination(Document):
    id:          PydanticObjectId | None   (Beanie-managed _id)
    combo_id:    Indexed(str, unique=True)
    description: str
    required_tags: List[str]
    target_order: Optional[List[str]]       (deprecated, nullable)
    model_3d_url: str
    texture_url: Optional[str]
    image_2d_url: str
    combo_mind_url: Optional[str]
    bonus_xp: int
    center_transform: Optional[TransformSchema]
    semantic_result: Optional[str]
    animation: Optional[str]
    sound: Optional[str]
    phrase: Optional[str]
    priority: int
    active: bool
    flashcard_set: Optional[str]

    class Settings:
        name = "ar_combinations"
        indexes = [
            [("combo_id", 1)],          # unique
            [("required_tags", 1)],     # for find_by_tag
            [("flashcard_set", 1), ("active", 1)],  # for by-set query
        ]
```

## Repository Query Changes

| Method | Before | After |
|--------|--------|-------|
| `get_by_combo_id` | `{"combo_id": combo_id}` | `ARCombination.find(ARCombination.combo_id == combo_id).first()` |
| `find_by_tag` | `{"required_tags": ar_tag}` | `ARCombination.find(ARCombination.required_tags == ar_tag).to_list()` |
| `find_by_tags` | `{"required_tags": {"$all": ar_tags}}` | `ARCombination.find(ARCombination.required_tags.all(ar_tags)).to_list()` |
| `find_by_any_tag` | `{"required_tags": {"$in": ar_tags}}` | `ARCombination.find(ARCombination.required_tags.in_(ar_tags)).to_list()` |
| `find_many` | `collection.find(filter).skip().limit()` | `.find(F()).skip().limit()` |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| 9 existing docs have stray fields (`reward_points`, etc.) | Medium | Use `unknown_field_warnings = False` (Beanie default = ignore) during migration; flip to strict after |
| `BaseRepository` still used by other repos | Low | Don't touch `BaseRepository` — only `ARCombinationRepository` changes |
| Sync callers of `db_manager.get_collection()` | None | `get_collection()` still works for raw access |
| Beanie `PydanticObjectId` vs raw `ObjectId` | Low | Beanie handles conversion; tests verify round-trip |

## Rollback Strategy

1. Revert `models/ar_combination.py` to plain `BaseModel`
2. Remove `ARCombination` from `document_models` list in `database/connection.py`
3. Restore raw Motor queries in `repositories/ar_combination_repository.py`
4. Restart app — no data lost (MongoDB schema is implicit)

## Migration Steps (Execution Order)

1. Install `beanie` (already done: 1.30.0)
2. Convert `models/ar_combination.py` → Beanie Document
3. Export `ARCombination` in `models/__init__.py`
4. Register `ARCombination` in `database/connection.py`
5. Rewrite `repositories/ar_combination_repository.py` → Beanie queries
6. Simplify `api/combos.py` — remove `_to_combo_response()`, use Beanie dict directly
7. Add `tests/test_beanie_odm.py`
8. Run full test suite → all pass
9. Write `database/README.md`
10. Save plan to `report/BEANIE_INTEGRATION_PLAN.md`
