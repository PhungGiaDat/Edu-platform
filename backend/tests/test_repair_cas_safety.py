"""Regression tests for the ar_objects repair CAS path.

The bugs these tests pin down (per audit on 2026-08-08):

1. ``_old_value_clause`` treats "field absent" the same as "field set to
   null". That conflates two distinct database states; a repair that only
   exists to clear a stale ``null`` should never accidentally match a
   record where the field is genuinely missing.
2. ``build_filter`` always emits clauses for ``tracking_mode``,
   ``mind_catalog_id``, and ``mind_target_index`` even when the repair
   does not touch them. That over-constrains the CAS filter and can
   silently skip repairs because the document no longer carries those
   fields at all.
3. ``build_repairs`` records ``nft_base_url`` in ``old_values`` whenever
   the field exists in the source row — even when the value is ``None``
   or ``""`` — which forces the filter to require that specific
   ``None`` / ``""`` value before the unset can fire. The right behavior
   is to skip the unset when there is nothing meaningful to remove.
4. ``build_repairs`` for legacy rows captures the *current* value of
   ``mind_catalog_id`` / ``mind_target_index`` even when it is ``None``
   or absent, which makes the filter match zero documents.
"""

from __future__ import annotations

import pytest

from database.migrations.repair_ar_objects_consistency import (
    MISSING,
    Repair,
    build_filter,
    build_repairs,
)


CATALOG = {
    "catalog": {
        "elephant_marker_01": {
            "mind_catalog_id": "animals-v2",
            "mind_target_index": 0,
        },
    },
    "legacy": ["apple_marker_01"],
}


def test_old_value_clause_treats_missing_and_null_as_distinct():
    from database.migrations.repair_ar_objects_consistency import _old_value_clause

    missing_clause = _old_value_clause("tracking_mode", MISSING)
    null_clause = _old_value_clause("tracking_mode", None)
    present_clause = _old_value_clause("tracking_mode", "legacy")

    # MISSING must match only the absent state — no $or widening. If a
    # future refactor re-widens this clause to include explicit nulls,
    # the production CAS path can over-match in any context where the
    # clause is used without ``build_filter``'s $and(_id) narrowing.
    assert missing_clause == {"tracking_mode": {"$exists": False}}, (
        f"MISSING clause must be the narrow {{$exists: False}} form, got {missing_clause!r}"
    )
    # Explicit null must be matched via $type: "null" (BSON null), not
    # via bare {x: null} which also matches missing.
    assert null_clause == {"tracking_mode": {"$type": "null"}}, (
        f"null clause must pin BSON null type, got {null_clause!r}"
    )
    # null must not be combined with "$exists: false" — they are different
    # states and conflating them silently allows stale repairs.
    assert null_clause != missing_clause
    assert present_clause == {
        "$or": [
            {"tracking_mode": "legacy"},
            {"tracking_mode": {"$eq": "legacy"}},
        ]
    }


def _constrained_fields_from_filter(filter_doc):
    """Return the set of field names whose value is constrained by a clause.

    Reads the three supported clause shapes produced by
    ``_old_value_clause``:

    * ``{field: {"$or": [{field: v}, {field: {"$eq": v}}]}}`` — present scalar
    * ``{field: {"$type": "null"}}`` — explicit null
    * ``{field: {"$exists": False}}`` — MISSING
    """
    fields: set[str] = set()
    for clause in filter_doc["$and"]:
        if not isinstance(clause, dict):
            continue
        if "$or" in clause:
            # Top-level $or form: the field name is buried inside each branch.
            for branch in clause["$or"]:
                if isinstance(branch, dict):
                    fields.update(branch.keys())
            continue
        for field, value in clause.items():
            if not isinstance(value, dict):
                continue
            if "$or" in value:
                for branch in value["$or"]:
                    if isinstance(branch, dict):
                        for inner_field in branch:
                            fields.add(inner_field)
            elif "$type" in value or "$exists" in value:
                fields.add(field)
    return fields


def test_build_filter_omits_clauses_for_unchanged_fields():
    """``build_filter`` should only constrain fields the repair actually
    touches. Emitting clauses for fields that are not in ``old_values``
    silently narrows the match set and can cause repairs to no-op.
    """
    repair = Repair(
        object_id="doc-1",
        ar_tag="apple_marker_01",
        set_values={"tracking_mode": "legacy"},
        unset_fields=frozenset({"mind_catalog_id"}),
        old_values={"tracking_mode": None},
    )
    filter_doc = build_filter(repair)

    # tracking_mode IS constrained — the repair sets it. The clause
    # form depends on the value kind: explicit null -> $type, MISSING
    # -> $exists, present scalar -> $or-of-equality whose outer key is
    # the field name. Extract from any of those shapes.
    constrained_fields = _constrained_fields_from_filter(filter_doc)
    assert "tracking_mode" in constrained_fields

    # mind_catalog_id is being unset — must NOT appear in the match clause,
    # because we explicitly want to match documents that already lost it.
    assert "mind_catalog_id" not in constrained_fields
    assert "mind_target_index" not in constrained_fields
    assert "nft_base_url" not in constrained_fields


