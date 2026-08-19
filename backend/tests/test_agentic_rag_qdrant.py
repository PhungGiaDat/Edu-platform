"""Contract tests for Lexi's Qdrant-backed Agentic RAG pipeline."""

import inspect
import logging
from unittest.mock import AsyncMock, patch

import pytest

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

    # Patch the local reference in agentic_rag_service (from-module import)
    async def fake_call_with_fallback(fn, inputs):
        captured_inputs.update(inputs)
        return "draft", "fake/model"

    with patch.object(
        agentic_rag_service, "ModelRouter"
    ) as MockRouter:
        mock_instance = AsyncMock()
        mock_instance.call_with_fallback = fake_call_with_fallback
        MockRouter.return_value = mock_instance

        draft, sources = await service._generator(
            question="Con voi là gì?",
            plan={"topic": " animals ", "keywords": [" elephant ", "jungle", "", 7]},
            model_override=None,
            agent_trace=[],
        )

    assert draft == "draft"
    assert retriever.queries == ["animals elephant jungle 7"]
    assert captured_inputs.get("context") == (
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

    async def fake_call_with_fallback(fn, inputs):
        return "draft", "fake/model"

    with patch.object(agentic_rag_service, "ModelRouter") as MockRouter:
        mock_instance = AsyncMock()
        mock_instance.call_with_fallback = fake_call_with_fallback
        MockRouter.return_value = mock_instance

        await service._generator(
            question="What does a tiger eat?",
            plan={"topic": " ", "keywords": []},
            model_override=None,
            agent_trace=[],
        )

    assert retriever.queries == ["What does a tiger eat?"]


@pytest.mark.asyncio
async def test_generator_sanitizes_qdrant_unavailability_and_keeps_safe_no_context(caplog):
    retriever = RecordingRetriever(error=QdrantRAGUnavailable("https://secret.example/?key=hidden"))
    service = AgenticRAGService(retriever=retriever)
    captured_inputs = {}

    async def fake_call_with_fallback(fn, inputs):
        captured_inputs.update(inputs)
        return "draft", "fake/model"

    with caplog.at_level(logging.WARNING), patch.object(
        agentic_rag_service, "ModelRouter"
    ) as MockRouter:
        mock_instance = AsyncMock()
        mock_instance.call_with_fallback = fake_call_with_fallback
        MockRouter.return_value = mock_instance

        draft, sources = await service._generator(
            question="Tell me about lions",
            plan={"topic": "animals", "keywords": ["lion"]},
            model_override=None,
            agent_trace=[],
        )

    assert draft == "draft"
    assert sources == []
    assert captured_inputs.get("context") == "Không tìm thấy tài liệu động vật Qdrant liên quan."
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

    assert "from google import genai" not in service_source
    assert "embed_content" not in service_source
    assert "gemini-embedding" not in service_source
    assert "FlashcardRepository" not in service_source
    assert "vector_search" not in service_source
    assert "FlashcardRepository" not in api_source
