"""Pre-demo latency hotfix: Gemma 4 31B via OpenRouter, bounded LLM calls, no inter-agent sleep."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import services.agentic_rag_service as agentic_rag_service
from services.agentic_rag_service import AgenticRAGService
from services.llm_clients import parse_provider_model
from settings import Settings, settings

GEMMA = "openrouter/google/gemma-4-31b-it:free"
ANSWER = (
    "Voi ăn cỏ và trái cây nhé 🐘 Voi dùng vòi dài để nhặt thức ăn. "
    "Elephants eat grass. = Voi ăn cỏ. (grass: cỏ). Con có biết voi uống nước thế nào không?"
)


def test_planner_and_generator_default_to_gemma_31b_via_openrouter():
    assert Settings.model_fields["MODEL_PLANNER"].default == GEMMA
    assert Settings.model_fields["MODEL_GENERATOR"].default == GEMMA
    assert parse_provider_model(GEMMA) == ("openrouter", "google/gemma-4-31b-it:free")


@pytest.mark.asyncio
async def test_animal_question_runs_planner_qdrant_generator_bounded_and_without_sleep():
    class Retriever:
        queries = []

        async def retrieve(self, query):
            self.queries.append(query)
            return [{"text": "Elephants eat grass.", "animal_en": "elephant", "score": 0.9}]

    retriever = Retriever()
    service = AgenticRAGService(retriever=retriever)
    service._get_cache = AsyncMock(return_value=None)
    service._set_cache = AsyncMock()
    service._get_progress_summary = AsyncMock(return_value="")
    service._get_recent_history_texts = AsyncMock(return_value=[])
    outputs = {
        "planner": '{"topic":"animals","keywords":["elephant","food"],"difficulty":"easy","language":"vi"}',
        "generator": ANSWER,
    }
    calls = []

    def router_factory(role, primary_model=None, **kwargs):
        calls.append({"role": role, "primary_model": primary_model, **kwargs})
        router = MagicMock()
        router.call_with_fallback = AsyncMock(return_value=(outputs[role], GEMMA))
        return router

    with patch.object(agentic_rag_service, "ModelRouter", side_effect=router_factory), \
         patch("asyncio.sleep", new=AsyncMock()) as sleep:
        result = await service.run(question="Con voi ăn gì?", user_id="u1", session_id="s1")

    assert [c["role"] for c in calls] == ["planner", "generator"]
    assert all(c["primary_model"] is None for c in calls)  # model comes from settings, not code
    assert all(c["max_attempts"] == settings.AGENTIC_LLM_MAX_ATTEMPTS == 1 for c in calls)
    assert all(c["timeout"] == settings.AGENTIC_LLM_TIMEOUT_SECONDS == 5.0 for c in calls)
    assert retriever.queries == ["animals elephant food"]
    assert result["response"] == ANSWER
    assert any(t.startswith("generator:done model=" + GEMMA) for t in result["agent_trace"])
    sleep.assert_not_awaited()
