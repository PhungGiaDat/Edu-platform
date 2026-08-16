"""Focused LC5 semantic asset-role and reuse coverage."""

from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from models.asset_contract import AssetRole, ResolvedLearnerAsset, vocabulary_asset_key
from models.game_activity import MemoryMatchPayload
from models.lesson_media import MediaType
from repositories.orm_media_asset_repository import MediaAssetRepository
from services.learner_asset_service import LearnerAssetService
from services.mini_game_activity_service import MiniGameActivityService


def test_controlled_roles_and_media_compatibility():
    asset = ResolvedLearnerAsset(role="vocabulary_illustration", url="https://assets.example/cat.png", media_type="image")
    assert asset.role is AssetRole.VOCABULARY_ILLUSTRATION
    with pytest.raises(ValidationError):
        ResolvedLearnerAsset(role="reference_image", url="https://assets.example/reference.png", media_type="image")
    with pytest.raises(ValidationError):
        ResolvedLearnerAsset(role="pronunciation_audio", url="https://assets.example/cat.png", media_type="image")
    with pytest.raises(ValidationError):
        ResolvedLearnerAsset(role="coloring_outline", url="", media_type="image")


def test_vocabulary_role_keys_are_explicit_and_reusable():
    assert vocabulary_asset_key("animal-cat", AssetRole.VOCABULARY_ILLUSTRATION) == "vocabulary:animal-cat:vocabulary_illustration"
    assert vocabulary_asset_key("animal-cat", AssetRole.PRONUNCIATION_AUDIO) == "vocabulary:animal-cat:pronunciation_audio"
    with pytest.raises(ValueError, match="not a vocabulary"):
        vocabulary_asset_key("animal-cat", AssetRole.COURSE_COVER)


def test_legacy_memory_image_payload_remains_readable():
    payload = MemoryMatchPayload.model_validate({"pairs": [
        {"id": "word", "type": "word", "content": "cat"},
        {"id": "image", "type": "image", "content": "https://legacy.example/cat.png"},
    ]})
    assert payload.pairs[1].content == "https://legacy.example/cat.png"


class _FakeCourses:
    async def get_lesson(self, course_id, lesson_id):
        return {"learning_blocks": {"schema_version": 2, "content_version": 1, "vocabulary": ["animal-cat"], "activities": [{
            "activity_id": "memory", "type": "mini_game", "order": 1, "required": True,
            "completion_policy": {"mode": "game_complete"},
            "config": {"game_type": "memory_match", "mini_game_item_ids": [7]},
        }]}}

    async def get_lesson_session(self, *args):
        return {"steps": [{"step_id": "memory"}]}


class _FakeGames:
    async def get_items(self, *args):
        return [SimpleNamespace(id=7, payload={"pairs": [
            {"id": "word", "type": "word", "content": "cat"},
            {"id": "image", "type": "image", "vocabulary_id": "animal-cat", "asset_role": "vocabulary_illustration"},
        ]})]


class _FakeMedia:
    async def get_ready_asset(self, course_id, lesson_id, section_id, asset_key):
        assert (course_id, lesson_id, section_id, asset_key) == ("animals", "cat-lesson", "vocabulary", "vocabulary:animal-cat:vocabulary_illustration")
        return SimpleNamespace(public_url="https://assets.example/cat.png", type="image", metadata_={"alt": "cat"})

    async def get_course_cover_url(self, course_id):
        assert course_id == "animals"
        return "https://assets.example/course-cover.png"


@pytest.mark.asyncio
async def test_memory_match_projects_canonical_vocabulary_illustration():
    service = MiniGameActivityService(_FakeCourses(), _FakeGames(), LearnerAssetService(_FakeMedia()))
    result = await service.hydrate("learner", "animals", "cat-lesson", "memory")
    image = next(card for card in result["cards"] if card["type"] == "image")
    assert image["content"] is None
    assert image["asset"].model_dump(mode="json") == {
        "role": "vocabulary_illustration", "url": "https://assets.example/cat.png", "media_type": "image", "metadata": {"alt": "cat"},
    }


@pytest.mark.asyncio
async def test_course_cover_resolves_through_canonical_course_media_representation():
    asset = await LearnerAssetService(_FakeMedia()).resolve_course_asset("animals", AssetRole.COURSE_COVER)
    assert asset.url == "https://assets.example/course-cover.png"
    assert asset.media_type is MediaType.IMAGE


class _FakeScalars:
    def __init__(self, rows): self.rows = rows
    def all(self): return self.rows


class _FakeResult:
    def __init__(self, rows): self.rows = rows
    def scalars(self): return _FakeScalars(self.rows)


class _FakeSession:
    def __init__(self, rows): self.rows = rows
    async def execute(self, statement): return _FakeResult(self.rows)


@pytest.mark.asyncio
async def test_media_lookup_rejects_ambiguous_ready_records_instead_of_selecting_first():
    repository = MediaAssetRepository(_FakeSession([SimpleNamespace(id=2), SimpleNamespace(id=1)]))
    with pytest.raises(ValueError, match="Ambiguous"):
        await repository.get_ready_asset("animals", "cat-lesson", "vocabulary", "vocabulary:animal-cat:vocabulary_illustration")


@pytest.mark.asyncio
async def test_media_lookup_returns_the_single_deterministic_record():
    row = SimpleNamespace(id=2)
    repository = MediaAssetRepository(_FakeSession([row]))
    assert await repository.get_ready_asset("animals", "cat-lesson", "vocabulary", "vocabulary:animal-cat:vocabulary_illustration") is row
