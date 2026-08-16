"""Contract tests for Lexi's Qdrant-backed Agentic RAG pipeline."""

import inspect
import logging
from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain_core.runnables import RunnableLambda

import services.agentic_rag_service as agentic_rag_service
from services.agentic_rag_service import AgenticRAGService, _cache_key
from services.qdrant_rag_service import QdrantRAGUnavailable


class RecordingRetriever:
    def __init__(self, documents=None, error=None):
        self.documents = documents or []
        self.error = error
        self.queries = []

    async def retrieve(self, query):
        self.queries.append(query)
        if self.error:
            raise self.error
        return self.documents


def test_cache_key_changes_with_retrieval_version_and_is_stable_otherwise():
    base = _cache_key(" What is an elephant? ", "child-1", "qdrant:animals:v1")

    assert base == _cache_key("what is an elephant?", "child-1", "qdrant:animals:v1")
    assert base != _cache_key("what is an elephant?", "child-1", "qdrant:animals:v2")
    assert base != _cache_key("what is an elephant?", "child-1", "qdrant:animals-other:v1")


def test_service_accepts_an_injected_qdrant_retriever():
    retriever = RecordingRetriever()

    service = AgenticRAGService(retriever=retriever)

    assert service._retriever is retriever


@pytest.mark.asyncio
async def test_generator_builds_english_query_and_maps_qdrant_payload_to_context_and_sources():
    retriever = RecordingRetriever(documents=[
        {"text": "Elephants have long trunks.", "animal_en": "elephant", "score": 0.91},
        {"text": "Lions live in prides.", "animal_en": "lion", "score": 0.73},
    ])
    service = AgenticRAGService(retriever=retriever)
    captured_inputs = {}

    async def fake_llm_call(chain, inputs, agent_name):
        captured_inputs.update(inputs)
        return "draft"

    with patch.object(agentic_rag_service, "_call_llm_with_retry", fake_llm_call):
        draft, sources = await service._generator(
            question="Con voi là gì?",
            plan={"topic": " animals ", "keywords": [" elephant ", "jungle", "", 7]},
            llm=RunnableLambda(lambda _: "unused"),
            agent_trace=[],
        )

    assert draft == "draft"
    assert retriever.queries == ["animals elephant jungle 7"]
    assert captured_inputs["context"] == (
        "1. Elephants have long trunks.\n2. Lions live in prides."
    )
    assert sources == [
        {"word": "elephant", "score": 0.91},
        {"word": "lion", "score": 0.73},
    ]


@pytest.mark.asyncio
async def test_generator_uses_original_question_when_planner_has_no_search_terms():
    retriever = RecordingRetriever()
    service = AgenticRAGService(retriever=retriever)

    with patch.object(agentic_rag_service, "_call_llm_with_retry", AsyncMock(return_value="draft")):
        await service._generator(
            question="What does a tiger eat?",
            plan={"topic": " ", "keywords": []},
            llm=RunnableLambda(lambda _: "unused"),
            agent_trace=[],
        )

    assert retriever.queries == ["What does a tiger eat?"]


@pytest.mark.asyncio
async def test_generator_sanitizes_qdrant_unavailability_and_keeps_safe_no_context(caplog):
    retriever = RecordingRetriever(error=QdrantRAGUnavailable("https://secret.example/?key=hidden"))
    service = AgenticRAGService(retriever=retriever)
    captured_inputs = {}

    async def fake_llm_call(chain, inputs, agent_name):
        captured_inputs.update(inputs)
        return "draft"

    with caplog.at_level(logging.WARNING), patch.object(
        agentic_rag_service, "_call_llm_with_retry", fake_llm_call
    ):
        draft, sources = await service._generator(
            question="Tell me about lions",
            plan={"topic": "animals", "keywords": ["lion"]},
            llm=RunnableLambda(lambda _: "unused"),
            agent_trace=[],
        )

    assert draft == "draft"
    assert sources == []
    assert captured_inputs["context"] == "Kh\u00f4ng t\u00ecm th\u1ea5y t\u00e0i li\u1ec7u \u0111\u1ed9ng v\u1eadt Qdrant li\u00ean quan."
    assert "https://secret.example" not in caplog.text
    assert "Qdrant retrieval unavailable; continuing without context" in caplog.text


def test_planner_prompt_demands_english_retrieval_keywords_without_changing_language_options():
    prompt = AgenticRAGService.PLANNER_PROMPT.format_messages(
        question="Con voi la gi?", progress_summary="none"
    )[0].content

    assert "English retrieval search terms" in prompt
    assert "vi/en/bilingual" in prompt


def test_agentic_rag_path_has_no_gemini_embedding_or_mongo_vector_dependencies():
    service_source = inspect.getsource(agentic_rag_service)
    from api import chat

    api_source = inspect.getsource(chat)
    endpoint_parameters = inspect.signature(chat.rag_chat).parameters

    assert "from google import genai" not in service_source
    assert "embed_content" not in service_source
    assert "gemini-embedding" not in service_source
    assert "FlashcardRepository" not in service_source
    assert "vector_search" not in service_source
    assert "FlashcardRepository" not in api_source
    assert "get_flashcard_repository" not in api_source
    assert "flashcard_repo" not in endpoint_parameters


@pytest.mark.asyncio
async def test_run_preserves_response_schema_and_versioned_cache_behavior(monkeypatch):
    service = AgenticRAGService(retriever=RecordingRetriever())
    expected_cache_key = _cache_key("What is a lion?", "child-1", agentic_rag_service.settings.qdrant_retrieval_version)
    cache_get = AsyncMock(return_value=None)
    cache_set = AsyncMock()
    service._get_cache = cache_get
    service._set_cache = cache_set
    service._get_llm = Mock(return_value=object())
    service._planner = AsyncMock(return_value={"topic": "animals", "keywords": ["lion"]})
    service._generator = AsyncMock(return_value=("A lion is an animal.", [{"word": "lion", "score": 0.8}]))
    service._validator = AsyncMock(return_value="A lion is an animal.")

    async def no_delay(_):
        return None

    monkeypatch.setattr(agentic_rag_service.asyncio, "sleep", no_delay)

    result = await service.run("What is a lion?", "child-1", "session-1")

    assert set(result) == {"response", "sources", "cached", "agent_trace"}
    assert result["cached"] is False
    cache_get.assert_awaited_once_with(expected_cache_key)
    cache_set.assert_awaited_once_with(expected_cache_key, result)

    cached_service = AgenticRAGService(retriever=RecordingRetriever())
    cached_service._get_cache = AsyncMock(return_value={"response": "cached", "sources": []})
    cached_result = await cached_service.run("What is a lion?", "child-1", "session-1")

    assert cached_result == {
        "response": "cached",
        "sources": [],
        "cached": True,
        "agent_trace": ["cache:hit"],
    }
