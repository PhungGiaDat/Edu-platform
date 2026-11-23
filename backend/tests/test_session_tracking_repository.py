"""Unit tests for the Postgres-native SessionTrackingRepository (W4 De-Mongo)."""
from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from repositories.session_tracking_repository import (
    SessionTrackingRepository,
    postgres_pool,
)


class FakePool:
    """Minimal asyncpg Pool-shaped fake that records calls + returns scripted rows."""

    def __init__(self):
        self.calls = []
        self._fetchrow_results = []
        self._fetch_results = []
        self._execute_result = "UPDATE 0"

    def set_fetchrow(self, *rows):
        """Queue one or more dicts/lists (each becomes the next fetchrow return)."""
        self._fetchrow_results = [dict(r) if isinstance(r, dict) else r for r in rows]

    def set_fetch(self, *row_lists):
        """Queue one or more lists of rows (each becomes the next fetch return)."""
        self._fetch_results = [list(r) for r in row_lists]

    # --- asyncpg Pool interface ---
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
        return self._execute_result


@pytest.fixture
def repo():
    return SessionTrackingRepository()


@pytest.fixture
def fake_pool():
    return FakePool()


@pytest.fixture(autouse=True)
def patch_pool(fake_pool):
    target = "repositories.session_tracking_repository.postgres_pool"
    with patch(target, return_value=fake_pool):
        yield


# =========================================================================
# create_or_update_session
# =========================================================================


@pytest.mark.asyncio
async def test_create_or_update_session_issues_postgres_sql(repo, fake_pool):
    """Issues two statements: UPDATE other sessions, then INSERT ON CONFLICT."""
    session_id = await repo.create_or_update_session("user-1", "session-1")

    assert session_id == "session-1"
    assert len(fake_pool.calls) == 2
    # First call: update other active sessions to ended
    call1 = fake_pool.calls[0]
    assert call1[0] == "execute"
    assert "UPDATE public.active_sessions" in call1[1]
    assert "status='ended'" in call1[1]
    assert call1[2][0] == "user-1"

    # Second call: upsert
    call2 = fake_pool.calls[1]
    assert call2[0] == "fetchrow"
    assert "INSERT INTO public.active_sessions" in call2[1]
    assert "ON CONFLICT (session_id)" in call2[1]
    assert call2[2][0] == "session-1"
    assert call2[2][1] == "user-1"


# =========================================================================
# heartbeat
# =========================================================================


@pytest.mark.asyncio
async def test_heartbeat_returns_row_when_found(repo, fake_pool):
    fake_pool.set_fetchrow({
        "session_id": "s1", "user_id": "u1", "status": "active",
        "last_heartbeat": datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc),
        "is_locked": False,
    })
    result = await repo.heartbeat("s1", "u1", current_step_id="step-1", progress_percent=50)
    assert result is not None
    assert result["session_id"] == "s1"
    assert result["status"] == "active"
    assert "last_heartbeat" in result
    # Verify SQL uses active_sessions
    assert "UPDATE public.active_sessions" in fake_pool.calls[0][1]
    assert "current_step_id" in fake_pool.calls[0][1]


@pytest.mark.asyncio
async def test_heartbeat_returns_none_when_not_found(repo, fake_pool):
    result = await repo.heartbeat("nonexistent", "u1")
    assert result is None


# =========================================================================
# get_active_session
# =========================================================================


@pytest.mark.asyncio
async def test_get_active_session_selects_active_idle_locked(repo, fake_pool):
    fake_pool.set_fetchrow({
        "session_id": "s1", "user_id": "u1", "status": "active",
        "started_at": datetime(2026, 8, 31, 10, 0, 0, tzinfo=timezone.utc),
    })
    result = await repo.get_active_session("u1")
    assert result is not None
    assert result["session_id"] == "s1"
    sql = fake_pool.calls[0][1]
    assert "status IN ('active', 'idle', 'locked')" in sql


