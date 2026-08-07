"""Task 7: admin must validate the AR object before inserting a flashcard.

Two contract obligations are tested:

1. ``AdminRepository.create_flashcard`` refuses to write anything when the
   referenced ``ar_tag`` does not already exist as a valid AR object.
2. When the AR object exists and passes :func:`serialize_ar_object`, the
   flashcard is inserted and the ``ar_objects_collection`` is never written
   to. Auto-creation from a bare ``ar_tag`` is forbidden.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError

from models.ar_object_contract import ARObjectConfigurationError  # noqa: F401 (re-export)
from repositories.admin_repository import AdminRepository


def _valid_catalog_document() -> dict:
    return {
        "_id": "68ac0dbc7ddebe79bec86620",
        "ar_tag": "elephant_marker_01",
        "tracking_mode": "catalog",
        "description": "Elephant AR target",
        "animation_type": "rotate",
        "glb_size": 1.5,
        "model_3d_url": "https://assets.example.com/elephant.glb",
        "texture_url": None,
        "image_2d_url": "https://assets.example.com/elephant.png",
        "position": "0 0 0",
        "rotation": "0 0 0",
        "scale": "1 1 1",
        "mind_catalog_id": "animals-v2",
        "mind_target_index": 0,
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    }


def _invalid_ar_object() -> dict:
    # Missing tracking_mode and the (mind_catalog_id, mind_target_index) pair,
    # so ARObjectContract.model_validate will raise ValidationError.
    return {
        "_id": "68ac0dbc7ddebe79bec86699",
        "ar_tag": "missing_marker",
        "description": "Broken",
        "animation_type": "rotate",
        "glb_size": 1.0,
        "nft_base_url": "https://assets.example.com/missing.mind",
        "model_3d_url": "https://assets.example.com/missing.glb",
        "position": "0 0 0",
        "rotation": "0 0 0",
        "scale": "1 1 1",
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    }


@pytest.fixture
def admin_repo():
    """Build an AdminRepository whose every collection is a mock.

    The constructor reaches into ``mongo_connector.get_collection``, which
    requires a real Mongo client. We patch the connector to return mocks
    during construction, then attach AsyncMocks for the collections we
    exercise in the assertions below.
    """
    ar_objects_collection = MagicMock()
    ar_objects_collection.find_one = AsyncMock()
    ar_objects_collection.insert_one = AsyncMock()

    flashcards_collection = MagicMock()
    flashcards_collection.insert_one = AsyncMock()

    decks_collection = MagicMock()
    decks_collection.update_one = AsyncMock()

    def _fake_get_collection(name: str):
        return {
            "ar_objects": ar_objects_collection,
            "flashcards": flashcards_collection,
            "flashcard_decks": decks_collection,
        }.get(name, MagicMock())

    with patch("repositories.admin_repository.mongo_connector.get_collection", _fake_get_collection):
        repo = AdminRepository(teacher_id="teacher-1")

    # Re-attach the mocks explicitly in case the constructor used different
    # instances; this guarantees attribute access in assertions below.
    repo.ar_objects_collection = ar_objects_collection
    repo.flashcards_collection = flashcards_collection
    repo.flashcard_decks_collection = decks_collection
    return repo


def test_ar_object_configuration_error_is_a_value_error():
    """The exception must be caught by FastAPI handlers that look for ValueError."""
    assert issubclass(ARObjectConfigurationError, ValueError)
    with pytest.raises(ARObjectConfigurationError, match="AR_OBJECT_NOT_CONFIGURED"):
        raise ARObjectConfigurationError("AR_OBJECT_NOT_CONFIGURED")


@pytest.mark.asyncio
async def test_flashcard_creation_rejects_missing_ar_object_before_insert(admin_repo):
    admin_repo.ar_objects_collection.find_one.return_value = None
    with pytest.raises(ARObjectConfigurationError, match="AR_OBJECT_NOT_CONFIGURED"):
        await admin_repo.create_flashcard({
            "qr_id": "new-card",
            "word": "New",
            "translation": {"vi": "Mới"},
            "ar_tag": "new_marker",
        })
    admin_repo.flashcards_collection.insert_one.assert_not_awaited()
    admin_repo.ar_objects_collection.insert_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_flashcard_creation_rejects_invalid_ar_object_before_insert(admin_repo):
    admin_repo.ar_objects_collection.find_one.return_value = _invalid_ar_object()
    with pytest.raises(ARObjectConfigurationError, match="AR_OBJECT_SCHEMA_INVALID"):
        await admin_repo.create_flashcard({
            "qr_id": "bad-card",
            "word": "Bad",
            "translation": {"vi": "Xấu"},
            "ar_tag": "missing_marker",
        })
    admin_repo.flashcards_collection.insert_one.assert_not_awaited()
    admin_repo.ar_objects_collection.insert_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_flashcard_creation_accepts_existing_valid_ar_object(admin_repo):
    admin_repo.ar_objects_collection.find_one.return_value = _valid_catalog_document()
    await admin_repo.create_flashcard({
        "qr_id": "ele123",
        "word": "Elephant",
        "translation": {"vi": "Voi"},
        "ar_tag": "elephant_marker_01",
    })
    admin_repo.flashcards_collection.insert_one.assert_awaited_once()
    admin_repo.ar_objects_collection.insert_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_flashcard_creation_without_ar_tag_is_unchanged(admin_repo):
    """Cards with no ``ar_tag`` and no ``qr_id`` are plain flashcards — no AR
    validation, no AR writes.
    """
    admin_repo.ar_objects_collection.find_one.return_value = None
    await admin_repo.create_flashcard({
        "qr_id": None,
        "word": "Plain",
        "translation": {"vi": "Phẳng"},
        "ar_tag": None,
    })
    admin_repo.flashcards_collection.insert_one.assert_awaited_once()
    admin_repo.ar_objects_collection.find_one.assert_not_awaited()
    admin_repo.ar_objects_collection.insert_one.assert_not_awaited()


def test_ar_object_contract_rejects_unknown_ar_tag_payload():
    """Sanity check: ARObjectContract validation rejects the broken payload."""
    from models.ar_object_contract import ARObjectContract

    with pytest.raises(ValidationError):
        ARObjectContract.model_validate(_invalid_ar_object())