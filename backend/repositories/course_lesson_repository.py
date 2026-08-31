# backend/repositories/course_lesson_repository.py
"""
CourseLesson Repository - CRUD operations for course lessons (PostgreSQL only)

De-Mongo Wave 1: PostgreSQL is the sole persistence path.  The Beanie
``CourseLesson`` document is not initialized at runtime, so this repository
was rewritten to raw SQL against ``public.lessons``.  Methods return plain
``Dict[str, Any]`` rows (keys matching the CourseLesson model), not Beanie
documents.
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from database.postgres_connection import postgres_pool
from models.course_lesson import LessonStatus, LessonType, VocabularyItem

logger = logging.getLogger(__name__)

# Beanie model field -> Postgres lessons column
_COLUMN_MAP: Dict[str, str] = {
    "lesson_id": "lesson_id",
    "course_id": "course_id",
    "title": "title",
    "title_vi": "title_vi",
    "description": "description",
    "order": "lesson_order",
    "lesson_type": "lesson_type",
    "status": "status",
    "duration_minutes": "duration_minutes",
    "xp_reward": "xp_reward",
    "created_by": "created_by",
    "vocabulary_items": "vocabulary_items",
    "total_attempts": "total_attempts",
    "completion_rate": "completion_rate",
    "average_score": "average_score",
    "created_at": "created_at",
    "updated_at": "updated_at",
    "published_at": "published_at",
    "archived_at": "archived_at",
}


def _row(row) -> Dict[str, Any]:
    """Map an asyncpg lessons row into a CourseLesson-shaped dict."""
    value = dict(row)
    for key in ("vocabulary_items", "video", "media", "learning_blocks",
                "reward", "ar_reference", "generated_media"):
        item = value.get(key)
        if isinstance(item, str):
            try:
                value[key] = json.loads(item)
            except json.JSONDecodeError:
                pass
    if "lesson_order" in value:
        value["order"] = value.pop("lesson_order")
    return value


class CourseLessonRepository:
    """Repository for lessons table (PostgreSQL)."""

    async def create_lesson(
        self,
        lesson_id: str,
        course_id: str,
        title: str,
        title_vi: str = "",
        description: Optional[str] = None,
        order: int = 0,
        lesson_type: LessonType = LessonType.MIXED,
        created_by: str = "system",
        duration_minutes: int = 5,
        xp_reward: int = 50,
        status: LessonStatus = LessonStatus.DRAFT
    ) -> Dict[str, Any]:
        """Create a new course lesson."""
        await postgres_pool().execute(
            """INSERT INTO public.lessons
               (lesson_id, course_id, title, title_vi, description, lesson_order,
                lesson_type, created_by, duration_minutes, xp_reward, status,
                created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now())""",
            lesson_id, course_id, title, title_vi, description, order,
            lesson_type.value, created_by, duration_minutes, xp_reward, status.value,
        )
        logger.info(f"✅ [Lesson] Created: {lesson_id}")
        return await self.get_lesson(lesson_id)

    async def get_lesson(self, lesson_id: str) -> Optional[Dict[str, Any]]:
        """Get a lesson by lesson_id."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.lessons WHERE lesson_id=$1", lesson_id
        )
        return _row(row) if row else None

    async def get_lesson_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        """Get a lesson by id (lesson_id is the identity in Postgres)."""
        return await self.get_lesson(id)

    async def get_course_lessons(
        self,
        course_id: str,
        status: Optional[LessonStatus] = None,
        lesson_type: Optional[LessonType] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Get all lessons for a course, ordered by lesson_order."""
        clauses = ["course_id=$1"]
        args: List[Any] = [course_id]
        if status:
            args.append(status.value)
            clauses.append(f"status=${len(args)}")
        if lesson_type:
            args.append(lesson_type.value)
            clauses.append(f"lesson_type=${len(args)}")
        args.append(skip)
        args.append(limit)
        sql = (
            "SELECT * FROM public.lessons WHERE "
            + " AND ".join(clauses)
            + f" ORDER BY lesson_order OFFSET ${len(args)-1} LIMIT ${len(args)}"
        )
        rows = await postgres_pool().fetch(sql, *args)
        return [_row(row) for row in rows]

    async def get_published_lessons(
        self,
        course_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get published lessons for a course."""
        return await self.get_course_lessons(
            course_id,
            status=LessonStatus.PUBLISHED,
            limit=limit,
        )

    async def update_lesson(
        self,
        lesson_id: str,
        **updates
    ) -> Optional[Dict[str, Any]]:
        """Update a lesson's fields (whitelisted column mapping)."""
        sets: List[str] = []
        args: List[Any] = []
        for key, value in updates.items():
            column = _COLUMN_MAP.get(key)
            if column is None:
                continue  # model-only field (e.g. updated_by) with no column
            if isinstance(value, (LessonStatus, LessonType)):
                value = value.value
            if isinstance(value, datetime):
                value = value.isoformat()
            if column in ("vocabulary_items",):
                value = json.dumps(value, default=str)
            args.append(value)
            sets.append(f"{column}=${len(args)}")
        if not sets:
            return await self.get_lesson(lesson_id)

        args.append(lesson_id)
        sql = (
            "UPDATE public.lessons SET "
            + ", ".join(sets)
            + f", updated_at=now() WHERE lesson_id=${len(args)} RETURNING *"
        )
        row = await postgres_pool().fetchrow(sql, *args)
        return _row(row) if row else None

    async def publish_lesson(self, lesson_id: str) -> Optional[Dict[str, Any]]:
        """Publish a lesson."""
        row = await postgres_pool().fetchrow(
            """UPDATE public.lessons
               SET status='published', published_at=now(), updated_at=now()
               WHERE lesson_id=$1 RETURNING *""",
            lesson_id,
        )
        return _row(row) if row else None

    async def archive_lesson(self, lesson_id: str) -> Optional[Dict[str, Any]]:
        """Archive a lesson."""
        row = await postgres_pool().fetchrow(
            """UPDATE public.lessons
               SET status='archived', archived_at=now(), updated_at=now()
               WHERE lesson_id=$1 RETURNING *""",
            lesson_id,
        )
        return _row(row) if row else None

    async def delete_lesson(self, lesson_id: str) -> bool:
        """Delete a lesson (soft delete by archiving)."""
        lesson = await self.archive_lesson(lesson_id)
        return lesson is not None

    async def add_vocabulary_item(
        self,
        lesson_id: str,
        vocabulary_item: VocabularyItem
    ) -> Optional[Dict[str, Any]]:
        """Add a vocabulary item to a lesson."""
        row = await postgres_pool().fetchrow(
            """UPDATE public.lessons
               SET vocabulary_items = COALESCE(vocabulary_items, '[]'::jsonb) || $2::jsonb,
                   updated_at = now()
               WHERE lesson_id=$1 RETURNING *""",
            lesson_id,
            json.dumps([vocabulary_item.model_dump(mode="json")], default=str),
        )
        return _row(row) if row else None

    async def update_lesson_stats(
        self,
        lesson_id: str,
        total_attempts: int = 0,
        completion_rate: float = 0.0,
        average_score: float = 0.0
    ) -> Optional[Dict[str, Any]]:
        """Update lesson statistics (called after student attempts)."""
        sets: List[str] = []
        args: List[Any] = []
        if total_attempts:
            args.append(total_attempts)
            sets.append(f"total_attempts=${len(args)}")
        if completion_rate >= 0:
            args.append(float(completion_rate))
            sets.append(f"completion_rate=${len(args)}")
        if average_score >= 0:
            args.append(float(average_score))
            sets.append(f"average_score=${len(args)}")
        if not sets:
            return await self.get_lesson(lesson_id)
        args.append(lesson_id)
        sql = (
            "UPDATE public.lessons SET "
            + ", ".join(sets)
            + f", updated_at=now() WHERE lesson_id=${len(args)} RETURNING *"
        )
        row = await postgres_pool().fetchrow(sql, *args)
        return _row(row) if row else None

    async def get_creator_lessons(
        self,
        created_by: str,
        status: Optional[LessonStatus] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get lessons created by a specific user."""
        clauses = ["created_by=$1"]
        args: List[Any] = [created_by]
        if status:
            args.append(status.value)
            clauses.append(f"status=${len(args)}")
        args.append(limit)
        sql = (
            "SELECT * FROM public.lessons WHERE "
            + " AND ".join(clauses)
            + f" ORDER BY created_at DESC NULLS LAST LIMIT ${len(args)}"
        )
        rows = await postgres_pool().fetch(sql, *args)
        return [_row(row) for row in rows]

    async def search_lessons(
        self,
        query_text: str,
        status: Optional[LessonStatus] = None,
        lesson_type: Optional[LessonType] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Search lessons by title / title_vi / description (ILIKE)."""
        clauses = [
            "(title ILIKE $1 OR title_vi ILIKE $1 OR COALESCE(description,'') ILIKE $1)"
        ]
        args: List[Any] = [f"%{query_text}%"]
        if status:
            args.append(status.value)
            clauses.append(f"status=${len(args)}")
        if lesson_type:
            args.append(lesson_type.value)
            clauses.append(f"lesson_type=${len(args)}")
        args.append(limit)
        sql = (
            "SELECT * FROM public.lessons WHERE "
            + " AND ".join(clauses)
            + f" ORDER BY lesson_order LIMIT ${len(args)}"
        )
        rows = await postgres_pool().fetch(sql, *args)
        return [_row(row) for row in rows]

    async def list_all(
        self,
        status: Optional[LessonStatus] = None,
        lesson_type: Optional[LessonType] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """List all lessons across courses with pagination and optional filters."""
        clauses: List[str] = []
        args: List[Any] = []
        arg_idx = 0
        if status:
            arg_idx += 1
            args.append(status.value)
            clauses.append(f"status=${arg_idx}")
        if lesson_type:
            arg_idx += 1
            args.append(lesson_type.value)
            clauses.append(f"lesson_type=${arg_idx}")
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        arg_idx += 1
        args.append(skip)
        arg_idx += 1
        args.append(limit)
        sql = (
            "SELECT * FROM public.lessons"
            + where
            + f" ORDER BY lesson_order OFFSET ${arg_idx-1} LIMIT ${arg_idx}"
        )
        rows = await postgres_pool().fetch(sql, *args)
        return [_row(row) for row in rows]

    async def get_course_lesson_count(self, course_id: str) -> int:
        """Count lessons in a course."""
        row = await postgres_pool().fetchrow(
            "SELECT count(*) AS count FROM public.lessons WHERE course_id=$1", course_id
        )
        return int(row["count"]) if row else 0

    async def reorder_lessons(
        self,
        course_id: str,
        lesson_orders: Dict[str, int]
    ) -> int:
        """Reorder lessons in a course (lesson_id -> new_order)."""
        updated = 0
        for lesson_id, new_order in lesson_orders.items():
            row = await postgres_pool().fetchrow(
                """UPDATE public.lessons
                   SET lesson_order=$2, updated_at=now()
                   WHERE lesson_id=$1 AND course_id=$3 RETURNING lesson_id""",
                lesson_id, new_order, course_id,
            )
            if row:
                updated += 1
        logger.info(f"📝 [Lessons] Reordered {updated} lessons in course {course_id}")
        return updated


# Singleton instance
course_lesson_repo = CourseLessonRepository()


def get_course_lesson_repository() -> CourseLessonRepository:
    return course_lesson_repo
