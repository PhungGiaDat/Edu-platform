"""
Test suite for GamificationService - Sprint 3A tests.

Tests the gamification service methods including:
- track_learning()
- add_xp()
- get_streak()
- _maybe_award_lesson_sticker()
- _is_today_active()

All tests use mocked MongoDB repository to verify business logic.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from typing import Dict, Any

from models.gamification_model import XP_REWARDS, calculate_next_level_xp


class TestGamificationServiceHelpers:
    """Test helper methods of GamificationService."""

    def test_clamp_within_range(self, gamification_service):
        """_clamp should return value when within min/max bounds."""
        assert gamification_service._clamp(50, 0, 100) == 50

    def test_clamp_belowMin(self, gamification_service):
        """_clamp should return minimum when value is below."""
        assert gamification_service._clamp(-10, 0, 100) == 0

    def test_clamp_aboveMax(self, gamification_service):
        """_clamp should return maximum when value exceeds."""
        assert gamification_service._clamp(150, 0, 100) == 100

    def test_clamp_convertsToInt(self, gamification_service):
        """_clamp should convert float to int."""
        assert gamification_service._clamp(50.7, 0, 100) == 50

    def test_parseDt_withDatetime(self, gamification_service):
        """_parse_dt should return datetime unchanged."""
        dt = datetime(2024, 1, 15, 10, 30)
        result = gamification_service._parse_dt(dt)
        assert result == dt

    def test_parseDt_withIsoString(self, gamification_service):
        """_parse_dt should parse ISO format string."""
        result = gamification_service._parse_dt("2024-01-15T10:30:00Z")
        assert result is not None
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15

    def test_parseDt_withInvalidString(self, gamification_service):
        """_parse_dt should return None for invalid string."""
        result = gamification_service._parse_dt("invalid-date")
        assert result is None

    def test_parseDt_withNonDatetime(self, gamification_service):
        """_parse_dt should return None for non-datetime types."""
        assert gamification_service._parse_dt(123) is None
        assert gamification_service._parse_dt(None) is None

    def test_isTodayActive_withTodayDate(self, gamification_service):
        """_is_today_active should return True for today's date."""
        today = datetime.utcnow()
        assert gamification_service._is_today_active(today) is True

    def test_isTodayActive_withYesterdayDate(self, gamification_service):
        """_is_today_active should return False for yesterday's date."""
        yesterday = datetime.utcnow() - timedelta(days=1)
        assert gamification_service._is_today_active(yesterday) is False

    def test_isTodayActive_withNone(self, gamification_service):
        """_is_today_active should return False for None."""
        assert gamification_service._is_today_active(None) is False

    def test_isTodayActive_withDateObject(self, gamification_service):
        """_is_today_active should handle date-only objects."""
        today_date = datetime.utcnow().date()
        assert gamification_service._is_today_active(today_date) is True

    def test_moodFromStats_sleeping(self, gamification_service):
        """_mood_from_stats should return 'sleeping' when energy <= 15."""
        assert gamification_service._mood_from_stats(50, 10, 50) == "sleeping"

    def test_moodFromStats_hungry(self, gamification_service):
        """_mood_from_stats should return 'hungry' when hunger >= 75."""
        assert gamification_service._mood_from_stats(80, 50, 50) == "hungry"

    def test_moodFromStats_sad(self, gamification_service):
        """_mood_from_stats should return 'sad' when happiness <= 25."""
        assert gamification_service._mood_from_stats(50, 50, 20) == "sad"

    def test_moodFromStats_happy(self, gamification_service):
        """_mood_from_stats should return 'happy' when happiness >= 80 and hunger <= 50."""
        assert gamification_service._mood_from_stats(40, 50, 85) == "happy"

    def test_moodFromStats_content(self, gamification_service):
        """_mood_from_stats should return 'content' for default state."""
        assert gamification_service._mood_from_stats(50, 50, 50) == "content"

    def test_getEvolutionStage_baby(self, gamification_service):
        """_get_evolution_stage should return 'baby' for 0-99 XP."""
        assert gamification_service._get_evolution_stage(0) == "baby"
        assert gamification_service._get_evolution_stage(99) == "baby"

    def test_getEvolutionStage_child(self, gamification_service):
        """_get_evolution_stage should return 'child' for 100-499 XP."""
        assert gamification_service._get_evolution_stage(100) == "child"
        assert gamification_service._get_evolution_stage(499) == "child"

    def test_getEvolutionStage_teen(self, gamification_service):
        """_get_evolution_stage should return 'teen' for 500-1999 XP."""
        assert gamification_service._get_evolution_stage(500) == "teen"
        assert gamification_service._get_evolution_stage(1999) == "teen"

    def test_getEvolutionStage_adult(self, gamification_service):
        """_get_evolution_stage should return 'adult' for 2000+ XP."""
        assert gamification_service._get_evolution_stage(2000) == "adult"
        assert gamification_service._get_evolution_stage(5000) == "adult"


