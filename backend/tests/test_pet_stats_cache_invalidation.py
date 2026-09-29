"""An XP award must be visible to GET /pets immediately, not after the 60 s stats cache."""
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api import pets
from services.postgres_gamification_service import PostgresGamificationService
from utils.cache import CacheKeys, user_stats_cache


class FakePool:
    @asynccontextmanager
    async def acquire(self):
        connection = MagicMock()

        @asynccontextmanager
        async def transaction():
            yield

        connection.transaction = transaction
        yield connection


@pytest.mark.asyncio
async def test_game_award_reaching_rare_threshold_shows_in_pets_without_waiting():
    user_id = "demo-learner"
    await user_stats_cache.set(CacheKeys.user_stats(user_id), {"total_points": 470, "streak_days": 0}, ttl=60)
    service = PostgresGamificationService()
    service.apply_xp_event = AsyncMock(return_value={"success": True, "xp_awarded": 30, "total_xp_after": 500})
    live = MagicMock(get_user_stats=AsyncMock(return_value={"total_points": 500, "streak_days": 0}))

    with patch("services.postgres_gamification_service.postgres_pool", return_value=FakePool()):
        await service.add_xp_with_event_id(user_id, "game_completed_drag_match_demo_20260930", "game_completed")
    with patch.object(pets, "get_gamification_service", return_value=live):
        stats = await pets._user_stats(user_id)

    assert stats["total_points"] == 500
    rare = {"pet_id": "fox", "name": "Fox", "unlock_condition": {"type": "xp", "value": 500}}
    assert pets.pet_to_response(rare, [], None, stats["total_points"], 0).can_unlock is True


@pytest.mark.asyncio
async def test_failed_award_keeps_the_cache():
    user_id = "demo-learner-2"
    key = CacheKeys.user_stats(user_id)
    await user_stats_cache.set(key, {"total_points": 470, "streak_days": 0}, ttl=60)
    service = PostgresGamificationService()
    service.apply_xp_event = AsyncMock(return_value={"success": False, "error": "CONCURRENT_PROCESSING"})

    with patch("services.postgres_gamification_service.postgres_pool", return_value=FakePool()):
        await service.add_xp_with_event_id(user_id, "evt", "game_completed")

    assert (await user_stats_cache.get(key))["total_points"] == 470
    await user_stats_cache.delete(key)
