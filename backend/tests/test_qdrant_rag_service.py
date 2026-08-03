"""Behavioral tests for Lexi's Qdrant retrieval boundary."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from pydantic import SecretStr
from qdrant_client import models

import services.qdrant_rag_service as qdrant_rag_service
from services.qdrant_rag_service import QdrantRAGService, QdrantRAGUnavailable
from settings import settings


class FakeQdrantClient:
    def __init__(self, points=None, error=None):
        self.points = points or []
        self.error = error
        self.calls = []

    def query_points(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return SimpleNamespace(points=self.points)


class FakeCollectionClient(FakeQdrantClient):
    def __init__(self, exists=False, vector_size=384, distance=models.Distance.COSINE):
        super().__init__()
        self.exists = exists
        self.vector_size = vector_size
        self.distance = distance
        self.created = []
        self.upserts = []

    def collection_exists(self, collection_name):
        return self.exists

    def create_collection(self, **kwargs):
        self.created.append(kwargs)
        self.exists = True

    def get_collection(self, collection_name):
        return SimpleNamespace(
            config=SimpleNamespace(
                params=SimpleNamespace(
                    vectors=SimpleNamespace(size=self.vector_size, distance=self.distance)
                )
            )
        )

    def upsert(self, **kwargs):
        self.upserts.append(kwargs)


def point(score, **payload):
    return SimpleNamespace(score=score, payload=payload)


@pytest.fixture
def configured_settings(monkeypatch):
    monkeypatch.setattr(settings, "QDRANT_URL", "https://qdrant.example")
    monkeypatch.setattr(settings, "QDRANT_COLLECTION", "kids_english_animals_minilm_v1")
    monkeypatch.setattr(settings, "QDRANT_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    monkeypatch.setattr(settings, "QDRANT_RETRIEVAL_LIMIT", 8)
    monkeypatch.setattr(settings, "QDRANT_CONTEXT_LIMIT", 3)
    monkeypatch.setattr(settings, "QDRANT_SCORE_THRESHOLD", 0.35)


@pytest.mark.asyncio
async def test_retrieve_uses_cloud_document_query_and_returns_clean_diverse_context(configured_settings):
    client = FakeQdrantClient(points=[
        point(0.99, text="Elephants have trunks.", animal_en="elephant", canonical_group="elephant", safety_label="clean", doc_id="elephant-1", topic="animals"),
        point(0.95, text="Another elephant fact.", animal_en="elephant", canonical_group="elephant", safety_label="clean", doc_id="elephant-2", topic="animals"),
        point(0.90, text="Lions live in prides.", animal_en="lion", canonical_group="lion", safety_label="clean", doc_id="lion-1", topic="animals"),
        point(0.80, text="Unsafe payload.", animal_en="wolf", canonical_group="wolf", safety_label="review", doc_id="wolf-1", topic="animals"),
        point(0.70, text="Giraffes are tall.", animal_en="giraffe", canonical_group="giraffe", safety_label="clean", doc_id="giraffe-1", topic="animals"),
        point(0.60, text="Zebras have stripes.", animal_en="zebra", canonical_group="zebra", safety_label="clean", doc_id="zebra-1", topic="animals"),
    ])

    results = await QdrantRAGService(client=client).retrieve("tell me about animals")

    assert [item["canonical_group"] for item in results] == ["elephant", "lion", "giraffe"]
    assert [item["score"] for item in results] == [0.99, 0.90, 0.70]
    assert all(isinstance(item["score"], float) for item in results)
    call = client.calls[0]
    assert call["collection_name"] == settings.QDRANT_COLLECTION
    assert type(call["query"]).__name__ == "Document"
    assert call["query"].text == "tell me about animals"
    assert call["query"].model == settings.QDRANT_EMBEDDING_MODEL
    assert call["with_payload"] is True
    assert call["limit"] == settings.QDRANT_RETRIEVAL_LIMIT
    assert call["score_threshold"] == settings.QDRANT_SCORE_THRESHOLD
    assert call["query_filter"].must[0].key == "safety_label"
    assert call["query_filter"].must[0].match.value == "clean"


@pytest.mark.asyncio
async def test_retrieve_returns_empty_for_blank_query_without_calling_qdrant(configured_settings):
    client = FakeQdrantClient()

    assert await QdrantRAGService(client=client).retrieve("  ") == []
    assert client.calls == []


@pytest.mark.asyncio
async def test_retrieve_rejects_missing_configuration_without_client():
    service = QdrantRAGService()

    with pytest.raises(QdrantRAGUnavailable, match="^Qdrant is not configured$"):
        await service.retrieve("animals")


@pytest.mark.asyncio
@pytest.mark.parametrize("empty_api_key", ["", "   "])
async def test_retrieve_rejects_empty_qdrant_api_key_without_constructing_client(
    monkeypatch, configured_settings, empty_api_key
):
    constructor = Mock()
    monkeypatch.setattr(settings, "QDRANT_API_KEY", SecretStr(empty_api_key))
    monkeypatch.setattr(qdrant_rag_service, "QdrantClient", constructor)

    with pytest.raises(QdrantRAGUnavailable, match="^Qdrant is not configured$"):
        await QdrantRAGService().retrieve("animals")

    constructor.assert_not_called()


@pytest.mark.asyncio
async def test_retrieve_wraps_client_failure_without_leaking_details(configured_settings):
    service = QdrantRAGService(client=FakeQdrantClient(error=RuntimeError("connection failed")))

    with pytest.raises(QdrantRAGUnavailable, match="^Qdrant retrieval failed$"):
        await service.retrieve("animals")


def test_settings_expose_stable_qdrant_retrieval_version():
    assert settings.qdrant_retrieval_version == (
        "qdrant:kids_english_animals_minilm_v1:sentence-transformers/all-MiniLM-L6-v2"
    )


def test_ensure_collection_creates_expected_cosine_vector_collection(configured_settings):
    client = FakeCollectionClient()

    QdrantRAGService(client=client).ensure_collection()

    assert len(client.created) == 1
    vector_config = client.created[0]["vectors_config"]
    assert vector_config.size == 384
    assert vector_config.distance == models.Distance.COSINE


def test_ensure_collection_never_recreates_incompatible_existing_collection(configured_settings):
    client = FakeCollectionClient(exists=True, vector_size=1536)

    with pytest.raises(QdrantRAGUnavailable, match="^Qdrant collection configuration mismatch$"):
        QdrantRAGService(client=client).ensure_collection()

    assert client.created == []


def test_upsert_documents_uses_repeatable_document_points(configured_settings):
    client = FakeCollectionClient()
    documents = [{
        "text": "Elephants have trunks.",
        "animal_en": "elephant",
        "canonical_group": "elephant",
        "safety_label": "clean",
        "doc_id": "elephant-1",
        "topic": "animals",
    }]
    service = QdrantRAGService(client=client)

    assert service.upsert_documents(documents) == 1
    assert service.upsert_documents(documents) == 1

    first_point = client.upserts[0]["points"][0]
    second_point = client.upserts[1]["points"][0]
    assert first_point.id == second_point.id
    assert type(first_point.vector).__name__ == "Document"
    assert first_point.vector.model == settings.QDRANT_EMBEDDING_MODEL
