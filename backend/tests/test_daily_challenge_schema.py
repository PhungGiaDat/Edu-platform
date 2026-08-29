"""Contract tests for the additive Daily Challenge PostgreSQL schema."""

import re
from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "database"
    / "postgres"
    / "migrations"
    / "20260830_01_daily_challenge_rewards.sql"
)


def test_migration_creates_only_additive_daily_challenge_tables():
    sql = MIGRATION_PATH.read_text(encoding="utf-8")

    for table_name in (
        "daily_challenges",
        "daily_challenge_lessons",
        "daily_challenge_rewards",
        "daily_challenge_claims",
    ):
        assert f"CREATE TABLE IF NOT EXISTS public.{table_name}" in sql

    assert not re.search(r"\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM\b", sql, re.IGNORECASE)


def test_migration_preserves_reward_and_claim_invariants():
    sql = MIGRATION_PATH.read_text(encoding="utf-8")

    expected_fragments = (
        "challenge_date DATE NOT NULL UNIQUE",
        "PRIMARY KEY (challenge_id, lesson_id)",
        "UNIQUE (challenge_id, position)",
        "UNIQUE (challenge_id, reward_type)",
        "UNIQUE (user_id, challenge_id)",
        "UNIQUE (user_id, event_id)",
        "ck_daily_challenge_reward_payload",
        "ck_daily_challenge_claim_applied_at",
        "TIMESTAMPTZ NOT NULL DEFAULT now()",
        "REFERENCES public.pets(pet_id) ON DELETE RESTRICT",
    )

    for fragment in expected_fragments:
        assert fragment in sql

    assert "idx_daily_challenge_lessons_lesson" in sql
    assert "idx_daily_challenge_claims_user_recent" in sql


def test_daily_challenge_orm_models_are_exported_with_contract_metadata():
    import database.orm_models as orm_models

    from database.orm_models.daily_challenge import (
        DailyChallengeClaimORM,
        DailyChallengeLessonORM,
        DailyChallengeORM,
        DailyChallengeRewardORM,
    )

    assert orm_models.DailyChallengeORM is DailyChallengeORM
    assert orm_models.DailyChallengeLessonORM is DailyChallengeLessonORM
    assert orm_models.DailyChallengeRewardORM is DailyChallengeRewardORM
    assert orm_models.DailyChallengeClaimORM is DailyChallengeClaimORM

    assert DailyChallengeORM.__tablename__ == "daily_challenges"
    assert DailyChallengeLessonORM.__tablename__ == "daily_challenge_lessons"
    assert DailyChallengeRewardORM.__tablename__ == "daily_challenge_rewards"
    assert DailyChallengeClaimORM.__tablename__ == "daily_challenge_claims"

    assert DailyChallengeORM.__table__.c.challenge_date.unique is True
    assert DailyChallengeClaimORM.__table__.c.event_id.unique is not True
    assert any(
        {column.name for column in constraint.columns} == {"user_id", "event_id"}
        for constraint in DailyChallengeClaimORM.__table__.constraints
        if hasattr(constraint, "columns")
    )
