import pytest

from models.asset_contract import AssetRole, ResolvedLearnerAsset
from models.lesson_media import MediaType
from services.vocabulary_activity_service import VocabularyActivityService
from repositories.orm_media_asset_repository import MediaAssetRepository


VOCABULARY_IDS = [
    "animals-v1-cat",
    "animals-v1-dog",
    "animals-v1-bird",
    "animals-v1-fish",
    "animals-v1-rabbit",
]


class FakeCourses:
    async def get_lesson(self, course_id, lesson_id):
        return {
            "learning_blocks": {
                "schema_version": 2,
                "content_version": 1,
                "vocabulary": VOCABULARY_IDS,
                "activities": [
                    {
                        "activity_id": "learn-the-cat:learn-vocabulary",
                        "type": "learn_vocabulary",
                        "order": 1,
                        "required": True,
                        "completion_policy": {"mode": "all_items"},
                        "config": {"vocabulary_ids": VOCABULARY_IDS},
                    }
                ],
            }
        }

    async def get_lesson_session(self, user_id, course_id, lesson_id):
        return {"steps": [{"step_id": "learn-the-cat:learn-vocabulary"}]}


class FakeAssets:
    async def resolve_vocabulary_asset(self, course_id, lesson_id, vocabulary_id, role):
        media_type = MediaType.AUDIO if role is AssetRole.PRONUNCIATION_AUDIO else MediaType.IMAGE
        return ResolvedLearnerAsset(
            role=role,
            url=f"https://assets.example/{vocabulary_id}/{role.value}",
            media_type=media_type,
            metadata={"content_identity": vocabulary_id},
        )


@pytest.mark.asyncio
async def test_hydrates_all_five_vocabulary_assets_in_authored_order():
    result = await VocabularyActivityService(FakeCourses(), FakeAssets()).hydrate(
        "learner-1",
        "animals-adventure-en-5-7",
        "learn-the-cat",
        "learn-the-cat:learn-vocabulary",
    )

    assert [item["vocabulary_id"] for item in result["items"]] == VOCABULARY_IDS
    assert all(item["illustration"].role is AssetRole.VOCABULARY_ILLUSTRATION for item in result["items"])
    assert all(item["pronunciation_audio"].role is AssetRole.PRONUNCIATION_AUDIO for item in result["items"])
    assert all(item["illustration"].url.startswith("https://") for item in result["items"])
    assert all(item["pronunciation_audio"].url.startswith("https://") for item in result["items"])


@pytest.mark.asyncio
async def test_rejects_non_vocabulary_activity():
    courses = FakeCourses()
    lesson = await courses.get_lesson("course", "lesson")
    lesson["learning_blocks"]["activities"][0]["type"] = "quiz"
    lesson["learning_blocks"]["activities"][0]["completion_policy"] = {"mode": "quiz_complete"}
    lesson["learning_blocks"]["activities"][0]["config"] = {
        "question_ids": [1],
        "order_policy": "authored",
    }
    courses.get_lesson = lambda *_: _async_value(lesson)

    with pytest.raises(ValueError, match="Learn-vocabulary activity not found"):
        await VocabularyActivityService(courses, FakeAssets()).hydrate(
            "learner-1", "course", "lesson", "learn-the-cat:learn-vocabulary"
        )


async def _async_value(value):
    return value


class FakeScalarResult:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return self

    def all(self):
        return self.rows


class FakeSession:
    def __init__(self, *result_rows):
        self.result_rows = list(result_rows)

    async def execute(self, _statement):
        return FakeScalarResult(self.result_rows.pop(0))


@pytest.mark.asyncio
async def test_media_resolution_reuses_one_course_wide_semantic_binding():
    canonical_row = object()
    repository = MediaAssetRepository(FakeSession([], [canonical_row]))

    result = await repository.get_ready_asset(
        "animals-adventure-en-5-7",
        "learn-the-cat",
        "vocabulary",
        "vocabulary:animals-v1-dog:vocabulary_illustration",
    )

    assert result is canonical_row


@pytest.mark.asyncio
async def test_media_resolution_rejects_ambiguous_course_wide_bindings():
    repository = MediaAssetRepository(FakeSession([], [object(), object()]))

    with pytest.raises(ValueError, match="Ambiguous ready Course media asset"):
        await repository.get_ready_asset(
            "animals-adventure-en-5-7",
            "learn-the-cat",
            "vocabulary",
            "vocabulary:animals-v1-dog:vocabulary_illustration",
        )
