"""Unit tests for the Postgres-native SessionLogRepository (W4 De-Mongo)."""
from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from repositories.session_log_repository import SessionLogRepository


class FakePool:
    """Minimal asyncpg Pool-shaped fake for the session_logs table."""

    def __init__(self):
        self.calls = []
        self._fetchrow_results = []
        self._fetch_results = []

    def set_fetchrow(self, *rows):
        self._fetchrow_results = [dict(r) if isinstance(r, dict) else r for r in rows]

    def set_fetch(self, *row_lists):
        self._fetch_results = [list(r) for r in row_lists]

    async def fetchrow(self, query, *args):
        self.calls.append(("fetchrow", query, args))
        if self._fetchrow_results:
            return self._fetchrow_results.pop(0)
        return None

    async def fetch(self, query, *args):
        self.calls.append(("fetch", query, args))
        if self._fetch_results:
            return self._fetch_results.pop(0)
        return []

    async def execute(self, query, *args):
        self.calls.append(("execute", query, args))
        return "UPDATE 0"


@pytest.fixture
def repo():
    return SessionLogRepository()


@pytest.fixture
def fake_pool():
    return FakePool()


@pytest.fixture(autouse=True)
def patch_pool(fake_pool):
    target = "repositories.session_log_repository.postgres_pool"
    with patch(target, return_value=fake_pool):
        yield


@pytest.mark.asyncio
async def test_create_session_inserts_and_returns_id_string(repo, fake_pool):
    fake_pool.set_fetchrow({"id": 7})
    result = await repo.create_session("user-1", active_topic="animals")
    assert result == "7"
    call = fake_pool.calls[0]
    assert call[0] == "fetchrow"
    assert "INSERT INTO public.session_logs" in call[1]
    assert call[2] == ("user-1", "animals")


@pytest.mark.asyncio
async def test_end_session_updates_and_returns_row(repo, fake_pool):
    fake_pool.set_fetchrow({
        "id": 7, "user_id": "user-1",
        "started_at": datetime(2026, 8, 31, 10, 0, 0, tzinfo=timezone.utc),
        "ended_at": datetime(2026, 8, 31, 10, 15, 0, tzinfo=timezone.utc),
        "duration_seconds": 900,
        "break_reminder_sent": False,
    })
    result = await repo.end_session("7", user_id="user-1", break_reminder_sent=True)
    assert result is not None
    assert result["id"] == 7
    assert result["duration_seconds"] == 900
    sql = fake_pool.calls[0][1]
    assert "UPDATE public.session_logs" in sql
    assert "id = $1::bigint" in sql


@pytest.mark.asyncio
async def test_end_session_invalid_id_returns_none(repo, fake_pool):
    assert await repo.end_session("") is None
    assert fake_pool.calls == []


@pytest.mark.asyncio
async def test_get_sessions_filters_closed(repo, fake_pool):
    fake_pool.set_fetch([{"id": 1, "user_id": "u1"}, {"id": 2, "user_id": "u1"}])
    sessions = await repo.get_sessions("u1", days=7, limit=50)
    assert len(sessions) == 2
    sql = fake_pool.calls[0][1]
    assert "ended_at IS NOT NULL" in sql
    assert "ORDER BY started_at DESC" in sql


@pytest.mark.asyncio
async def test_get_summary_aggregates(repo, fake_pool):
    fake_pool.set_fetchrow(
        {
            "total_sessions": 3,
            "total_time_seconds": 2700,
            "average_session_seconds": 900.0,
            "longest_session_seconds": 1800,
        },
        {"active_topic": "animals"},
    )
    summary = await repo.get_summary("u1")
    assert summary["user_id"] == "u1"
    assert summary["total_sessions"] == 3
    assert summary["total_time_seconds"] == 2700
    assert summary["average_session_seconds"] == 900.0
    assert summary["longest_session_seconds"] == 1800
    assert summary["most_studied_topic"] == "animals"


@pytest.mark.asyncio
async def test_get_summary_empty(repo, fake_pool):
    summary = await repo.get_summary("nobody")
    assert summary["total_sessions"] == 0
    assert summary["average_session_seconds"] == 0.0
    assert summary["most_studied_topic"] is None


@pytest.mark.asyncio
async def test_get_active_session(repo, fake_pool):
    fake_pool.set_fetchrow({"id": 9, "user_id": "u1", "ended_at": None})
    result = await repo.get_active_session("u1")
    assert result is not None
    sql = fake_pool.calls[0][1]
    assert "ended_at IS NULL" in sql


def test_no_mongo_symbols():
    import repositories.session_log_repository as mod
    assert not hasattr(mod, "get_database")
    assert not hasattr(mod, "BaseRepository")
    assert not hasattr(mod, "_SafeCollection")
    assert not hasattr(mod, "_SafeCursor")