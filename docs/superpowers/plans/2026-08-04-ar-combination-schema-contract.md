# AR Combination Schema Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return HTTP 200 for flashcards with related AR combos and provide a safe, explicit cross-category backfill.

**Architecture:** `ARCombination` remains the persistence model, while `ArCombinationSchema` is the strict public DTO. A shared serializer selects DTO fields at every API boundary. The MongoDB migration uses an explicit nine-combo map, defaults to dry-run, and requires `--apply` for writes.

**Tech Stack:** Python 3.10+, FastAPI, Pydantic v2, Beanie, Motor, Pytest.

## Global Constraints

- Work directly on `MindAR-Update`; do not create a worktree.
- Preserve `center_transform` in the public combo response.
- Never expose Beanie `id` or MongoDB `_id` in combo API payloads.
- Migration execution defaults to dry-run and must not mutate live MongoDB without `--apply`.
- Do not add a MongoDB validator until after data cleanup has been applied and verified.

---

### Task 1: Regression coverage for related-combo serialization

**Files:**
- Create: `backend/tests/test_flashcard_ar_response.py`
- Modify: `backend/models/ar_combination.py:23-159`
- Modify: `backend/services/ar_service.py:27-60`
- Modify: `backend/api/combos.py:18-61`

**Interfaces:**
- Consumes: `api.flashcards.router`, `services.ar_service.get_ar_service`.
- Produces: `serialize_ar_combination(combo: Mapping[str, Any]) -> ArCombinationSchema`.

- [ ] **Step 1: Write the failing endpoint regression test**

Create a small FastAPI app containing only `flashcard_router`, override
`get_ar_service` with an `AsyncMock`, and return a complete flashcard, target,
and raw combo containing `id`, `_id`, and `center_transform`:

```python
def test_flashcard_with_related_combo_returns_public_combo_contract():
    service = AsyncMock()
    service.get_ar_experience.return_value = ar_experience_with_raw_combo()
    app.dependency_overrides[get_ar_service] = lambda: service
    response = TestClient(app, raise_server_exceptions=False).get(
        "/api/v1/flashcard/ele123"
    )
    assert response.status_code == 200
    combo = response.json()["related_combos"][0]
    assert combo["center_transform"]["scale"] == "0.65 0.65 0.65"
    assert "id" not in combo
    assert "_id" not in combo
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
& .\.venv\Scripts\python.exe -m pytest .\backend\tests\test_flashcard_ar_response.py -q -p no:cacheprovider
```

Expected: FAIL because FastAPI returns HTTP 500 with `extra_forbidden` for
`id`, `center_transform`, and `_id`.

- [ ] **Step 3: Add the shared public serializer**

Add `center_transform: Optional[TransformSchema] = None` to
`ArCombinationSchema`, then add:

```python
def serialize_ar_combination(combo: Mapping[str, Any]) -> ArCombinationSchema:
    payload = {
        field: combo[field]
        for field in ArCombinationSchema.model_fields
        if field in combo
    }
    if "bonus_xp" not in payload and "reward_xp" in combo:
        payload["bonus_xp"] = combo["reward_xp"]
    return ArCombinationSchema.model_validate(payload)
```

Use this function in `api/combos.py` instead of its private field-by-field
mapper. Include `cross_category_allowed` and `center_transform` automatically.

- [ ] **Step 4: Serialize related combos in ARService**

Change `get_ar_experience()` to serialize repository results before returning:

```python
raw_combos = await self.ar_combination_repo.find_by_tag(ar_tag)
related_combos = [serialize_ar_combination(combo) for combo in raw_combos]
```

- [ ] **Step 5: Run the regression and related tests GREEN**

Run:

```powershell
& .\.venv\Scripts\python.exe -m pytest .\backend\tests\test_flashcard_ar_response.py .\backend\tests\test_beanie_odm.py .\backend\tests\test_ar_service.py -q -p no:cacheprovider
```

Expected: all tests pass.

- [ ] **Step 6: Commit the response-contract fix**

Stage only the four task files and commit:

```text
fix(ar): align combo persistence and response schemas
```

---

### Task 2: Safe explicit cross-category migration

**Files:**
- Modify: `backend/scripts/migrate_cross_category_flag.py`
- Create: `backend/tests/test_cross_category_migration.py`

