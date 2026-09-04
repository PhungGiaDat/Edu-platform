import pytest
from backend.services.data_collection_service import DataCollectionService


def test_store_recording_returns_id():
    audio_data = b"fake_audio_data"
    recording_id = DataCollectionService.store_recording(
        audio_data=audio_data,
        user_id="user123",
        word_id="cat",
        topic_id="animals",
    )
    assert recording_id is not None
    assert isinstance(recording_id, str)


def test_get_consented_recordings():
    DataCollectionService._recordings_store.clear()
    DataCollectionService.store_recording(
        audio_data=b"data1",
        user_id="u1",
        word_id="cat",
        topic_id="animals",
        is_consent_granted=True,
    )
    DataCollectionService.store_recording(
        audio_data=b"data2",
        user_id="u2",
        word_id="dog",
        topic_id="animals",
        is_consent_granted=False,
    )
    consented = DataCollectionService.get_consented_recordings()
    assert len(consented) == 1
    assert consented[0].user_id == "u1"
