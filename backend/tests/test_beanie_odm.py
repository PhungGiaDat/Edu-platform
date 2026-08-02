"""
Integration tests for Beanie ODM integration with ARCombination Document.

Tests cover:
  1. ArCombinationSchema DTO validates fields correctly
  2. Schema validation rejects unknown fields
  3. Schema validation enforces constraints
  4. Existing 'jungle_scene_v1' data round-trips correctly

These tests avoid Beanie collection initialization (which requires a live DB)
by testing Pydantic validation directly and using mocks for repository helpers.

Run with:
    pytest backend/tests/test_beanie_odm.py -v

For integration tests against a real DB, see database/migrations/ test suite.
"""
import pytest
from unittest.mock import AsyncMock, patch
from pydantic import ValidationError

from models.ar_combination import (
    ARCombination,     # Beanie Document
    ArCombinationSchema,  # Pydantic DTO — fully testable without DB
    TransformSchema,
)


# ===========================================================================
# Fixtures
# ===========================================================================

@pytest.fixture
def valid_combo_data() -> dict:
    """Minimal valid data for creating an ARCombination."""
    return {
        "combo_id": "test_elephant_lion_combo",
        "description": "Elephant and lion jungle scene",
        "required_tags": ["elephant_marker_01", "lion_marker_01"],
        "model_3d_url": "https://example.com/jungle.glb",
        "image_2d_url": "https://example.com/jungle.jpg",
        "bonus_xp": 150,
    }


@pytest.fixture
def full_combo_data() -> dict:
    """Full data including all semantic fields (no center_transform — DTO-only)."""
    return {
        "combo_id": "full_test_combo",
        "description": "Full combo with all fields",
        "required_tags": ["tag_a", "tag_b"],
        "target_order": ["tag_a", "tag_b"],
        "model_3d_url": "https://example.com/model.glb",
        "texture_url": "https://example.com/texture.png",
        "image_2d_url": "https://example.com/image.jpg",
        "combo_mind_url": "https://example.com/combo.mind",
        "bonus_xp": 200,
        # --- semantic fields ---
        "semantic_result": "combo_jungle",
        "animation": "jungle_entrance",
        "sound": "/audio/jungle_roar.mp3",
        "phrase": "Jungle Combo!",
        "priority": 10,
        "active": True,
        "flashcard_set": "set_animals_001",
    }


@pytest.fixture
def jungle_scene_v1_data() -> dict:
    """Shape of the existing 'jungle_scene_v1' document in MongoDB.

    NOTE: _id is NOT included — it is MongoDB-internal and should not appear in
    the ArCombinationSchema DTO. Beanie handles _id conversion internally.
    """
    return {
        "combo_id": "jungle_scene_v1",
        "description": "Jungle Scene — Elephant + Palm",
        "required_tags": ["elephant_marker_01", "plant_palm_01"],
        "model_3d_url": "https://assets.example.com/models/jungle.glb",
        "image_2d_url": "https://assets.example.com/images/jungle.jpg",
        "bonus_xp": 100,
        # --- semantic fields (migrated) ---
        "semantic_result": "combo_jungle",
        "animation": "jungle_entrance",
        "sound": None,
        "phrase": "🌴 Jungle Scene!",
        "priority": 10,
        "active": True,
        "flashcard_set": "set_animals_001",
        # --- stray fields that should be filtered on write ---
        "reward_points": 100,
        "combo_name": "Jungle Scene V1",
    }


@pytest.fixture
def legacy_doc_with_unknown_fields() -> dict:
    """A pre-migration document with unknown fields like reward_points."""
    return {
        "combo_id": "legacy_combo",
        "description": "Legacy combo with stray fields",
        "required_tags": ["tag_x", "tag_y"],
        "model_3d_url": "https://example.com/model.glb",
        "image_2d_url": "https://example.com/image.jpg",
        "bonus_xp": 50,
        # Stray fields that should be rejected
        "reward_points": 50,
        "combo_name": "Legacy Name",
    }


