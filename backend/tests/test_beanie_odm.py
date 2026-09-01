"""
Tests for ArCombinationSchema DTO and related models.

All database operations go through ARCombinationRepository (PostgreSQL).
These tests validate Pydantic schemas without any database dependency.

Run with:
    pytest backend/tests/test_beanie_odm.py -v
"""
import pytest
from pydantic import ValidationError

from models.ar_combination import (
    ArCombinationSchema,
    TransformSchema,
    serialize_ar_combination,
)


# ===========================================================================
# Fixtures
# ===========================================================================

@pytest.fixture
def valid_combo_data() -> dict:
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
    return {
        "combo_id": "jungle_scene_v1",
        "description": "Jungle Scene — Elephant + Palm",
        "required_tags": ["elephant_marker_01", "plant_palm_01"],
        "model_3d_url": "https://assets.example.com/models/jungle.glb",
        "image_2d_url": "https://assets.example.com/images/jungle.jpg",
        "bonus_xp": 100,
        "semantic_result": "combo_jungle",
        "animation": "jungle_entrance",
        "sound": None,
        "phrase": "🌴 Jungle Scene!",
        "priority": 10,
        "active": True,
        "flashcard_set": "set_animals_001",
        # Stray fields from legacy docs
        "reward_points": 100,
        "combo_name": "Jungle Scene V1",
    }


@pytest.fixture
def legacy_doc_with_unknown_fields() -> dict:
    return {
        "combo_id": "legacy_combo",
        "description": "Legacy combo with stray fields",
        "required_tags": ["tag_x", "tag_y"],
        "model_3d_url": "https://example.com/model.glb",
        "image_2d_url": "https://example.com/image.jpg",
        "bonus_xp": 50,
        "reward_points": 50,
        "combo_name": "Legacy Name",
    }


# ===========================================================================
# ArCombinationSchema (DTO) Tests
# ===========================================================================

class TestArCombinationSchema:
    """Tests for ArCombinationSchema DTO (Pydantic validation, no DB needed)."""

    def test_accepts_minimal_valid_data(self, valid_combo_data):
        dto = ArCombinationSchema(**valid_combo_data)
        assert dto.combo_id == valid_combo_data["combo_id"]
        assert dto.description == valid_combo_data["description"]
        assert dto.required_tags == valid_combo_data["required_tags"]
        assert dto.bonus_xp == 150

    def test_accepts_all_semantic_fields(self, full_combo_data):
        dto = ArCombinationSchema(**full_combo_data)
        assert dto.semantic_result == "combo_jungle"
        assert dto.animation == "jungle_entrance"
        assert dto.sound == "/audio/jungle_roar.mp3"
        assert dto.phrase == "Jungle Combo!"
        assert dto.priority == 10
        assert dto.active is True
        assert dto.flashcard_set == "set_animals_001"

    def test_rejects_missing_combo_id(self, valid_combo_data):
        del valid_combo_data["combo_id"]
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        assert any("combo_id" in str(e["loc"]) for e in exc_info.value.errors())

    def test_rejects_missing_required_tags(self, valid_combo_data):
        del valid_combo_data["required_tags"]
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        assert any("required_tags" in str(e["loc"]) for e in exc_info.value.errors())

    def test_rejects_missing_model_3d_url(self, valid_combo_data):
        del valid_combo_data["model_3d_url"]
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        assert any("model_3d_url" in str(e["loc"]) for e in exc_info.value.errors())

    def test_rejects_less_than_two_required_tags(self, valid_combo_data):
        valid_combo_data["required_tags"] = ["only_one"]
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        errors = exc_info.value.errors()
        assert any(
            "required_tags" in str(e["loc"]) and e["type"] == "too_short"
            for e in errors
        )

    def test_accepts_two_required_tags(self, valid_combo_data):
        dto = ArCombinationSchema(**valid_combo_data)
        assert len(dto.required_tags) == 2

    def test_rejects_unknown_fields(self, valid_combo_data):
        valid_combo_data["reward_points"] = 999
        valid_combo_data["combo_name"] = "My Combo"
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**valid_combo_data)
        errors = exc_info.value.errors()
        unknown = {e["loc"][0] for e in errors}
        assert "reward_points" in unknown
        assert "combo_name" in unknown

    def test_default_values(self):
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

    def test_description_is_required(self):
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(
                combo_id="x",
                required_tags=["a", "b"],
                model_3d_url="https://x.com/m.glb",
                image_2d_url="https://x.com/i.jpg",
            )
        assert any("description" in str(e["loc"]) for e in exc_info.value.errors())

    def test_image_2d_url_is_required(self):
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(
                combo_id="x",
                description="x",
                required_tags=["a", "b"],
                model_3d_url="https://x.com/m.glb",
            )
        assert any("image_2d_url" in str(e["loc"]) for e in exc_info.value.errors())

    def test_all_semantic_fields_are_optional(self, valid_combo_data):
        dto = ArCombinationSchema(**valid_combo_data)
        assert dto.semantic_result is None
        assert dto.animation is None
        assert dto.sound is None
        assert dto.phrase is None
        assert dto.priority == 0
        assert dto.active is True

    def test_semantic_result_accepts_valid_types(self):
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
        dto_false = ArCombinationSchema(
            combo_id="active_test",
            description="Test",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
            active=False,
        )
        assert dto_false.active is False

        dto_default = ArCombinationSchema(
            combo_id="active_default_test",
            description="Test",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
        )
        assert dto_default.active is True

    def test_cross_category_allowed_defaults_to_false(self):
        dto = ArCombinationSchema(
            combo_id="test",
            description="test",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
        )
        assert dto.cross_category_allowed is False

    def test_cross_category_allowed_can_be_set_true(self):
        dto = ArCombinationSchema(
            combo_id="test",
            description="test",
            required_tags=["a", "b"],
            model_3d_url="https://x.com/m.glb",
            image_2d_url="https://x.com/i.jpg",
            cross_category_allowed=True
        )
        assert dto.cross_category_allowed is True


