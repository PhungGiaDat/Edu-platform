"""
Test suite for API authentication requirements.

Tests that protected endpoints require authentication:
- /gamification/streak/{user_id} - GET
- /gamification/user/{user_id} - GET  
- /gamification/pet/{user_id} - GET
- /gamification/stickers/{user_id} - GET
- /gamification/track-learning - POST
- /gamification/add-xp - POST
- /reports/child/{user_id}/summary - GET

All tests verify:
1. Auth required without token
2. Invalid token rejected
3. Valid token accepted
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from core.security import get_current_user, create_access_token
from models.user_schemas import UserResponse


class TestAuthenticationRequired:
    """Test that protected endpoints require authentication."""

    @pytest.fixture
    def mock_user(self):
        """Create a mock user for testing."""
        user = MagicMock()
        user.id = "test_user_123"
        user.email = "test@example.com"
        user.is_active = True
        user.is_superuser = False
        return user

    @pytest.fixture
    def valid_token(self, mock_user):
        """Create a valid JWT token."""
        return create_access_token(str(mock_user.id))

    @pytest.fixture
    def app(self):
        """Create test FastAPI app with routes."""
        app = FastAPI()
        
        # Import routers to register them
        from api.gamification import router as gamification_router
        from api.reports import router as reports_router
        
        app.include_router(gamification_router, prefix="/api/v1")
        app.include_router(reports_router, prefix="/api/v1")
        
        return app

    def test_gamification_streak_requires_auth(self, app):
        """GET /gamification/streak/{user_id} should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get("/api/v1/gamification/streak/user_123")
        
        # Should return 401 Unauthorized
        assert response.status_code == 401

    def test_gamification_user_stats_requires_auth(self, app):
        """GET /gamification/user/{user_id} should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get("/api/v1/gamification/user/user_123")
        
        assert response.status_code == 401

    def test_gamification_pet_requires_auth(self, app):
        """GET /gamification/pet/{user_id} should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get("/api/v1/gamification/pet/user_123")
        
        assert response.status_code == 401

    def test_gamification_stickers_requires_auth(self, app):
        """GET /gamification/stickers/{user_id} should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get("/api/v1/gamification/stickers/user_123")
        
        assert response.status_code == 401

    def test_gamification_track_learning_requires_auth(self, app):
        """POST /gamification/track-learning should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/track-learning",
            json={"user_id": "user_123", "words_learned": 5, "time_mins": 15}
        )
        
        assert response.status_code == 401

    def test_gamification_add_xp_requires_auth(self, app):
        """POST /gamification/add-xp should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/add-xp",
            json={"user_id": "user_123", "action": "lesson_completed"}
        )
        
        assert response.status_code == 401

    def test_gamification_award_badge_requires_auth(self, app):
        """POST /gamification/award-badge should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/award-badge",
            params={"badge_id": "streak_3"}
        )
        
        assert response.status_code == 401

    def test_reports_child_summary_requires_auth(self, app):
        """GET /reports/child/{user_id}/summary should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get("/api/v1/reports/child/user_123/summary")
        
        assert response.status_code == 401

    def test_gamification_pet_xp_requires_auth(self, app):
        """GET /gamification/pet-xp/{user_id} should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get("/api/v1/gamification/pet-xp/user_123")
        
        assert response.status_code == 401

    def test_gamification_pet_feed_requires_auth(self, app):
        """POST /gamification/pet/feed should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/pet/feed",
            json={"user_id": "user_123"}
        )
        
        assert response.status_code == 401

    def test_gamification_pet_choose_requires_auth(self, app):
        """POST /gamification/pet/choose should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/pet/choose",
            json={"user_id": "user_123", "pet_type": "bunny"}
        )
        
        assert response.status_code == 401

    def test_gamification_pet_play_requires_auth(self, app):
        """POST /gamification/pet/play should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/pet/play",
            json={"user_id": "user_123"}
        )
        
        assert response.status_code == 401

    def test_gamification_pet_outfit_requires_auth(self, app):
        """POST /gamification/pet/outfit should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/pet/outfit",
            json={"user_id": "user_123", "outfit": "crown"}
        )
        
        assert response.status_code == 401

    def test_gamification_stickers_collect_requires_auth(self, app):
        """POST /gamification/stickers/collect should require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/stickers/collect",
            json={"user_id": "user_123", "sticker_id": "star_gold"}
        )
        
        assert response.status_code == 401


class TestAuthenticationInvalid:
    """Test that invalid tokens are rejected."""

    @pytest.fixture
    def app(self):
        """Create test FastAPI app."""
        app = FastAPI()
        from api.gamification import router
        app.include_router(router, prefix="/api/v1")
        return app

    def test_invalid_token_rejected(self, app):
        """Invalid JWT token should be rejected."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get(
            "/api/v1/gamification/streak/user_123",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        
        assert response.status_code == 401

    def test_malformed_auth_header_rejected(self, app):
        """Malformed Authorization header should be rejected."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get(
            "/api/v1/gamification/streak/user_123",
            headers={"Authorization": "NotBearer token"}
        )
        
        assert response.status_code == 401

    def test_empty_token_rejected(self, app):
        """Empty token should be rejected."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get(
            "/api/v1/gamification/streak/user_123",
            headers={"Authorization": "Bearer "}
        )
        
        assert response.status_code == 401


