"""Hydrate learn_vocabulary from authored IDs and canonical LC5 assets."""

from typing import Any

from models.asset_contract import AssetRole
from models.lesson_activity import LearnVocabularyActivity, normalize_learning_blocks
from repositories.orm_course_repository import CourseRepository
from services.learner_asset_service import LearnerAssetService


class VocabularyActivityService:
    def __init__(self, courses: CourseRepository, assets: LearnerAssetService):
        self.courses = courses
        self.assets = assets

    async def hydrate(
        self,
        user_id: str,
        course_id: str,
        lesson_id: str,
        activity_id: str,
    ) -> dict[str, Any]:
        lesson = await self.courses.get_lesson(course_id, lesson_id)
        activity = next(
            (
                item
                for item in normalize_learning_blocks(
                    lesson.get("learning_blocks") if lesson else {}
                ).activities
                if item.activity_id == activity_id
            ),
            None,
        )
        if not isinstance(activity, LearnVocabularyActivity):
            raise ValueError("Learn-vocabulary activity not found")

        session = await self.courses.get_lesson_session(user_id, course_id, lesson_id)
        if not session or not any(step["step_id"] == activity_id for step in session["steps"]):
            raise ValueError("Learn-vocabulary activity is not mapped to this lesson session")

        items = []
        for vocabulary_id in activity.config.vocabulary_ids:
            illustration = await self.assets.resolve_vocabulary_asset(
                course_id,
                lesson_id,
                vocabulary_id,
                AssetRole.VOCABULARY_ILLUSTRATION,
            )
            pronunciation = await self.assets.resolve_vocabulary_asset(
                course_id,
                lesson_id,
                vocabulary_id,
                AssetRole.PRONUNCIATION_AUDIO,
            )
            items.append(
                {
                    "vocabulary_id": vocabulary_id,
                    "illustration": illustration,
                    "pronunciation_audio": pronunciation,
                }
            )
        return {"activity_id": activity_id, "items": items}
