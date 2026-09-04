from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import uuid


@dataclass
class RecordingDocument:
    recording_id: str
    user_id: str
    word_id: str
    topic_id: str
    audio_url: Optional[str] = None
    transcription: Optional[str] = None
    is_consent_granted: bool = False
    quality_rating: Optional[int] = None
    created_at: str = ""


class DataCollectionService:
    """Service for collecting pronunciation recordings for model fine-tuning."""

    # TODO: Integrate with MongoDB collection "pronunciation_recordings"
    _recordings_store: list[RecordingDocument] = []

    @classmethod
    def store_recording(
        cls,
        audio_data: bytes,
        user_id: str,
        word_id: str,
        topic_id: str,
        transcription: Optional[str] = None,
        is_consent_granted: bool = False,
    ) -> str:
        """Store audio recording with metadata for future fine-tuning."""
        recording_id = str(uuid.uuid4())

        recording = RecordingDocument(
            recording_id=recording_id,
            user_id=user_id,
            word_id=word_id,
            topic_id=topic_id,
            transcription=transcription,
            is_consent_granted=is_consent_granted,
            created_at=datetime.utcnow().isoformat(),
        )

        cls._recordings_store.append(recording)
        return recording_id

    @classmethod
    def get_consented_recordings(cls) -> list[RecordingDocument]:
        """Get recordings with parent consent for fine-tuning."""
        return [r for r in cls._recordings_store if r.is_consent_granted]
