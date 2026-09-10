from unittest.mock import AsyncMock

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
