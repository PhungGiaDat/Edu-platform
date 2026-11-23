"""Each catalog pet keeps its own care state inside user_gamification.pet_state (v2 map)."""
import copy
import json
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from services import postgres_gamification_service
from services.postgres_gamification_service import PostgresGamificationService

USER = "learner-1"


class MemoryPool:
    """user_gamification rows in memory; a transaction commits only if its block succeeds."""

    def __init__(self, pet_state=None, total_points=120, fail_update=False):
        self.rows = {USER: {"user_id": USER, "total_points": total_points, "badges": "[]",
                            "pet_state": json.dumps(pet_state) if pet_state is not None else None}}
        self.fail_update = fail_update

    async def fetchrow(self, query, user_id):
        return dict(self.rows[user_id]) if user_id in self.rows else None

    async def fetch(self, query, *args):
        return []

    @asynccontextmanager
    async def acquire(self):
        pool = self
        staged = copy.deepcopy(self.rows)

        class Conn:
            async def execute(self, query, user_id, *args):
                if query.startswith("INSERT"):
                    staged.setdefault(user_id, {"user_id": user_id, "total_points": 0, "badges": "[]", "pet_state": "{}"})
                elif query.startswith("UPDATE"):
                    if pool.fail_update:
                        raise RuntimeError("db write failed")
                    staged[user_id]["pet_state"] = args[0]

            async def fetchval(self, query, user_id):
                return staged[user_id]["pet_state"]

            @asynccontextmanager
            async def transaction(self):
                yield
                pool.rows = staged

        yield Conn()


def seeded():
    return {"version": 2, "pets": {
        "cube_elephant": {"happiness": 40, "hunger": 80, "energy": 60, "mood": "content", "xp_earned": 20, "stage": "baby"},
        "cube_cat": {"happiness": 70, "hunger": 30, "energy": 50, "mood": "content", "xp_earned": 5, "stage": "baby"},
    }}


def stored(pool):
    return json.loads(pool.rows[USER]["pet_state"])


@pytest.fixture
def pool(monkeypatch):
    pool = MemoryPool(seeded())
    monkeypatch.setattr(postgres_gamification_service, "postgres_pool", lambda: pool)
    return pool


@pytest.mark.asyncio
async def test_feeding_one_pet_leaves_the_other_untouched(pool):
    cat_before = copy.deepcopy(stored(pool)["pets"]["cube_cat"])

    result = await PostgresGamificationService().feed_pet(USER, "cube_elephant")

    assert (result["hunger"], result["happiness"], result["energy"], result["pet_xp"]) == (45, 50, 65, 25)
    assert stored(pool)["pets"]["cube_cat"] == cat_before


@pytest.mark.asyncio
async def test_playing_one_pet_leaves_the_other_untouched(pool):
    elephant_before = copy.deepcopy(stored(pool)["pets"]["cube_elephant"])

    result = await PostgresGamificationService().play_with_pet(USER, "cube_cat")

    assert (result["happiness"], result["hunger"], result["energy"], result["pet_xp"]) == (85, 40, 35, 13)
    assert stored(pool)["pets"]["cube_elephant"] == elephant_before


@pytest.mark.asyncio
async def test_pet_xp_and_stage_are_independent(pool):
    pool.rows[USER]["pet_state"] = json.dumps({"version": 2, "pets": {
        "cube_elephant": {"xp_earned": 98, "stage": "baby"},
        "cube_cat": {"xp_earned": 5, "stage": "baby"},
    }})
    service = PostgresGamificationService()

    fed = await service.feed_pet(USER, "cube_elephant")

    assert (fed["pet_xp"], fed["stage"], fed["evolved"]) == (103, "child", True)
    assert (await service.get_pet_xp(USER, "cube_elephant"))["stage"] == "child"
    cat = await service.get_pet_xp(USER, "cube_cat")
    assert (cat["xp"], cat["stage"]) == (5, "baby")