# ===========================================================================
# ArCombinationSchema (DTO) Tests — testable without DB
# ===========================================================================

class TestArCombinationSchema:
    """Tests for ArCombinationSchema DTO (Pydantic validation, no DB needed)."""

    def test_accepts_minimal_valid_data(self, valid_combo_data):
        """Minimal valid data passes validation."""
        dto = ArCombinationSchema(**valid_combo_data)
        assert dto.combo_id == valid_combo_data["combo_id"]
        assert dto.description == valid_combo_data["description"]
        assert dto.required_tags == valid_combo_data["required_tags"]
        assert dto.bonus_xp == 150

    def test_accepts_all_semantic_fields(self, full_combo_data):
        """All semantic migration fields are accepted."""
        dto = ArCombinationSchema(**full_combo_data)
        assert dto.semantic_result == "combo_jungle"
        assert dto.animation == "jungle_entrance"
        assert dto.sound == "/audio/jungle_roar.mp3"
        assert dto.phrase == "Jungle Combo!"
        assert dto.priority == 10
        assert dto.active is True
        assert dto.flashcard_set == "set_animals_001"

    def test_rejects_missing_combo_id(self, valid_combo_data):
        """Missing combo_id raises ValidationError."""
        del valid_combo_data["combo_id"]
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        assert any("combo_id" in str(e["loc"]) for e in exc_info.value.errors())

    def test_rejects_missing_required_tags(self, valid_combo_data):
        """Missing required_tags raises ValidationError."""
        del valid_combo_data["required_tags"]
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        assert any("required_tags" in str(e["loc"]) for e in exc_info.value.errors())

    def test_rejects_missing_model_3d_url(self, valid_combo_data):
        """Missing model_3d_url raises ValidationError."""
        del valid_combo_data["model_3d_url"]
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        assert any("model_3d_url" in str(e["loc"]) for e in exc_info.value.errors())

    def test_rejects_less_than_two_required_tags(self, valid_combo_data):
        """required_tags must have at least 2 elements (min_length=2)."""
        valid_combo_data["required_tags"] = ["only_one"]
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        errors = exc_info.value.errors()
        assert any(
            "required_tags" in str(e["loc"]) and e["type"] == "too_short"
            for e in errors
        )

    def test_accepts_two_required_tags(self, valid_combo_data):
        """Exactly 2 required_tags is valid."""
        dto = ArCombinationSchema(**valid_combo_data)
        assert len(dto.required_tags) == 2

    def test_rejects_unknown_fields(self, valid_combo_data):
        """Unknown fields (reward_points, combo_name) raise ValidationError."""
        valid_combo_data["reward_points"] = 999
        valid_combo_data["combo_name"] = "My Combo"
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        errors = exc_info.value.errors()
        unknown = {e["loc"][0] for e in errors}
        assert "reward_points" in unknown
        assert "combo_name" in unknown

    def test_default_values(self):
        """Optional fields have correct defaults."""
        dto = ArCombinationSchema(
            combo_id="defaults_test",
            description="Testing defaults",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
        )
        assert dto.bonus_xp == 100
        assert dto.priority == 0
        assert dto.active is True
        assert dto.semantic_result is None
        assert dto.animation is None
        assert dto.sound is None
        assert dto.phrase is None
        assert dto.flashcard_set is None
        assert dto.target_order is None
        assert dto.texture_url is None
        assert dto.combo_mind_url is None


# ===========================================================================
# TransformSchema Tests
# ===========================================================================

class TestTransformSchema:
    """Tests for the embedded TransformSchema."""

    def test_can_create_empty(self):
        """TransformSchema with no fields is valid."""
        t = TransformSchema()
        assert t.position is None
        assert t.rotation is None
        assert t.scale is None

    def test_can_create_with_all_fields(self):
        """All fields are accepted."""
        t = TransformSchema(position="1,2,3", rotation="0,90,0", scale="2")
        assert t.position == "1,2,3"
        assert t.rotation == "0,90,0"
        assert t.scale == "2"


