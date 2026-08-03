"""Small, safe boundary around Qdrant Cloud Inference for Lexi retrieval."""

import asyncio
from typing import Any, Optional, Sequence

from qdrant_client import QdrantClient, models

from settings import settings
from services.animal_rag_dataset import AnimalRAGDocument, build_qdrant_payload


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
        try:
            client = self._get_client()
            if not client.collection_exists(settings.QDRANT_COLLECTION):
                client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION,
                    vectors_config=models.VectorParams(
                        size=settings.QDRANT_VECTOR_SIZE,
                        distance=models.Distance.COSINE,
                    ),
                )
            else:
                collection = client.get_collection(settings.QDRANT_COLLECTION)
                vectors = collection.config.params.vectors
                if isinstance(vectors, dict):
                    if not {"size", "distance"}.issubset(vectors):
                        raise QdrantRAGUnavailable("Qdrant collection configuration mismatch")
                    size = vectors["size"]
                    distance = vectors["distance"]
                else:
                    size = getattr(vectors, "size", None)
                    distance = getattr(vectors, "distance", None)
                normalized_distance = getattr(distance, "value", distance)
                if (
                    size != settings.QDRANT_VECTOR_SIZE
                    or str(normalized_distance).casefold() != models.Distance.COSINE.value.casefold()
                ):
                    raise QdrantRAGUnavailable("Qdrant collection configuration mismatch")

            client.create_payload_index(
                collection_name=settings.QDRANT_COLLECTION,
                field_name="safety_label",
                field_schema=models.PayloadSchemaType.KEYWORD,
                wait=True,
            )
        except QdrantRAGUnavailable:
            raise
        except Exception as exc:
            raise QdrantRAGUnavailable("Qdrant collection setup failed") from exc

    def upsert_documents(self, documents: Sequence[AnimalRAGDocument]) -> int:
        """Idempotently write inference documents with deterministic point IDs."""
        if not documents:
            return 0

        completed_documents = 0
        try:
            points = [
                models.PointStruct(
                    id=document.point_id,
                    vector=models.Document(
                        text=document.text,
                        model=settings.QDRANT_EMBEDDING_MODEL,
                    ),
                    payload=build_qdrant_payload(
                        document,
                        embedding_model=settings.QDRANT_EMBEDDING_MODEL,
                    ),
                )
                for document in documents
            ]
            client = self._get_client()
            for start in range(0, len(points), 32):
                batch = points[start:start + 32]
                client.upsert(
                    collection_name=settings.QDRANT_COLLECTION,
                    points=batch,
                    wait=True,
                )
                completed_documents += len(batch)
        except QdrantRAGUnavailable:
            raise
        except Exception as exc:
            raise QdrantRAGUnavailable(
                f"Qdrant upsert failed after {completed_documents} of {len(documents)} documents"
            ) from exc
        return len(points)

    def verify_document_ids(self, point_ids: Sequence[str]) -> None:
        """Confirm that every deterministic point ID can be retrieved."""
        if not point_ids:
            return

        normalized_ids = [str(point_id) for point_id in point_ids]
        found_ids: set[str] = set()
        try:
            client = self._get_client()
            for start in range(0, len(normalized_ids), 32):
                response = client.retrieve(
                    collection_name=settings.QDRANT_COLLECTION,
                    ids=normalized_ids[start:start + 32],
                    with_payload=False,
                    with_vectors=False,
                )
                records = getattr(response, "points", response)
                for record in records:
                    point_id = record.get("id") if isinstance(record, dict) else getattr(record, "id", None)
                    if point_id is not None:
                        found_ids.add(str(point_id))
        except Exception as exc:
            raise QdrantRAGUnavailable("Qdrant verification failed") from exc

        missing_count = sum(point_id not in found_ids for point_id in normalized_ids)
        if missing_count:
            raise QdrantRAGUnavailable(
                f"Qdrant verification failed: {missing_count} document IDs are missing"
            )

def get_qdrant_rag_service() -> QdrantRAGService:
    """FastAPI dependency factory for the Qdrant retrieval boundary."""
    return QdrantRAGService()