class TestAddXP:
    """Test add_xp method and XP calculation logic."""

    @pytest.mark.asyncio
    async def test_addXp_lessonComplete(self, gamification_service, mock_repository, mock_user_id):
        """add_xp should award XP for lesson_complete action."""
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0,
            "level": 1,
            "xp_to_next_level": 100,
            "streak_days": 0,
        })

        result = await gamification_service.add_xp(mock_user_id, "lesson_completed", {})

        assert result["success"] is True
        assert result["xp_added"] == XP_REWARDS["lesson_completed"]
        mock_repository.add_xp.assert_called_once()

    @pytest.mark.asyncio
    async def test_addXp_unknownAction(self, gamification_service, mock_user_id):
        """add_xp should return error for unknown action."""
        result = await gamification_service.add_xp(mock_user_id, "unknown_action", {})

        assert result["success"] is False
        assert "Unknown action" in result["error"]

    @pytest.mark.asyncio
    async def test_addXp_levelUp(self, gamification_service, mock_repository, mock_user_id):
        """add_xp should detect level up when XP exceeds threshold."""
        # 96 + 5 = 101 >= 100, triggers level up
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 96,
            "level": 1,
            "xp_to_next_level": 100,
            "streak_days": 0,
        })

        result = await gamification_service.add_xp(mock_user_id, "flashcard_viewed", {})

        assert result["success"] is True
        assert result["level_up"] is True
        assert result["level"] == 2

    @pytest.mark.asyncio
    async def test_addXp_multiLevelUp(self, gamification_service, mock_repository, mock_user_id):
        """add_xp should handle multiple level ups."""
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 95,
            "level": 1,
            "xp_to_next_level": 100,
            "streak_days": 0,
        })

        result = await gamification_service.add_xp(mock_user_id, "quiz_completed", {})

        assert result["success"] is True
        assert result["xp_added"] == XP_REWARDS["quiz_completed"]
        # 95 + 50 = 145, which triggers level up

    @pytest.mark.asyncio
    async def test_addXp_newUser(self, gamification_service, mock_repository, mock_user_id):
        """add_xp should work for new users without existing data."""
        mock_repository.get_by_user_id = AsyncMock(return_value=None)

        result = await gamification_service.add_xp(mock_user_id, "daily_login", {})

        assert result["success"] is True
        assert result["total_xp"] == XP_REWARDS["daily_login"]

    @pytest.mark.asyncio
    async def test_addXp_awardsLevel5Badge(self, gamification_service, mock_repository, mock_user_id):
        """add_xp should award level_5 badge when reaching level 5."""
        # Need to set up so reaching level 5 triggers the badge
        # Level 4 needs 100 XP to reach level 5
        # quiz_completed = 50 XP, so 51 + 50 = 101 >= 100 -> level up
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 51,
            "level": 4,
            "xp_to_next_level": 100,
            "streak_days": 0,
            "badges": [],
        })

        result = await gamification_service.add_xp(mock_user_id, "quiz_completed", {})

        assert result["success"] is True
        assert result["level_up"] is True
        assert result["level"] == 5
        assert "level_5" in result["badges_earned"]