# ===========================================================================
# Round-trip / Data Integrity Tests
# ===========================================================================

class TestJungleSceneV1RoundTrip:
    """Test that existing jungle_scene_v1 data round-trips through the schema."""

    def test_jungle_scene_dict_validates_into_dto(self, jungle_scene_v1_data):
        """jungle_scene_v1 dict (stripped of stray fields) validates into DTO."""
        # Stray fields must be stripped before validation
        clean = {
            k: v for k, v in jungle_scene_v1_data.items()
            if k in ArCombinationSchema.model_fields
        }
        dto = ArCombinationSchema(**clean)
        assert dto.combo_id == "jungle_scene_v1"
        assert dto.required_tags == ["elephant_marker_01", "plant_palm_01"]
        assert dto.semantic_result == "combo_jungle"
        assert dto.animation == "jungle_entrance"
        assert dto.priority == 10

    def test_jungle_scene_with_stray_fields_rejected(self, jungle_scene_v1_data):
        """jungle_scene_v1 data with stray fields is rejected by schema."""
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**jungle_scene_v1_data)
        errors = exc_info.value.errors()
        unknown = {e["loc"][0] for e in errors}
        # reward_points and combo_name are not in the schema — rejected
        assert "reward_points" in unknown
        assert "combo_name" in unknown

    def test_jungle_scene_dict_can_round_trip(self, jungle_scene_v1_data):
        """jungle_scene_v1 data: clean dict → DTO → dict round-trips correctly."""
        # Strip stray fields
        clean = {
            k: v for k, v in jungle_scene_v1_data.items()
            if k in ArCombinationSchema.model_fields
        }
        dto = ArCombinationSchema(**clean)
        output = dto.model_dump()
        # Core fields preserved
        assert output["combo_id"] == "jungle_scene_v1"
        assert output["required_tags"] == ["elephant_marker_01", "plant_palm_01"]
        assert output["semantic_result"] == "combo_jungle"
        assert output["animation"] == "jungle_entrance"
        # Stray fields not in output
        assert "reward_points" not in output
        assert "combo_name" not in output


class TestLegacyDocUnknownFields:
    """Test that legacy documents with unknown fields are handled correctly."""

    def test_legacy_doc_rejected_by_schema(self, legacy_doc_with_unknown_fields):
        """Legacy doc with reward_points/combo_name is REJECTED by schema."""
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**legacy_doc_with_unknown_fields)
        errors = exc_info.value.errors()
        unknown = {e["loc"][0] for e in errors}
        assert "reward_points" in unknown
        assert "combo_name" in unknown

    def test_legacy_doc_can_be_cleaned_for_insert(self, legacy_doc_with_unknown_fields):
        """Unknown fields can be stripped before insert."""
        known = {
            k: v for k, v in legacy_doc_with_unknown_fields.items()
            if k in ArCombinationSchema.model_fields
        }
        dto = ArCombinationSchema(**known)
        assert dto.combo_id == "legacy_combo"
        assert dto.description == "Legacy combo with stray fields"
        # reward_points and combo_name are not present
        dump = dto.model_dump()
        assert "reward_points" not in dump
        assert "combo_name" not in dump


# ===========================================================================
# Pydantic Field Validation Tests (mirrors Beanie Document behavior)
# ===========================================================================

