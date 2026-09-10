from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.combos import router as combos_router
from services.ar_service import get_ar_service


def test_combo_rules_expose_generic_runtime_selection_metadata():
    service = AsyncMock()
    service.list_combos.return_value = [
        {
            "combo_id": "dog_bone",
            "combo_name": "Dog eats Bone",
            "required_tags": ["dog001", "bone001"],
            "target_order": ["dog001", "bone001"],
            "priority": 17,
            "animation_trigger": "DOG_EAT",
            "active": True,
            "proximity_enter_distance": 0.42,
            "proximity_exit_distance": 0.50,
            "proximity_stable_ms": 240,
            "proximity_smoothing_alpha": 0.30,
        }
    ]
    app = FastAPI()
    app.include_router(combos_router, prefix="/api/v1")
    app.dependency_overrides[get_ar_service] = lambda: service
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/api/v1/combos/rules")

    assert response.status_code == 200
    assert response.json() == {
        "rules": [
            {
                "tags": ["dog001", "bone001"],
                "target_order": ["dog001", "bone001"],
                "name": "Dog eats Bone",
                "combo_id": "dog_bone",
                "animation_trigger": "DOG_EAT",
                "priority": 17,
                "proximity": {
                    "enter_distance": 0.42,
                    "exit_distance": 0.50,
                    "proximity_stable_ms": 240,
                    "smoothing_alpha": 0.30,
                },
            }
        ],
        "total": 1,
    }


def test_combo_rules_default_missing_priority_to_zero_for_runtime_tie_breaking():
    service = AsyncMock()
    service.list_combos.return_value = [
        {
            "combo_id": "dog_bone",
            "combo_name": "Dog eats Bone",
            "required_tags": ["dog001", "bone001"],
            "animation_trigger": "DOG_EAT",
            "active": True,
        }
    ]
    app = FastAPI()
    app.include_router(combos_router, prefix="/api/v1")
    app.dependency_overrides[get_ar_service] = lambda: service
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/api/v1/combos/rules")

    assert response.status_code == 200
    assert response.json()["rules"][0]["priority"] == 0


@pytest.mark.parametrize(
    ("stored_animation_trigger", "stored_animation", "expected_animation"),
    [
        ("DOG_EAT", "OLD_VALUE", "DOG_EAT"),
        (None, "DOG_EAT", "DOG_EAT"),
        (None, None, None),
    ],
    ids=("explicit-trigger-wins", "repository-animation-bridged", "no-animation"),
)
def test_combo_rules_bridge_repository_animation_to_runtime_trigger(
    stored_animation_trigger,
    stored_animation,
    expected_animation,
):
    """The repository's canonical ``animation`` field must reach WebAR rules."""
    service = AsyncMock()
    combo = {
        "combo_id": "dog_bone",
        "combo_name": "Dog eats Bone",
        "required_tags": ["dog001", "bone001"],
        "target_order": ["dog001", "bone001"],
        "priority": 40,
        "active": True,
        "proximity_enter_distance": 0.45,
        "proximity_exit_distance": 0.55,
        "proximity_stable_ms": 300,
        "proximity_smoothing_alpha": 0.25,
    }
    if stored_animation_trigger is not None:
        combo["animation_trigger"] = stored_animation_trigger
    if stored_animation is not None:
        combo["animation"] = stored_animation
    service.list_combos.return_value = [combo]

    app = FastAPI()
    app.include_router(combos_router, prefix="/api/v1")
    app.dependency_overrides[get_ar_service] = lambda: service
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/api/v1/combos/rules")

    assert response.status_code == 200
    assert response.json()["rules"][0]["animation_trigger"] == expected_animation
