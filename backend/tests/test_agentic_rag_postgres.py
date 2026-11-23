"""AgenticRAG — Postgres-only cache/history/progress (Mongo removed)."""
from unittest.mock import MagicMock

import pytest

from services import agentic_rag_service as ars
from services.agentic_rag_service import AgenticRAGService


@pytest.fixture
def service():
    # MagicMock retriever keeps Qdrant out of unit tests
    return AgenticRAGService(retriever=MagicMock())


class FakeCache:
    def __init__(self):
        self.store = {}

    async def get(self, key):
        return self.store.get(key)

    async def set(self, key, value, ttl_seconds=None):
        self.store[key] = value
        return True


def test_module_no_longer_imports_mongo():
    assert not hasattr(ars, "get_database")


@pytest.mark.asyncio
async def test_cache_roundtrip_uses_cache_service(service, monkeypatch):
    fake = FakeCache()
    monkeypatch.setattr(ars, "cache_service", fake)

    await service._set_cache("k1", {"response": "hello"})
    out = await service._get_cache("k1")

    assert out == {"response": "hello"}
    assert "k1" in fake.store


@pytest.mark.asyncio
async def test_cache_read_error_degrades_gracefully(service, monkeypatch):
    class BrokenCache:
        async def get(self, key):
            raise RuntimeError("cache down")

        async def set(self, key, value, ttl_seconds=None):
            raise RuntimeError("cache down")

    monkeypatch.setattr(ars, "cache_service", BrokenCache())
    # no raise
    assert await service._get_cache("k") is None
    await service._set_cache("k", {"a": 1})


@pytest.mark.asyncio
async def test_recent_history_reads_postgres_and_filters_ai(service, monkeypatch):
    rows = [
        {"sender": "ai", "message": "A1"},
        {"sender": "user", "message": "U1"},
        {"sender": "ai", "message": "A2"},
        {"sender": "ai", "message": "A3"},
    ]

    class FakePostgresRepo:
        async def get_session_history(self, session_id, limit=50):
            assert session_id == "s1"
            return rows

    monkeypatch.setattr(ars, "PostgresChatLogRepository", FakePostgresRepo)

    out = await service._get_recent_history("s1", limit=2)
    assert out == "A2\n---\nA3"


@pytest.mark.asyncio
async def test_recent_history_empty_postgres(service, monkeypatch):
    class FakePostgresRepo:
        async def get_session_history(self, session_id, limit=50):
            return []

    monkeypatch.setattr(ars, "PostgresChatLogRepository", FakePostgresRepo)
    out = await service._get_recent_history("s1", limit=5)
    assert "lịch sử" in out or out == ""


@pytest.mark.asyncio
async def test_progress_summary_reads_postgres_learning_progress(service, monkeypatch):
    class _FakeResult:
        def mappings(self):
            class _M:
                def all(self_inner):
                    return [
                        {
                            "flashcard_qr_id": "qr1",
                            "mastery_level": 3,
                            "times_viewed": 5,
                        }
                    ]

            return _M()

    class _FakeSession:
        async def execute(self, query, params=None):
            assert params == {"user_id": "u1"}
            assert "learning_progress" in str(query)
            return _FakeResult()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

    class _FakeSessionMaker:
        def __call__(self):
            return _FakeSession()

    class _FakeFactory:
        def __call__(self):
            return _FakeSessionMaker()

    monkeypatch.setattr("database.orm_session.session_factory", _FakeFactory())

    out = await service._get_progress_summary("u1")
    assert "qr1" in out
    assert "mastery=3/5" in out


@pytest.mark.asyncio
async def test_progress_summary_guest(service):
    out = await service._get_progress_summary(None)
    assert "khách" in out.lower() or "vãng lai" in out.lower()
