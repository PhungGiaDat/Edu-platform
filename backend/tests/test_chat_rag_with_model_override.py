"""
Contract tests for POST /api/v1/chat/rag — model override passthrough (L3.3).

Tests call agentic_rag.run() directly with mocked Qdrant retriever,
bypassing FastAPI's Depends() dependency injection which is hard to override
in unit tests.
"""
from unittest.mock import AsyncMock, patch
import pytest

from api.chat import RAGChatRequest, RAGChatResponse
from services.agentic_rag_service import AgenticRAGService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def fake_documents():
    return [
        {"text": "Elephants have long trunks.", "animal_en": "elephant", "score": 0.91},
        {"text": "Lions live in prides.", "animal_en": "lion", "score": 0.73},
    ]


@pytest.fixture
def recording_retriever(fake_documents):
    """Retriever that captures queries and returns canned documents."""
    retriever = AsyncMock()
    retriever.retrieve = AsyncMock(return_value=fake_documents)
    return retriever


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_overrides_returns_valid_response(recording_retriever):
    """Without model overrides the pipeline returns a valid RAGChatResponse."""
    service = AgenticRAGService(retriever=recording_retriever)

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        mock_instance = AsyncMock()
        mock_instance.call_with_fallback = AsyncMock(
            return_value=("validated draft", "default/model")
        )
        MockRouter.return_value = mock_instance

        result = await service.run(
            question="What is an elephant?",
            user_id="user-1",
            session_id="session-1",
        )

    assert isinstance(result, dict)
    assert "response" in result
    assert "sources" in result
    assert "agent_trace" in result
    assert len(result["agent_trace"]) > 0


@pytest.mark.asyncio
async def test_planner_model_override_forwarded(recording_retriever):
    """planner_model override is forwarded to ModelRouter for the planner stage."""
    service = AgenticRAGService(retriever=recording_retriever)
    used_models = {}

    def make_router(role, primary_model=None, **kwargs):
        r = AsyncMock()
        r._role = role
        r._primary_model = primary_model

        async def call_with_fallback(fn, inputs):
            used_models[role] = primary_model
            return f"output for {role}", primary_model or "default"

        r.call_with_fallback = call_with_fallback
        return r

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        MockRouter.side_effect = make_router

        await service.run(
            question="What is an elephant?",
            user_id="user-1",
            session_id="session-1",
            planner_model="custom/planner-model",
        )

    assert used_models.get("planner") == "custom/planner-model", (
        f"Expected planner_model='custom/planner-model', got {used_models.get('planner')}"
    )


@pytest.mark.asyncio
async def test_generator_model_override_forwarded(recording_retriever):
    """generator_model override is forwarded to ModelRouter for the generator stage."""
    service = AgenticRAGService(retriever=recording_retriever)
    used_models = {}

    def make_router(role, primary_model=None, **kwargs):
        r = AsyncMock()
        r._role = role

        async def call_with_fallback(fn, inputs):
            used_models[role] = primary_model
            return f"output for {role}", primary_model or "default"

        r.call_with_fallback = call_with_fallback
        return r

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        MockRouter.side_effect = make_router

        await service.run(
            question="What is an elephant?",
            user_id="user-1",
            session_id="session-1",
            generator_model="custom/gen-model",
        )

    assert used_models.get("generator") == "custom/gen-model"


@pytest.mark.asyncio
async def test_validator_model_override_forwarded(recording_retriever):
    """validator_model override is forwarded to ModelRouter for the validator stage."""
    service = AgenticRAGService(retriever=recording_retriever)
    used_models = {}

    def make_router(role, primary_model=None, **kwargs):
        r = AsyncMock()
        r._role = role

        async def call_with_fallback(fn, inputs):
            used_models[role] = primary_model
            return f"output for {role}", primary_model or "default"

        r.call_with_fallback = call_with_fallback
        return r

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        MockRouter.side_effect = make_router

        await service.run(
            question="What is an elephant?",
            user_id="user-1",
            session_id="session-1",
            validator_model="custom/val-model",
        )

    assert used_models.get("validator") == "custom/val-model"


@pytest.mark.asyncio
async def test_all_three_overrides_forwarded_together(recording_retriever):
    """All three overrides are forwarded simultaneously to their respective stages."""
    service = AgenticRAGService(retriever=recording_retriever)
    used_models = {}

    def make_router(role, primary_model=None, **kwargs):
        r = AsyncMock()
        r._role = role

        async def call_with_fallback(fn, inputs):
            used_models[role] = primary_model
            return f"output for {role}", primary_model or "default"

        r.call_with_fallback = call_with_fallback
        return r

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        MockRouter.side_effect = make_router

        await service.run(
            question="What is an elephant?",
            user_id="user-1",
            session_id="session-1",
            planner_model="p/model",
            generator_model="g/model",
            validator_model="v/model",
        )

    assert used_models.get("planner") == "p/model"
    assert used_models.get("generator") == "g/model"
    assert used_models.get("validator") == "v/model"


@pytest.mark.asyncio
async def test_agent_trace_included_in_result(recording_retriever):
    """The result includes agent_trace with planner/generator/validator events."""
    service = AgenticRAGService(retriever=recording_retriever)

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        mock_instance = AsyncMock()
        mock_instance.call_with_fallback = AsyncMock(
            return_value=("validated", "default")
        )
        MockRouter.return_value = mock_instance

        result = await service.run(
            question="What is an elephant?",
            user_id="user-1",
            session_id="session-1",
        )

    assert "agent_trace" in result
    assert isinstance(result["agent_trace"], list)
    assert len(result["agent_trace"]) > 0


@pytest.mark.asyncio
async def test_response_schema_fields(recording_retriever):
    """RAG pipeline result contains the full RAGChatResponse schema."""
    service = AgenticRAGService(retriever=recording_retriever)

    with patch("services.agentic_rag_service.ModelRouter") as MockRouter:
        mock_instance = AsyncMock()
        mock_instance.call_with_fallback = AsyncMock(
            return_value=("validated", "default")
        )
        MockRouter.return_value = mock_instance

        result = await service.run(
            question="What is an elephant?",
            user_id="user-1",
            session_id="test-session-xyz",
        )

    # Map agent result → RAGChatResponse
    response = RAGChatResponse(
        response=result["response"],
        sources=result.get("sources", []),
        session_id="test-session-xyz",
        agent_trace=result.get("agent_trace", []),
    )

    assert isinstance(response.response, str)
    assert isinstance(response.sources, list)
    assert isinstance(response.session_id, str)
    assert isinstance(response.agent_trace, list)
    assert response.session_id == "test-session-xyz"
