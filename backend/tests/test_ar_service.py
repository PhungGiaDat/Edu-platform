"""
Test AR Service - Category Validation

Tests:
1. Same category combos work (regardless of cross_category_allowed flag)
2. Different category combos rejected when cross_category_allowed=False
3. Different category combos allowed when cross_category_allowed=True

Run with:
    pytest backend/tests/test_ar_service.py -v
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_flashcard_repo():
    """Create mock flashcard repository."""
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_ar_object_repo():
    """Create mock AR object repository."""
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_ar_combination_repo():
    """Create mock AR combination repository."""
    repo = AsyncMock()
    return repo


@pytest.fixture
def ar_service(mock_flashcard_repo, mock_ar_object_repo, mock_ar_combination_repo):
    """Create ARService with mocked repositories."""
    from services.ar_service import ARService
    return ARService(
        flashcard_repo=mock_flashcard_repo,
        ar_object_repo=mock_ar_object_repo,
        ar_combination_repo=mock_ar_combination_repo
    )


# ============================================================================
# Test 1: Same Category Allowed
# ============================================================================

class TestComboSameCategoryAllowed:
    """Same category combos should work regardless of cross_category_allowed flag."""

    @pytest.mark.asyncio
    async def test_same_category_combo_works(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Same category combos should succeed."""
        # Setup: combo exists with cross_category_allowed=False
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "animal_combo",
            "required_tags": ["tag_dog", "tag_cat"],
            "cross_category_allowed": False,
            "priority": 0
        }]

        # Both flashcards in same category (animals)
        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "dog", "word": "dog", "category": "animals", "ar_tag": "tag_dog"},
            {"qr_id": "cat", "word": "cat", "category": "animals", "ar_tag": "tag_cat"},
        ]

        result = await ar_service.check_combo(["tag_dog", "tag_cat"])

        # Should return the combo (same category is allowed)
        assert result is not None
        assert result["combo_id"] == "animal_combo"

    @pytest.mark.asyncio
    async def test_same_category_combo_works_with_flag_true(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Same category combos should also work when flag is True."""
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "animal_combo",
            "required_tags": ["tag_dog", "tag_cat"],
            "cross_category_allowed": True,
            "priority": 0
        }]

        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "dog", "word": "dog", "category": "animals", "ar_tag": "tag_dog"},
            {"qr_id": "cat", "word": "cat", "category": "animals", "ar_tag": "tag_cat"},
        ]

        result = await ar_service.check_combo(["tag_dog", "tag_cat"])

        assert result is not None
        assert result["combo_id"] == "animal_combo"


# ============================================================================
# Test 2: Different Category Rejected (cross_category_allowed=False)
# ============================================================================

class TestComboCrossCategoryRejected:
    """Different categories should be rejected when cross_category_allowed=False."""

    @pytest.mark.asyncio
    async def test_different_category_rejected_when_flag_false(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Different categories should be rejected when flag is False."""
        # Setup: combo exists but cross_category_allowed=False
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "cross_combo",
            "required_tags": ["tag_dog", "tag_apple"],
            "cross_category_allowed": False,
            "priority": 0
        }]

        # Flashcards from different categories
        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "dog", "word": "dog", "category": "animals", "ar_tag": "tag_dog"},
            {"qr_id": "apple", "word": "apple", "category": "fruits", "ar_tag": "tag_apple"},
        ]

        result = await ar_service.check_combo(["tag_dog", "tag_apple"])

        # Should return None (rejected due to different categories)
        assert result is None

    @pytest.mark.asyncio
    async def test_different_category_rejected_when_flag_missing(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Different categories should be rejected when flag is missing (None)."""
        # Setup: combo without cross_category_allowed field (legacy data)
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "legacy_combo",
            "required_tags": ["tag_dog", "tag_apple"],
            # cross_category_allowed field not present
            "priority": 0
        }]

        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "dog", "word": "dog", "category": "animals", "ar_tag": "tag_dog"},
            {"qr_id": "apple", "word": "apple", "category": "fruits", "ar_tag": "tag_apple"},
        ]

        result = await ar_service.check_combo(["tag_dog", "tag_apple"])

        # Should return None (missing flag defaults to False)
        assert result is None

    @pytest.mark.asyncio
    async def test_different_category_rejected_when_flag_explicitly_false(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Different categories should be rejected when flag is explicitly False."""
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "explicit_false_combo",
            "required_tags": ["tag_lion", "tag_banana"],
            "cross_category_allowed": False,
            "priority": 0
        }]

        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "lion", "word": "lion", "category": "animals", "ar_tag": "tag_lion"},
            {"qr_id": "banana", "word": "banana", "category": "fruits", "ar_tag": "tag_banana"},
        ]

        result = await ar_service.check_combo(["tag_lion", "tag_banana"])

        assert result is None


# ============================================================================
# Test 3: Different Category Allowed (cross_category_allowed=True)
# ============================================================================

