"""Small, safe boundary around Qdrant Cloud Inference for Lexi retrieval."""

import asyncio
import uuid
from typing import Any, Optional, Sequence

from qdrant_client import QdrantClient, models

from settings import settings


class QdrantRAGUnavailable(RuntimeError):
    """Raised when Qdrant retrieval cannot safely be used."""


class QdrantRAGService:
    """Retrieve and maintain Lexi's approved vocabulary context collection."""

    def __init__(self, client: Optional[QdrantClient] = None) -> None:
        self._client = client

    def _get_client(self) -> QdrantClient:
        if self._client is not None:
            return self._client

        api_key = settings.QDRANT_API_KEY
        api_key_value = api_key.get_secret_value() if api_key is not None else ""
        if not settings.QDRANT_URL or not api_key_value.strip():
            raise QdrantRAGUnavailable("Qdrant is not configured")

        self._client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=api_key_value,
            cloud_inference=True,
            timeout=30,
        )
        return self._client

    async def retrieve(self, query: str) -> list[dict[str, Any]]:
        """Return a small, safety-filtered and diversified Qdrant context."""
        if not query.strip():
            return []

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="safety_label",
                    match=models.MatchValue(value="clean"),
                )
            ]
        )
        try:
            response = await asyncio.to_thread(
                self._get_client().query_points,
                collection_name=settings.QDRANT_COLLECTION,
                query=models.Document(
                    text=query,
                    model=settings.QDRANT_EMBEDDING_MODEL,
                ),
                query_filter=query_filter,
                with_payload=True,
                limit=settings.QDRANT_RETRIEVAL_LIMIT,
                score_threshold=settings.QDRANT_SCORE_THRESHOLD,
            )
        except QdrantRAGUnavailable:
            raise
        except Exception as exc:
            raise QdrantRAGUnavailable("Qdrant retrieval failed") from exc

        context: list[dict[str, Any]] = []
        seen_groups: set[str] = set()
        for point in response.points:
            payload = dict(point.payload or {})
            if payload.get("safety_label") != "clean":
                continue

            group = str(payload.get("canonical_group") or payload.get("doc_id") or "")
            if group in seen_groups:
                continue
            seen_groups.add(group)

            payload["score"] = float(point.score)
            context.append(payload)
            if len(context) >= settings.QDRANT_CONTEXT_LIMIT:
                break
        return context

    def ensure_collection(self) -> None:
        """Create the collection once, or reject an incompatible existing one."""
        client = self._get_client()
        try:
            if not client.collection_exists(settings.QDRANT_COLLECTION):
                client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION,
                    vectors_config=models.VectorParams(
                        size=settings.QDRANT_VECTOR_SIZE,
                        distance=models.Distance.COSINE,
                    ),
                )
                return

            collection = client.get_collection(settings.QDRANT_COLLECTION)
            vectors = collection.config.params.vectors
            if isinstance(vectors, dict):
                vectors = next(iter(vectors.values()), None)
            if (
                getattr(vectors, "size", None) != settings.QDRANT_VECTOR_SIZE
                or getattr(vectors, "distance", None) != models.Distance.COSINE
            ):
                raise QdrantRAGUnavailable("Qdrant collection configuration mismatch")
        except QdrantRAGUnavailable:
            raise
        except Exception as exc:
            raise QdrantRAGUnavailable("Qdrant collection setup failed") from exc

    def upsert_documents(self, documents: Sequence[dict[str, Any]]) -> int:
        """Idempotently write inference documents with deterministic point IDs."""
        if not documents:
            return 0

        self.ensure_collection()
        points: list[models.PointStruct] = []
        for document in documents:
            text = document.get("text")
            doc_id = document.get("doc_id")
            if not isinstance(text, str) or not text.strip() or not doc_id:
                raise ValueError("Qdrant documents require non-empty text and doc_id")
            points.append(
                models.PointStruct(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, str(doc_id))),
                    vector=models.Document(
                        text=text,
                        model=settings.QDRANT_EMBEDDING_MODEL,
                    ),
                    payload=dict(document),
                )
            )

        try:
            self._get_client().upsert(
                collection_name=settings.QDRANT_COLLECTION,
                points=points,
                wait=True,
            )
        except Exception as exc:
            raise QdrantRAGUnavailable("Qdrant upsert failed") from exc
        return len(points)

def get_qdrant_rag_service() -> QdrantRAGService:
    """FastAPI dependency factory for the Qdrant retrieval boundary."""
    return QdrantRAGService()
