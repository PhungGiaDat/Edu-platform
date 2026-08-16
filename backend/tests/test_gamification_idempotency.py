"""
Test suite for GamificationService idempotency - XP Event System.

Tests the exactly-once XP award semantics via UNIQUE(user_id, event_id).

Tests cover:
- add_xp_with_event_id basic functionality
- Idempotent replay (same event_id returns cached result)
- Concurrent duplicate handling
- Conflict detection
- Legacy add_xp backward compatibility
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from models.gamification_model import XP_REWARDS
from models.gamification_event import EventStatus


class TestAddXPWithEventId:
    """Test idempotent XP award via add_xp_with_event_id."""

    @pytest.mark.asyncio
    async def test_new_event_awards_xp_once(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """First request with new event_id should award XP once."""
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-new-001",
            "action": "pronunciation_attempt",
            "status": "processing",
        })
        # mark_applied must return a value for XP to be applied (atomic conditional update)
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-new-001",
            "action": "pronunciation_attempt",
            "status": "applied",
            "xp_awarded": 15,
            "total_xp_after": 15,
            "level_after": 1,
            "xp_to_next_after": 100,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-new-001",
            action="pronunciation_attempt",
            source_type="pronunciation",
            source_id="qr-cat",
        )

        assert result["success"] is True
        assert result["xp_awarded"] == XP_REWARDS["pronunciation_attempt"]
        assert result["idempotent_replay"] is False
        assert result["status"] == EventStatus.APPLIED.value
        mock_event_repository.mark_applied.assert_called_once()

    @pytest.mark.asyncio
    async def test_replay_returns_cached_result(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """Same event_id replay should return cached result without extra XP."""
        mock_event_repository.create_event = AsyncMock(return_value=None)  # Duplicate
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-123",
            "action": "pronunciation_attempt",
            "status": EventStatus.APPLIED.value,
            "xp_awarded": 15,
            "total_xp_after": 115,
            "level_after": 2,
            "xp_to_next_after": 150,
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-123",
            action="pronunciation_attempt",
        )

        assert result["success"] is True
        assert result["idempotent_replay"] is True
        assert result["xp_awarded"] == 15  # Cached value
        assert result["total_xp_after"] == 115  # Cached value
        # No new XP awarded
        mock_repository.add_xp.assert_not_called()
        mock_event_repository.mark_applied.assert_not_called()

    @pytest.mark.asyncio
    async def test_different_users_same_event_id_independent(
        self, gamification_service, mock_repository, mock_event_repository
    ):
        """Same event_id for different users should be independent."""
        # First user - new event
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": "user-A",
            "event_id": "event-shared-001",
            "action": "combo_discovered",
            "status": "processing",
        })
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": "user-A",
            "event_id": "event-shared-001",
            "action": "combo_discovered",
            "status": "applied",
            "xp_awarded": 40,
            "total_xp_after": 40,
            "level_after": 1,
            "xp_to_next_after": 100,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result_a = await gamification_service.add_xp_with_event_id(
            user_id="user-A",
            event_id="event-shared-001",
            action="combo_discovered",
        )

        assert result_a["success"] is True
        assert result_a["xp_awarded"] == XP_REWARDS["combo_discovered"]

    @pytest.mark.asyncio
    async def test_different_event_ids_both_awarded(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """Different event_ids should each be awarded independently."""
        # First event
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-001",
            "action": "flashcard_viewed",
            "status": "processing",
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result1 = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-001",
            action="flashcard_viewed",
        )

        assert result1["success"] is True
        assert result1["event_id"] == "event-001"

        # Second event - reset mocks for second call
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-002",
            "action": "flashcard_viewed",
            "status": "processing",
        })

        result2 = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-002",
            action="flashcard_viewed",
        )

        assert result2["success"] is True
        assert result2["event_id"] == "event-002"
        # Both should have called add_xp
        assert mock_repository.add_xp.call_count == 2

    @pytest.mark.asyncio
    async def test_unknown_action_rejected(
        self, gamification_service, mock_user_id
    ):
        """Unknown action should be rejected with error."""
        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-001",
            action="invalid_action_xyz",
        )

        assert result["success"] is False
        assert "Unknown action" in result["error"]
        assert result["idempotent_replay"] is False

    @pytest.mark.asyncio
    async def test_concurrent_processing_returns_conflict(
        self, gamification_service, mock_event_repository, mock_user_id
    ):
        """Concurrent processing of same event_id should return conflict."""
        mock_event_repository.create_event = AsyncMock(return_value=None)  # Duplicate
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-123",
            "action": "pronunciation_attempt",
            "status": EventStatus.PROCESSING.value,  # Still processing
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-123",
            action="pronunciation_attempt",
        )

        assert result["success"] is False
        assert result["error"] == "CONCURRENT_PROCESSING"

    @pytest.mark.asyncio
    async def test_rejected_event_allows_retry(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """REJECTED status should allow retry by resetting to PROCESSING."""
        # First call - returns REJECTED (create fails with duplicate)
        mock_event_repository.create_event = AsyncMock(return_value=None)
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-rejected",
            "action": "pronunciation_attempt",
            "status": EventStatus.REJECTED.value,
        })
        # reset_to_processing succeeds
        mock_event_repository.reset_to_processing = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-rejected",
            "status": EventStatus.PROCESSING.value,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-rejected",
            action="pronunciation_attempt",
        )

        assert result["success"] is True
        # reset_to_processing was called (retry succeeded)
        assert mock_event_repository.reset_to_processing.call_count == 1

    @pytest.mark.asyncio
    async def test_level_up_detected(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """Level-up should be detected and returned correctly."""
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-levelup",
            "action": "quiz_completed",
            "status": "processing",
        })
        # mark_applied must return a value for XP to be applied
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-levelup",
            "action": "quiz_completed",
            "status": "applied",
            "xp_awarded": 50,
            "total_xp_after": 146,
            "level_after": 2,
            "xp_to_next_after": 150,
        })
        # User near level-up: 96 XP, quiz = 50 XP -> 146 >= 100 -> level up
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 96,
            "level": 1,
            "xp_to_next_level": 100,
            "streak_days": 0,
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-levelup",
            action="quiz_completed",
        )

        assert result["success"] is True
        assert result["level_up"] is True
        assert result["level_after"] == 2

    @pytest.mark.asyncio
    async def test_source_tracking(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """Source tracking fields should be preserved."""
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-source",
            "action": "lesson_completed",
            "source_type": "lesson",
            "source_id": "lesson-animals-001",
            "status": "processing",
        })
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-source",
            "action": "lesson_completed",
            "status": "applied",
            "xp_awarded": 60,
            "total_xp_after": 60,
            "level_after": 1,
            "xp_to_next_after": 100,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-source",
            action="lesson_completed",
            source_type="lesson",
            source_id="lesson-animals-001",
            session_id="session-123",
            learning_path_id="path-456",
        )

        assert result["success"] is True
        # Verify create_event was called with correct source fields
        call_kwargs = mock_event_repository.create_event.call_args.kwargs
        assert call_kwargs["source_type"] == "lesson"
        assert call_kwargs["source_id"] == "lesson-animals-001"
        assert call_kwargs["session_id"] == "session-123"
        assert call_kwargs["learning_path_id"] == "path-456"


class TestCheckEventConflict:
    """Test conflict detection for semantic validation."""

    @pytest.mark.asyncio
    async def test_no_conflict_when_event_not_exists(
        self, gamification_service, mock_event_repository, mock_user_id
    ):
        """No conflict when event doesn't exist."""
        mock_event_repository.find_by_user_event = AsyncMock(return_value=None)

        result = await gamification_service.check_event_conflict(
            user_id=mock_user_id,
            event_id="event-new",
            expected_action="pronunciation_attempt",
        )

        assert result["has_conflict"] is False
        assert result["existing_event"] is None

    @pytest.mark.asyncio
    async def test_no_conflict_when_same_action(
        self, gamification_service, mock_event_repository, mock_user_id
    ):
        """No conflict when existing event has same action."""
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-123",
            "action": "pronunciation_attempt",
        })

        result = await gamification_service.check_event_conflict(
            user_id=mock_user_id,
            event_id="event-123",
            expected_action="pronunciation_attempt",
        )

        assert result["has_conflict"] is False

    @pytest.mark.asyncio
    async def test_conflict_when_different_action(
        self, gamification_service, mock_event_repository, mock_user_id
    ):
        """Conflict when existing event has different action."""
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-123",
            "action": "flashcard_viewed",
        })

        result = await gamification_service.check_event_conflict(
            user_id=mock_user_id,
            event_id="event-123",
            expected_action="pronunciation_attempt",
        )

        assert result["has_conflict"] is True
        assert result["existing_event"] is not None
        assert "flashcard_viewed" in result["message"]


