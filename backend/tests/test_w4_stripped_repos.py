"""Verify stripped repos raise NotImplementedError and have no Mongo symbols (W4)."""
import pytest

from repositories.user_session_repository import (
    UserSessionRepository,
    user_session_repo,
    get_user_session_repository,
)
from repositories.cache_repository import (
    CacheRepository,
    cache_repo,
    get_cache_repository,
)


class TestUserSessionRepositoryStripped:
    def test_instantiation(self):
        repo = UserSessionRepository()
        assert repo.collection_name == "user_sessions"

    @pytest.mark.asyncio
    async def test_every_method_raises(self):
        repo = UserSessionRepository()
        for method_name in [
            "create_session", "get_active_session", "get_session",
            "get_user_sessions", "update_session_activity",
            "update_session_metrics", "pause_session", "resume_session",
            "end_session", "abandon_session", "get_user_session_stats",
        ]:
            with pytest.raises(NotImplementedError, match="stripped in De-Mongo"):
                await getattr(repo, method_name)()

    def test_singleton(self):
        assert user_session_repo is get_user_session_repository()

    def test_no_mongo_imports(self):
        import repositories.user_session_repository as mod
        import inspect
        src = inspect.getsource(mod)
        assert "beanie" not in src
        assert "mongodb" not in src
        assert "BaseRepository" not in src


class TestCacheRepositoryStripped:
    def test_instantiation(self):
        repo = CacheRepository()
        assert repo.collection_name == "redis_cache"

    @pytest.mark.asyncio
    async def test_every_method_raises(self):
        repo = CacheRepository()
        for method_name in [
            "get", "set", "delete", "invalidate", "invalidate_pattern",
            "get_or_set", "get_by_type", "get_stats", "cleanup_expired",
        ]:
            with pytest.raises(NotImplementedError, match="stripped in De-Mongo"):
                await getattr(repo, method_name)(cache_key="test")

    def test_singleton(self):
        assert cache_repo is get_cache_repository()

    def test_no_mongo_imports(self):
        import repositories.cache_repository as mod
        import inspect
        src = inspect.getsource(mod)
        assert "beanie" not in src
        assert "mongodb" not in src
        assert "BaseRepository" not in src