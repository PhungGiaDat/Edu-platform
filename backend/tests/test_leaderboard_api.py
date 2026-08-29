from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.gamification import get_gamification_service, router
from core.security import get_current_user


@pytest.fixture
def leaderboard_app():
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    service = SimpleNamespace(
        get_leaderboard=AsyncMock(return_value=[
            {
                "user_id": "learner-1",
                "username": "Linh",
                "avatar_url": "https://example.test/linh.png",
                "total_points": 320,
                "level": 4,
                "streak_days": 5,
            },
        ]),
        get_user_rank=AsyncMock(return_value={
            "user_id": "learner-51",
            "rank": 51,
            "points": 480,
        }),
    )
    app.dependency_overrides[get_gamification_service] = lambda: service
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="learner-51")

    yield app, service
    app.dependency_overrides.clear()


def test_leaderboard_returns_profile_fields_and_period(leaderboard_app):
    app, service = leaderboard_app

    response = TestClient(app).get("/api/v1/gamification/leaderboard?period=weekly&limit=25")

    assert response.status_code == 200
    assert response.json() == [{
        "user_id": "learner-1",
        "username": "Linh",
        "avatar_url": "https://example.test/linh.png",
        "points": 320,
        "level": 4,
        "streak_days": 5,
        "rank": 1,
    }]
    service.get_leaderboard.assert_awaited_once_with(period="weekly", limit=25)


def test_user_rank_returns_rank_beyond_top_50(leaderboard_app):
    app, service = leaderboard_app

    response = TestClient(app).get("/api/v1/gamification/leaderboard/rank/learner-51?period=weekly")

    assert response.status_code == 200
    assert response.json() == {
        "user_id": "learner-51",
        "rank": 51,
        "points": 480,
        "period": "weekly",
    }
    service.get_user_rank.assert_awaited_once_with(user_id="learner-51", period="weekly")


def test_user_rank_cannot_be_used_for_another_learner(leaderboard_app):
    app, service = leaderboard_app

    response = TestClient(app).get("/api/v1/gamification/leaderboard/rank/another-user")

    assert response.status_code == 403
    service.get_user_rank.assert_not_awaited()