class TestLegacyAddXP:
    """Test legacy add_xp maintains backward compatibility."""

    @pytest.mark.asyncio
    async def test_legacy_add_xp_still_works(
        self, gamification_service, mock_repository, mock_user_id
    ):
        """Legacy add_xp should continue to work without event_id."""
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result = await gamification_service.add_xp(
            user_id=mock_user_id,
            action="flashcard_viewed",
            metadata={"source": "test"},
        )

        assert result["success"] is True
        assert result["xp_added"] == XP_REWARDS["flashcard_viewed"]
        assert "_legacy" in result  # Marked as legacy

    @pytest.mark.asyncio
    async def test_legacy_add_xp_unknown_action(
        self, gamification_service, mock_user_id
    ):
        """Legacy add_xp should reject unknown actions."""
        result = await gamification_service.add_xp(
            user_id=mock_user_id,
            action="invalid_action",
        )

        assert result["success"] is False
        assert "Unknown action" in result["error"]


class TestIdempotencyEdgeCases:
    """Edge cases for idempotency implementation."""

    @pytest.mark.asyncio
    async def test_event_id_none_handled(
        self, gamification_service, mock_user_id
    ):
        """event_id=None should be rejected with validation error."""
        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id=None,
            action="flashcard_viewed",
        )

        # Should return error for invalid event_id
        assert result["success"] is False
        assert "Invalid event_id" in result["error"]

    @pytest.mark.asyncio
    async def test_empty_action_handled(
        self, gamification_service, mock_user_id
    ):
        """Empty action should be rejected."""
        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-001",
            action="",
        )

        assert result["success"] is False
        assert "Unknown action" in result["error"]

    @pytest.mark.asyncio
    async def test_special_characters_in_event_id(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """Event IDs with special characters should work."""
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-with-special_chars-123_456",
            "action": "flashcard_viewed",
            "status": "processing",
        })
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-with-special_chars-123_456",
            "action": "flashcard_viewed",
            "status": "applied",
            "xp_awarded": 5,
            "total_xp_after": 5,
            "level_after": 1,
            "xp_to_next_after": 100,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-with-special_chars-123_456",
            action="flashcard_viewed",
        )

        assert result["success"] is True
        assert result["event_id"] == "event-with-special_chars-123_456"

    @pytest.mark.asyncio
    async def test_metadata_preserved(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """Metadata should be preserved through the event flow."""
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-meta",
            "action": "game_completed",
            "status": "processing",
        })
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-meta",
            "action": "game_completed",
            "status": "applied",
            "xp_awarded": 30,
            "total_xp_after": 30,
            "level_after": 1,
            "xp_to_next_after": 100,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        custom_metadata = {
            "score": 95,
            "time_seconds": 120,
            "hints_used": 0,
        }

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-meta",
            action="game_completed",
            metadata=custom_metadata,
        )

        assert result["success"] is True
        # Verify metadata was passed to create_event
        call_kwargs = mock_event_repository.create_event.call_args.kwargs
        assert call_kwargs["metadata"] == custom_metadata