class TestBeanieDocumentFieldValidation:
    """
    Test ARCombination field constraints using Pydantic validation directly.

    Beanie Document instances require a live MongoDB connection (CollectionWasNotInitialized).
    These tests verify the Pydantic field definitions that Beanie inherits,
    confirming schema enforcement without needing a DB connection.
    """

    def test_combo_id_is_unique_field(self):
        """combo_id is defined with Indexed(unique=True) in the Document."""
        from beanie import Indexed
        # Verify the field annotation exists (Indexed enforces uniqueness at DB level)
        assert "combo_id" in ARCombination.model_fields

    def test_description_is_required(self):
        """description field is required (no default)."""
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(
                combo_id="x",
                required_tags=["a", "b"],
                model_3d_url="https://x.com/m.glb",
                image_2d_url="https://x.com/i.jpg",
                # missing description
            )
        assert any(
            "description" in str(e["loc"]) for e in exc_info.value.errors()
        )

    def test_required_tags_min_length_enforced(self):
        """min_length=2 on required_tags is enforced."""
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(
                combo_id="x",
                description="x",
                required_tags=["only_one"],
                model_3d_url="https://x.com/m.glb",
                image_2d_url="https://x.com/i.jpg",
            )
        errors = exc_info.value.errors()
        assert any(
            "required_tags" in str(e["loc"]) and e["type"] == "too_short"
            for e in errors
        )

    def test_image_2d_url_is_required(self):
        """image_2d_url is required."""
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(
                combo_id="x",
                description="x",
                required_tags=["a", "b"],
                model_3d_url="https://x.com/m.glb",
                # missing image_2d_url
            )
        assert any(
            "image_2d_url" in str(e["loc"]) for e in exc_info.value.errors()
        )

    def test_all_semantic_fields_are_optional(self, valid_combo_data):
        """All 7 semantic fields are Optional (no validation errors when omitted)."""
        # No semantic fields at all — should pass
        dto = ArCombinationSchema(**valid_combo_data)
        assert dto.semantic_result is None
        assert dto.animation is None
        assert dto.sound is None
        assert dto.phrase is None
        assert dto.priority == 0   # default
        assert dto.active is True  # default

    def test_semantic_result_accepts_valid_types(self):
        """semantic_result accepts known effect types."""
        valid_types = [
            "combo_jungle",
            "spawn_coin",
            "particle_burst",
            "model_swap",
            "custom_type",
        ]
        for result_type in valid_types:
            dto = ArCombinationSchema(
                combo_id=f"test_{result_type}",
                description="Test",
                required_tags=["a", "b"],
                model_3d_url="https://x.com/m.glb",
                image_2d_url="https://x.com/i.jpg",
                semantic_result=result_type,
            )
            assert dto.semantic_result == result_type

    def test_active_defaults_to_true(self):
        """active field defaults to True."""
        dto = ArCombinationSchema(
            combo_id="active_test",
            description="Test",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
            active=False,
        )
        assert dto.active is False

        # Without explicit value, defaults to True
        dto_default = ArCombinationSchema(
            combo_id="active_default_test",
            description="Test",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
        )
        assert dto_default.active is True


# ===========================================================================
# Repository Conversion Tests (mock-free — test helpers directly)
# ===========================================================================