@pytest.mark.asyncio
async def test_switching_pets_and_reloading_returns_each_persisted_state(pool):
    await PostgresGamificationService().feed_pet(USER, "cube_elephant")

    fresh = PostgresGamificationService()  # e.g. after a page refresh
    elephant = await fresh.get_pet(USER, "cube_elephant")
    cat = await fresh.get_pet(USER, "cube_cat")
    again = await fresh.get_pet(USER, "cube_elephant")

    assert (elephant["hunger"], elephant["happiness"], elephant["xp_earned"]) == (45, 50, 25)
    assert (cat["hunger"], cat["happiness"], cat["xp_earned"]) == (30, 70, 5)
    assert again == elephant


@pytest.mark.asyncio
async def test_legacy_single_state_is_preserved_but_not_copied_to_pets(monkeypatch):
    legacy = {"type": "bunny", "happiness": 99, "hunger": 1, "xp_earned": 400, "stage": "child"}
    pool = MemoryPool(legacy)
    monkeypatch.setattr(postgres_gamification_service, "postgres_pool", lambda: pool)
    service = PostgresGamificationService()

    unseen = await service.get_pet(USER, "cube_elephant")
    await service.feed_pet(USER, "cube_cat")

    assert (unseen["happiness"], unseen["hunger"], unseen["xp_earned"]) == (50, 45, 0)
    state = stored(pool)
    assert state["version"] == 2 and state["legacy"] == legacy
    assert list(state["pets"]) == ["cube_cat"]
    assert state["pets"]["cube_cat"]["xp_earned"] == 5  # starts from default, not legacy 400


@pytest.mark.asyncio
async def test_feed_does_not_touch_the_global_user_total(pool):
    """Production feed never awarded user XP; per-pet care must not start doing so."""
    await PostgresGamificationService().feed_pet(USER, "cube_elephant")

    assert pool.rows[USER]["total_points"] == 120


@pytest.mark.asyncio
async def test_failed_feed_leaves_the_pet_state_unchanged(monkeypatch):
    pool = MemoryPool(seeded(), fail_update=True)
    monkeypatch.setattr(postgres_gamification_service, "postgres_pool", lambda: pool)
    before = stored(pool)

    with pytest.raises(RuntimeError):
        await PostgresGamificationService().feed_pet(USER, "cube_elephant")

    assert stored(pool) == before


@pytest.fixture
def api_client():
    from core.security import get_current_user
    from main import app
    from services.gamification_service import get_gamification_service

    service = AsyncMock()
    service.feed_pet = AsyncMock(return_value={"success": True})
    service.play_with_pet = AsyncMock(return_value={"success": True})
    service.get_pet = AsyncMock(return_value={})
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=USER, active_pet="cube_cat", unlocked_pets=["cube_cat", "cube_elephant"])
    app.dependency_overrides[get_gamification_service] = lambda: service
    yield TestClient(app), service
    app.dependency_overrides.clear()


def test_body_user_id_cannot_target_another_user(api_client):
    client, service = api_client

    response = client.post("/api/v1/gamification/pet/feed", json={"user_id": "victim", "pet_id": "cube_elephant"})

    assert response.status_code == 200
    service.feed_pet.assert_awaited_once_with(USER, pet_id="cube_elephant")


def test_care_requires_an_unlocked_pet_and_falls_back_to_the_active_one(api_client):
    client, service = api_client

    assert client.post("/api/v1/gamification/pet/play", json={"pet_id": "cube_lion"}).status_code == 403
    assert client.post("/api/v1/gamification/pet/play", json={"user_id": USER}).status_code == 200
    service.play_with_pet.assert_awaited_once_with(USER, pet_id="cube_cat")
    client.get("/api/v1/gamification/pet/someone-else?pet_id=cube_cat")
    service.get_pet.assert_awaited_once_with(USER, pet_id="cube_cat")
    service.feed_pet.assert_not_awaited()