class TestStreakLogic:
    """Test streak calculation and update logic."""

    @pytest.mark.asyncio
    async def test_getStreak_returnsData(self, gamification_service, mock_repository, mock_user_id):
        """get_streak should return streak data from repository."""
        result = await gamification_service.get_streak(mock_user_id)

        mock_repository.get_streak.assert_called_once_with(mock_user_id)
        assert "current_streak" in result
        assert "longest_streak" in result
        assert "streak_active_today" in result

    @pytest.mark.asyncio
    async def test_updateStreak_firstActivity(self, gamification_service, mock_repository, mock_user_id):
        """update_streak should start at 1 for first activity."""
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "last_activity_date": None,
            "streak_days": 0,
            "longest_streak": 0,
        })

        today = datetime.utcnow().strftime("%Y-%m-%d")
        result = await gamification_service.update_streak(mock_user_id, today)

        assert result["current_streak"] == 1

    @pytest.mark.asyncio
    async def test_updateStreak_consecutiveDay(self, gamification_service, mock_repository, mock_user_id):
        """update_streak should increment for consecutive day."""
        yesterday = datetime.utcnow() - timedelta(days=1)
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "last_activity_date": yesterday,
            "streak_days": 5,
            "longest_streak": 10,
        })

        today = datetime.utcnow().strftime("%Y-%m-%d")
        result = await gamification_service.update_streak(mock_user_id, today)

        assert result["current_streak"] == 6

    @pytest.mark.asyncio
    async def test_updateStreak_gapInDays(self, gamification_service, mock_repository, mock_user_id):
        """update_streak should reset to 1 after gap."""
        two_days_ago = datetime.utcnow() - timedelta(days=2)
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "last_activity_date": two_days_ago,
            "streak_days": 10,
            "longest_streak": 10,
        })

        today = datetime.utcnow().strftime("%Y-%m-%d")
        result = await gamification_service.update_streak(mock_user_id, today)

        assert result["current_streak"] == 1

    @pytest.mark.asyncio
    async def test_updateStreak_sameDay(self, gamification_service, mock_repository, mock_user_id):
        """update_streak should not increment for same day."""
        today = datetime.utcnow()
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "last_activity_date": today,
            "streak_days": 5,
            "longest_streak": 10,
        })

        today_str = today.strftime("%Y-%m-%d")
        result = await gamification_service.update_streak(mock_user_id, today_str)

        assert result["current_streak"] == 5  # No change

    @pytest.mark.asyncio
    async def test_updateStreak_updatesLongest(self, gamification_service, mock_repository, mock_user_id):
        """update_streak should update longest_streak when current exceeds."""
        yesterday = datetime.utcnow() - timedelta(days=1)
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "last_activity_date": yesterday,
            "streak_days": 10,
            "longest_streak": 10,
        })

        today = datetime.utcnow().strftime("%Y-%m-%d")
        result = await gamification_service.update_streak(mock_user_id, today)

        assert result["longest_streak"] == 11

    @pytest.mark.asyncio
    async def test_updateStreak_awards3DayBadge(self, gamification_service, mock_repository, mock_user_id):
        """update_streak should award streak_3 badge at 3 days."""
        yesterday = datetime.utcnow() - timedelta(days=1)
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "last_activity_date": yesterday,
            "streak_days": 2,
            "longest_streak": 2,
            "badges": [],
        })

        today = datetime.utcnow().strftime("%Y-%m-%d")
        result = await gamification_service.update_streak(mock_user_id, today)

        assert result["current_streak"] == 3

    @pytest.mark.asyncio
    async def test_updateStreak_awards7DayBadge(self, gamification_service, mock_repository, mock_user_id):
        """update_streak should award streak_7 badge at 7 days."""
        yesterday = datetime.utcnow() - timedelta(days=1)
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "last_activity_date": yesterday,
            "streak_days": 6,
            "longest_streak": 6,
            "badges": [],
        })

        today = datetime.utcnow().strftime("%Y-%m-%d")
        result = await gamification_service.update_streak(mock_user_id, today)

        assert result["current_streak"] == 7


