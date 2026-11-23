"""Tests for the explicit, dry-run-safe cross-category combo migration."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from scripts import migrate_cross_category_flag as migration


EXPECTED_TRUE_IDS = {
    "birthday_party_v1",
    "jungle_scene_v1",
    "picnic_day_v1",
    "road_trip_v1",
    "safari_adventure_v1",
}

EXPECTED_FALSE_IDS = {
    "desert_oasis_v1",
    "forest_scene_v1",
    "fruit_basket_v1",
    "race_track_v1",
}


def _live_combo_documents() -> list[dict]:
    return [{"combo_id": combo_id} for combo_id in sorted(migration.KNOWN_COMBO_FLAGS)]


def _fake_collection(documents: list[dict]):
    collection = MagicMock()
    cursor = MagicMock()
    cursor.to_list = AsyncMock(return_value=documents)
    collection.find.return_value = cursor
    collection.update_many = AsyncMock()
    collection.update_many.side_effect = [
        MagicMock(modified_count=len(EXPECTED_TRUE_IDS)),
        MagicMock(modified_count=len(EXPECTED_FALSE_IDS)),
    ]
    return collection


def test_known_combo_flags_are_explicit_and_complete():
    assert hasattr(migration, "KNOWN_COMBO_FLAGS")
    assert {combo_id for combo_id, allowed in migration.KNOWN_COMBO_FLAGS.items() if allowed} == EXPECTED_TRUE_IDS
    assert {combo_id for combo_id, allowed in migration.KNOWN_COMBO_FLAGS.items() if not allowed} == EXPECTED_FALSE_IDS


def test_filter_uses_and_with_two_or_groups():
    query = migration.build_update_filter(["jungle_scene_v1"], True)

    assert list(query) == ["$and"]
    assert len(query["$and"]) == 2
    assert all("$or" in group for group in query["$and"])
    assert query["$and"][0]["$or"] == [{"combo_id": "jungle_scene_v1"}]


def test_cli_defaults_to_dry_run():
    assert migration.parse_args([]).apply is False
    assert migration.parse_args(["--apply"]).apply is True


@pytest.mark.asyncio
async def test_dry_run_never_writes():
    collection = _fake_collection(_live_combo_documents())

    report = await migration.migrate_cross_category_combos(collection, apply=False)

    collection.update_many.assert_not_awaited()
    assert report.mode == "dry-run"
    assert report.planned_count == 9
    assert report.missing_ids == ()
    assert report.unexpected_ids == ()


@pytest.mark.asyncio
async def test_apply_updates_only_explicit_ids():
    collection = _fake_collection(_live_combo_documents())

    report = await migration.migrate_cross_category_combos(collection, apply=True)

    assert collection.update_many.await_count == 2
    assert report.mode == "apply"
    assert report.modified_count == 9
    called_filters = [call.args[0] for call in collection.update_many.await_args_list]
    serialized_filters = repr(called_filters)
    assert "unexpected_combo" not in serialized_filters
    for combo_id in migration.KNOWN_COMBO_FLAGS:
        assert combo_id in serialized_filters


@pytest.mark.asyncio
async def test_unexpected_documents_are_reported_but_never_planned():
    documents = _live_combo_documents() + [{"combo_id": "unexpected_combo"}]
    collection = _fake_collection(documents)

    report = await migration.migrate_cross_category_combos(collection, apply=False)

    assert report.unexpected_ids == ("unexpected_combo",)
    assert "unexpected_combo" not in report.planned_updates