def test_build_filter_keeps_clause_when_unset_field_has_old_value():
    repair = Repair(
        object_id="doc-1",
        ar_tag="elephant_marker_01",
        set_values={"tracking_mode": "catalog", "mind_catalog_id": "animals-v2"},
        unset_fields=frozenset({"nft_base_url"}),
        old_values={
            "tracking_mode": None,
            "mind_catalog_id": None,
            "nft_base_url": "/old.mind",
        },
    )
    filter_doc = build_filter(repair)
    constrained_fields = _constrained_fields_from_filter(filter_doc)
    assert "nft_base_url" in constrained_fields


def test_catalog_repair_skips_unset_when_nft_url_is_already_blank():
    """Catalog rows with no ``nft_base_url`` (or only empty/None values)
    must not produce an unset operation. The original code added the
    field to ``unset_fields`` whenever the key was present in the row,
    even if the value was ``None``/empty, and then the filter required
    exactly that empty value — a deadlock that no real document can
    satisfy.
    """
    repairs = build_repairs(
        [
            {
                "_id": "doc-1",
                "ar_tag": "elephant_marker_01",
                "nft_base_url": None,
            },
            {
                "_id": "doc-2",
                "ar_tag": "elephant_marker_01",
                "nft_base_url": "",
            },
            {
                "_id": "doc-3",
                "ar_tag": "elephant_marker_01",
            },
        ],
        CATALOG,
    )

    assert len(repairs) == 3
    for repair in repairs:
        assert "nft_base_url" not in repair.unset_fields, (
            f"unset is meaningless when nft_base_url is already absent/blank: {repair}"
        )
        # But catalog pair is still being written — we still need to set them.
        assert repair.set_values["tracking_mode"] == "catalog"
        assert repair.set_values["mind_catalog_id"] == "animals-v2"
        assert repair.set_values["mind_target_index"] == 0


def test_legacy_repair_only_unset_fields_when_source_value_is_meaningful():
    """Legacy rows whose catalog fields are already ``None`` or absent must
    not emit an unset for those fields. Forcing an unset with a None
    "old value" silently matches nothing.
    """
    repairs = build_repairs(
        [
            {
                "_id": "doc-1",
                "ar_tag": "apple_marker_01",
                "nft_base_url": "https://assets/apple.mind",
            },
            {
                "_id": "doc-2",
                "ar_tag": "apple_marker_01",
                "nft_base_url": "https://assets/apple.mind",
                "mind_catalog_id": None,
                "mind_target_index": None,
            },
            {
                "_id": "doc-3",
                "ar_tag": "apple_marker_01",
                "nft_base_url": "https://assets/apple.mind",
                "mind_catalog_id": "wrong-stale-id",
                "mind_target_index": 99,
            },
        ],
        CATALOG,
    )

    assert len(repairs) == 3
    # doc-1 has no catalog fields at all → nothing to unset
    assert "mind_catalog_id" not in repairs[0].unset_fields
    assert "mind_target_index" not in repairs[0].unset_fields

    # doc-2 has catalog fields but they're null → still nothing to unset
    assert "mind_catalog_id" not in repairs[1].unset_fields
    assert "mind_target_index" not in repairs[1].unset_fields

    # doc-3 has meaningful catalog values → must unset them
    assert "mind_catalog_id" in repairs[2].unset_fields
    assert "mind_target_index" in repairs[2].unset_fields
    # The CAS filter must pin those exact stale values.
    assert repairs[2].old_values["mind_catalog_id"] == "wrong-stale-id"
    assert repairs[2].old_values["mind_target_index"] == 99


def test_filter_for_explicit_unset_uses_old_value_clause_for_unset_field():
    repair = Repair(
        object_id="doc-1",
        ar_tag="elephant_marker_01",
        set_values={
            "tracking_mode": "catalog",
            "mind_catalog_id": "animals-v2",
            "mind_target_index": 0,
        },
        unset_fields=frozenset({"nft_base_url"}),
        old_values={
            "tracking_mode": None,
            "mind_catalog_id": None,
            "nft_base_url": "/old.mind",
        },
    )
    filter_doc = build_filter(repair)
    serialized = {
        next(iter(clause["$or"][0].keys())): clause["$or"]
        for clause in filter_doc["$and"]
        if "$or" in clause
    }
    assert serialized["nft_base_url"] == [
        {"nft_base_url": "/old.mind"},
        {"nft_base_url": {"$eq": "/old.mind"}},
    ]
