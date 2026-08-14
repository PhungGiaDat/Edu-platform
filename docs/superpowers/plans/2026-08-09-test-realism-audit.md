# Test Realism Audit — AR Artifact MongoDB Recovery

**Date:** 2026-08-09
**Scope:** Concerns raised during pre-merge review of the AR artifact MongoDB engine recovery work (see
`docs/superpowers/plans/2026-08-07-ar-artifact-mongodb-engine-recovery.md` and
`plan/20260808_MIGRATION_SAFETY_REVIEW.md`).

**Goal:** Replace hand-rolled fakes that masked real-MongoDB shape and semantics with tests that drive the
production code paths against shape-correct fakes, so future regressions cannot hide behind false-green
coverage.

**Method:** RED → fix → GREEN; every claim in this report is backed by a pytest run output.

---

## Concerns raised

| # | Concern | User phrasing |
|---|---------|---------------|
| 1 | The fake `listCollections` used by the validator tests does not look like a real MongoDB response. | "fake listCollections trong test không giống response thật của MongoDB" |
| 2 | The "missing different from null" test asserts a structural difference that does not translate into a semantic difference when MongoDB evaluates the clauses. | "test 'missing khác null' lại kỳ vọng query cho MISSING match cả missing lẫn null" |

Both concerns were raised before the user ran the suite. The user wanted to (a) run the suite in the project
venv, (b) add probes that simulate the real MongoDB shape to avoid false-green coverage, and (c) record
the evidence in `docs/`.

---

## Baseline (pre-change)

```text
$ cd backend && ..\.venv\Scripts\python.exe -m pytest -q \
    tests/test_audit_ar_objects_consistency.py \
    tests/test_ar_objects_validator.py \
    tests/test_repair_cas_safety.py \
    tests/test_validator_apply_safety.py \
    tests/test_repair_ar_objects_consistency.py

23 passed in 8.62s
```

The baseline passes. The user's suspicion was that the pass was a false-green because the safety tests
pin shape, not semantics. Two probes confirmed this.

---

## Probe 1 — Real `listCollections` wire reply vs. production readback

Source: `backend/scripts/audit_probe_mongo_shapes.py` (run during the audit, removed after evidence was
captured).

The probe feeds the production readback (`_fetch_validator_metadata`) the exact wire reply that
`PyMongo.command({listCollections: 1, filter: ...})` returns:

```python
{
    "cursor": {
        "firstBatch": [{"name": "ar_objects", "options": {"validator": {...}, "validationAction": "warn"}}],
        "id": 0,
        "ns": "db.$cmd.listCollections",
    },
    "ok": 1.0,
}
```

Pre-fix result:

```text
readback_wire_error= AttributeError 'str' object has no attribute 'get'
```

The old production readback called `await db.command({...})`, which returns a plain `dict`, then tried
`to_list()` and `__aiter__` (both absent on `dict`), then fell back to `for row in cursor` which iterated
**keys** of the wire reply (`"cursor"`, `"ok"`). The first key is a `dict`; the second is a float; the
`dict.get("options")` step actually triggers a `for row in dict:` that yields string keys, and the next
statement tries to call `.get` on a string, raising `AttributeError: 'str' object has no attribute 'get'`.

In the pre-fix test, the `_FakeCommandCursor` implemented `to_list`, `__aiter__`, `__anext__`, AND a
synchronous `next()` — a shape no real Motor cursor has. PyMongo's `Database.command` is annotated
`-> dict[str, Any]`. The only reason the suite passed was the fake.

**Verdict:** Real production bug. The `listCollections` readback in `apply_ar_objects_validator.py` is
broken against any real `mongod`.

## Probe 2 — `mongomock` evaluation of MISSING/null clauses

Source: `backend/scripts/audit_probe_missing_vs_null.py` (run during the audit, removed after evidence
was captured). Three documents seeded: `_id=missing` (no field), `_id=explicit_null` (`{x: null}`),
`_id=present` (`{x: "legacy"}`).

```text
exists_false            -> ['missing']
bare_null               -> ['bare_null', 'explicit_null', 'missing']
eq_null                 -> ['bare_null', 'explicit_null', 'missing']
missing_field_in_or     -> ['bare_null', 'explicit_null', 'missing']
null_field_in_or        -> ['bare_null', 'explicit_null', 'missing']
```

`{x: null}` and `{x: {$eq: null}}` both match a missing field under MongoDB. The two `$or` clauses
emitted by `_old_value_clause` are structurally different but evaluate to the same document set. The
existing test `test_old_value_clause_treats_missing_and_null_as_distinct` only compared literal
dictionaries and never executed the query.

