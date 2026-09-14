"""
Auth gate tests for Chat API — the LLM-backed endpoints must reject
anonymous and invalid-token callers with 401, while public metadata
(GET /chat/models) stays open.

Policy (agreed 2026-09-14): guests get 401 + a Vietnamese login prompt on the
frontend; all four LLM-costing endpoints (/chat/rag, /chat/message,
/chat/pronunciation, /chat/test-embedding) require get_current_user.
Native (paused) RN clients already send Bearer tokens, so the contract holds.
"""
from unittest.mock import AsyncMock
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

import core.security as core_security
from main import app
from api.chat import get_agentic_rag_service, get_postgres_chat_log_repository
from services.ai_service import get_ai_service
from repositories.postgres_user_repository import PostgresUser
from tests.test_chat_integration import FAKE_USER  # reuse the fake identity

ANON_POSTS = [
    ("/api/v1/chat/rag", {"question": "hi"}),
    ("/api/v1/chat/message", {"message": "hi"}),
    ("/api/v1/chat/pronunciation", {"target_text": "cat", "audio_text": "cat"}),
    ("/api/v1/chat/test-embedding", {"text": "hi"}),
]


@pytest.fixture
def anon_client():
    """Client with service deps mocked but AUTH intact (no user override)."""
    mock_service = AsyncMock()
    mock_service.chat = AsyncMock(return_value="ok")
    mock_service.analyze_pronunciation = AsyncMock(return_value={"feedback": "ok"})
    mock_service.generate_embedding = AsyncMock(return_value=[0.1] * 8)

    app.dependency_overrides[get_agentic_rag_service] = lambda: AsyncMock()
    app.dependency_overrides[get_postgres_chat_log_repository] = lambda: AsyncMock()
    app.dependency_overrides[get_ai_service] = lambda: mock_service
    client = TestClient(app, raise_server_exceptions=False)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(monkeypatch):
    """Client where get_current_user runs FOR REAL (JWT decode) but the user
    lookup is patched — proves the whole dependency, not just its presence."""
    app.dependency_overrides[get_agentic_rag_service] = lambda: AsyncMock(
        run=AsyncMock(return_value={
            "response": "ok", "sources": [], "cached": False, "agent_trace": [],
        })
    )
    app.dependency_overrides[get_postgres_chat_log_repository] = lambda: AsyncMock()

    fake_repo = AsyncMock()
    fake_repo.get_by_id = AsyncMock(return_value=FAKE_USER)
    monkeypatch.setattr(
        core_security.PostgresUserRepository, "get_by_id", fake_repo.get_by_id
    )
    client = TestClient(app, raise_server_exceptions=False)
    yield client
    app.dependency_overrides.clear()


class TestAnonymousRejected:

    @pytest.mark.parametrize("path,payload", ANON_POSTS)
    def test_no_token_returns_401(self, anon_client, path, payload):
        assert anon_client.post(path, json=payload).status_code == 401

    @pytest.mark.parametrize("path,payload", ANON_POSTS)
    def test_invalid_token_returns_401(self, anon_client, path, payload):
        r = anon_client.post(
            path, json=payload, headers={"Authorization": "Bearer garbage-not-a-jwt"}
        )
        assert r.status_code == 401

    def test_models_endpoint_stays_public(self, anon_client):
        """GET /chat/models costs no LLM quota and gates the picker UI."""
        assert anon_client.get("/api/v1/chat/models").status_code == 200


class TestRealJwtAccepted:

    def test_valid_token_passes_dependency(self, auth_client):
        token = core_security.create_access_token(subject="learner-123")
        r = auth_client.post(
            "/api/v1/chat/rag",
            json={"question": "What is an elephant?"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200

    def test_expired_token_rejected(self, auth_client):
        token = core_security.create_access_token(
            subject="learner-123", expires_delta=timedelta(minutes=-5)
        )
        r = auth_client.post(
            "/api/v1/chat/rag",
            json={"question": "hi"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 401

    def test_inactive_user_rejected(self, auth_client, monkeypatch):
        inactive = PostgresUser(
            id="banned-1",
            email="banned@example.test",
            username="banned",
            hashed_password="x",
            is_active=False,
        )
        fake_repo = AsyncMock(return_value=inactive)
        monkeypatch.setattr(
            core_security.PostgresUserRepository, "get_by_id", fake_repo
        )
        token = core_security.create_access_token(subject="banned-1")
        r = auth_client.post(
            "/api/v1/chat/rag",
            json={"question": "hi"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 400  # get_current_user blocks inactive accounts
