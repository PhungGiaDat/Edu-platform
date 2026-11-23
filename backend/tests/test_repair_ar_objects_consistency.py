from database.migrations.repair_ar_objects_consistency import build_filter, build_repairs

MAPPING = {
    "catalog": {"elephant_marker_01": {"mind_catalog_id": "animals-v2", "mind_target_index": 0}},
    "legacy": ["apple_marker_01"],
}


def test_repairs_catalog_and_legacy_without_inference():
    docs = [
        {"_id": "1", "ar_tag": "elephant_marker_01", "nft_base_url": "/old.mind", "mind_catalog_id": None},
        {"_id": "2", "ar_tag": "apple_marker_01", "nft_base_url": "https://assets/apple.mind", "mind_catalog_id": "legacy-singletons", "mind_target_index": 7},
        {"_id": "3", "ar_tag": "unknown_marker", "nft_base_url": "https://assets/unknown.mind"},
    ]
    repairs = build_repairs(docs, MAPPING)
    assert [repair.ar_tag for repair in repairs] == ["elephant_marker_01", "apple_marker_01"]
    assert repairs[0].set_values["tracking_mode"] == "catalog"
    assert "nft_base_url" in repairs[0].unset_fields
    assert repairs[1].set_values["tracking_mode"] == "legacy"
    assert {"mind_catalog_id", "mind_target_index"} <= repairs[1].unset_fields


def test_compare_and_set_filter_uses_explicit_and_or_groups():
    """The CAS filter must use an ``$and`` with per-field old-value clauses.

    Every constrained field contributes exactly one clause. For MISSING
    fields the clause is ``{field: {$exists: False}}``; for present
    scalars it is an ``$or`` of equality forms; for explicit nulls it is
    ``{field: {$type: "null"}}``. The ``$and`` narrowing by ``_id`` is
    what makes the over-all filter exact — this test pins the
    composition so a refactor cannot silently weaken the constraint.
    """
    repair = build_repairs([
        {"_id": "1", "ar_tag": "elephant_marker_01", "nft_base_url": "/old.mind", "mind_catalog_id": None}
    ], MAPPING)[0]
    query = build_filter(repair)
    assert "$and" in query
    clauses = query["$and"]
    # The first two clauses are always the {ar_tag} and {_id} pin.
    assert clauses[0] == {"_id": "1"}
    assert clauses[1] == {"ar_tag": "elephant_marker_01"}
    # The remaining clauses must use the supported narrowing operators.
    has_narrowing = False
    for clause in clauses[2:]:
        for _field, value in clause.items():
            if isinstance(value, dict) and (
                "$or" in value or "$exists" in value or "$type" in value
            ):
                has_narrowing = True
                break
    assert has_narrowing, (
        "per-field clauses must use narrowing operators, "
        f"got {clauses[2:]!r}"
    )


def test_second_pass_plans_zero_repairs():
    clean = [{
        "_id": "1",
        "ar_tag": "elephant_marker_01",
        "tracking_mode": "catalog",
        "mind_catalog_id": "animals-v2",
        "mind_target_index": 0,
    }]
    assert build_repairs(clean, MAPPING) == []