# ===========================================================================
# TransformSchema Tests
# ===========================================================================

class TestTransformSchema:
    def test_can_create_empty(self):
        t = TransformSchema()
        assert t.position is None
        assert t.rotation is None
        assert t.scale is None

    def test_can_create_with_all_fields(self):
        t = TransformSchema(position="1,2,3", rotation="0,90,0", scale="2")
        assert t.position == "1,2,3"
        assert t.rotation == "0,90,0"
        assert t.scale == "2"


# ===========================================================================
# Round-trip / Data Integrity Tests
# ===========================================================================

class TestJungleSceneV1RoundTrip:
    def test_jungle_scene_dict_validates_into_dto(self, jungle_scene_v1_data):
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
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**jungle_scene_v1_data)
        errors = exc_info.value.errors()
        unknown = {e["loc"][0] for e in errors}
        assert "reward_points" in unknown
        assert "combo_name" in unknown

    def test_jungle_scene_dict_can_round_trip(self, jungle_scene_v1_data):
        clean = {
            k: v for k, v in jungle_scene_v1_data.items()
            if k in ArCombinationSchema.model_fields
        }
        dto = ArCombinationSchema(**clean)
        output = dto.model_dump()
        assert output["combo_id"] == "jungle_scene_v1"
        assert output["required_tags"] == ["elephant_marker_01", "plant_palm_01"]
        assert output["semantic_result"] == "combo_jungle"
        assert output["animation"] == "jungle_entrance"
        assert "reward_points" not in output
        assert "combo_name" not in output


class TestLegacyDocUnknownFields:
    def test_legacy_doc_rejected_by_schema(self, legacy_doc_with_unknown_fields):
        with pytest.raises(ValidationError) as exc_info:
            ArCombinationSchema(**legacy_doc_with_unknown_fields)
        errors = exc_info.value.errors()
        unknown = {e["loc"][0] for e in errors}
        assert "reward_points" in unknown
        assert "combo_name" in unknown

    def test_legacy_doc_can_be_cleaned_for_insert(self, legacy_doc_with_unknown_fields):
        known = {
            k: v for k, v in legacy_doc_with_unknown_fields.items()
            if k in ArCombinationSchema.model_fields
        }
        dto = ArCombinationSchema(**known)
        assert dto.combo_id == "legacy_combo"
        dump = dto.model_dump()
        assert "reward_points" not in dump
        assert "combo_name" not in dump


# ===========================================================================
# serialize_ar_combination Tests
# ===========================================================================

class TestSerializeArCombination:
    def test_serializes_dict_without_json_fields(self):
        data = {
            "combo_id": "test",
            "description": "Test combo",
            "required_tags": ["a", "b"],
            "model_3d_url": "https://x.com/m.glb",
            "image_2d_url": "https://x.com/i.jpg",
            "bonus_xp": 100,
            "priority": 0,
            "active": True,
        }
        dto = serialize_ar_combination(data)
        assert dto.combo_id == "test"

    def test_serializes_dict_with_json_center_transform(self):
        import json
        data = {
            "combo_id": "test",
            "description": "Test combo",
            "required_tags": ["a", "b"],
            "model_3d_url": "https://x.com/m.glb",
            "image_2d_url": "https://x.com/i.jpg",
            "bonus_xp": 100,
            "priority": 0,
            "active": True,
            "center_transform": json.dumps({"position": "0 0 0", "rotation": "0 0 0"}),
        }
        dto = serialize_ar_combination(data)
        assert dto.center_transform is not None
        assert dto.center_transform.position == "0 0 0"

    def test_serializes_dict_with_missing_required_tags_raises(self):
        """Missing required_tags raises ValidationError (min 2 required)."""
        data = {
            "combo_id": "test",
            "description": "Test combo",
            "model_3d_url": "https://x.com/m.glb",
            "image_2d_url": "https://x.com/i.jpg",
        }
        with pytest.raises(ValidationError) as exc_info:
            serialize_ar_combination(data)
        assert any("required_tags" in str(e["loc"]) for e in exc_info.value.errors())


# ===========================================================================
# API Response Model Tests
# ===========================================================================

class TestComboResponseModels:
    def test_combo_check_response_with_found_combo(self, full_combo_data):
        from pydantic import BaseModel
        from models.ar_combination import ArCombinationSchema

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
        from pydantic import BaseModel
        from models.ar_combination import ArCombinationSchema

        class ComboCheckResponse(BaseModel):
            found: bool
            combo: ArCombinationSchema | None = None

        response = ComboCheckResponse(found=False, combo=None)
        assert response.found is False
        assert response.combo is None
