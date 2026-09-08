"""Regression contracts for the Learn AR preload and gamification responses."""

from pathlib import Path

import pytest

from models.gamification_model import UserPointsSchema
from repositories.ar_object_repository import ARObjectRepository
from services.postgres_gamification_service import PostgresGamificationService


class _RecordingPool:
    def __init__(self, *, row=None):
        self.row = row
        self.queries = []

    async def fetch(self, query, *args):
        self.queries.append((query, args))
        if "user_gamification_stickers" in query:
            return []
        return []

    async def fetchrow(self, query, *args):
        self.queries.append((query, args))
        return self.row


@pytest.mark.asyncio
@pytest.mark.parametrize("deck_id", ["claymorphic-animals-001", None])
async def test_ar_preload_reads_animation_type_from_ar_object_alias(monkeypatch, deck_id):
    """The tracking-target table has no animation_type column."""
    from repositories import ar_object_repository

    pool = _RecordingPool()
    monkeypatch.setattr(ar_object_repository, "postgres_pool", lambda: pool)

    await ARObjectRepository().get_tracking_targets_with_xr(deck_id)

    query, _ = pool.queries[0]
    assert "ao.animation_type" in query
    assert "tt.animation_type" not in query
    assert "ao.combo_animation" in query
    assert "NULL::text AS combo_animation" not in query


def test_ar_combo_animation_schema_reconciliation_is_idempotent():
    migration = (
        Path(__file__).resolve().parents[1]
        / "database"
        / "postgres"
        / "migrations"
        / "20260908_02_reconcile_ar_combo_animation.sql"
    )

    assert migration.is_file()
    sql = migration.read_text(encoding="utf-8")
    assert "ADD COLUMN IF NOT EXISTS combo_animation TEXT" in sql
    assert "SET combo_animation = 'CAT_EAT'" in sql


def test_postgres_gamification_keeps_badges_a_list_for_malformed_legacy_values():
    assert PostgresGamificationService._decode_badges("not-json") == []
    assert PostgresGamificationService._decode_badges('{"badge": "level_5"}') == []


@pytest.mark.asyncio
async def test_postgres_gamification_decodes_jsonb_badges_before_response_validation(monkeypatch):
    """asyncpg exposes JSONB as text, but the API contract requires list[str]."""
    from services import postgres_gamification_service

    pool = _RecordingPool(
        row={
            "user_id": "learner-1",
            "total_points": 500,
            "level": 5,
            "xp_to_next_level": 600,
            "streak_days": 2,
            "longest_streak": 3,
            "last_activity_date": None,
            "badges": '["level_5"]',
            "pet_state": None,
        }
    )
    monkeypatch.setattr(postgres_gamification_service, "postgres_pool", lambda: pool)

    result = await PostgresGamificationService().get_user_stats("learner-1")

    assert result["badges"] == ["level_5"]
    assert UserPointsSchema.model_validate(result).badges == ["level_5"]
