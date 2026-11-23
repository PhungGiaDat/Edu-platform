from datetime import datetime
import pytest
from pydantic import ValidationError
from models.ar_object_contract import ARObjectContract, serialize_ar_object

BASE = {
    "ar_tag": "elephant_marker_01",
    "description": "Elephant",
    "animation_type": "idle",
    "glb_size": 1.0,
    "model_3d_url": "https://assets.example/elephant.glb",
    "image_2d_url": None,
    "texture_url": None,
    "position": "0 0 0",
    "rotation": "0 0 0",
    "scale": "1 1 1",
    "created_at": datetime(2026, 8, 7),
}


def test_catalog_contract_requires_exact_pair_and_forbids_legacy_url():
    value = ARObjectContract(
        **BASE,
        tracking_mode="catalog",
        mind_catalog_id="animals-v2",
        mind_target_index=0,
    )
    assert value.mind_target_index == 0
    with pytest.raises(ValidationError):
        ARObjectContract(**BASE, tracking_mode="catalog", mind_catalog_id="animals-v2")
    with pytest.raises(ValidationError):
        ARObjectContract(
            **BASE,
            tracking_mode="catalog",
            mind_catalog_id="animals-v2",
            mind_target_index=0,
            nft_base_url="/old.mind",
        )


def test_legacy_contract_requires_url_and_forbids_catalog_pair():
    value = ARObjectContract(**BASE, tracking_mode="legacy", nft_base_url="https://assets/old.mind")
    assert value.mind_catalog_id is None
    with pytest.raises(ValidationError):
        ARObjectContract(**BASE, tracking_mode="legacy")


def test_serializer_normalizes_vectors_and_removes_mongo_ids():
    result = serialize_ar_object({
        **BASE,
        "_id": "mongo-id",
        "id": "beanie-id",
        "tracking_mode": "catalog",
        "mind_catalog_id": "animals-v2",
        "mind_target_index": 0,
        "position": {"x": 0, "y": 0.5, "z": 0},
    })
    assert result["position"] == "0 0.5 0"
    assert "_id" not in result
    assert "id" not in result