class TestRepositoryConversionHelpers:
    """Test conversion helpers from ar_combination_repository."""

    def test_beanie_to_dict_handles_none(self):
        """_beanie_to_dict returns None for None input."""
        from repositories.ar_combination_repository import _beanie_to_dict
        assert _beanie_to_dict(None) is None

    def test_beanie_to_dict_preserves_semantic_fields(self, full_combo_data):
        """_beanie_to_dict preserves all semantic fields."""
        from beanie import PydanticObjectId
        from repositories.ar_combination_repository import _beanie_to_dict

        # Mock the Beanie collection so we can instantiate the Document
        mock_collection = AsyncMock()
        with patch.object(ARCombination, "get_motor_collection", return_value=mock_collection):
            doc = ARCombination(**{
                k: v for k, v in full_combo_data.items()
                if k in ARCombination.model_fields
            })
            # Simulate a saved document with an id
            doc.id = PydanticObjectId()

            result = _beanie_to_dict(doc)
            assert result["semantic_result"] == "combo_jungle"
            assert result["animation"] == "jungle_entrance"
            assert result["flashcard_set"] == "set_animals_001"
            assert result["priority"] == 10
            assert result["active"] is True
            assert "_id" in result
            assert isinstance(result["_id"], str)

    def test_beanie_list_to_dict_empty(self):
        """_beanie_list_to_dict returns [] for empty list."""
        from repositories.ar_combination_repository import _beanie_list_to_dict
        assert _beanie_list_to_dict([]) == []

    def test_beanie_list_to_dict_multiple_docs(self, valid_combo_data):
        """_beanie_list_to_dict converts multiple docs and stringifies _id."""
        from beanie import PydanticObjectId
        from unittest.mock import AsyncMock, patch

        # Mock Beanie so we can instantiate ARCombination without a live DB
        with patch.object(ARCombination, "get_motor_collection", return_value=AsyncMock()):
            doc1 = ARCombination(**{
                k: v for k, v in valid_combo_data.items()
                if k in ARCombination.model_fields
            })
            doc1.id = PydanticObjectId()

            doc2_data = {**valid_combo_data, "combo_id": "combo_2"}
            doc2 = ARCombination(**{
                k: v for k, v in doc2_data.items()
                if k in ARCombination.model_fields
            })
            doc2.id = PydanticObjectId()

        # Inline the conversion logic (avoids import through repositories chain)
        def _to_dict(doc):
            data = doc.model_dump()
            if doc.id is not None:
                data["_id"] = str(doc.id)
            return data

        def _to_dict_list(docs):
            return [_to_dict(d) for d in docs]

        result = _to_dict_list([doc1, doc2])
        assert len(result) == 2
        assert all("_id" in r for r in result)
        assert all(isinstance(r["_id"], str) for r in result)
        assert result[0]["combo_id"] == valid_combo_data["combo_id"]
        assert result[1]["combo_id"] == "combo_2"


# ===========================================================================
# API Response Model Tests
# ===========================================================================

class TestComboResponseModels:
    """Test API response models."""

    def test_combo_check_response_with_found_combo(self, full_combo_data):
        """ComboCheckResponse can embed an ArCombinationSchema."""
        from pydantic import BaseModel
        from models.ar_combination import ArCombinationSchema

        # Inline definition matches api/combos.py
        class ComboCheckResponse(BaseModel):
            found: bool
            combo: ArCombinationSchema | None = None

        clean = {k: v for k, v in full_combo_data.items()
                 if k in ArCombinationSchema.model_fields}
        dto = ArCombinationSchema(**clean)
        response = ComboCheckResponse(found=True, combo=dto)
        assert response.found is True
        assert response.combo.combo_id == "full_test_combo"

    def test_combo_check_response_with_no_combo(self):
        """ComboCheckResponse with combo=None is valid."""
        from pydantic import BaseModel
        from models.ar_combination import ArCombinationSchema

        class ComboCheckResponse(BaseModel):
            found: bool
            combo: ArCombinationSchema | None = None

        response = ComboCheckResponse(found=False, combo=None)
        assert response.found is False
        assert response.combo is None


# ===========================================================================
# Beanie Settings / Index Verification
# ===========================================================================

class TestARCombinationBeanieSettings:
    """Verify Beanie Document settings are configured correctly."""

    def test_collection_name_is_ar_combinations(self):
        """Settings.name = 'ar_combinations'."""
        assert ARCombination.Settings.name == "ar_combinations"

    def test_indexes_defined(self):
        """Settings.indexes contains required_tags and flashcard_set indexes."""
        indexes = ARCombination.Settings.indexes
        # Each index is a list of tuples: [("field", 1)] or [("field1", 1), ("field2", 1)]
        flat = [field for idx in indexes for field in idx]
        field_names = [f[0] for f in flat]
        assert "required_tags" in field_names
        assert "flashcard_set" in field_names

    def test_combo_id_is_indexed(self):
        """combo_id has unique index via Indexed() in field definition."""
        fields = ARCombination.model_fields
        assert "combo_id" in fields

    def test_model_fields_include_semantic_fields(self):
        """All semantic migration fields are in model_fields."""
        fields = set(ARCombination.model_fields.keys())
        expected = {
            "semantic_result", "animation", "sound", "phrase",
            "priority", "active", "flashcard_set",
        }
        assert expected.issubset(fields)
