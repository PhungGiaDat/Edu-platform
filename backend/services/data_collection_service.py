# backend/services/data_collection_service.py
"""
Data Collection Service for wav2vec2 Fine-tuning

Collects pronunciation recordings from in-app practice and guided sessions.
Only recordings with parent consent are used for model training.
"""
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
from database.connection import get_database


@dataclass
class RecordingDocument:
    recording_id: str
    user_id: str
    topic_id: str
    word_id: str
    audio_url: Optional[str] = None
    transcription: Optional[str] = None
    is_consent_granted: bool = False
    quality_rating: Optional[int] = None
    created_at: str = ""


class DataCollectionService:
    """Service for collecting pronunciation recordings for model fine-tuning."""

    COLLECTION_NAME = "pronunciation_recordings"

    @classmethod
    def _coll(cls):
        return get_database()[cls.COLLECTION_NAME]

    @classmethod
    async def store_recording(
        cls,
        audio_data: bytes,
        user_id: str,
        word_id: str,
        topic_id: str,
        transcription: Optional[str] = None,
        is_consent_granted: bool = False,
        audio_url: Optional[str] = None,
    ) -> str:
        """
        Store audio recording with metadata for future fine-tuning.

        Args:
            audio_data: Raw audio bytes
            user_id: User ID
            word_id: Word that was pronounced
            topic_id: Topic/course ID
            transcription: Optional STT transcription
            is_consent_granted: Parent consent flag
            audio_url: Optional URL if audio uploaded to storage

        Returns:
            recording_id: UUID string
        """
        import uuid

        recording_id = str(uuid.uuid4())

        doc = {
            "recording_id": recording_id,
            "user_id": user_id,
            "topic_id": topic_id,
            "word_id": word_id,
            "audio_url": audio_url,
            "transcription": transcription,
            "is_consent_granted": is_consent_granted,
            "quality_rating": None,
            "created_at": datetime.utcnow(),
        }

        coll = cls._coll()
        await coll.insert_one(doc)

        # Ensure indexes
        try:
            await coll.create_index("user_id")
            await coll.create_index([("user_id", 1), ("is_consent_granted", 1)])
            await coll.create_index([("topic_id", 1), ("word_id", 1)])
            await coll.create_index([("quality_rating", 1), ("is_consent_granted", 1)])
        except Exception:
            pass

        return recording_id

    @classmethod
    async def get_consented_recordings(
        cls,
        topic_id: Optional[str] = None,
        min_quality: int = 3,
        limit: int = 1000,
    ) -> List[RecordingDocument]:
        """
        Get recordings with parent consent for fine-tuning.

        Args:
            topic_id: Optional filter by topic
            min_quality: Minimum quality rating (1-5), None to skip filter
            limit: Maximum number of recordings to return

        Returns:
            List of RecordingDocument with consent=True
        """
        query: dict = {"is_consent_granted": True}
        if topic_id:
            query["topic_id"] = topic_id
        if min_quality is not None:
            query["quality_rating"] = {"$gte": min_quality}

        results: List[RecordingDocument] = []
        coll = cls._coll()
        async for doc in coll.find(query).limit(limit):
            results.append(
                RecordingDocument(
                    recording_id=doc.get("recording_id", ""),
                    user_id=doc.get("user_id", ""),
                    topic_id=doc.get("topic_id", ""),
                    word_id=doc.get("word_id", ""),
                    audio_url=doc.get("audio_url"),
                    transcription=doc.get("transcription"),
                    is_consent_granted=doc.get("is_consent_granted", False),
                    quality_rating=doc.get("quality_rating"),
                    created_at=doc.get("created_at", ""),
                )
            )
        return results

    @classmethod
    async def update_quality_rating(cls, recording_id: str, rating: int) -> bool:
        """Update quality rating for a recording (admin/teacher use)."""
        coll = cls._coll()
        result = await coll.update_one(
            {"recording_id": recording_id},
            {"$set": {"quality_rating": rating, "updated_at": datetime.utcnow()}},
        )
        return result.modified_count > 0

    @classmethod
    async def grant_consent(cls, recording_ids: List[str]) -> int:
        """Grant consent for recordings (parent action)."""
        coll = cls._coll()
        result = await coll.update_many(
            {"recording_id": {"$in": recording_ids}},
            {"$set": {"is_consent_granted": True}},
        )
        return result.modified_count