The pre-fix MISSING clause was a `{$or: [{$exists: False}, {$eq: null}]}` — defensible only when
combined with `{$and: [{_id: ...}, ...]}` in `build_filter`, because `$and(_id)` narrows to a single
document. Outside that contract, the widened clause over-matches. The audit promotes the clause to its
narrow form (`{$exists: False}`) and uses `$type: "null"` (BSON alias 10) for explicit nulls, so the
clauses are semantically distinct without relying on caller-side `$and` narrowing.

**Verdict:** Real semantics bug. The two clauses match the same document set. The test was a false-green
even though the production code was technically "correct" in the only place it is used (inside
`build_filter`).

---

## Tests added

New file: `backend/tests/test_real_mongo_shapes.py`

| Test | What it pins |
|---|---|
| `test_fetch_validator_metadata_handles_real_wire_reply_dict` | The production readback handles the real PyMongo `dict` wire reply. Uses a fake that mirrors `Database.command` exactly. |
| `test_fetch_validator_metadata_uses_list_collections_helper` | The preferred path is the Motor `list_collections(filter=...)` helper. |
| `test_fetch_validator_metadata_returns_none_when_collection_missing` | Empty `firstBatch` produces the documented "not found" sentinel. |
| `test_fetch_validator_metadata_signature_does_not_assume_cursor_interface` | Locks down the cursor-shape branches to at most two (the helper and the wire-reply fallback), preventing the original three-branch `hasattr` ladder. |
| `test_old_value_clause_matches_only_its_own_state[missing]` | mongomock-based RED test for the MISSING clause. Asserts that the clause matches only `_id=missing`, never `_id=explicit_null`. |
| `test_old_value_clause_matches_only_its_own_state[missing_minimal]` | Minimal two-doc variant for the same invariant. |
| `test_old_value_clause_must_not_match_null_for_missing_state` | Direct regression pin — MISSING must not over-match explicit null. |

RED state for the new file (before fixes):

```text
tests\test_real_mongo_shapes.py FFF.FFF                                  [100%]
6 failed, 1 passed
```

Failures listed the production AttributeError, the misset of the missing field with explicit nulls, and the
widened clause over-match.

---

## Production fixes

### 1. `apply_ar_objects_validator._fetch_validator_metadata`

The function now prefers `db.list_collections(filter=...)` (the recommended Motor helper) and falls
back to unpacking the wire reply only when the helper is unavailable. The three-branch `hasattr`
ladder is gone.

```python
if hasattr(db, "list_collections"):
    cursor = db.list_collections(filter={"name": "ar_objects"})
    if hasattr(cursor, "to_list"):
        rows = await cursor.to_list(length=1)
    else:
        async for row in cursor:  # pragma: no cover
            ...
else:
    reply = await db.command({"listCollections": 1, "filter": {"name": "ar_objects"}})
    if isinstance(reply, Mapping):
        first_batch = reply.get("cursor", {}).get("firstBatch")
        if isinstance(first_batch, list):
            rows = first_batch[:1]
```

### 2. `repair_ar_objects_consistency._old_value_clause`

Each value kind now produces a semantically distinct clause:

| `old_value` | Clause | Why |
|---|---|---|
| `MISSING` | `{field: {"$exists": False}}` | Matches only the absent state. |
| `None` | `{field: {"$type": "null"}}` | Matches only an explicit BSON null. |
| scalar | `{"$or": [{field: v}, {field: {"$eq": v}}]}` | Unchanged. Present scalar. |

`build_filter` is unchanged; the `$and(_id)` narrowing still applies on top.

### 3. Test fakes updated to real Motor shape

`test_validator_apply_safety.py` had three hand-rolled `_FakeCommandCursor`/`_Cursor` classes that
returned fake cursors from `db.command({listCollections:1})`. Real Motor never does that. The fakes
were migrated to the `db.list_collections(filter=...)` helper shape, which mirrors what
`motor.motor_asyncio.AsyncIOMotorDatabase.list_collections` actually returns. The original
collMod-wipe, index-failure, and credential-logging contracts are still asserted; only the cursor
shape changed.

### 4. `test_repair_cas_safety.py` clause extraction helper

The two existing CAS tests asserted `next(iter(clause["$or"][0].keys()))`. After the fix, MISSING
clauses use `$exists` and null clauses use `$type`, so the helper was lifted to a module-level
`_constrained_fields_from_filter` that walks the three supported shapes.

### 5. `test_repair_ar_objects_consistency.py::test_compare_and_set_filter_uses_explicit_and_or_groups`

Updated to assert at least one narrowing operator (`$or` / `$exists` / `$type`) is present, and that
the first two clauses are the `{_id: ...}` and `{ar_tag: ...}` pins.

---

## Evidence — post-change

