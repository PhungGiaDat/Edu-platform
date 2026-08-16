"""SQLAlchemy learner-core repository; replaces the retired asyncpg course path."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.orm_models.learner import (
    CourseORM, LessonORM, LessonSessionORM, LessonSessionStepORM,
    LessonStepAttemptORM, UserCourseLessonProgressORM, UserCourseProgressORM,
    WordMasteryORM,
    MediaAssetORM,
)
from models.lesson_activity import normalize_learning_blocks


def _lesson_contract(value: dict[str, Any]) -> dict[str, Any]:
    video = value.pop("video", None)
    if isinstance(video, dict) and {"video", "thumbnail", "scenes"}.issubset(video):
        value["videoLesson"] = video
    elif video:
        value["video"] = video
    value["arReference"] = value.pop("ar_reference", None) or None
    return value


def _lesson_payload(lesson: LessonORM) -> dict[str, Any]:
    value = {column.name: getattr(lesson, column.name) for column in lesson.__table__.columns}
    blocks = normalize_learning_blocks(value.pop("learning_blocks") or {})
    value["learning_blocks"] = blocks.model_dump(mode="json")
    if blocks.schema_version == 1:
        for key in ("vocabulary", "game", "activity", "readAloudStory", "pronunciation", "quiz"):
            legacy_value = getattr(blocks, key)
            if legacy_value is not None:
                value[key] = legacy_value
    value["order"] = value.pop("lesson_order")
    value["lesson_media"] = value.pop("media", None)
    value["generatedMedia"] = value.pop("generated_media", []) or []
    return _lesson_contract(value)


class CourseRepository:
    """One session is injected by the service dependency for an entire request."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def _course_payload(self, course: CourseORM) -> dict[str, Any]:
        value = {column.name: getattr(course, column.name) for column in course.__table__.columns}
        value["catalogPreview"] = value.pop("catalog_preview", []) or []
        value["studentTestimonials"] = value.pop("student_testimonials", []) or []
        value["enrollmentCta"] = value.pop("enrollment_cta", None)
        value["lessons"] = [_lesson_payload(item) for item in sorted(course.lessons, key=lambda x: x.lesson_order)]
        return value

    async def get_all_published(self, skip: int = 0, limit: int = 20) -> list[dict[str, Any]]:
        result = await self.session.execute(
            select(CourseORM).options(selectinload(CourseORM.lessons)).where(CourseORM.is_published.is_(True)).order_by(CourseORM.created_at.nulls_last(), CourseORM.course_id).offset(skip).limit(limit)
        )
        return [await self._course_payload(course) for course in result.scalars().unique()]

    async def get_by_level(self, level: str) -> list[dict[str, Any]]:
        result = await self.session.execute(select(CourseORM).options(selectinload(CourseORM.lessons)).where(and_(CourseORM.level == level, CourseORM.is_published.is_(True))).order_by(CourseORM.course_id))
        return [await self._course_payload(course) for course in result.scalars().unique()]

    async def get_by_course_id(self, course_id: str) -> Optional[dict[str, Any]]:
        result = await self.session.execute(select(CourseORM).options(selectinload(CourseORM.lessons)).where(and_(CourseORM.course_id == course_id, CourseORM.is_published.is_(True))))
        course = result.scalar_one_or_none()
        return await self._course_payload(course) if course else None

    async def get_lesson(self, course_id: str, lesson_id: str) -> Optional[dict[str, Any]]:
        result = await self.session.execute(select(LessonORM).where(and_(LessonORM.course_id == course_id, LessonORM.lesson_id == lesson_id)))
        lesson = result.scalar_one_or_none()
        return _lesson_payload(lesson) if lesson else None

    async def upsert_course(self, course: dict[str, Any]) -> bool:
        now = datetime.utcnow()
        statement = insert(CourseORM).values(course_id=course["course_id"], title=course["title"], description=course.get("description"), thumbnail_url=course.get("thumbnail_url"), level=course.get("level", "beginner"), is_published=course.get("is_published", False), created_at=now, updated_at=now)
        await self.session.execute(statement.on_conflict_do_update(index_elements=[CourseORM.course_id], set_={"title": statement.excluded.title, "description": statement.excluded.description, "thumbnail_url": statement.excluded.thumbnail_url, "level": statement.excluded.level, "is_published": statement.excluded.is_published, "updated_at": now}))
        for order, lesson in enumerate(course.get("lessons", []), start=1):
            blocks = lesson.get("learning_blocks")
            if hasattr(blocks, "model_dump"):
                blocks = blocks.model_dump(mode="json")
            if not isinstance(blocks, dict) or not blocks:
                blocks = {key: lesson[key] for key in ("vocabulary", "game", "activity", "readAloudStory", "pronunciation", "quiz") if key in lesson}
            payload = dict(lesson_id=lesson["lesson_id"], course_id=course["course_id"], title=lesson["title"], title_vi=lesson.get("title_vi", ""), description=lesson.get("description"), lesson_order=lesson.get("order", order), duration_minutes=lesson.get("duration_minutes", 3), content=lesson.get("content"), video=lesson.get("videoLesson"), media=lesson.get("lesson_media"), learning_blocks=normalize_learning_blocks(blocks).model_dump(mode="json"), reward=lesson.get("reward"), ar_reference=lesson.get("arReference"), generated_media=lesson.get("generatedMedia", []), is_completed=lesson.get("is_completed", False))
            lesson_statement = insert(LessonORM).values(**payload)
            await self.session.execute(lesson_statement.on_conflict_do_update(index_elements=[LessonORM.lesson_id], set_={key: lesson_statement.excluded[key] for key in ("title", "description", "lesson_order", "learning_blocks", "reward")}))
        return True

    async def _progress_payload(self, progress: UserCourseProgressORM) -> dict[str, Any]:
        value = {column.name: getattr(progress, column.name) for column in progress.__table__.columns}
        result = await self.session.execute(select(UserCourseLessonProgressORM).where(and_(UserCourseLessonProgressORM.user_id == progress.user_id, UserCourseLessonProgressORM.course_id == progress.course_id)).order_by(UserCourseLessonProgressORM.lesson_id))
        children = list(result.scalars())
        value["lesson_progress"] = [{column.name: getattr(item, column.name) for column in item.__table__.columns} for item in children]
        value["completed_lessons"] = [item.lesson_id for item in children if item.status == "completed"]
        return value

    async def get_progress(self, user_id: str, course_id: Optional[str] = None) -> list[dict[str, Any]]:
        statement = select(UserCourseProgressORM).where(UserCourseProgressORM.user_id == user_id)
        if course_id:
            statement = statement.where(UserCourseProgressORM.course_id == course_id)
        else:
            statement = statement.order_by(UserCourseProgressORM.updated_at.desc().nulls_last())
        result = await self.session.execute(statement)
        return [await self._progress_payload(item) for item in result.scalars()]

    async def get_one_progress(self, user_id: str, course_id: str) -> Optional[dict[str, Any]]:
        result = await self.session.execute(select(UserCourseProgressORM).where(and_(UserCourseProgressORM.user_id == user_id, UserCourseProgressORM.course_id == course_id)))
        progress = result.scalar_one_or_none()
        return await self._progress_payload(progress) if progress else None

    async def upsert_progress(self, user_id: str, course_id: str, progress: dict[str, Any]) -> bool:
        statement = insert(UserCourseProgressORM).values(user_id=user_id, course_id=course_id, current_lesson_id=progress.get("current_lesson_id"), status=progress.get("status", "started"), total_xp=int(progress.get("total_xp", 0)), rewards=progress.get("rewards", []), started_at=progress.get("started_at") or datetime.utcnow())
        await self.session.execute(statement.on_conflict_do_update(index_elements=[UserCourseProgressORM.user_id, UserCourseProgressORM.course_id], set_={"current_lesson_id": statement.excluded.current_lesson_id, "status": statement.excluded.status, "total_xp": statement.excluded.total_xp, "rewards": statement.excluded.rewards, "updated_at": datetime.utcnow()}))
        for item in progress.get("lesson_progress", []):
            child = insert(UserCourseLessonProgressORM).values(user_id=user_id, course_id=course_id, lesson_id=item["lesson_id"], status=item.get("status", "not_started"), best_score=int(item.get("best_score", 0)), attempts=int(item.get("attempts", 0)), completed_at=item.get("completed_at"))
            await self.session.execute(child.on_conflict_do_update(index_elements=[UserCourseLessonProgressORM.user_id, UserCourseLessonProgressORM.course_id, UserCourseLessonProgressORM.lesson_id], set_={"status": child.excluded.status, "best_score": child.excluded.best_score, "attempts": child.excluded.attempts, "completed_at": child.excluded.completed_at}))
        return True

    async def get_lesson_session(self, user_id: str, course_id: str, lesson_id: str) -> Optional[dict[str, Any]]:
        result = await self.session.execute(select(LessonSessionORM).options(selectinload(LessonSessionORM.steps)).where(and_(LessonSessionORM.user_id == user_id, LessonSessionORM.course_id == course_id, LessonSessionORM.lesson_id == lesson_id)))
        session = result.scalar_one_or_none()
        if not session:
            return None
        value = {column.name: getattr(session, column.name) for column in session.__table__.columns}
        value["steps"] = [{column.name: getattr(step, column.name) for column in step.__table__.columns} for step in sorted(session.steps, key=lambda item: (item.activity_order is None, item.activity_order or 0, item.step_id))]
        return value

    async def upsert_lesson_session(self, session: dict[str, Any]) -> bool:
        statement = insert(LessonSessionORM).values(session_id=session["session_id"], user_id=session["user_id"], course_id=session["course_id"], lesson_id=session["lesson_id"], content_version=int(session.get("content_version", 1)), status=session.get("status", "started"), current_step_id=session["current_step_id"], current_step_index=int(session.get("current_step_index", 0)), progress_percent=int(session.get("progress_percent", 0)), started_at=session.get("started_at") or datetime.utcnow(), completed_at=session.get("completed_at"))
        await self.session.execute(statement.on_conflict_do_update(index_elements=[LessonSessionORM.user_id, LessonSessionORM.course_id, LessonSessionORM.lesson_id], set_={key: statement.excluded[key] for key in ("status", "current_step_id", "current_step_index", "progress_percent", "content_version", "completed_at")} | {"updated_at": datetime.utcnow()}))
        for step in session.get("steps", []):
            child = insert(LessonSessionStepORM).values(session_id=session["session_id"], step_id=step["step_id"], title=step.get("title", ""), activity_type=step.get("activity_type"), activity_order=step.get("activity_order"), required=bool(step.get("required", True)), status=step.get("status", "locked"), attempts=int(step.get("attempts", 0)), best_score=int(step.get("best_score", 0)), passed=bool(step.get("passed", False)), last_response=step.get("last_response", {}), completed_at=step.get("completed_at"))
            await self.session.execute(child.on_conflict_do_update(index_elements=[LessonSessionStepORM.session_id, LessonSessionStepORM.step_id], set_={key: child.excluded[key] for key in ("title", "status", "attempts", "best_score", "activity_type", "activity_order", "required", "passed", "last_response", "completed_at")} | {"updated_at": datetime.utcnow()}))
        return True

    async def create_lesson_step_attempt(self, attempt: dict[str, Any]) -> str:
        result = await self.session.execute(insert(LessonStepAttemptORM).values(**attempt).returning(LessonStepAttemptORM.id))
        return str(result.scalar_one())

    async def get_lesson_step_attempts(self, session_id: str, step_id: Optional[str] = None, limit: int = 50) -> list[dict[str, Any]]:
        statement = select(LessonStepAttemptORM).where(LessonStepAttemptORM.session_id == session_id)
        if step_id:
            statement = statement.where(LessonStepAttemptORM.step_id == step_id)
        result = await self.session.execute(statement.order_by(LessonStepAttemptORM.attempted_at.desc()).limit(limit))
        return [{column.name: getattr(item, column.name) for column in item.__table__.columns} for item in result.scalars()]

    async def update_word_mastery(self, user_id: str, course_id: str, lesson_id: str, word: str, passed: bool, score: int) -> bool:
        statement = insert(WordMasteryORM).values(user_id=user_id, course_id=course_id, lesson_id=lesson_id, word=word.lower(), mastery_level=1 if passed else 0, metadata_={"last_score": score, "last_passed": passed}, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        await self.session.execute(statement.on_conflict_do_update(index_elements=[WordMasteryORM.user_id, WordMasteryORM.course_id, WordMasteryORM.lesson_id, WordMasteryORM.word], set_={"mastery_level": func.greatest(WordMasteryORM.mastery_level, statement.excluded.mastery_level), "metadata": statement.excluded["metadata"], "updated_at": datetime.utcnow()}))
        return True

    async def upsert_media_assets(self, assets: list[dict[str, Any]]) -> None:
        for asset in assets:
            statement = insert(MediaAssetORM).values(course_id=asset["course_id"], lesson_id=asset["lesson_id"], section_id=asset["section_id"], asset_key=asset["asset_key"], bucket=asset["bucket"], path=asset["path"], type=asset["type"], status=asset.get("status", "pending"), public_url=asset.get("public_url"), provider=asset.get("provider", "supabase"), metadata_=asset.get("metadata", {}), created_at=datetime.utcnow(), updated_at=datetime.utcnow())
            await self.session.execute(statement.on_conflict_do_update(index_elements=[MediaAssetORM.course_id, MediaAssetORM.lesson_id, MediaAssetORM.section_id, MediaAssetORM.asset_key, MediaAssetORM.path], set_={"type": statement.excluded.type, "status": statement.excluded.status, "public_url": statement.excluded.public_url, "provider": statement.excluded.provider, "metadata": statement.excluded["metadata"], "updated_at": datetime.utcnow()}))

    async def get_media_assets(self, course_id: str, lesson_id: str) -> list[dict[str, Any]]:
        result = await self.session.execute(select(MediaAssetORM).where(and_(MediaAssetORM.course_id == course_id, MediaAssetORM.lesson_id == lesson_id)).order_by(MediaAssetORM.section_id, MediaAssetORM.asset_key))
        return [{column.name: getattr(item, column.name) for column in item.__table__.columns} for item in result.scalars()]
