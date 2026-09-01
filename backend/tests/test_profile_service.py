from datetime import datetime
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from models.user_schemas import UserResponse


# The repository's services package eagerly imports speech/ML integrations in
# ``services.__init__``.  Load this isolated service module directly so these
# unit tests do not bootstrap unrelated infrastructure.
_PROFILE_SERVICE_PATH = Path(__file__).resolve().parents[1] / "services" / "profile_service.py"
_PROFILE_SERVICE_SPEC = importlib.util.spec_from_file_location(
    "profile_service_under_test",
    _PROFILE_SERVICE_PATH,
)
assert _PROFILE_SERVICE_SPEC and _PROFILE_SERVICE_SPEC.loader
_PROFILE_SERVICE_MODULE = importlib.util.module_from_spec(_PROFILE_SERVICE_SPEC)
_PROFILE_SERVICE_SPEC.loader.exec_module(_PROFILE_SERVICE_MODULE)
ProfileService = _PROFILE_SERVICE_MODULE.ProfileService


def make_user():
    return SimpleNamespace(
        id="user-1",
        email="learner@example.com",
        username="learner",
        full_name="Test Learner",
        avatar_url="https://example.com/avatar.png",
        is_active=True,
        is_verified=True,
        is_superuser=True,
        role="admin",
        roles=["admin"],
        created_at=datetime.utcnow(),
        active_pet=None,
        unlocked_pets=[],
        pet_preferences=None,
    )


def make_database(*, words=4, quizzes=2):
    word_collection = MagicMock()
    word_collection.count_documents = AsyncMock(return_value=words)
    quiz_collection = MagicMock()
    quiz_collection.count_documents = AsyncMock(return_value=quizzes)
    content_collection = MagicMock()
    content_collection.update_one = AsyncMock()
    content_collection.find_one = AsyncMock(return_value=None)
    collections = {
        "word_mastery": word_collection,
        "quiz_attempts": quiz_collection,
        "profile_content": content_collection,
    }
    database = MagicMock()
    database.__getitem__.side_effect = collections.__getitem__
    return database


def test_auth_user_response_exposes_authoritative_admin_fields():
    user = make_user()
    response = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_superuser=user.is_superuser,
        role=user.role,
        roles=user.roles,
        created_at=user.created_at,
    )
    assert response.is_superuser is True
    assert response.role == "admin"
    assert response.full_name == "Test Learner"
    assert response.avatar_url == "https://example.com/avatar.png"


@pytest.mark.asyncio
async def test_profile_uses_real_sources_and_authenticated_identity():
    gamification = MagicMock()
    gamification.get_user_stats = AsyncMock(return_value={
        "level": 3,
        "total_points": 80,
        "xp_to_next_level": 100,
        "streak_days": 5,
        "badges": ["first_scan"],
    })
    gamification.get_leaderboard = AsyncMock(return_value=[])
    courses = MagicMock()
    courses.get_progress = AsyncMock(return_value=[{
        "course_id": "course-1",
        "completed_lessons": ["lesson-1"],
        "lesson_progress": [{
            "lesson_id": "lesson-1",
            "status": "completed",
            "completed_at": datetime.utcnow(),
        }],
    }])

    result = await ProfileService(gamification, courses, make_database()).get_profile(make_user())

    assert result.identity.id == "user-1"
    assert result.summary.total_points == 80
    assert result.summary.lessons_completed == 1
    assert result.summary.words_learned == 4
    assert result.summary.quizzes_passed == 2
    assert result.daily_challenge.progress == 1
    assert next(badge for badge in result.badges if badge.id == "first_scan").earned is True
    assert result.meta.partial_sections == []


@pytest.mark.asyncio
async def test_profile_reports_partial_sources_without_erasing_identity():
    gamification = MagicMock()
    gamification.get_user_stats = AsyncMock(side_effect=RuntimeError("gamification unavailable"))
    gamification.get_leaderboard = AsyncMock(return_value=[])
    courses = MagicMock()
    courses.get_progress = AsyncMock(side_effect=RuntimeError("progress unavailable"))
    database = make_database(words=0, quizzes=0)

    result = await ProfileService(gamification, courses, database).get_profile(make_user())

    assert result.identity.username == "learner"
    assert result.summary.total_points == 0
    assert "summary.gamification" in result.meta.partial_sections
    assert "summary.lessons" in result.meta.partial_sections
    assert "daily_challenge" in result.meta.partial_sections
