"""Safety tests for the catalog backfill migration.

The migration is intentionally conservative: it only repairs documents
whose ``ar_tag`` matches the exact whitelist defined by the catalog build
and whose existing ``nft_base_url`` is one of the documented legacy URLs.
Any other document must be left untouched so the operator can investigate
manually.
"""

from database.migrations.backfill_ar_mind_catalog import (
    build_operations,
    parse_args,
)


def test_dry_run_is_default():
    assert parse_args([]).apply is False


def test_builds_only_exact_animal_repairs():
    docs = [
        {
            "ar_tag": "elephant_marker_01",
            "nft_base_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/elephant_targets.mind",
        },
        {
            "ar_tag": "shiba_marker_01",
            "nft_base_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/shiba_targets.mind",
        },
        {"ar_tag": "cat_marker_01", "nft_base_url": "cat.mind"},
    ]
    operations = build_operations(docs)
    assert [(op.ar_tag, op.mind_target_index) for op in operations] == [
        ("elephant_marker_01", 0),
        ("shiba_marker_01", 1),
    ]


def test_unknown_existing_catalog_is_not_overwritten():
    docs = [{
        "ar_tag": "elephant_marker_01",
        "nft_base_url": "unexpected.mind",
        "mind_catalog_id": "another-v3",
        "mind_target_index": 4,
    }]
    assert build_operations(docs) == []


def test_already_correct_document_is_skipped():
    """A document that already matches the catalog contract must not be repaired."""
    docs = [{
        "ar_tag": "elephant_marker_01",
        "nft_base_url": "/assets/target/catalogs/animals-v2.mind",
        "mind_catalog_id": "animals-v2",
        "mind_target_index": 0,
    }]
    assert build_operations(docs) == []


def test_legacy_url_is_captured_for_compare_and_set():
    """The repair must preserve the original ``nft_base_url`` so the filter
    can guard against concurrent writers."""
    docs = [{
        "ar_tag": "shiba_marker_01",
        "nft_base_url": "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/shiba_targets.mind",
    }]
    [operation] = build_operations(docs)
    assert operation.old_mind_url == docs[0]["nft_base_url"]
    assert operation.mind_target_index == 1
