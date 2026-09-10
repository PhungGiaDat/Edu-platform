from unittest.mock import AsyncMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.combos import router as combos_router
from services.ar_service import get_ar_service


def test_combo_rules_expose_runtime_selection_metadata():
    service = AsyncMock()
    service.list_combos.return_value = [
        {
            "combo_id": "clay_cat_fish",
            "combo_name": "Cat eats Fish",
            "required_tags": ["cat001", "fish001"],
            "target_order": ["cat001", "fish001"],
            "priority": 20,
            "animation_trigger": "CAT_EAT",
            "active": True,
            "proximity_enter_distance": 0.52,
            "proximity_exit_distance": 0.60,
            "proximity_stable_ms": 300,
            "proximity_smoothing_alpha": 0.25,
        }
    ]
    app = FastAPI()
    app.include_router(combos_router, prefix="/api/v1")
    app.dependency_overrides[get_ar_service] = lambda: service
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/api/v1/combos/rules")

    assert response.status_code == 200
    assert response.json()["rules"] == [
        {
            "tags": ["cat001", "fish001"],
            "target_order": ["cat001", "fish001"],
            "name": "Cat eats Fish",
            "combo_id": "clay_cat_fish",
            "animation_trigger": "CAT_EAT",
            "priority": 20,
            "proximity": {
                "enter_distance": 0.52,
                "exit_distance": 0.60,
                "proximity_stable_ms": 300,
                "smoothing_alpha": 0.25,
            },
        }
    ]
