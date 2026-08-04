"""Regression coverage for flashcard AR responses containing related combos."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock

from bson import ObjectId
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.flashcards import router as flashcard_router
from services.ar_service import ARService, get_ar_service


def _elephant_flashcard() -> dict:
    return {
        "qr_id": "ele123",
        "word": "elephant",
        "translation": {"en": "elephant", "vi": "con voi"},
        "category": "animals",
        "image_url": "/assets/flashcards/ele123_card.png",
        "audio_url": None,
        "difficulty": "medium",
        "ar_tag": "elephant_marker_01",
        "image_animation_type": "wiggle",
    }


def _elephant_ar_object() -> dict:
    return {
        "_id": "68ac0dbc7ddebe79bec86620",
        "ar_tag": "elephant_marker_01",
        "description": "Elephant AR target",
        "animation_type": "rotate",
        "glb_size": 1.5,
        "nft_base_url": "https://assets.example.com/elephant.mind",
        "model_3d_url": "https://assets.example.com/elephant.glb",
        "texture_url": None,
        "image_2d_url": "https://assets.example.com/elephant.png",
        "position": "0 0 0",
        "rotation": "0 0 0",
        "scale": "1 1 1",
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    }


def _raw_jungle_combo() -> dict:
    mongo_id = ObjectId("68ac0dbc7ddebe79bec8661e")
    return {
        "id": mongo_id,
        "_id": str(mongo_id),
        "combo_id": "jungle_scene_v1",
        "description": "Scene of an elephant in a jungle with a palm tree.",
        "required_tags": ["elephant_marker_01", "jungle_marker_01"],
        "target_order": ["jungle_marker_01", "elephant_marker_01"],
        "model_3d_url": "https://assets.example.com/jungle.glb",
        "texture_url": None,
        "image_2d_url": "https://assets.example.com/jungle.png",
        "combo_mind_url": "https://assets.example.com/combo.mind",
        "bonus_xp": 100,
        "center_transform": {
            "position": "0 0.15 0",
            "rotation": "0 0 0",
            "scale": "0.65 0.65 0.65",
        },
        "semantic_result": None,
        "animation": None,
        "sound": None,
        "phrase": None,
        "priority": 0,
        "active": True,
        "flashcard_set": None,
        "cross_category_allowed": True,
    }


def test_flashcard_with_related_combo_returns_public_combo_contract():
    flashcards = AsyncMock()
    flashcards.get_by_qr_id.return_value = _elephant_flashcard()
    ar_objects = AsyncMock()
    ar_objects.get_by_tag.return_value = _elephant_ar_object()
    combinations = AsyncMock()
    combinations.find_by_tag.return_value = [_raw_jungle_combo()]
    service = ARService(flashcards, ar_objects, combinations)

    app = FastAPI()
    app.include_router(flashcard_router, prefix="/api/v1")
    app.dependency_overrides[get_ar_service] = lambda: service
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/api/v1/flashcard/ele123")

    assert response.status_code == 200
    combo = response.json()["related_combos"][0]
    assert combo["center_transform"]["scale"] == "0.65 0.65 0.65"
    assert combo["cross_category_allowed"] is True
    assert "id" not in combo
    assert "_id" not in combo
