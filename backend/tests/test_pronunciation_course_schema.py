"""Keep course attempts separate from flashcard pronunciation attempts."""

from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from repositories.pronunciation_course_repository import PronunciationAttemptRepository


@pytest.mark.asyncio
async def test_course_attempt_uses_its_own_table():
    migration = Path(__file__).resolve().parents[1] / "database/postgres/migrations/20260925_01_pronunciation_course_tables.sql"
    sql = migration.read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS public.pronunciation_course_attempts" in sql
    assert "CREATE TABLE IF NOT EXISTS public.pronunciation_attempts" not in sql

    pool = AsyncMock()
    pool.fetchrow.return_value = {"attempt_id": "test-attempt"}
    with patch("repositories.pronunciation_course_repository.postgres_pool", return_value=pool):
        await PronunciationAttemptRepository().log_attempt("user", "animals", "cat", 80, 2)

    assert "INSERT INTO public.pronunciation_course_attempts" in pool.fetchrow.call_args.args[0]
    assert pool.fetchrow.call_args.args[10] == "{}"
