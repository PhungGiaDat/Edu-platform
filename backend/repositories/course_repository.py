"""PostgreSQL persistence for learner courses, sessions, and progress."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from database.postgres_connection import postgres_pool
from models.lesson_activity import normalize_learning_blocks


def _row(row) -> dict[str, Any]:
    value = dict(row)
    for key, item in list(value.items()):
        if isinstance(item, str) and key in {"thumbnail", "catalog_preview", "student_testimonials", "enrollment_cta", "video", "media", "learning_blocks", "reward", "ar_reference", "generated_media", "rewards", "last_response", "response_data", "metadata"}:
            try:
                value[key] = json.loads(item)
            except json.JSONDecodeError:
                pass
    return value


def _lesson_contract(value: dict[str, Any]) -> dict[str, Any]:
    """Adapt imported JSONB into the existing FastAPI lesson contract.

    Older course records store a small ``VideoSchema`` object while generated
    courses store the richer ``VideoLesson`` shape.  They are distinct public
    contract fields, so do not coerce the legacy object into generated content.
    """
    video = value.pop("video", None)
    if isinstance(video, dict) and {"video", "thumbnail", "scenes"}.issubset(video):
        value["videoLesson"] = video
    elif video:
        value["video"] = video

    ar_reference = value.pop("ar_reference", None)
    value["arReference"] = ar_reference or None
    return value


def _apply_learning_blocks(value: dict[str, Any], blocks: Any) -> None:
    normalized = normalize_learning_blocks(blocks)
    value["learning_blocks"] = normalized.model_dump(mode="json")
    if normalized.schema_version == 1:
        for key in ("vocabulary", "game", "activity", "readAloudStory", "pronunciation", "quiz"):
            legacy_value = getattr(normalized, key)
            if legacy_value is not None:
                value[key] = legacy_value


class CourseRepository:
    """LEGACY asyncpg repository retained for non-migrated lesson-media routes."""
    async def _lessons(self, course_id: str) -> list[dict[str, Any]]:
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.lessons WHERE course_id=$1 ORDER BY lesson_order", course_id
        )
        lessons = []
        for row in rows:
            value = _row(row)
            blocks = value.pop("learning_blocks", {}) or {}
            if isinstance(blocks, str):
                blocks = json.loads(blocks)
            if not isinstance(blocks, dict):
                blocks = {}
            value["order"] = value.pop("lesson_order")
            value["lesson_media"] = value.pop("media", None)
            value["generatedMedia"] = value.pop("generated_media", []) or []
            _apply_learning_blocks(value, blocks)
            lessons.append(_lesson_contract(value))
        return lessons

    async def _course(self, row) -> dict[str, Any]:
        value = _row(row)
        value["catalogPreview"] = value.pop("catalog_preview", []) or []
        value["studentTestimonials"] = value.pop("student_testimonials", []) or []
        value["enrollmentCta"] = value.pop("enrollment_cta", None)
        value["lessons"] = await self._lessons(value["course_id"])
        return value

    async def get_all_published(self, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.courses WHERE is_published=TRUE
               ORDER BY created_at NULLS LAST, course_id OFFSET $1 LIMIT $2""", skip, limit
        )
        return [await self._course(row) for row in rows]

    async def get_by_level(self, level: str) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.courses WHERE level=$1 AND is_published=TRUE ORDER BY course_id", level
        )
        return [await self._course(row) for row in rows]

    async def get_by_course_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.courses WHERE course_id=$1 AND is_published=TRUE", course_id
        )
        return await self._course(row) if row else None

    async def upsert_course(self, course: Dict[str, Any]) -> bool:
        # Generation remains an admin path, but it must not write Mongo.
        now = datetime.utcnow()
        await postgres_pool().execute(
            """INSERT INTO public.courses(course_id,title,description,thumbnail_url,level,is_published,created_at,updated_at)
               VALUES($1,$2,$3,$4,$5,$6,$7,$7)
               ON CONFLICT(course_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,
               thumbnail_url=EXCLUDED.thumbnail_url,level=EXCLUDED.level,is_published=EXCLUDED.is_published,updated_at=EXCLUDED.updated_at""",
            course["course_id"], course["title"], course.get("description"), course.get("thumbnail_url"),
            course.get("level", "beginner"), course.get("is_published", False), now,
        )
        for order, lesson in enumerate(course.get("lessons", []), start=1):
            blocks = lesson.get("learning_blocks")
            if hasattr(blocks, "model_dump"):
                blocks = blocks.model_dump(mode="json")
            if not isinstance(blocks, dict) or not blocks:
                blocks = {
                    key: lesson[key]
                    for key in ("vocabulary", "game", "activity", "readAloudStory", "pronunciation", "quiz")
                    if key in lesson
                }
            blocks = normalize_learning_blocks(blocks).model_dump(mode="json")
            await postgres_pool().execute(
                """INSERT INTO public.lessons(lesson_id,course_id,title,title_vi,description,lesson_order,duration_minutes,content,
                   video,media,learning_blocks,reward,ar_reference,generated_media,is_completed)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15)
                   ON CONFLICT(lesson_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,
                   lesson_order=EXCLUDED.lesson_order,learning_blocks=EXCLUDED.learning_blocks,reward=EXCLUDED.reward""",
                lesson["lesson_id"], course["course_id"], lesson["title"], lesson.get("title_vi", ""), lesson.get("description"),
                lesson.get("order", order), lesson.get("duration_minutes", 3), lesson.get("content"),
                json.dumps(lesson.get("videoLesson")), json.dumps(lesson.get("lesson_media")),
                json.dumps(blocks),
                json.dumps(lesson.get("reward")), json.dumps(lesson.get("arReference")), json.dumps(lesson.get("generatedMedia", [])),
                lesson.get("is_completed", False),
            )
        return True

    async def get_lesson(self, course_id: str, lesson_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.lessons WHERE course_id=$1 AND lesson_id=$2", course_id, lesson_id
        )
        if not row:
            return None
        value = _row(row)
        blocks = value.pop("learning_blocks", {}) or {}
        if isinstance(blocks, str):
            blocks = json.loads(blocks)
        if not isinstance(blocks, dict):
            blocks = {}
        value["order"] = value.pop("lesson_order")
        value["lesson_media"] = value.pop("media", None)
        value["generatedMedia"] = value.pop("generated_media", []) or []
        _apply_learning_blocks(value, blocks)
        return _lesson_contract(value)

    async def _progress(self, row) -> Optional[dict[str, Any]]:
        if row is None:
            return None
        value = _row(row)
        children = await postgres_pool().fetch(
            "SELECT * FROM public.user_course_lesson_progress WHERE user_id=$1 AND course_id=$2 ORDER BY lesson_id",
            value["user_id"], value["course_id"],
        )
        value["lesson_progress"] = [_row(item) for item in children]
        value["completed_lessons"] = [item["lesson_id"] for item in children if item["status"] == "completed"]
        return value

    async def get_progress(self, user_id: str, course_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if course_id:
            rows = await postgres_pool().fetch("SELECT * FROM public.user_course_progress WHERE user_id=$1 AND course_id=$2", user_id, course_id)
        else:
            rows = await postgres_pool().fetch("SELECT * FROM public.user_course_progress WHERE user_id=$1 ORDER BY updated_at DESC NULLS LAST", user_id)
        return [await self._progress(row) for row in rows]  # type: ignore[misc]

    async def get_one_progress(self, user_id: str, course_id: str) -> Optional[Dict[str, Any]]:
        return await self._progress(await postgres_pool().fetchrow(
            "SELECT * FROM public.user_course_progress WHERE user_id=$1 AND course_id=$2", user_id, course_id
        ))

    async def upsert_progress(self, user_id: str, course_id: str, progress: Dict[str, Any]) -> bool:
        await postgres_pool().execute(
            """INSERT INTO public.user_course_progress(user_id,course_id,current_lesson_id,status,total_xp,rewards,started_at,updated_at)
               VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,now())
               ON CONFLICT(user_id,course_id) DO UPDATE SET current_lesson_id=EXCLUDED.current_lesson_id,
               status=EXCLUDED.status,total_xp=EXCLUDED.total_xp,rewards=EXCLUDED.rewards,updated_at=now()""",
            user_id, course_id, progress.get("current_lesson_id"), progress.get("status", "started"),
            int(progress.get("total_xp", 0)), json.dumps(progress.get("rewards", [])), progress.get("started_at") or datetime.utcnow(),
        )
        for item in progress.get("lesson_progress", []):
            await postgres_pool().execute(
                """INSERT INTO public.user_course_lesson_progress(user_id,course_id,lesson_id,status,best_score,attempts,completed_at)
                   VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,course_id,lesson_id) DO UPDATE SET
                   status=EXCLUDED.status,best_score=EXCLUDED.best_score,attempts=EXCLUDED.attempts,completed_at=EXCLUDED.completed_at""",
                user_id, course_id, item["lesson_id"], item.get("status", "not_started"), int(item.get("best_score", 0)),
                int(item.get("attempts", 0)), item.get("completed_at"),
            )
        return True

    async def get_lesson_session(self, user_id: str, course_id: str, lesson_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow("SELECT * FROM public.lesson_sessions WHERE user_id=$1 AND course_id=$2 AND lesson_id=$3", user_id, course_id, lesson_id)
        if not row:
            return None
        value = _row(row)
        steps = await postgres_pool().fetch(
            """SELECT * FROM public.lesson_session_steps WHERE session_id=$1
               ORDER BY activity_order NULLS LAST, step_id""",
            value["session_id"],
        )
        value["steps"] = [_row(step) for step in steps]
        return value

    async def upsert_lesson_session(self, session: Dict[str, Any]) -> bool:
        await postgres_pool().execute(
            """INSERT INTO public.lesson_sessions(session_id,user_id,course_id,lesson_id,content_version,status,current_step_id,current_step_index,progress_percent,started_at,updated_at,completed_at)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),$11)
               ON CONFLICT(user_id,course_id,lesson_id) DO UPDATE SET status=EXCLUDED.status,current_step_id=EXCLUDED.current_step_id,
               current_step_index=EXCLUDED.current_step_index,progress_percent=EXCLUDED.progress_percent,
               content_version=EXCLUDED.content_version,updated_at=now(),completed_at=EXCLUDED.completed_at""",
            session["session_id"], session["user_id"], session["course_id"], session["lesson_id"],
            int(session.get("content_version", 1)), session.get("status", "started"), session["current_step_id"],
            int(session.get("current_step_index", 0)), int(session.get("progress_percent", 0)),
            session.get("started_at") or datetime.utcnow(), session.get("completed_at"),
        )
        for step in session.get("steps", []):
            await postgres_pool().execute(
                """INSERT INTO public.lesson_session_steps(session_id,step_id,title,activity_type,activity_order,required,status,attempts,best_score,passed,last_response,updated_at,completed_at)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,now(),$12) ON CONFLICT(session_id,step_id) DO UPDATE SET
                   title=EXCLUDED.title,status=EXCLUDED.status,attempts=EXCLUDED.attempts,best_score=EXCLUDED.best_score,
                   activity_type=EXCLUDED.activity_type,activity_order=EXCLUDED.activity_order,required=EXCLUDED.required,
                   passed=EXCLUDED.passed,last_response=EXCLUDED.last_response,updated_at=now(),completed_at=EXCLUDED.completed_at""",
                session["session_id"], step["step_id"], step.get("title", ""), step.get("activity_type"),
                step.get("activity_order"), bool(step.get("required", True)), step.get("status", "locked"),
                int(step.get("attempts", 0)), int(step.get("best_score", 0)), bool(step.get("passed", False)),
                json.dumps(step.get("last_response", {})), step.get("completed_at"),
            )
        return True

    async def create_lesson_step_attempt(self, attempt: Dict[str, Any]) -> str:
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.lesson_step_attempts(session_id,user_id,course_id,lesson_id,step_id,attempt_type,passed,score,response_data)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING id""",
            attempt["session_id"], attempt["user_id"], attempt["course_id"], attempt["lesson_id"], attempt["step_id"],
            attempt.get("attempt_type", "practice"), attempt.get("passed", False), attempt.get("score", 0), json.dumps(attempt.get("response_data", {})),
        )
        return str(row["id"])

    async def get_lesson_step_attempts(self, session_id: str, step_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM public.lesson_step_attempts WHERE session_id=$1"
        args: list[Any] = [session_id]
        if step_id:
            sql += " AND step_id=$2"
            args.append(step_id)
        sql += f" ORDER BY attempted_at DESC LIMIT ${len(args)+1}"
        args.append(limit)
        return [_row(row) for row in await postgres_pool().fetch(sql, *args)]

    async def update_word_mastery(self, user_id: str, course_id: str, lesson_id: str, word: str, passed: bool, score: int) -> bool:
        await postgres_pool().execute(
            """INSERT INTO public.word_mastery(user_id,course_id,lesson_id,word,mastery_level,metadata,created_at,updated_at)
               VALUES($1,$2,$3,$4,$5,$6::jsonb,now(),now()) ON CONFLICT(user_id,course_id,lesson_id,word) DO UPDATE SET
               mastery_level=GREATEST(word_mastery.mastery_level,EXCLUDED.mastery_level),metadata=EXCLUDED.metadata,updated_at=now()""",
            user_id, course_id, lesson_id, word.lower(), 1 if passed else 0, json.dumps({"last_score": score, "last_passed": passed}),
        )
        return True

    async def upsert_media_assets(self, assets: List[Dict[str, Any]]) -> None:
        for asset in assets:
            await postgres_pool().execute(
                """INSERT INTO public.media_assets(course_id,lesson_id,section_id,asset_key,bucket,path,type,status,public_url,provider,metadata,created_at,updated_at)
                   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,now(),now()) ON CONFLICT(course_id,lesson_id,section_id,asset_key,path) DO UPDATE SET
                   type=EXCLUDED.type,status=EXCLUDED.status,public_url=EXCLUDED.public_url,provider=EXCLUDED.provider,metadata=EXCLUDED.metadata,updated_at=now()""",
                asset["course_id"], asset["lesson_id"], asset["section_id"], asset["asset_key"], asset["bucket"], asset["path"], asset["type"],
                asset.get("status", "pending"), asset.get("public_url"), asset.get("provider", "supabase"), json.dumps(asset.get("metadata", {})),
            )

    async def get_media_assets(self, course_id: str, lesson_id: str) -> List[Dict[str, Any]]:
        return [_row(row) for row in await postgres_pool().fetch(
            "SELECT * FROM public.media_assets WHERE course_id=$1 AND lesson_id=$2 ORDER BY section_id,asset_key", course_id, lesson_id
        )]


def get_course_repository() -> CourseRepository:
    """Legacy factory; new learner course routes use orm_course_repository."""
    return CourseRepository()
