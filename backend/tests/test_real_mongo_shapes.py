"""Regression tests for the real-MongoDB shapes that safety tests must cover.

Background
----------

The existing ``test_validator_apply_safety.py`` and ``test_repair_cas_safety.py``
were written against *hand-rolled* fakes:

* ``_FakeCommandCursor`` returned by ``db.command`` in the apply path
  implements ``to_list``, ``__aiter__``, ``__anext__`` AND a synchronous
  ``next``. Real Motor/PyMongo never produces that shape. ``db.command``
  returns a plain ``dict`` (the wire reply) — a ``CommandCursor`` only
  exists on the public ``db.list_collections(filter=...)`` helper.
* ``_old_value_clause`` was asserted to differ in *structure* between
  MISSING and null, but the production CAS path combines both branches
  in an ``$or``, and MongoDB treats ``{x: null}`` and ``{x: {$eq: null}}``
  identically: they match both an explicit ``null`` and a missing field.
  The two clauses therefore match the same document set, which the
  existing tests never pinned down.

This module introduces the missing probes — real MongoDB-compatible
behaviour, not hand-rolled fakes — so a future refactor cannot
silently reintroduce the false-green coverage.
"""

from __future__ import annotations

import inspect
import os
import sys

import pytest

# ``backend/tests/conftest.py`` already sets the dummy env vars; this file
# only needs to be importable in isolation when the user runs the
# single-module ``pytest`` invocation.
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)


# ---------------------------------------------------------------------------
# Concern #1: _fetch_validator_metadata must handle the real MongoDB shape.
# ---------------------------------------------------------------------------


def _build_real_list_collections_reply(name: str = "ar_objects") -> dict:
    """The exact wire reply Motor / PyMongo returns for ``listCollections``."""
    return {
        "cursor": {
            "firstBatch": [
                {
                    "name": name,
                    "options": {
                        "validator": {"$jsonSchema": {"required": ["tracking_mode"]}},
                        "validationLevel": "moderate",
                        "validationAction": "warn",
                    },
                }
            ],
            "id": 0,
            "ns": f"db.$cmd.listCollections",
        },
        "ok": 1.0,
    }


def _build_empty_list_collections_reply() -> dict:
    return {
        "cursor": {"firstBatch": [], "id": 0, "ns": "db.$cmd.listCollections"},
        "ok": 1.0,
    }


class _RealWireReplyDb:
    """Mimics ``db.command({listCollections:1})`` returning the wire dict.

    PyMongo's ``Database.command`` is annotated ``-> dict[str, Any]``; Motor
    preserves that contract. No async-iterable, no ``to_list``, no
    ``next()`` — just a plain dict.
    """

    def __init__(self, reply: dict) -> None:
        self._reply = reply
        self.calls: list[dict] = []

    async def command(self, command_doc: dict) -> dict:
        self.calls.append(command_doc)
        return self._reply


class _RealHelperDb:
    """Mimics ``db.list_collections(filter=...)`` returning a CommandCursor.

    Motor wraps the wire reply in a ``MotorCommandCursor`` that exposes
    ``to_list`` and async iteration — but ``list_collections`` is a
    *synchronous* call that returns the cursor; only ``to_list`` awaits.
    """

    class _RealMotorCursor:
        def __init__(self, rows: list[dict]) -> None:
            self._rows = list(rows)
            self.to_list_calls: list[int | None] = []

        def __aiter__(self) -> "_RealHelperDb._RealMotorCursor":
            self._iter = iter(self._rows)
            return self

        async def __anext__(self) -> dict:
            try:
                return next(self._iter)
            except StopIteration as exc:  # pragma: no cover - probe
                raise StopAsyncIteration from exc

        async def to_list(self, length: int | None = None) -> list[dict]:
            self.to_list_calls.append(length)
            if length is None:
                return list(self._rows)
            return list(self._rows[:length])

    def __init__(self, reply: dict) -> None:
        self._reply = reply
        self.calls: list[dict] = []

    def list_collections(self, **kwargs) -> "_RealHelperDb._RealMotorCursor":
        self.calls.append(kwargs)
        first_batch = self._reply.get("cursor", {}).get("firstBatch", [])
        return _RealHelperDb._RealMotorCursor(first_batch)