### Concern #1 (readback) — RED then GREEN

```text
# RED
tests\test_real_mongo_shapes.py FFF.FFF                                  [100%]
FAILED test_fetch_validator_metadata_handles_real_wire_reply_dict
FAILED test_fetch_validator_metadata_uses_list_collections_helper
FAILED test_fetch_validator_metadata_returns_none_when_collection_missing
AttributeError: 'str' object has no attribute 'get'

# After fix
tests\test_real_mongo_shapes.py .......                                  [ 30%]
tests\test_validator_apply_safety.py .......                             [ 60%]
7 + 7 passed
```

### Concern #2 (MISSING vs null) — RED then GREEN

```text
# RED
E   AssertionError: _old_value_clause {'$or': [{'tracking_mode': {'$exists': False}}, ...]} must
    match exactly ['missing'] under MongoDB semantics, but matched ['explicit_null', 'missing'].

# After fix
tests\test_real_mongo_shapes.py .....F. -> .......                        [all pass]
test_old_value_clause_treats_missing_and_null_as_distinct -> PASS
```

### Focused suite

```text
$ ..\.venv\Scripts\python.exe -m pytest -q \
    tests/test_real_mongo_shapes.py \
    tests/test_validator_apply_safety.py \
    tests/test_repair_cas_safety.py \
    tests/test_repair_ar_objects_consistency.py

23 passed in 8.81s
```

### Full backend suite

```text
$ ..\.venv\Scripts\python.exe -m pytest -q tests/

302 collected
300 passed, 1 skipped, 1 failed
```

The single failure is `test_course_schema_integrity::test_normalizeCoursePayload_rejectsMissingGeneratedCourseBlock`
and is **pre-existing and unrelated to this audit**. We confirmed this by stashing the audit changes
(`git stash -u`) and re-running the test on the unmodified tree — the same test fails identically
("DID NOT RAISE ValueError"). The failure is a course-payload validator regression outside the
AR artifact recovery scope and should be tracked separately.

---

## Files changed

| Path | Change |
|---|---|
| `backend/database/migrations/apply_ar_objects_validator.py` | `_fetch_validator_metadata` now uses the `list_collections` helper and unpacks the wire reply when the helper is unavailable. |
| `backend/database/migrations/repair_ar_objects_consistency.py` | `_old_value_clause` now produces three semantically distinct forms (`$exists: False` / `$type: "null"` / `$or` of equality). |
| `backend/tests/test_real_mongo_shapes.py` | **New** — RED tests with real Motor/MongoDB shape and `mongomock` semantics. |
| `backend/tests/test_repair_cas_safety.py` | Lifted `_constrained_fields_from_filter` helper to module scope; updated assertions for the three clause shapes. |
| `backend/tests/test_repair_ar_objects_consistency.py` | Updated `test_compare_and_set_filter_uses_explicit_and_or_groups` to assert structural narrowing instead of counting `$or` branches. |
| `backend/tests/test_validator_apply_safety.py` | Replaced fake `db.command({listCollections:1})` cursors with real `db.list_collections(filter=...)` cursors. |
| `docs/superpowers/plans/2026-08-09-test-realism-audit.md` | This report. |

No production data was touched. The audit ran entirely in the project venv and used a temporary
`backend/scripts/audit_probe_*.py` pair that was deleted before committing.

---

## Residual risks and follow-ups

1. **`mongomock` does not implement `$type: "null"`.** The structural test for the null clause lives
   in `test_repair_cas_safety.py::test_old_value_clause_treats_missing_and_null_as_distinct` and
   asserts the literal shape. A real-mongod integration test is the only way to evaluate the null
   clause end-to-end; recommend adding a `testcontainers`-based test in CI that exercises
   `_apply_repairs_async` against a live `mongod`.
2. **The original three-branch `hasattr` ladder** is now reduced to two branches (helper + wire-reply
   fallback). A future contributor could still re-add branches. The
   `test_fetch_validator_metadata_signature_does_not_assume_cursor_interface` test pins the branch
   count to ≤ 2; it does not pin the *exact* branches. A more strict assertion is possible but would
   over-couple the test to the implementation.
3. **The pre-existing `test_normalizeCoursePayload_rejectsMissingGeneratedCourseBlock` failure**
   is unrelated to this audit. It is reproduced on the unmodified `MindAR-Update` branch and should
   be triaged separately.
4. **The fix tightens the CAS clause contract** (clauses are no longer over-permissive). Callers that
   used `_old_value_clause(field, MISSING)` outside `build_filter` previously relied on the widening;
   they now must combine the clause with another narrowing operator (e.g., `_id`). No such caller
   exists in the current codebase, but the docstring now spells this out.
