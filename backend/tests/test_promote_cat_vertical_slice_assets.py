"""Focused guards for the approved six-item Cat Clay v1 promotion."""

from database.seed.canonical_animals import COURSE_ID
from database.seed.promote_cat_vertical_slice_assets import (
    EXPECTED_COUNT,
    SPECS,
    load_and_validate_inventory,
)
from models.asset_contract import AssetRole


def test_prepared_batch_is_exactly_the_six_approved_transparent_png_derivatives():
    inventory = load_and_validate_inventory()
    assert len(inventory.entries) == EXPECTED_COUNT == 6
    assert {entry.semantic_key for entry in inventory.entries} == {
        "vocabulary:animals-v1-cat:vocabulary_illustration",
        "vocabulary:animals-v1-dog:vocabulary_illustration",
        "vocabulary:animals-v1-bird:vocabulary_illustration",
        "mascot:lexi:neutral",
        "mascot:lexi:cheer",
        "lesson:learn-the-cat:cat_champion_reward",
    }
    assert all(
        entry.mime_type == "image/png"
        and entry.width == 512
        and entry.height == 512
        and entry.validation_status == "READY_FOR_UPLOAD"
        for entry in inventory.entries
    )


def test_promotion_uses_versioned_semantic_paths_without_overwriting_lc10_objects():
    old_paths = {
        f"courses/{COURSE_ID}/vocabulary/animals-v1-{animal}/vocabulary_illustration.png"
        for animal in ("cat", "dog", "bird")
    }
    new_paths = {spec.object_path for spec in SPECS}
    assert new_paths.isdisjoint(old_paths)
    assert all(path.startswith(f"courses/{COURSE_ID}/") for path in new_paths)
    assert all("clay-v1-512.png" in path for path in new_paths)


def test_promotion_role_set_does_not_expand_into_other_course_assets():
    assert {spec.asset_role for spec in SPECS} == {
        AssetRole.VOCABULARY_ILLUSTRATION,
        AssetRole.MASCOT_NEUTRAL,
        AssetRole.MASCOT_CHEER,
        AssetRole.LESSON_REWARD,
    }
    assert all("fish" not in spec.semantic_key and "rabbit" not in spec.semantic_key for spec in SPECS)