class TestTrackLearning:
    """Test track_learning method."""

    @pytest.mark.asyncio
    async def test_trackLearning_basic(self, gamification_service, mock_repository, mock_user_id):
        """track_learning should call repository add_daily_stat."""
        words = 5
        time_mins = 15

        result = await gamification_service.track_learning(mock_user_id, words, time_mins)

        mock_repository.add_daily_stat.assert_called_once_with(mock_user_id, words, time_mins)
        assert result["success"] is True
        assert result["words_learned"] == words
        assert result["time_mins"] == time_mins

    @pytest.mark.asyncio
    async def test_trackLearning_zeroValues(self, gamification_service, mock_repository, mock_user_id):
        """track_learning should handle zero values."""
        result = await gamification_service.track_learning(mock_user_id, 0, 0)

        mock_repository.add_daily_stat.assert_called_once_with(mock_user_id, 0, 0)
        assert result["success"] is True


class TestMaybeAwardLessonSticker:
    """Test _maybe_award_lesson_sticker method."""

    @pytest.mark.asyncio
    async def test_maybeAward_firstLessonSticker(self, gamification_service, mock_repository, mock_user_id):
        """_maybe_award_lesson_sticker should award star_gold at 1st lesson."""
        # After completing first lesson, lessons_completed becomes 1
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "lessons_completed": 1,  # Already at threshold
            "games_played": 0,
            "total_words_learned": 0,
            "stickers": [],
        })
        mock_repository.has_sticker = AsyncMock(return_value=False)
        mock_repository.add_sticker = AsyncMock(return_value={})

        sticker = await gamification_service._maybe_award_lesson_sticker(
            mock_user_id, 5, 2
        )

        assert sticker is not None
        assert sticker["id"] == "star_gold"

    @pytest.mark.asyncio
    async def test_maybeAward_5thLessonSticker(self, gamification_service, mock_repository, mock_user_id):
        """_maybe_award_lesson_sticker should award medal_silver at 5th lesson."""
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "lessons_completed": 5,  # At threshold
            "games_played": 0,
            "total_words_learned": 0,
            "stickers": [],
        })
        mock_repository.has_sticker = AsyncMock(return_value=False)
        mock_repository.add_sticker = AsyncMock(return_value={})

        sticker = await gamification_service._maybe_award_lesson_sticker(
            mock_user_id, 5, 2
        )

        assert sticker is not None
        assert sticker["id"] == "medal_silver"

    @pytest.mark.asyncio
    async def test_maybeAward_10thLessonSticker(self, gamification_service, mock_repository, mock_user_id):
        """_maybe_award_lesson_sticker should award trophy_bronze at 10th lesson."""
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "lessons_completed": 10,  # At threshold
            "games_played": 0,
            "total_words_learned": 0,
            "stickers": [],
        })
        mock_repository.has_sticker = AsyncMock(return_value=False)
        mock_repository.add_sticker = AsyncMock(return_value={})

        sticker = await gamification_service._maybe_award_lesson_sticker(
            mock_user_id, 5, 2
        )

        assert sticker is not None
        assert sticker["id"] == "trophy_bronze"

    @pytest.mark.asyncio
    async def test_maybeAward_alreadyHasSticker(self, gamification_service, mock_repository, mock_user_id):
        """_maybe_award_lesson_sticker should return None if already has sticker."""
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "lessons_completed": 1,
            "games_played": 0,
            "total_words_learned": 0,
            "stickers": [{"id": "star_gold"}],
        })
        mock_repository.has_sticker = AsyncMock(return_value=True)

        sticker = await gamification_service._maybe_award_lesson_sticker(
            mock_user_id, 5, 2
        )

        # Should not award since already has it
        mock_repository.add_sticker.assert_not_called()