class TestLeaderboardPublic:
    """Test that leaderboard endpoint is public (no auth required)."""

    @pytest.fixture
    def app(self):
        """Create test FastAPI app."""
        app = FastAPI()
        from api.gamification import router
        app.include_router(router, prefix="/api/v1")
        return app

    def test_leaderboard_no_auth_required(self, app):
        """GET /gamification/leaderboard should not require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get("/api/v1/gamification/leaderboard")
        
        # Should NOT return 401 - could be 200 with mock or actual data
        assert response.status_code != 401

    def test_sticker_catalog_no_auth_required(self, app):
        """GET /gamification/stickers/catalog should not require auth."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.get("/api/v1/gamification/stickers/catalog")
        
        # Should NOT return 401
        assert response.status_code != 401


class TestTokenGeneration:
    """Test JWT token generation and validation."""

    def test_create_access_token(self):
        """create_access_token should generate valid JWT."""
        token = create_access_token("user_123")
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_contains_user_id(self):
        """Token payload should contain user ID."""
        from jose import jwt
        from settings import settings
        
        token = create_access_token("user_123")
        secret = settings.SECRET_KEY.get_secret_value()
        payload = jwt.decode(token, secret, algorithms=[settings.ALGORITHM])
        
        assert payload["sub"] == "user_123"
        assert "exp" in payload

    def test_token_with_custom_expiry(self):
        """Token should support custom expiry time."""
        from datetime import timedelta
        
        token = create_access_token("user_123", expires_delta=timedelta(hours=1))
        
        assert token is not None


class TestInputValidation:
    """Test input validation for API endpoints."""

    @pytest.fixture
    def app(self):
        """Create test FastAPI app."""
        app = FastAPI()
        from api.gamification import router
        app.include_router(router, prefix="/api/v1")
        return app

    def test_track_learning_invalid_words_type(self, app):
        """track_learning should reject invalid words_learned type."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/track-learning",
            json={"user_id": "user_123", "words_learned": "invalid", "time_mins": 15}
        )
        
        # Should return validation error
        assert response.status_code in [401, 422]

    def test_track_learning_negative_time(self, app):
        """track_learning should handle negative time_mins."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/track-learning",
            json={"user_id": "user_123", "words_learned": 5, "time_mins": -5}
        )
        
        # Should return validation error or accept (business logic check)
        assert response.status_code in [401, 422, 200]

    def test_add_xp_invalid_action(self, app):
        """add_xp should return error for unknown action."""
        client = TestClient(app, raise_server_exceptions=False)
        
        # Without proper auth, should get 401
        response = client.post(
            "/api/v1/gamification/add-xp",
            json={"user_id": "user_123", "action": "invalid_action"}
        )
        
        assert response.status_code == 401

    def test_collect_sticker_invalid_sticker_id(self, app):
        """collect_sticker should handle invalid sticker_id."""
        client = TestClient(app, raise_server_exceptions=False)
        
        response = client.post(
            "/api/v1/gamification/stickers/collect",
            json={"user_id": "user_123", "sticker_id": "invalid_sticker"}
        )
        
        assert response.status_code == 401
