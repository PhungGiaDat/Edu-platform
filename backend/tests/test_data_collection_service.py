import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_store_recording_returns_id():
    """Test that store_recording returns a valid recording ID."""
    fake_coll = MagicMock()
    fake_coll.insert_one = AsyncMock()

    with patch(
        "backend.services.data_collection_service.DataCollectionService._coll",
        return_value=fake_coll,
    ):
        from backend.services.data_collection_service import DataCollectionService

        recording_id = await DataCollectionService.store_recording(
            audio_data=b"fake_audio_data",
            user_id="user123",
            word_id="cat",
            topic_id="animals",
        )
        assert recording_id is not None
        assert isinstance(recording_id, str)
        assert len(recording_id) == 36  # UUID format


@pytest.mark.asyncio
async def test_get_consented_recordings():
    """Test retrieving consented recordings."""
    fake_docs = [
        {
            "recording_id": "id1",
            "user_id": "u1",
            "topic_id": "animals",
            "word_id": "cat",
            "is_consent_granted": True,
            "quality_rating": 4,
            "created_at": "2026-09-05T00:00:00",
        },
        {
            "recording_id": "id2",
            "user_id": "u2",
            "topic_id": "animals",
            "word_id": "dog",
            "is_consent_granted": False,
            "quality_rating": None,
            "created_at": "2026-09-05T00:00:00",
        },
    ]

    # Mock cursor that iterates over fake docs
    class FakeCursor:
        def __init__(self, docs, query=None):
            # Apply the query filter manually
            self.docs = docs
            self._query = query or {}
            self.index = 0

        def __aiter__(self):
            return self

        async def __anext__(self):
            # Filter by query
            filtered = [d for d in self.docs if all(
                d.get(k) == v for k, v in self._query.items()
            )]
            if self.index >= len(filtered):
                raise StopAsyncIteration
            doc = filtered[self.index]
            self.index += 1
            return doc

        def limit(self, n):
            return self

    fake_coll = MagicMock()
    fake_coll.find = MagicMock(return_value=FakeCursor(fake_docs, {"is_consent_granted": True}))

    with patch(
        "backend.services.data_collection_service.DataCollectionService._coll",
        return_value=fake_coll,
    ):
        from backend.services.data_collection_service import DataCollectionService

        consented = await DataCollectionService.get_consented_recordings()
        assert len(consented) == 1
        assert consented[0].user_id == "u1"
        assert consented[0].is_consent_granted is True