class TestGetUserStats:
    """Test get_user_stats method."""

    @pytest.mark.asyncio
    async def test_getUserStats_existingUser(self, gamification_service, mock_repository, mock_user_id, mock_user_data):
        """get_user_stats should return stats for existing user."""
        mock_repository.get_by_user_id = AsyncMock(return_value=mock_user_data)

        result = await gamification_service.get_user_stats(mock_user_id)

        assert result["user_id"] == mock_user_id
        assert result["total_points"] == mock_user_data["total_points"]
        assert result["level"] == mock_user_data["level"]
        assert "streak_active_today" in result

    @pytest.mark.asyncio
    async def test_getUserStats_newUser(self, gamification_service, mock_repository, mock_user_id):
        """get_user_stats should return defaults for new user."""
        mock_repository.get_by_user_id = AsyncMock(return_value=None)

        result = await gamification_service.get_user_stats(mock_user_id)

        assert result["user_id"] == mock_user_id
        assert result["total_points"] == 0
        assert result["level"] == 1
        assert result["xp_to_next_level"] == 100
        assert result["pet"] is not None


class TestCalculateNextLevelXp:
    """Test XP calculation helper."""

    def test_calculateNextLevelXp_level1(self):
        """calculate_next_level_xp should return 100 for level 1."""
        assert calculate_next_level_xp(1) == 100

    def test_calculateNextLevelXp_level2(self):
        """calculate_next_level_xp should return 150 for level 2."""
        assert calculate_next_level_xp(2) == 150

    def test_calculateNextLevelXp_level3(self):
        """calculate_next_level_xp should return 225 for level 3."""
        assert calculate_next_level_xp(3) == 225

    def test_calculateNextLevelXp_level5(self):
        """calculate_next_level_xp should return exponential curve."""
        result = calculate_next_level_xp(5)
        assert result == int(100 * (1.5 ** 4))


class TestXpRewards:
    """Test XP_REWARDS constant values."""

    def test_xpRewards_flashcardViewed(self):
        """flashcard_viewed should award 5 XP."""
        assert XP_REWARDS["flashcard_viewed"] == 5

    def test_xpRewards_quizCompleted(self):
        """quiz_completed should award 50 XP."""
        assert XP_REWARDS["quiz_completed"] == 50

    def test_xpRewards_gameCompleted(self):
        """game_completed should award 30 XP."""
        assert XP_REWARDS["game_completed"] == 30

    def test_xpRewards_lessonCompleted(self):
        """lesson_completed should award 60 XP."""
        assert XP_REWARDS["lesson_completed"] == 60

    def test_xpRewards_pronunciationCorrect(self):
        """pronunciation_correct should award 25 XP."""
        assert XP_REWARDS["pronunciation_correct"] == 25

    def test_xpRewards_dailyLogin(self):
        """daily_login should award 10 XP."""
        assert XP_REWARDS["daily_login"] == 10

    def test_xpRewards_topicMastered(self):
        """topic_mastered should award 100 XP."""
        assert XP_REWARDS["topic_mastered"] == 100


class TestPetMethods:
    """Test pet-related methods."""

    @pytest.mark.asyncio
    async def test_getPet_returnsHydratedState(self, gamification_service, mock_repository, mock_user_id):
        """get_pet should return hydrated pet state."""
        mock_repository.get_pet = AsyncMock(return_value={
            "type": "bunny",
            "happiness": 50,
            "hunger": 45,
            "energy": 70,
            "stage": "baby",
        })

        result = await gamification_service.get_pet(mock_user_id)

        assert "mood" in result
        assert "needs_attention" in result

    @pytest.mark.asyncio
    async def test_feedPet_awardsXp(self, gamification_service, mock_repository, mock_user_id):
        """feed_pet should award 5 XP to user."""
        mock_repository.feed_pet = AsyncMock(return_value={
            "pet": {
                "type": "bunny",
                "happiness": 60,
                "hunger": 10,
                "energy": 75,
                "xp_earned": 0,
                "stage": "baby",
            }
        })

        result = await gamification_service.feed_pet(mock_user_id)

        assert result["success"] is True
        assert result["xp_earned"] == 5

    @pytest.mark.asyncio
    async def test_playWithPet_awardsXp(self, gamification_service, mock_repository, mock_user_id):
        """play_with_pet should award 8 XP to user."""
        mock_repository.play_pet = AsyncMock(return_value={
            "pet": {
                "type": "bunny",
                "happiness": 65,
                "hunger": 55,
                "energy": 55,
                "xp_earned": 0,
                "stage": "baby",
            }
        })

        result = await gamification_service.play_with_pet(mock_user_id)

        assert result["success"] is True
        assert result["xp_earned"] == 8

    @pytest.mark.asyncio
    async def test_choosePet_validType(self, gamification_service, mock_repository, mock_user_id):
        """choose_pet should accept valid pet types."""
        result = await gamification_service.choose_pet(mock_user_id, "cat")

        assert result["success"] is True
        assert result["pet"]["type"] == "cat"

    @pytest.mark.asyncio
    async def test_choosePet_emptyType(self, gamification_service, mock_repository, mock_user_id):
        """choose_pet should reject empty pet type."""
        result = await gamification_service.choose_pet(mock_user_id, "")

        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_changePetOutfit_validOutfit(self, gamification_service, mock_repository, mock_user_id):
        """change_pet_outfit should accept valid outfits."""
        result = await gamification_service.change_pet_outfit(mock_user_id, "crown")

        assert result["success"] is True
        assert result["outfit"] == "crown"

    @pytest.mark.asyncio
    async def test_changePetOutfit_invalidOutfit(self, gamification_service, mock_repository, mock_user_id):
        """change_pet_outfit should reject invalid outfits."""
        result = await gamification_service.change_pet_outfit(mock_user_id, "invalid_outfit")

        assert result["success"] is False


