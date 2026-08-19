"""
L4 Integration tests for Chat API endpoints (POST /chat/rag + GET /chat/models).

Uses TestClient(main.app) with app.dependency_overrides to inject mocks for
downstream services:
- get_agentic_rag_service() → mock AgenticRAGService
- get_postgres_chat_log_repository() → mock that does nothing

FastAPI calls app.dependency_overrides.get(fn, fn)() at request time — this
bypasses the stale closure problem that makes patching Depends() factories
from outside the module impossible.
"""
from unittest.mock import AsyncMock
import pytest
from fastapi.testclient import TestClient

from main import app
from api.chat import get_agentic_rag_service, get_postgres_chat_log_repository


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_agentic_rag_service():
    """Controlled mock that returns a fixed RAG pipeline result."""
    mock = AsyncMock()
    mock.run = AsyncMock(return_value={
        "response": "Elephant is a large animal with a trunk 🐘",
        "sources": [
            {"word": "elephant", "score": 0.95},
            {"word": "animal", "score": 0.80},
        ],
        "cached": False,
        "agent_trace": [
            "planner:done model=qwen/qwen3.8-max-free",
            "generator:done model=deepseek/deepseek-v4-pro-0813-free sources=2",
            "validator:done model=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        ],
    })
    return mock


@pytest.fixture
def mock_chat_repo():
    """Mock PostgresChatLogRepository that does nothing (no-op)."""
    repo = AsyncMock()
    repo.log_message = AsyncMock(return_value=None)
    return repo


@pytest.fixture
def client(mock_agentic_rag_service, mock_chat_repo):
    """
    TestClient with dependency overrides active.

    Using app.dependency_overrides (not patch) so FastAPI calls our
    mocks at request time instead of resolving a stale closure.
    Clears overrides after the test.
    """
    app.dependency_overrides[get_agentic_rag_service] = lambda: mock_agentic_rag_service
    app.dependency_overrides[get_postgres_chat_log_repository] = lambda: mock_chat_repo
    client = TestClient(app, raise_server_exceptions=False)
    yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# GET /api/v1/chat/models
# ---------------------------------------------------------------------------

class TestGetModelsEndpoint:

    def test_returns_200(self, client):
        """GET /chat/models must return HTTP 200."""
        response = client.get("/api/v1/chat/models")
        assert response.status_code == 200

    def test_response_contains_models_and_defaults(self, client):
        """Response must contain 'models' (list) and 'defaults' (dict)."""
        data = client.get("/api/v1/chat/models").json()
        assert "models" in data
        assert "defaults" in data
        assert isinstance(data["models"], list)
        assert isinstance(data["defaults"], dict)

    def test_three_models_in_catalog(self, client):
        """The catalog must expose exactly 3 models — one per pipeline role."""
        data = client.get("/api/v1/chat/models").json()
        assert len(data["models"]) == 3
        roles = {m["role"] for m in data["models"]}
        assert roles == {"planner", "generator", "validator"}

    def test_each_model_has_id_role_description(self, client):
        """Every model entry must expose non-empty id, role, description."""
        data = client.get("/api/v1/chat/models").json()
        for model in data["models"]:
            assert model["id"], "Model id must be non-empty"
            assert model["role"] in {"planner", "generator", "validator"}
            assert model["description"], "Model description must be non-empty"

    def test_defaults_contain_all_three_roles(self, client):
        """defaults dict must have keys for planner, generator, validator."""
        data = client.get("/api/v1/chat/models").json()
        assert set(data["defaults"].keys()) == {"planner", "generator", "validator"}

    def test_defaults_are_non_empty_strings(self, client):
        """Every default value must be a non-empty model ID string."""
        data = client.get("/api/v1/chat/models").json()
        for key, value in data["defaults"].items():
            assert isinstance(value, str), f"default for '{key}' must be a string"
            assert value, f"default for '{key}' must be non-empty"


# ---------------------------------------------------------------------------
# POST /api/v1/chat/rag
# ---------------------------------------------------------------------------

class TestRAGChatEndpoint:

    def test_returns_200(self, client):
        """POST /chat/rag with a valid body must return HTTP 200."""
        response = client.post(
            "/api/v1/chat/rag",
            json={"question": "What is an elephant?"},
        )
        assert response.status_code == 200

    def test_response_has_required_fields(self, client):
        """RAG response must contain response, sources, session_id, agent_trace."""
        data = client.post(
            "/api/v1/chat/rag",
            json={"question": "What is an elephant?"},
        ).json()
        assert "response" in data
        assert "sources" in data
        assert "session_id" in data
        assert "agent_trace" in data

    def test_response_values_have_correct_types(self, client):
        """response: str, sources: list, session_id: str, agent_trace: list."""
        data = client.post(
            "/api/v1/chat/rag",
            json={"question": "What is an elephant?"},
        ).json()
        assert isinstance(data["response"], str)
        assert isinstance(data["sources"], list)
        assert isinstance(data["session_id"], str)
        assert isinstance(data["agent_trace"], list)

    def test_sources_contain_word_and_score(self, client):
        """Each source must have 'word' (str) and 'score' (float)."""
        data = client.post(
            "/api/v1/chat/rag",
            json={"question": "What is an elephant?"},
        ).json()
        for source in data["sources"]:
            assert "word" in source
            assert "score" in source
            assert isinstance(source["word"], str)
            assert isinstance(source["score"], (int, float))

    def test_agent_trace_is_populated(self, client):
        """agent_trace must contain planner/generator/validator entries."""
        data = client.post(
            "/api/v1/chat/rag",
            json={"question": "What is an elephant?"},
        ).json()
        assert len(data["agent_trace"]) >= 3
        trace_text = " ".join(data["agent_trace"])
        assert "planner" in trace_text
        assert "generator" in trace_text
        assert "validator" in trace_text

    def test_session_id_is_stable_across_requests(self, client):
        """Two requests with same session_id should return the same session_id."""
        session_payload = {"question": "Tell me about lions", "session_id": "my-session-123"}
        r1 = client.post("/api/v1/chat/rag", json=session_payload).json()
        r2 = client.post("/api/v1/chat/rag", json=session_payload).json()
        assert r1["session_id"] == "my-session-123"
        assert r2["session_id"] == "my-session-123"
        assert r1["session_id"] == r2["session_id"]

    def test_missing_question_returns_422(self, client):
        """Omitting 'question' must return HTTP 422 validation error."""
        response = client.post("/api/v1/chat/rag", json={})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Model override passthrough
# ---------------------------------------------------------------------------

class TestModelOverridePassthrough:
    """Verify model overrides from the HTTP request reach agentic_rag.run()."""

    def test_planner_model_override_forwarded(self, client, mock_agentic_rag_service):
        """planner_model override must be forwarded to service.run()."""
        client.post(
            "/api/v1/chat/rag",
            json={"question": "What is a tiger?", "planner_model": "custom/planner"},
        )
        mock_agentic_rag_service.run.assert_called_once()
        _, kwargs = mock_agentic_rag_service.run.call_args
        assert kwargs.get("planner_model") == "custom/planner"

    def test_generator_model_override_forwarded(self, client, mock_agentic_rag_service):
        """generator_model override must be forwarded to service.run()."""
        client.post(
            "/api/v1/chat/rag",
            json={"question": "What is a tiger?", "generator_model": "custom/gen"},
        )
        mock_agentic_rag_service.run.assert_called_once()
        _, kwargs = mock_agentic_rag_service.run.call_args
        assert kwargs.get("generator_model") == "custom/gen"

    def test_validator_model_override_forwarded(self, client, mock_agentic_rag_service):
        """validator_model override must be forwarded to service.run()."""
        client.post(
            "/api/v1/chat/rag",
            json={"question": "What is a tiger?", "validator_model": "custom/val"},
        )
        mock_agentic_rag_service.run.assert_called_once()
        _, kwargs = mock_agentic_rag_service.run.call_args
        assert kwargs.get("validator_model") == "custom/val"

    def test_all_three_overrides_forwarded_together(self, client, mock_agentic_rag_service):
        """All three overrides can be sent simultaneously."""
        client.post(
            "/api/v1/chat/rag",
            json={
                "question": "Tell me about cats",
                "planner_model": "p/model",
                "generator_model": "g/model",
                "validator_model": "v/model",
            },
        )
        mock_agentic_rag_service.run.assert_called_once()
        _, kwargs = mock_agentic_rag_service.run.call_args
        assert kwargs.get("planner_model") == "p/model"
        assert kwargs.get("generator_model") == "g/model"
        assert kwargs.get("validator_model") == "v/model"

    def test_no_override_passes_none(self, client, mock_agentic_rag_service):
        """When no override is sent, service.run() receives None for all three."""
        client.post(
            "/api/v1/chat/rag",
            json={"question": "What is a cat?"},
        )
        mock_agentic_rag_service.run.assert_called_once()
        _, kwargs = mock_agentic_rag_service.run.call_args
        assert kwargs.get("planner_model") is None
        assert kwargs.get("generator_model") is None
        assert kwargs.get("validator_model") is None


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

class TestRAGChatErrorHandling:

    def test_service_error_returns_500(self, client, mock_agentic_rag_service):
        """If service.run() raises, the endpoint returns HTTP 500 (no try/except)."""
        mock_agentic_rag_service.run.side_effect = RuntimeError("Qdrant unavailable")
        response = client.post(
            "/api/v1/chat/rag",
            json={"question": "What is an elephant?"},
        )
        # Currently the endpoint lets exceptions propagate → 500.
        # A future fix would wrap in try/except and return 200 with an error message.
        assert response.status_code == 500