# =========================================================================
# end_session
# =========================================================================


@pytest.mark.asyncio
async def test_end_session_returns_bool(repo, fake_pool):
    fake_pool.set_fetchrow({"session_id": "s1"})
    assert await repo.end_session("s1", "u1") is True
    fake_pool.set_fetchrow()  # None → not found
    assert await repo.end_session("s1", "u1") is False


# =========================================================================
# lock_app / unlock_app
# =========================================================================


@pytest.mark.asyncio
async def test_lock_app_with_duration(repo, fake_pool):
    fake_pool.set_fetchrow({
        "session_id": "s1", "status": "locked", "is_locked": True,
        "locked_at": datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc),
        "locked_until": datetime(2026, 8, 31, 12, 30, 0, tzinfo=timezone.utc),
        "locked_reason": "break",
    })
    result = await repo.lock_app("s1", "u1", reason="break", duration_minutes=30)
    assert result is not None
    assert result["status"] == "locked"
    sql = fake_pool.calls[0][1]
    assert "locked_until" in sql


@pytest.mark.asyncio
async def test_unlock_app_returns_bool(repo, fake_pool):
    fake_pool.set_fetchrow({"session_id": "s1"})
    assert await repo.unlock_app("s1", "u1") is True
    fake_pool.set_fetchrow()
    assert await repo.unlock_app("s1", "u1") is False


# =========================================================================
# get_user_metrics
# =========================================================================


@pytest.mark.asyncio
async def test_get_user_metrics_shape(repo, fake_pool):
    fake_pool.set_fetchrow(
        {"total_sessions": 5, "total_time_seconds": 3600},
        {"sessions_today": 1, "time_today": 600},
    )
    metrics = await repo.get_user_metrics("u1")
    assert metrics["user_id"] == "u1"
    assert metrics["total_sessions"] == 5
    assert metrics["total_time_seconds"] == 3600
    assert metrics["average_session_seconds"] == 720.0  # 3600/5
    assert metrics["sessions_today"] == 1
    assert metrics["time_today_seconds"] == 600


# =========================================================================
# cleanup_stale_sessions
# =========================================================================


@pytest.mark.asyncio
async def test_cleanup_stale_sessions_returns_count(repo, fake_pool):
    fake_pool.set_fetch([{"session_id": "s1"}, {"session_id": "s2"}])
    count = await repo.cleanup_stale_sessions(300)
    assert count == 2
    sql = fake_pool.calls[0][1]
    assert "UPDATE public.active_sessions" in sql
    assert "last_heartbeat" in sql


# =========================================================================
# log_activity
# =========================================================================


@pytest.mark.asyncio
async def test_log_activity_returns_id_string(repo, fake_pool):
    fake_pool.set_fetchrow({"id": 42})
    result = await repo.log_activity("s1", "u1", "quiz_answered", {"score": 90})
    assert result == "42"
    sql = fake_pool.calls[0][1]
    assert "INSERT INTO public.session_activities" in sql
    assert "activity_data" in sql


# =========================================================================
# get_session_activities
# =========================================================================


@pytest.mark.asyncio
async def test_get_session_activities_returns_list(repo, fake_pool):
    fake_pool.set_fetch([
        {"id": 1, "session_id": "s1", "user_id": "u1", "activity_type": "view",
         "activity_data": {}, "timestamp": datetime(2026, 8, 31, 10, 0, 0)},
    ])
    activities = await repo.get_session_activities("s1", limit=10)
    assert len(activities) == 1
    assert activities[0]["activity_type"] == "view"


# =========================================================================
# No Mongo symbols
# =========================================================================


def test_no_mongo_symbols():
    import repositories.session_tracking_repository as mod
    assert not hasattr(mod, "get_database")
    assert not hasattr(mod, "BaseRepository")
    assert not hasattr(mod, "_SafeCollection")
    assert not hasattr(mod, "_SafeCursor")