class TestComboCrossCategoryAllowed:
    """Different categories should be allowed when cross_category_allowed=True."""

    @pytest.mark.asyncio
    async def test_different_category_allowed_when_flag_true(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Different categories should be allowed when flag is True."""
        # Setup: combo with cross_category_allowed=True (e.g., jungle ecosystem)
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "jungle_ecosystem",
            "description": "Elephant + Palm = Jungle Ecosystem",
            "required_tags": ["tag_elephant", "tag_palm"],
            "cross_category_allowed": True,
            "priority": 10
        }]

        # Flashcards from different categories
        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "elephant", "word": "elephant", "category": "animals", "ar_tag": "tag_elephant"},
            {"qr_id": "palm", "word": "palm", "category": "plants", "ar_tag": "tag_palm"},
        ]

        result = await ar_service.check_combo(["tag_elephant", "tag_palm"])

        # Should return the combo (cross-category is allowed)
        assert result is not None
        assert result["combo_id"] == "jungle_ecosystem"

    @pytest.mark.asyncio
    async def test_nature_ecosystem_combo_allowed(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Nature ecosystem combos (animals + plants) should be allowed."""
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "nature_scene",
            "description": "Nature ecosystem scene",
            "required_tags": ["tag_rabbit", "tag_tree"],
            "cross_category_allowed": True,
            "priority": 5
        }]

        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "rabbit", "word": "rabbit", "category": "animals", "ar_tag": "tag_rabbit"},
            {"qr_id": "tree", "word": "tree", "category": "nature", "ar_tag": "tag_tree"},
        ]

        result = await ar_service.check_combo(["tag_rabbit", "tag_tree"])

        assert result is not None
        assert result["combo_id"] == "nature_scene"


# ============================================================================
# Edge Cases
# ============================================================================

class TestComboEdgeCases:
    """Edge cases for combo validation."""

    @pytest.mark.asyncio
    async def test_combo_without_flashcard_data_returns_combo(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """If flashcards can't be found, combo is still returned (no category check)."""
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "orphan_combo",
            "required_tags": ["tag_unknown_1", "tag_unknown_2"],
            "cross_category_allowed": False,
            "priority": 0
        }]

        # Flashcards not found
        mock_flashcard_repo.get_by_ar_tag.side_effect = [None, None]

        result = await ar_service.check_combo(["tag_unknown_1", "tag_unknown_2"])

        # Should return combo (no category to validate)
        assert result is not None
        assert result["combo_id"] == "orphan_combo"

    @pytest.mark.asyncio
    async def test_combo_with_missing_category_field(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Flashcards without category field should not trigger rejection."""
        mock_ar_combination_repo.find_by_tags.return_value = [{
            "combo_id": "legacy_flashcards",
            "required_tags": ["tag_legacy_1", "tag_legacy_2"],
            "cross_category_allowed": False,
            "priority": 0
        }]

        # Flashcards without category
        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "legacy1", "word": "word1", "ar_tag": "tag_legacy_1"},
            {"qr_id": "legacy2", "word": "word2", "ar_tag": "tag_legacy_2"},
        ]

        result = await ar_service.check_combo(["tag_legacy_1", "tag_legacy_2"])

        # Should return combo (empty categories are not "different")
        assert result is not None
        assert result["combo_id"] == "legacy_flashcards"

    @pytest.mark.asyncio
    async def test_single_tag_returns_none(self, ar_service):
        """Single tag should return None (need at least 2 tags)."""
        result = await ar_service.check_combo(["tag_single"])
        assert result is None

    @pytest.mark.asyncio
    async def test_empty_tags_returns_none(self, ar_service):
        """Empty tags should return None."""
        result = await ar_service.check_combo([])
        assert result is None

    @pytest.mark.asyncio
    async def test_no_combo_returns_none(self, ar_service, mock_ar_combination_repo):
        """No matching combo should return None."""
        mock_ar_combination_repo.find_by_tags.return_value = []
        result = await ar_service.check_combo(["tag_a", "tag_b"])
        assert result is None

    @pytest.mark.asyncio
    async def test_priority_selection(
        self, ar_service, mock_flashcard_repo, mock_ar_combination_repo
    ):
        """Higher priority combo should be selected."""
        mock_ar_combination_repo.find_by_tags.return_value = [
            {
                "combo_id": "low_priority",
                "required_tags": ["tag_a", "tag_b"],
                "cross_category_allowed": True,
                "priority": 1
            },
            {
                "combo_id": "high_priority",
                "required_tags": ["tag_a", "tag_b"],
                "cross_category_allowed": True,
                "priority": 10
            },
        ]

        mock_flashcard_repo.get_by_ar_tag.side_effect = [
            {"qr_id": "a", "word": "a", "category": "animals", "ar_tag": "tag_a"},
            {"qr_id": "b", "word": "b", "category": "animals", "ar_tag": "tag_b"},
        ]

        result = await ar_service.check_combo(["tag_a", "tag_b"])

        assert result is not None
        assert result["combo_id"] == "high_priority"


# ============================================================================
# Model Field Tests
# ============================================================================

class TestARCombinationModelFields:
    """Test ArCombinationSchema includes cross_category_allowed field."""

    def test_schema_has_cross_category_allowed_field(self):
        """ArCombinationSchema should have cross_category_allowed field."""
        from models.ar_combination import ArCombinationSchema
        assert "cross_category_allowed" in ArCombinationSchema.model_fields

    def test_cross_category_allowed_defaults_to_false(self):
        """cross_category_allowed should default to False."""
        from models.ar_combination import ArCombinationSchema
        dto = ArCombinationSchema(
            combo_id="test",
            description="test",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
        )
        assert dto.cross_category_allowed is False

    def test_cross_category_allowed_can_be_set_true(self):
        """cross_category_allowed can be set to True."""
        from models.ar_combination import ArCombinationSchema
        dto = ArCombinationSchema(
            combo_id="test",
            description="test",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
            cross_category_allowed=True
        )
        assert dto.cross_category_allowed is True
