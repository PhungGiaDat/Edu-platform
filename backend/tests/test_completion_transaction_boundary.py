"""Regression guards for the request-scoped completion transaction."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from services.course_service import CourseService
from tests.test_course_service_gamification import setup_course_mock


@pytest.mark.asyncio
async def test_completion_reward_failure_bubbles_before_request_commit():
    """A failed same-session reward prevents the dependency transaction from committing."""
    repo = MagicMock()
    setup_course_mock(repo)
    rewards = MagicMock()
    rewards.award_lesson_completion = AsyncMock(return_value={"success": False, "error": "INJECTED"})
    with patch("services.course_service.get_gamification_service") as gamification:
        gamification.return_value.track_learning = AsyncMock()
        with pytest.raises(RuntimeError, match="INJECTED"):
            await CourseService(repo, rewards).complete_lesson("user_123", "course_123", "lesson_1")
    repo.upsert_progress.assert_awaited_once()
    rewards.award_lesson_completion.assert_awaited_once_with("user_123", "course_123", "lesson_1")


@pytest.mark.asyncio
async def test_session_bound_reward_replaces_raw_add_xp_for_completion():
    repo = MagicMock()
    setup_course_mock(repo)
    rewards = MagicMock()
    rewards.award_lesson_completion = AsyncMock(return_value={"success": True})
    with patch("services.course_service.get_gamification_service") as gamification:
        gamification.return_value.add_xp = AsyncMock()
        gamification.return_value.track_learning = AsyncMock()
        await CourseService(repo, rewards).complete_lesson("user_123", "course_123", "lesson_1")
    rewards.award_lesson_completion.assert_awaited_once()
    gamification.return_value.add_xp.assert_not_awaited()