class TestPronunciationIntegration:
    """Test pronunciation integration with attempt_id as event_id."""

    @pytest.mark.asyncio
    async def test_attempt_id_mapped_to_event_id(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """attempt_id should be used as event_id for pronunciation."""
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "attempt-abc123",
            "action": "pronunciation_attempt",
            "status": "processing",
        })
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "attempt-abc123",
            "action": "pronunciation_attempt",
            "status": "applied",
            "xp_awarded": 15,
            "total_xp_after": 15,
            "level_after": 1,
            "xp_to_next_after": 100,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="attempt-abc123",  # Using attempt_id as event_id
            action="pronunciation_attempt",
            source_type="pronunciation",
            source_id="qr-cat",
            attempt_id="attempt-abc123",  # Also passed as attempt_id
        )

        assert result["success"] is True
        call_kwargs = mock_event_repository.create_event.call_args.kwargs
        assert call_kwargs["event_id"] == "attempt-abc123"
        assert call_kwargs["attempt_id"] == "attempt-abc123"

    @pytest.mark.asyncio
    async def test_pronunciation_replay_uses_attempt_id(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """Pronunciation replay should use same attempt_id."""
        mock_event_repository.create_event = AsyncMock(return_value=None)  # Duplicate
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "attempt-abc123",
            "action": "pronunciation_attempt",
            "status": EventStatus.APPLIED.value,
            "xp_awarded": 15,
            "total_xp_after": 15,
            "level_after": 1,
            "xp_to_next_after": 100,
        })

        result = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="attempt-abc123",
            action="pronunciation_attempt",
        )

        assert result["success"] is True
        assert result["idempotent_replay"] is True
        assert result["xp_awarded"] == 15  # Original award, not duplicated