**Interfaces:**
- Produces: `KNOWN_COMBO_FLAGS: dict[str, bool]`.
- Produces: `build_update_filter(combo_ids: Collection[str], desired: bool) -> dict`.
- Produces: `migrate_cross_category_combos(collection, apply: bool = False) -> MigrationReport`.

- [ ] **Step 1: Write failing migration tests**

Test these behaviors:

```python
def test_filter_uses_and_with_two_or_groups():
    query = build_update_filter(["jungle_scene_v1"], True)
    assert list(query) == ["$and"]
    assert len(query["$and"]) == 2
    assert all("$or" in group for group in query["$and"])

@pytest.mark.asyncio
async def test_dry_run_never_writes():
    collection = fake_collection(live_combo_documents())
    report = await migrate_cross_category_combos(collection, apply=False)
    collection.update_many.assert_not_awaited()
    assert report.mode == "dry-run"

@pytest.mark.asyncio
async def test_apply_updates_only_explicit_ids():
    collection = fake_collection(live_combo_documents())
    await migrate_cross_category_combos(collection, apply=True)
    assert collection.update_many.await_count == 2
```

Also assert the explicit `True` IDs are exactly:

```python
{
    "birthday_party_v1",
    "jungle_scene_v1",
    "picnic_day_v1",
    "road_trip_v1",
    "safari_adventure_v1",
}
```

The remaining known IDs are explicitly `False`.

- [ ] **Step 2: Run migration tests and verify RED**

Run:

```powershell
& .\.venv\Scripts\python.exe -m pytest .\backend\tests\test_cross_category_migration.py -q -p no:cacheprovider
```

Expected: FAIL because the current script has no dry-run flag, explicit map, or
testable query builder.

- [ ] **Step 3: Implement the explicit migration plan**

Replace regex inference with:

```python
KNOWN_COMBO_FLAGS = {
    "birthday_party_v1": True,
    "desert_oasis_v1": False,
    "forest_scene_v1": False,
    "fruit_basket_v1": False,
    "jungle_scene_v1": True,
    "picnic_day_v1": True,
    "race_track_v1": False,
    "road_trip_v1": True,
    "safari_adventure_v1": True,
}
```

Build each true/false update query as an `$and` of an explicit combo-ID `$or`
and a current-value `$or`. Read documents first, report missing and unexpected
IDs, and call `update_many` only when `apply=True`. Parse `--apply` with
`argparse`; absence of the flag is dry-run.

- [ ] **Step 4: Run migration tests GREEN**

Run the targeted migration tests and the complete AR backend set. Expected: all
pass with no database connection.

- [ ] **Step 5: Run live migration in dry-run mode**

Run:

```powershell
& .\.venv\Scripts\python.exe .\backend\scripts\migrate_cross_category_flag.py
```

Expected: reports nine planned changes, five `true` and four `false`, and zero
writes. Do not pass `--apply` in this implementation flow.

- [ ] **Step 6: Commit migration safety**

Stage only the migration and its test, then commit:

```text
fix(ar): make cross-category migration explicit and dry-run safe
```

---

### Task 3: Final verification and publication

**Files:**
- Verify only; no new production files.

**Interfaces:**
- Consumes: the shared serializer and migration report from Tasks 1-2.
- Produces: a verified `MindAR-Update` commit range ready for deployment.

- [ ] **Step 1: Run backend AR tests**

```powershell
& .\.venv\Scripts\python.exe -m pytest .\backend\tests\test_flashcard_ar_response.py .\backend\tests\test_cross_category_migration.py .\backend\tests\test_beanie_odm.py .\backend\tests\test_ar_service.py -q -p no:cacheprovider
```

- [ ] **Step 2: Run backend compile check**

```powershell
& .\.venv\Scripts\python.exe -m compileall -q .\backend\api .\backend\models .\backend\repositories .\backend\services .\backend\scripts
```

- [ ] **Step 3: Verify staged and branch scope**

Confirm `git diff --check`, no temporary audit files, and no user-owned untracked
files staged.

- [ ] **Step 4: Fetch and publish**

Fetch `origin/MindAR-Update`, verify the branch is not behind, and push the
focused commits to `origin/MindAR-Update`. Do not apply the live MongoDB
migration.
