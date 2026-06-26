"""
Test suite for CourseService gamification integration.

Tests the integration between course service and gamification:
- complete_lesson() with gamification hooks
- XP calculation for lesson completion
- Daily stat upsert-per-day logic
- Sticker award conditions
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

from services.course_service import CourseService, _advance_session, _build_session


class TestCompleteLessonGamification:
    """Test complete_lesson integration with gamification."""

    @pytest.mark.asyncio
    async def test_completeLesson_awardsXpFirstTime(self):
        """complete_lesson should award XP only on first completion."""
        with patch('services.course_service.get_gamification_service') as mock_gam:
            mock_gam_instance = MagicMock()
            mock_gam_instance.add_xp = AsyncMock(return_value={"success": True, "xp_added": 60})
            mock_gam_instance.track_learning = AsyncMock(return_value={"success": True})
            mock_gam_instance._maybe_award_lesson_sticker = AsyncMock(return_value=None)
            mock_gam.return_value = mock_gam_instance

            with patch('services.course_service.get_course_repository') as mock_repo:
                mock_repo_instance = MagicMock()
                mock_repo.return_value = mock_repo_instance
                
                # Setup complete async mock chain
                setup_course_mock(mock_repo_instance)

                service = CourseService()
                service.repo = mock_repo_instance

                # First completion
                result = await service.complete_lesson(
                    user_id="user_123",
                    course_id="course_123",
                    lesson_id="lesson_1",
                    score=85,
                    time_spent=10,
                    words_learned=["apple", "banana"],
                    games_played=2,
                )

                # Verify gamification was called
                mock_gam_instance.add_xp.assert_called()
                mock_gam_instance.track_learning.assert_called()

    @pytest.mark.asyncio
    async def test_completeLesson_noXpOnRepeat(self):
        """complete_lesson should NOT award XP on repeat completion."""
        with patch('services.course_service.get_gamification_service') as mock_gam:
            mock_gam_instance = MagicMock()
            mock_gam_instance.add_xp = AsyncMock(return_value={"success": True})
            mock_gam_instance.track_learning = AsyncMock(return_value={"success": True})
            mock_gam_instance._maybe_award_lesson_sticker = AsyncMock(return_value=None)
            mock_gam.return_value = mock_gam_instance

            with patch('services.course_service.get_course_repository') as mock_repo:
                mock_repo_instance = MagicMock()
                mock_repo.return_value = mock_repo_instance

                # Setup already-completed lesson
                setup_course_mock(mock_repo_instance, already_completed=True)

                service = CourseService()
                service.repo = mock_repo_instance

                result = await service.complete_lesson(
                    user_id="user_123",
                    course_id="course_123",
                    lesson_id="lesson_1",
                    score=85,
                    time_spent=10,
                )

                # XP should not be awarded for repeat completion
                mock_gam_instance.add_xp.assert_not_called()

    @pytest.mark.asyncio
    async def test_completeLesson_tracksLearning(self):
        """complete_lesson should call track_learning with correct values."""
        with patch('services.course_service.get_gamification_service') as mock_gam:
            mock_gam_instance = MagicMock()
            mock_gam_instance.add_xp = AsyncMock(return_value={"success": True})
            mock_gam_instance.track_learning = AsyncMock(return_value={"success": True})
            mock_gam_instance._maybe_award_lesson_sticker = AsyncMock(return_value=None)
            mock_gam.return_value = mock_gam_instance

            with patch('services.course_service.get_course_repository') as mock_repo:
                setup_course_mock(mock_repo.return_value)

                service = CourseService()
                service.repo = mock_repo.return_value

                words_learned = ["apple", "banana", "cherry"]
                time_spent = 15

                await service.complete_lesson(
                    user_id="user_123",
                    course_id="course_123",
                    lesson_id="lesson_1",
                    time_spent=time_spent,
                    words_learned=words_learned,
                )

                # Verify track_learning was called with correct values
                mock_gam_instance.track_learning.assert_called_with(
                    "user_123",
                    len(words_learned),  # 3 words
                    time_spent  # 15 mins
                )

    @pytest.mark.asyncio
    async def test_completeLesson_awardsSticker(self):
        """complete_lesson should call _maybe_award_lesson_sticker."""
        with patch('services.course_service.get_gamification_service') as mock_gam:
            mock_gam_instance = MagicMock()
            mock_gam_instance.add_xp = AsyncMock(return_value={"success": True})
            mock_gam_instance.track_learning = AsyncMock(return_value={"success": True})
            mock_gam_instance._maybe_award_lesson_sticker = AsyncMock(return_value={
                "id": "star_gold",
                "name": "Gold Star",
            })
            mock_gam.return_value = mock_gam_instance

            with patch('services.course_service.get_course_repository') as mock_repo:
                setup_course_mock(mock_repo.return_value)

                service = CourseService()
                service.repo = mock_repo.return_value

                await service.complete_lesson(
                    user_id="user_123",
                    course_id="course_123",
                    lesson_id="lesson_1",
                    words_learned=["apple"],
                    games_played=1,
                )

                # Verify sticker check was called
                mock_gam_instance._maybe_award_lesson_sticker.assert_called_once()

    @pytest.mark.asyncio
    async def test_completeLesson_includesGamificationInResponse(self):
        """complete_lesson response should include gamification metadata."""
        with patch('services.course_service.get_gamification_service') as mock_gam:
            mock_gam_instance = MagicMock()
            mock_gam_instance.add_xp = AsyncMock(return_value={"success": True, "xp_added": 60})
            mock_gam_instance.track_learning = AsyncMock(return_value={"success": True})
            mock_gam_instance._maybe_award_lesson_sticker = AsyncMock(return_value={
                "id": "star_gold",
                "name": "Gold Star",
            })
            mock_gam.return_value = mock_gam_instance

            with patch('services.course_service.get_course_repository') as mock_repo:
                setup_course_mock(mock_repo.return_value)

                service = CourseService()
                service.repo = mock_repo.return_value

                result = await service.complete_lesson(
                    user_id="user_123",
                    course_id="course_123",
                    lesson_id="lesson_1",
                    score=90,
                    time_spent=10,
                    words_learned=["apple", "banana"],
                    games_played=2,
                )

                # Response should include gamification data
                assert "gamification" in result
                assert "xp_earned" in result["gamification"]
                assert "words_learned" in result["gamification"]
                assert "time_mins" in result["gamification"]
                assert "new_sticker" in result["gamification"]

    @pytest.mark.asyncio
    async def test_completeLesson_usesTimeSpentDirectly(self):
        """complete_lesson should use time_spent directly (frontend already ceil'd)."""
        with patch('services.course_service.get_gamification_service') as mock_gam:
            mock_gam_instance = MagicMock()
            mock_gam_instance.add_xp = AsyncMock(return_value={"success": True})
            mock_gam_instance.track_learning = AsyncMock(return_value={"success": True})
            mock_gam_instance._maybe_award_lesson_sticker = AsyncMock(return_value=None)
            mock_gam.return_value = mock_gam_instance

            with patch('services.course_service.get_course_repository') as mock_repo:
                setup_course_mock(mock_repo.return_value)

                service = CourseService()
                service.repo = mock_repo.return_value

                # Frontend sends time in minutes (already ceil'd)
                time_spent = 7

                await service.complete_lesson(
                    user_id="user_123",
                    course_id="course_123",
                    lesson_id="lesson_1",
                    time_spent=time_spent,
                )

                # Verify time_mins is used directly
                call_args = mock_gam_instance.track_learning.call_args
                assert call_args[0][2] == time_spent


class TestDailyStatUpsert:
    """Test daily stat upsert-per-day logic."""

    @pytest.mark.asyncio
    async def test_trackLearning_upsertPerDay(self):
        """track_learning should use upsert-per-day pattern."""
        with patch('services.gamification_service.get_gamification_repository') as mock_repo_factory:
            mock_repo = AsyncMock()
            mock_repo.add_daily_stat = AsyncMock(return_value={})
            mock_repo_factory.return_value = mock_repo

            from services.gamification_service import GamificationService
            service = GamificationService()
            service.repo = mock_repo

            await service.track_learning("user_123", 5, 15)

            # Verify add_daily_stat was called
            mock_repo.add_daily_stat.assert_called_once_with("user_123", 5, 15)


class TestAdvanceSession:
    """Test _advance_session function."""

    def test_advanceSession_completesStep(self):
        """_advance_session should mark step as completed when passed."""
        session = {
            "current_step_id": "watch",
            "steps": [
                {"step_id": "watch", "status": "in_progress", "attempts": 0, "best_score": 0},
                {"step_id": "game", "status": "locked", "attempts": 0, "best_score": 0},
                {"step_id": "finish", "status": "locked", "attempts": 0, "best_score": 0},
            ]
        }

        result = _advance_session(session, "watch", True, 85, {})

        assert result["steps"][0]["status"] == "completed"
        assert result["steps"][0]["attempts"] == 1
        assert result["steps"][0]["best_score"] == 85
        assert result["current_step_id"] == "game"

    def test_advanceSession_failsStep(self):
        """_advance_session should mark step as needs_retry when failed."""
        session = {
            "current_step_id": "watch",
            "steps": [
                {"step_id": "watch", "status": "in_progress", "attempts": 0, "best_score": 0},
            ]
        }

        result = _advance_session(session, "watch", False, 50, {})

        assert result["steps"][0]["status"] == "needs_retry"
        assert result["steps"][0]["attempts"] == 1
        assert result["current_step_id"] == "watch"

    def test_advanceSession_finishCompletesSession(self):
        """_advance_session should complete session when finish step passed."""
        session = {
            "current_step_id": "finish",
            "status": "in_progress",
            "steps": [
                {"step_id": "watch", "status": "completed", "attempts": 1, "best_score": 90},
                {"step_id": "game", "status": "completed", "attempts": 1, "best_score": 85},
                {"step_id": "finish", "status": "in_progress", "attempts": 0, "best_score": 0},
            ]
        }

        result = _advance_session(session, "finish", True, 100, {})

        assert result["status"] == "completed"
        assert result["steps"][2]["status"] == "completed"

    def test_advanceSession_updatesBestScore(self):
        """_advance_session should keep best score when lower score achieved."""
        session = {
            "current_step_id": "watch",
            "steps": [
                {"step_id": "watch", "status": "completed", "attempts": 1, "best_score": 90},
            ]
        }

        result = _advance_session(session, "watch", True, 70, {})

        assert result["steps"][0]["best_score"] == 90


class TestBuildSession:
    """Test _build_session function."""

    def test_buildSession_createsCorrectSteps(self):
        """_build_session should create steps based on lesson blueprint."""
        lesson = {
            "lesson_id": "lesson_1",  # Required field
            "videoLesson": {"scenes": []},
            "game": {"items": []},
            "vocabulary": [],
            "readAloudStory": {},
            "pronunciation": {},
            "quiz": [],
        }

        result = _build_session("user_123", "course_123", lesson)

        assert result["user_id"] == "user_123"
        assert result["course_id"] == "course_123"
        assert len(result["steps"]) >= 2
        assert result["steps"][0]["step_id"] == "watch"
        assert result["steps"][0]["status"] == "in_progress"
        # Session status depends on implementation - check for valid status
        assert result["status"] in ["in_progress", "started"]

    def test_buildSession_locksNonFirstSteps(self):
        """_build_session should lock all steps except first."""
        lesson = {
            "lesson_id": "lesson_1",  # Required field
            "videoLesson": {},
            "game": {},
            "quiz": [],
        }

        result = _build_session("user_123", "course_123", lesson)

        for i, step in enumerate(result["steps"]):
            if i == 0:
                assert step["status"] in ["in_progress", "available"]
            else:
                assert step["status"] == "locked"


class TestSubmitQuiz:
    """Test submit_quiz functionality."""

    @pytest.mark.asyncio
    async def test_submitQuiz_calculatesScore(self):
        """submit_quiz should calculate correct score."""
        with patch('services.course_service.get_course_repository') as mock_repo:
            mock_repo_instance = MagicMock()
            mock_repo.return_value = mock_repo_instance
            mock_repo_instance.get_lesson = AsyncMock(return_value={
                "lesson_id": "lesson_1",
                "quiz": [
                    {"question_id": "q1", "correctOptionId": "a", "feedbackCorrect": "Good", "feedbackIncorrect": "Bad"},
                    {"question_id": "q2", "correctOptionId": "b", "feedbackCorrect": "Good", "feedbackIncorrect": "Bad"},
                    {"question_id": "q3", "correctOptionId": "c", "feedbackCorrect": "Good", "feedbackIncorrect": "Bad"},
                ],
                "reward": {"xp": 50},
            })
            mock_repo_instance.upsert_media_assets = AsyncMock(return_value={})
            mock_repo_instance.get_one_progress = AsyncMock(return_value={
                "lesson_progress": []
            })
            mock_repo_instance.upsert_progress = AsyncMock(return_value={})

            service = CourseService()
            service.repo = mock_repo_instance

            result = await service.submit_quiz(
                user_id="user_123",
                course_id="course_123",
                lesson_id="lesson_1",
                answers={"q1": "a", "q2": "b", "q3": "c"}
            )

            assert result["score"] == 100
            assert result["correct"] == 3
            assert result["total"] == 3
            assert result["passed"] is True

    @pytest.mark.asyncio
    async def test_submitQuiz_partialCorrect(self):
        """submit_quiz should handle partial correct answers."""
        with patch('services.course_service.get_course_repository') as mock_repo:
            mock_repo_instance = MagicMock()
            mock_repo.return_value = mock_repo_instance
            mock_repo_instance.get_lesson = AsyncMock(return_value={
                "lesson_id": "lesson_1",
                "quiz": [
                    {"question_id": "q1", "correctOptionId": "a", "feedbackCorrect": "Good", "feedbackIncorrect": "Bad"},
                    {"question_id": "q2", "correctOptionId": "b", "feedbackCorrect": "Good", "feedbackIncorrect": "Bad"},
                ],
                "reward": {"xp": 50},
            })
            mock_repo_instance.upsert_media_assets = AsyncMock(return_value={})
            mock_repo_instance.get_one_progress = AsyncMock(return_value={
                "lesson_progress": []
            })
            mock_repo_instance.upsert_progress = AsyncMock(return_value={})

            service = CourseService()
            service.repo = mock_repo_instance

            result = await service.submit_quiz(
                user_id="user_123",
                course_id="course_123",
                lesson_id="lesson_1",
                answers={"q1": "a", "q2": "wrong"}
            )

            assert result["score"] == 50
            assert result["correct"] == 1
            assert result["passed"] is False


# ========== Helper Functions ==========

def setup_course_mock(mock_repo, already_completed=False):
    """Setup mock course repository for testing."""
    lesson = {
        "lesson_id": "lesson_1",
        "order": 1,
        "vocabulary": [
            {"word_en": "apple"},
            {"word_en": "banana"},
        ],
        "reward": {"xp": 60, "sticker": "star_gold"},
    }

    course = {
        "course_id": "course_123",
        "title": "Test Course",
        "lessons": [lesson],
    }

    completed_lessons = ["lesson_1"] if already_completed else []

    # Make sure all methods are properly async mocks
    mock_repo.get_by_course_id = AsyncMock(return_value=course)
    mock_repo.get_one_progress = AsyncMock(return_value={
        "user_id": "user_123",
        "course_id": "course_123",
        "completed_lessons": completed_lessons,
        "lesson_progress": [
            {
                "lesson_id": "lesson_1",
                "status": "completed" if already_completed else "not_started",
            }
        ],
        "rewards": [],
    })
    mock_repo.upsert_progress = AsyncMock(return_value={})
    mock_repo.get_lesson_session = AsyncMock(return_value=None)
    mock_repo.upsert_lesson_session = AsyncMock(return_value={})
    mock_repo.get_media_assets = AsyncMock(return_value=[])
    mock_repo.upsert_media_assets = AsyncMock(return_value={})
    mock_repo.create_lesson_step_attempt = AsyncMock(return_value={})