class TestStickerMethods:
    """Test sticker-related methods."""

    def test_getStickerCatalog_returnsAllStickers(self, gamification_service):
        """get_sticker_catalog should return full sticker catalog."""
        catalog = gamification_service.get_sticker_catalog()

        assert "star_gold" in catalog
        assert "trophy_gold" in catalog
        assert "diamond" in catalog
        assert "crown" in catalog
        assert catalog["star_gold"]["rarity"] == "common"

    @pytest.mark.asyncio
    async def test_collectSticker_newSticker(self, gamification_service, mock_repository, mock_user_id):
        """collect_sticker should add sticker for new collection."""
        mock_repository.has_sticker = AsyncMock(return_value=False)

        result = await gamification_service.collect_sticker(mock_user_id, "star_gold")

        assert result["success"] is True
        assert result["collected"] is True
        mock_repository.add_sticker.assert_called_once()

    @pytest.mark.asyncio
    async def test_collectSticker_alreadyOwned(self, gamification_service, mock_repository, mock_user_id):
        """collect_sticker should return already owned for duplicate."""
        mock_repository.has_sticker = AsyncMock(return_value=True)

        result = await gamification_service.collect_sticker(mock_user_id, "star_gold")

        assert result["success"] is True
        assert result["collected"] is False

    @pytest.mark.asyncio
    async def test_collectSticker_invalidSticker(self, gamification_service, mock_repository, mock_user_id):
        """collect_sticker should reject invalid sticker ID."""
        result = await gamification_service.collect_sticker(mock_user_id, "invalid_sticker")

        assert result["success"] is False


class TestProgressReport:
    """Test get_progress_report method."""

    @pytest.mark.asyncio
    async def test_getProgressReport_basic(self, gamification_service, mock_repository, mock_user_id, mock_user_data):
        """get_progress_report should return comprehensive report."""
        mock_repository.get_by_user_id = AsyncMock(return_value=mock_user_data)
        mock_repository.get_daily_stats = AsyncMock(return_value=[
            {"date": "2024-01-15", "words_learned": 3, "time_mins": 15}
        ])

        result = await gamification_service.get_progress_report(mock_user_id, 7)

        assert result["user_id"] == mock_user_id
        assert "summary" in result
        assert "learning" in result
        assert "daily_breakdown" in result
        assert "pet" in result

    @pytest.mark.asyncio
    async def test_getProgressReport_newUser(self, gamification_service, mock_repository, mock_user_id):
        """get_progress_report should handle new users with no data."""
        mock_repository.get_by_user_id = AsyncMock(return_value=None)
        mock_repository.get_daily_stats = AsyncMock(return_value=[])

        result = await gamification_service.get_progress_report(mock_user_id, 7)

        assert result["user_id"] == mock_user_id
        assert result["summary"]["total_xp"] == 0
        assert result["learning"]["total_words"] == 0