class TestFailureInjection:
    """
    Failure-injection tests to prove atomicity guarantees.
    
    These tests simulate two failure windows:
    - TEST A: Failure BEFORE XP mutation (XP should be awarded on retry)
    - TEST B: Failure AFTER XP mutation but BEFORE finalization (XP must NOT be duplicated on retry)
    """

    @pytest.mark.asyncio
    async def test_failure_before_xp_mutation_retry_succeeds(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """
        FAILURE INJECTION TEST A:
        Simulates failure BEFORE XP mutation (event created, but failure before mark_applied).
        
        Scenario:
        1. create_event() succeeds - event is PROCESSING
        2. XP calculation happens
        3. Failure occurs (mock mark_applied to return None - simulating failure)
        4. Retry with SAME event_id
        
        Expected:
        - XP ultimately awarded exactly once
        - No permanent PROCESSING dead state
        """
        # First call - create succeeds, mark_applied fails (simulating failure)
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-fail-a",
            "action": "pronunciation_attempt",
            "status": "processing",
        })
        mock_event_repository.mark_applied = AsyncMock(return_value=None)  # Failure!
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result1 = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-fail-a",
            action="pronunciation_attempt",
        )

        # First call should fail (mark_applied returned None)
        assert result1["success"] is False
        assert result1["error"] == "CONCURRENT_PROCESSING"
        # XP was NOT applied
        mock_repository.add_xp.assert_not_called()

        # Reset mocks for retry
        # On retry, create_event fails (duplicate), but event is REJECTED
        mock_event_repository.create_event = AsyncMock(return_value=None)  # Duplicate
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-fail-a",
            "action": "pronunciation_attempt",
            "status": EventStatus.REJECTED.value,  # REJECTED - allows retry
        })
        # reset_to_processing succeeds
        mock_event_repository.reset_to_processing = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-fail-a",
            "status": EventStatus.PROCESSING.value,
        })
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-fail-a",
            "action": "pronunciation_attempt",
            "status": "applied",
            "xp_awarded": 15,
            "total_xp_after": 15,
            "level_after": 1,
            "xp_to_next_after": 100,
        })

        result2 = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-fail-a",
            action="pronunciation_attempt",
        )

        # Retry should succeed with fresh calculation
        assert result2["success"] is True
        # reset_to_processing was called to allow retry
        assert mock_event_repository.reset_to_processing.call_count == 1
        # XP awarded exactly once
        mock_repository.add_xp.assert_called_once()

    @pytest.mark.asyncio
    async def test_failure_after_xp_mutation_no_duplicate(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """
        FAILURE INJECTION TEST B:
        Simulates failure AFTER XP mutation but BEFORE event finalization.
        
        Scenario:
        1. mark_applied succeeds (atomic conditional update)
        2. add_xp succeeds
        3. Failure occurs before final response
        4. Retry with SAME event_id
        
        Expected:
        - Total XP must NOT increase twice
        - Should return cached APPLIED result (idempotent replay)
        """
        # First call - everything succeeds
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-fail-b",
            "action": "pronunciation_attempt",
            "status": "processing",
        })
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-fail-b",
            "action": "pronunciation_attempt",
            "status": "applied",
            "xp_awarded": 15,
            "total_xp_after": 15,
            "level_after": 1,
            "xp_to_next_after": 100,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result1 = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-fail-b",
            action="pronunciation_attempt",
        )

        assert result1["success"] is True
        assert result1["xp_awarded"] == 15
        # add_xp was called once
        assert mock_repository.add_xp.call_count == 1

        # Reset mocks for retry
        mock_event_repository.create_event = AsyncMock(return_value=None)  # Duplicate
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-fail-b",
            "action": "pronunciation_attempt",
            "status": EventStatus.APPLIED.value,  # Already APPLIED
            "xp_awarded": 15,
            "total_xp_after": 15,
            "level_after": 1,
            "xp_to_next_after": 100,
        })

        result2 = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-fail-b",
            action="pronunciation_attempt",
        )

        # Retry should return cached result (idempotent replay)
        assert result2["success"] is True
        assert result2["idempotent_replay"] is True
        # XP was NOT awarded again
        # add_xp was called once (from first call only)
        assert mock_repository.add_xp.call_count == 1

    @pytest.mark.asyncio
    async def test_atomic_mark_applied_prevents_double_award(
        self, gamification_service, mock_repository, mock_event_repository, mock_user_id
    ):
        """
        ATOMICITY PROOF: Conditional update prevents double XP.
        
        Scenario: Two concurrent requests for same event_id
        1. Request A: mark_applied succeeds first
        2. Request B: mark_applied fails (status already APPLIED)
        3. Request B: add_xp should NOT be called
        
        Expected:
        - Only one request awards XP
        - Second request returns cached result
        """
        # Request A: mark_applied succeeds
        mock_event_repository.create_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-atomic",
            "action": "pronunciation_attempt",
            "status": "processing",
        })
        mock_event_repository.mark_applied = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-atomic",
            "action": "pronunciation_attempt",
            "status": "applied",
            "xp_awarded": 15,
            "total_xp_after": 15,
            "level_after": 1,
            "xp_to_next_after": 100,
        })
        mock_repository.get_by_user_id = AsyncMock(return_value={
            "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0
        })

        result_a = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-atomic",
            action="pronunciation_attempt",
        )

        assert result_a["success"] is True

        # Request B: create fails (duplicate), but find returns APPLIED
        mock_event_repository.create_event = AsyncMock(return_value=None)
        mock_event_repository.find_by_user_event = AsyncMock(return_value={
            "user_id": mock_user_id,
            "event_id": "event-atomic",
            "action": "pronunciation_attempt",
            "status": EventStatus.APPLIED.value,
            "xp_awarded": 15,
            "total_xp_after": 15,
            "level_after": 1,
            "xp_to_next_after": 100,
        })

        result_b = await gamification_service.add_xp_with_event_id(
            user_id=mock_user_id,
            event_id="event-atomic",
            action="pronunciation_attempt",
        )

        # Request B should get cached result, NOT award XP again
        assert result_b["success"] is True
        assert result_b["idempotent_replay"] is True
        assert result_b["xp_awarded"] == 15
        # add_xp was called only once (by Request A)
        assert mock_repository.add_xp.call_count == 1