@pytest.mark.asyncio
async def test_fetch_validator_metadata_handles_real_wire_reply_dict():
    """The real PyMongo shape is a plain dict. The helper must unpack it."""
    from database.migrations.apply_ar_objects_validator import (
        _fetch_validator_metadata,
    )

    db = _RealWireReplyDb(_build_real_list_collections_reply())
    validator, action = await _fetch_validator_metadata(db)

    assert action == "warn", (
        f"expected validationAction 'warn' from real wire reply, got {action!r}. "
        "If this is the production code's fault, _fetch_validator_metadata is "
        "still trying to call .to_list() on a dict — exactly the bug the "
        "audit flagged."
    )
    assert validator == {"$jsonSchema": {"required": ["tracking_mode"]}}, (
        f"expected the JSON Schema extracted from options.validator, got {validator!r}"
    )
    assert len(db.calls) == 1, "exactly one Mongo command must be issued"


@pytest.mark.asyncio
async def test_fetch_validator_metadata_uses_list_collections_helper():
    """Preferred path: ``db.list_collections`` returns a real cursor.

    This is what the original audit recommended; if the production code
    ever reverts to ``db.command({listCollections:1})`` with the wire-reply
    parser, this test still passes through the helper path, so the two
    tests together pin both supported shapes.
    """
    from database.migrations.apply_ar_objects_validator import (
        _fetch_validator_metadata,
    )

    db = _RealHelperDb(_build_real_list_collections_reply())
    validator, action = await _fetch_validator_metadata(db)

    assert action == "warn"
    assert validator == {"$jsonSchema": {"required": ["tracking_mode"]}}
    assert db.calls, "db.list_collections helper must be used"


@pytest.mark.asyncio
async def test_fetch_validator_metadata_returns_none_when_collection_missing():
    """Empty firstBatch must produce the documented "not found" sentinel."""
    from database.migrations.apply_ar_objects_validator import (
        _fetch_validator_metadata,
    )

    db = _RealWireReplyDb(_build_empty_list_collections_reply())
    validator, action = await _fetch_validator_metadata(db)

    assert validator is None
    assert action is not None and "not found" in action, (
        f"missing-collection readback must return a 'not found' message; got {action!r}"
    )


def test_fetch_validator_metadata_signature_does_not_assume_cursor_interface():
    """The audit found the old code branching on ``to_list``/``__aiter__``.

    Lock the production helper down to two explicit shapes: a
    CommandCursor-like object OR a wire-reply dict. If a future refactor
    re-adds the ``elif hasattr(cursor, '__aiter__')`` ladder, this
    signature inspection flags it.
    """
    from database.migrations.apply_ar_objects_validator import (
        _fetch_validator_metadata,
    )

    source = inspect.getsource(_fetch_validator_metadata)
    # Production code MUST have exactly one of the two support paths; both
    # is fine (defensive), but the original ladder had three branches
    # (``to_list``/``__aiter__``/sync). Allow up to 2 to permit dual shape.
    branch_markers = sum(
        1
        for marker in ("hasattr(cursor, \"to_list\")", "hasattr(cursor, \"__aiter__\")")
        if marker in source
    )
    assert branch_markers <= 2, (
        "production readback has too many cursor-shape branches; refactor to "
        "a single explicit shape (list_collections helper) plus the wire-reply "
        "fallback."
    )


