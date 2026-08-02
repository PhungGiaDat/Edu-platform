"""
Pytest configuration and fixtures for backend tests.
"""
import os

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from typing import Dict, Any


# Test-time defaults installed at conftest load time. This runs *before* pytest
# collects test modules, so any top-level `import settings` / `from settings
# import settings` inside a test file sees these env vars. The per-test
# autouse monkeypatch below re-asserts the same values inside the test
# scope (so they are cleaned up automatically by pytest).
_TEST_ENV: Dict[str, str] = {
    "MONGO_URL": "mongodb://localhost:27017",
    "MONGO_DB": "test_eduplatform",
    # 32+ char dummy secret (Settings.SECRET_KEY validator requires this)
    "SECRET_KEY": "x" * 64,
    "SUPABASE_PROJECT_URL": "https://test.supabase.co",
    "SUPABASE_STORAGE_BUCKET": "AR_models",
    "AVATAR_SERVICE_URL": "https://api.dicebear.com/7.x/avataaars/svg",
    "DEFAULT_FRONTEND_ORIGIN": "http://localhost:5173",
    "ALLOWED_ORIGINS": "*",
    "DEV_ORIGINS": "http://localhost:3000,http://localhost:5173",
}
for _k, _v in _TEST_ENV.items():
    os.environ.setdefault(_k, _v)


def pytest_configure(config: pytest.Config) -> None:
    """Run once at pytest startup. Optional services disabled by default."""
    for k in ("GOOGLE_API_KEY", "OPENAI_API_KEY",
              "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        os.environ.pop(k, None)


@pytest.fixture(autouse=True)
def _dummy_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Re-assert the dummy env vars for every test.

    The autouse `monkeypatch` is the user-approved fixture pattern: it
    auto-applies to every test and auto-reverts on teardown, so tests that
    need to override a value can do so with their own `monkeypatch.setenv`
    (the inner scope wins) and leak nothing.
    """
    for k, v in _TEST_ENV.items():
        monkeypatch.setenv(k, v)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_user_id():
    """Sample user ID for testing."""
    return "test_user_123"


@pytest.fixture
def mock_user_data(mock_user_id):
    """Sample user gamification data."""
    return {
        "user_id": mock_user_id,
        "total_points": 250,
        "level": 3,
        "xp_to_next_level": 150,
        "streak_days": 5,
        "longest_streak": 10,
        "badges": ["first_scan", "quiz_starter"],
        "last_activity_date": datetime.utcnow() - timedelta(hours=2),
        "minutes_today": 10,
        "daily_stats": [
            {
                "date": (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
                "words_learned": 3,
                "time_mins": 15,
            }
        ],
        "pet": {
            "type": "bunny",
            "happiness": 60,
            "hunger": 30,
            "energy": 80,
            "mood": "happy",
            "xp_earned": 150,
            "stage": "child",
        },
    }


@pytest.fixture
def mock_repository(mock_user_data):
    """Create a mock gamification repository."""
    repo = AsyncMock()
    repo.get_by_user_id = AsyncMock(return_value=mock_user_data)
    repo.update_points = AsyncMock(return_value=mock_user_data)
    repo.add_xp = AsyncMock(return_value=mock_user_data)
    repo.add_badge = AsyncMock(return_value=mock_user_data)
    repo.update_streak = AsyncMock(return_value=mock_user_data)
    repo.get_streak = AsyncMock(return_value={
        "current_streak": mock_user_data["streak_days"],
        "longest_streak": mock_user_data["longest_streak"],
        "last_activity": mock_user_data["last_activity_date"].isoformat(),
        "streak_active_today": True,
        "daily_goal_minutes": 15,
        "minutes_today": mock_user_data["minutes_today"],
    })
    repo.get_leaderboard = AsyncMock(return_value=[])
    repo.get_pet = AsyncMock(return_value=mock_user_data.get("pet"))
    repo.update_pet = AsyncMock(return_value=mock_user_data)
    repo.feed_pet = AsyncMock(return_value=mock_user_data)
    repo.play_pet = AsyncMock(return_value=mock_user_data)
    repo.update_pet_xp = AsyncMock(return_value=mock_user_data)
    repo.update_pet_stage = AsyncMock(return_value=mock_user_data)
    repo.update_pet_outfit = AsyncMock(return_value=mock_user_data)
    repo.get_stickers = AsyncMock(return_value=[])
    repo.has_sticker = AsyncMock(return_value=False)
    repo.add_sticker = AsyncMock(return_value=mock_user_data)
    repo.add_daily_stat = AsyncMock(return_value=mock_user_data)
    repo.get_daily_stats = AsyncMock(return_value=mock_user_data.get("daily_stats", []))
    return repo


@pytest.fixture
def gamification_service(mock_repository):
    """Create a GamificationService with mocked repository."""
    with patch('services.gamification_service.get_gamification_repository', return_value=mock_repository):
        from services.gamification_service import GamificationService
        service = GamificationService()
        service.repo = mock_repository
        return service


@pytest.fixture
def sample_course_data():
    """Sample course data for testing."""
    return {
        "course_id": "course_test_123",
        "title": "Test Course",
        "lessons": [
            {
                "lesson_id": "lesson_1",
                "order": 1,
                "vocabulary": [
                    {"word_en": "apple", "word_local": "manzana"},
                    {"word_en": "banana", "word_local": "platano"},
                ],
                "reward": {"xp": 50, "sticker": "star_gold"},
            }
        ],
    }


@pytest.fixture
def sample_lesson_session():
    """Sample lesson session for testing."""
    return {
        "session_id": "session_test_123",
        "user_id": "test_user_123",
        "course_id": "course_test_123",
        "lesson_id": "lesson_1",
        "current_step_id": "watch",
        "current_step_index": 0,
        "progress_percent": 0,
        "status": "in_progress",
        "steps": [
            {"step_id": "watch", "title": "Watch", "status": "in_progress", "attempts": 0},
            {"step_id": "game", "title": "Game", "status": "locked", "attempts": 0},
            {"step_id": "finish", "title": "Finish", "status": "locked", "attempts": 0},
        ],
    }
