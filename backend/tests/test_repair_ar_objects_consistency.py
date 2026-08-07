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
    repair = build_repairs([
        {"_id": "1", "ar_tag": "elephant_marker_01", "nft_base_url": "/old.mind", "mind_catalog_id": None}
    ], MAPPING)[0]
    query = build_filter(repair)
    assert "$and" in query
    assert sum(1 for clause in query["$and"] if "$or" in clause) >= 2


def test_second_pass_plans_zero_repairs():
    clean = [{
        "_id": "1",
        "ar_tag": "elephant_marker_01",
        "tracking_mode": "catalog",
        "mind_catalog_id": "animals-v2",
        "mind_target_index": 0,
    }]
    assert build_repairs(clean, MAPPING) == []