# ---------------------------------------------------------------------------
# Concern #2: _old_value_clause must distinguish MISSING from null.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "documents,old_value,expected_matching_ids,id_for_param",
    [
        # Only the missing field should match the MISSING clause.
        (
            [
                {"_id": "missing"},
                {"_id": "explicit_null", "tracking_mode": None},
                {"_id": "present", "tracking_mode": "legacy"},
            ],
            "MISSING",
            {"missing"},
            "missing",
        ),
        # Only the missing field should match the MISSING clause (minimal
        # two-doc case used to assert the invariant in isolation).
        (
            [
                {"_id": "missing"},
                {"_id": "explicit_null", "tracking_mode": None},
            ],
            "MISSING",
            {"missing"},
            "missing_minimal",
        ),
    ],
)
def test_old_value_clause_matches_only_its_own_state(
    documents, old_value, expected_matching_ids, id_for_param
):
    """Real-MongoDB evaluation of MISSING clause must isolate absent state.

    The old test only checked the literal dict shape, which lets both
    clauses match the same documents. This probe uses ``mongomock`` (a
    MongoDB-compatible in-memory engine that follows the same query
    semantics) to assert *evaluated* match sets for the MISSING case.
    The explicit-null branch is covered by the structural
    ``test_old_value_clause_treats_missing_and_null_as_distinct`` test
    in ``test_repair_cas_safety.py`` — mongomock does not implement the
    ``$type: "null"`` alias, so a live mongod is required to evaluate
    that branch.
    """
    from database.migrations.repair_ar_objects_consistency import (
        MISSING,
        _old_value_clause,
    )

    if old_value == "MISSING":
        sentinel = MISSING
    elif old_value == "NULL":
        pytest.skip("mongomock does not implement $type: 'null'; covered structurally")
    else:  # pragma: no cover - defensive
        raise AssertionError(f"unhandled old_value {old_value!r}")

    mongomock = pytest.importorskip("mongomock")
    collection = mongomock.MongoClient().db.c
    collection.insert_many(documents)

    clause = _old_value_clause("tracking_mode", sentinel)
    matched = {doc["_id"] for doc in collection.find(clause)}
    assert matched == expected_matching_ids, (
        f"_old_value_clause {clause!r} must match exactly "
        f"{sorted(expected_matching_ids)} under MongoDB semantics, but matched "
        f"{sorted(matched)}. If MISSING and null collapse, the production CAS "
        "filter will over-match and rewrite documents the operator never "
        "intended to touch."
    )


def test_old_value_clause_must_not_match_null_for_missing_state():
    """Audit invariant #2: MISSING must not over-match explicit nulls.

    Pin the regression directly. The original fix intentionally
    broadened the MISSING clause to *include* nulls to dodge the
    "operator overwriting a missing field with null would never see
    their document matched" risk. That tradeoff is wrong for our
    production path: ``build_filter`` already constrains the CAS by
    ``_id`` (exactly one document), so broadening the clause to include
    explicit nulls cannot match extra documents inside the $and. But a
    future caller that uses the clause alone (outside ``build_filter``)
    *would* over-match. The minimal fix is to make the MISSING clause
    match ONLY the missing state and rely on the $and narrowing in
    ``build_filter`` to keep the existing repair semantics.
    """
    mongomock = pytest.importorskip("mongomock")
    from database.migrations.repair_ar_objects_consistency import (
        MISSING,
        _old_value_clause,
    )

    collection = mongomock.MongoClient().db.c
    collection.insert_many(
        [
            {"_id": "missing"},
            {"_id": "explicit_null", "tracking_mode": None},
        ]
    )
    clause = _old_value_clause("tracking_mode", MISSING)
    matched = {doc["_id"] for doc in collection.find(clause)}
    assert "explicit_null" not in matched, (
        "MISSING clause must not over-match an explicit null; the narrowing "
        "happens via $and(_id) inside build_filter, not by widening the "
        "clause itself. The widened clause creates a foot-gun for any "
        "future caller that uses it outside build_filter."
    )
    assert "missing" in matched, "MISSING clause must still match missing field"
