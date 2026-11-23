"""LC5 acceptance evidence using synthetic media_assets-shaped rows only."""

from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from models.asset_contract import AssetRole, ResolvedLearnerAsset, vocabulary_asset_key
from repositories.orm_media_asset_repository import MediaAssetRepository
from services.learner_asset_service import LearnerAssetService
from services.mini_game_activity_service import MiniGameActivityService


COURSE_ID = "lc5-evidence-course"
LESSON_ID = "lc5-evidence-lesson"
VOCABULARY_ID = "test-fox"


def _asset(role: AssetRole, url: str, media_type: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=hash((role.value, url)),
        course_id=COURSE_ID,
        lesson_id=LESSON_ID,
        section_id="vocabulary",
        asset_key=vocabulary_asset_key(VOCABULARY_ID, role),
        status="ready",
        public_url=url,
        type=media_type,
        metadata_={"fixture": "lc5-evidence", "vocabulary_id": VOCABULARY_ID},
    )


FOX_ASSETS = [
    _asset(AssetRole.VOCABULARY_ILLUSTRATION, "https://example.test/fox.png", "image"),
    _asset(AssetRole.PRONUNCIATION_AUDIO, "https://example.test/fox.mp3", "audio"),
    _asset(AssetRole.COLORING_OUTLINE, "https://example.test/fox-outline.png", "image"),
]


class _Scalars:
    def __init__(self, rows): self.rows = rows
    def all(self): return self.rows


class _Result:
    def __init__(self, rows): self.rows = rows
    def scalars(self): return _Scalars(self.rows)


class FixtureMediaSession:
    """Minimal AsyncSession boundary that applies the repository's lookup identity."""

    def __init__(self, rows): self.rows = rows

    async def execute(self, statement):
        values = tuple(statement.compile().params.values())
        asset_key = next(value for value in values if isinstance(value, str) and value.startswith("vocabulary:"))
        rows = [row for row in self.rows if (
            row.course_id, row.lesson_id, row.section_id, row.asset_key, row.status
        ) == (COURSE_ID, LESSON_ID, "vocabulary", asset_key, "ready")]
        return _Result(rows)


def _resolver(rows=FOX_ASSETS) -> LearnerAssetService:
    return LearnerAssetService(MediaAssetRepository(FixtureMediaSession(rows)))


@pytest.mark.asyncio
async def test_synthetic_test_fox_resolves_each_semantic_role_through_repository():
    resolver = _resolver()
    illustration = await resolver.resolve_vocabulary_asset(COURSE_ID, LESSON_ID, VOCABULARY_ID, AssetRole.VOCABULARY_ILLUSTRATION)
    pronunciation = await resolver.resolve_vocabulary_asset(COURSE_ID, LESSON_ID, VOCABULARY_ID, AssetRole.PRONUNCIATION_AUDIO)
    outline = await resolver.resolve_vocabulary_asset(COURSE_ID, LESSON_ID, VOCABULARY_ID, AssetRole.COLORING_OUTLINE)
    assert (illustration.role.value, illustration.url, illustration.media_type.value) == ("vocabulary_illustration", "https://example.test/fox.png", "image")
    assert (pronunciation.role.value, pronunciation.url, pronunciation.media_type.value) == ("pronunciation_audio", "https://example.test/fox.mp3", "audio")
    assert (outline.role.value, outline.url, outline.media_type.value) == ("coloring_outline", "https://example.test/fox-outline.png", "image")


def test_role_media_mismatches_are_executably_rejected():
    for role, media_type in (("pronunciation_audio", "image"), ("vocabulary_illustration", "audio")):
        with pytest.raises(ValidationError):
            ResolvedLearnerAsset(role=role, url="https://example.test/invalid", media_type=media_type)


@pytest.mark.asyncio
async def test_duplicate_ready_identity_is_rejected_and_missing_role_does_not_fallback():
    duplicate = _asset(AssetRole.VOCABULARY_ILLUSTRATION, "https://example.test/fox-second.png", "image")
    with pytest.raises(ValueError, match="Ambiguous"):
        await _resolver([FOX_ASSETS[0], duplicate]).resolve_vocabulary_asset(COURSE_ID, LESSON_ID, VOCABULARY_ID, AssetRole.VOCABULARY_ILLUSTRATION)
    with pytest.raises(ValueError, match="Missing ready coloring_outline"):
        await _resolver(FOX_ASSETS[:2]).resolve_vocabulary_asset(COURSE_ID, LESSON_ID, VOCABULARY_ID, AssetRole.COLORING_OUTLINE)


class _Courses:
    async def get_lesson(self, *_):
        return {"learning_blocks": {"schema_version": 2, "content_version": 1, "vocabulary": [VOCABULARY_ID], "activities": [{
            "activity_id": "memory", "type": "mini_game", "order": 1, "required": True,
            "completion_policy": {"mode": "game_complete"},
            "config": {"game_type": "memory_match", "mini_game_item_ids": [1]},
        }]}}

    async def get_lesson_session(self, *_): return {"steps": [{"step_id": "memory"}]}


class _CanonicalGame:
    async def get_items(self, *_):
        return [SimpleNamespace(id=1, payload={"pairs": [
            {"id": "word", "type": "word", "content": "fox"},
            {"id": "image", "type": "image", "content": "https://example.test/fox-old.png", "vocabulary_id": VOCABULARY_ID, "asset_role": "vocabulary_illustration"},
        ]})]


class _LegacyGame:
    async def get_items(self, *_):
        return [SimpleNamespace(id=2, payload={"pairs": [
            {"id": "word", "type": "word", "content": "fox"},
            {"id": "image", "type": "image", "content": "https://example.test/fox-legacy.png"},
        ]})]


@pytest.mark.asyncio
async def test_memory_match_projects_canonical_asset_before_legacy_content():
    result = await MiniGameActivityService(_Courses(), _CanonicalGame(), _resolver()).hydrate("learner", COURSE_ID, LESSON_ID, "memory")
    image = next(card for card in result["cards"] if card["type"] == "image")
    assert image["asset"].url == "https://example.test/fox.png"
    assert image["content"] == "https://example.test/fox-old.png"


@pytest.mark.asyncio
async def test_memory_match_legacy_payload_needs_no_media_asset_row():
    result = await MiniGameActivityService(_Courses(), _LegacyGame(), _resolver([])).hydrate("learner", COURSE_ID, LESSON_ID, "memory")
    image = next(card for card in result["cards"] if card["type"] == "image")
    assert image["asset"] is None
    assert image["content"] == "https://example.test/fox-legacy.png"


@pytest.mark.asyncio
async def test_ar_fixture_is_not_a_learner_resolution_fallback_and_manifest_key_is_explicit():
    ar_only_fields = {"reference_image_url": "https://example.test/fox-ar-card.png", "model_3d_url": "https://example.test/fox.glb", "physical_width_m": 0.12}
    resolved = await _resolver().resolve_vocabulary_asset(COURSE_ID, LESSON_ID, VOCABULARY_ID, AssetRole.VOCABULARY_ILLUSTRATION)
    assert resolved.url == "https://example.test/fox.png"
    assert resolved.url not in ar_only_fields.values()
    assert vocabulary_asset_key(VOCABULARY_ID, AssetRole.VOCABULARY_ILLUSTRATION) == "vocabulary:test-fox:vocabulary_illustration"
