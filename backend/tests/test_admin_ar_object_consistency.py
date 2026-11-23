"""Task 7: admin must validate the AR object before inserting a flashcard.

Two contract obligations are tested:

1. ``AdminRepository.create_flashcard`` refuses to write anything when the
   referenced ``ar_tag`` does not already exist as a valid AR object.
2. When the AR object exists and passes :func:`serialize_ar_object`, the
   flashcard is inserted and the ``ar_objects`` table is never written to.
   Auto-creation from a bare ``ar_tag`` is forbidden.

De-Mongo Wave 5: the repository is Postgres-only, so ``postgres_pool()`` is
mocked instead of ``mongo_connector``.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock

import pytest
from pydantic import ValidationError

from models.ar_object_contract import ARObjectConfigurationError  # noqa: F401 (re-export)
from repositories.admin_repository import AdminRepository


def _valid_catalog_document() -> dict:
    return {
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
    # No tracking_mode → required-field ValidationError when validated raw.
    # Also carries both nft_base_url and mind_catalog_id, so the synthesized
    # "legacy" tracking_mode (no mind_target_index) fails the identity
    # validator → ARObjectConfigurationError in the repository.
    return {
        "ar_tag": "missing_marker",
        "description": "Broken",
        "animation_type": "rotate",
        "glb_size": 1.0,
        "nft_base_url": "https://assets.example.com/missing.mind",
        "model_3d_url": "https://assets.example.com/missing.glb",
        "position": "0 0 0",
        "rotation": "0 0 0",
        "scale": "1 1 1",
        "mind_catalog_id": "broken-catalog",
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
    }


@pytest.fixture
def fake_pool():
    """Return a mock pool with async methods."""
    pool = Mock()
    pool.fetchrow = AsyncMock()
    pool.execute = AsyncMock()
    pool.fetch = AsyncMock(return_value=[])
    pool.fetchval = AsyncMock(return_value=0)
    return pool


@pytest.fixture
def admin_repo(monkeypatch, fake_pool):
    """Build an AdminRepository whose postgres_pool() returns a mock pool.

    Uses ``monkeypatch`` so the patch stays active for the test duration.
    """
    monkeypatch.setattr(
        "repositories.admin_repository.postgres_pool",
        Mock(return_value=fake_pool),
    )
    repo = AdminRepository(teacher_id="teacher-1")
    repo._pool = fake_pool
    return repo


@pytest.fixture
def script_ar_object(fake_pool):
    """Helper to script the ar_objects lookup + flashcard insert rows."""

    def _set(ar_object_row, qr_id="new-card"):
        calls = []
        if ar_object_row is None:
            calls.append(None)  # ar_objects lookup → not configured
        else:
            calls.append(ar_object_row)  # ar_objects lookup → existing row
        calls.append({"qr_id": qr_id})  # flashcards INSERT returning qr_id
        fake_pool.fetchrow.side_effect = calls

    return _set


def test_ar_object_configuration_error_is_a_value_error():
    """The exception must be caught by FastAPI handlers that look for ValueError."""
    assert issubclass(ARObjectConfigurationError, ValueError)
    with pytest.raises(ARObjectConfigurationError, match="AR_OBJECT_NOT_CONFIGURED"):
        raise ARObjectConfigurationError("AR_OBJECT_NOT_CONFIGURED")


@pytest.mark.asyncio
async def test_flashcard_creation_rejects_missing_ar_object_before_insert(admin_repo, script_ar_object):
    script_ar_object(None)
    with pytest.raises(ARObjectConfigurationError, match="AR_OBJECT_NOT_CONFIGURED"):
        await admin_repo.create_flashcard({
            "qr_id": "new-card",
            "word": "New",
            "translation": {"vi": "Mới"},
            "ar_tag": "new_marker",
        })
    # The AR lookup ran (returning None → raise) and the INSERT never happened.
    assert admin_repo._pool.fetchrow.await_count == 1


@pytest.mark.asyncio
async def test_flashcard_creation_rejects_invalid_ar_object_before_insert(admin_repo, script_ar_object):
    script_ar_object(_invalid_ar_object())
    with pytest.raises(ARObjectConfigurationError, match="AR_OBJECT_SCHEMA_INVALID"):
        await admin_repo.create_flashcard({
            "qr_id": "bad-card",
            "word": "Bad",
            "translation": {"vi": "Xấu"},
            "ar_tag": "missing_marker",
        })
    # The invalid lookup is consumed; no INSERT was reached.
    assert admin_repo._pool.fetchrow.await_count == 1


@pytest.mark.asyncio
async def test_flashcard_creation_accepts_existing_valid_ar_object(admin_repo, script_ar_object):
    script_ar_object(_valid_catalog_document(), qr_id="ele123")
    result = await admin_repo.create_flashcard({
        "qr_id": "ele123",
        "word": "Elephant",
        "translation": {"vi": "Voi"},
        "ar_tag": "elephant_marker_01",
    })
    assert result["_id"] == "ele123"
    # Two fetchrow calls: AR lookup + flashcard INSERT.
    assert admin_repo._pool.fetchrow.await_count == 2
    # Never writes to the ar_objects table.
    insert_sqls = [c.args[0] for c in admin_repo._pool.fetchrow.await_args_list]
    assert all("INSERT INTO public.ar_objects" not in s for s in insert_sqls)


@pytest.mark.asyncio
async def test_flashcard_creation_without_ar_tag_is_unchanged(admin_repo, script_ar_object):
    """Cards with no ``ar_tag`` and no ``qr_id`` are plain flashcards — no AR
    validation, no AR writes.
    """
    fake_pool = admin_repo._pool
    # Only one call: the INSERT (no AR lookup since qr_id is None → no ar_tag auto-gen).
    fake_pool.fetchrow.side_effect = [{"qr_id": "plain-card"}]
    result = await admin_repo.create_flashcard({
        "qr_id": None,
        "word": "Plain",
        "translation": {"vi": "Phẳng"},
    })
    assert result["_id"] == "plain-card"
    # Only the INSERT ran — no AR lookup.
    assert fake_pool.fetchrow.await_count == 1
    sql = fake_pool.fetchrow.await_args_list[0].args[0]
    assert "INSERT INTO public.flashcards" in sql


def test_ar_object_contract_rejects_unknown_ar_tag_payload():
    """Sanity check: ARObjectContract validation rejects the broken payload."""
    from models.ar_object_contract import ARObjectContract

    with pytest.raises(ValidationError):
        ARObjectContract.model_validate(_invalid_ar_object())