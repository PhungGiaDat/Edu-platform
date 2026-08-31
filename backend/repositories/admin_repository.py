# backend/repositories/admin_repository.py
"""
Admin Repository - PostgreSQL Data Access Layer for Teacher Admin Dashboard

De-Mongo Wave 5: PostgreSQL is the sole persistence path.
All Mongo collections are replaced by Postgres tables.
All methods use raw SQL via ``postgres_pool()`` and return plain dicts.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from database.postgres_connection import postgres_pool
from models.ar_object_contract import ARObjectConfigurationError, serialize_ar_object
import json
import logging
import uuid

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Row helpers — convert asyncpg Records → plain dicts with JSONB parsing
# ---------------------------------------------------------------------------

# Known column sets for dynamic INSERT/UPDATE
COURSE_COLUMNS = {
    "course_id", "title", "title_vi", "description", "description_vi",
    "thumbnail_url", "subtitle_vi", "theme", "category_key", "category_label",
    "category_icon", "age_range", "level", "is_published", "teacher_id",
    "is_active", "created_at", "updated_at",
}
DECK_COLUMNS = {"deck_id", "teacher_id", "is_active", "card_count",
                "created_at", "updated_at"}
FLASHCARD_COLUMNS = {"qr_id", "deck_id", "teacher_id", "ar_tag", "word",
                     "category", "image_url", "audio_url", "difficulty",
                     "image_animation_type", "is_active", "created_at",
                     "updated_at"}


def _parse_jsonb(value: Any) -> Any:
    """Parse an asyncpg JSONB value (returned as str by default) to Python."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return value
    return value


def _row_flashcard(row) -> Dict[str, Any]:
    """Convert a flashcards row: parse translation JSONB, set _id."""
    value = dict(row)
    value["translation"] = _parse_jsonb(value.get("translation"))
    # pronunciation and tags are not columns in the flashcards table; default
    # for backward compatibility with AdminFlashcardResponse.
    value.setdefault("pronunciation", None)
    value.setdefault("tags", [])
    value["_id"] = value.get("qr_id", "")
    return value


def _row_deck(row) -> Dict[str, Any]:
    """Convert a flashcard_decks row: parse JSONB fields, set _id."""
    value = dict(row)
    value["name"] = _parse_jsonb(value.get("name"))
    value["description"] = _parse_jsonb(value.get("description"))
    value["tags"] = _parse_jsonb(value.get("tags")) or []
    value["_id"] = value.get("deck_id", "")
    return value


def _row_course(row) -> Dict[str, Any]:
    """Convert a courses row: set _id, add synthetic fields the response
    models expect (lessons=[], enrollment_count=0, is_template=False)."""
    value = dict(row)
    value["_id"] = value.get("course_id", "")
    value.setdefault("lesson_count", 0)
    value.setdefault("enrollment_count", 0)
    value.setdefault("is_template", False)
    value.setdefault("lessons", [])
    return value


def _row_progress(row) -> Dict[str, Any]:
    """Convert a student_progress row: parse enrollments JSONB, set _id."""
    value = dict(row)
    value["enrollments"] = _parse_jsonb(value.get("enrollments")) or []
    value["_id"] = value.get("user_id", "")
    return value


def _row_learning_goal(row) -> Dict[str, Any]:
    """Convert a learning_goals row: parse settings JSONB, set _id."""
    value = dict(row)
    value["settings"] = _parse_jsonb(value.get("settings")) or {}
    value["_id"] = value.get("user_id", "")
    return value


def _enrich_enrollments(student: Dict[str, Any], course_map: dict) -> Dict[str, Any]:
    """Enrich enrollments with course title/thumbnail (O(1) lookup)."""
    for enrollment in student.get("enrollments", []):
        course = course_map.get(enrollment["course_id"], {})
        enrollment["course_title"] = course.get("title", "Unknown")
        enrollment["course_thumbnail"] = course.get("thumbnail_url", "")
    return student


# ---------------------------------------------------------------------------
# AR object helper
# ---------------------------------------------------------------------------

async def _require_valid_ar_object(ar_tag: str) -> dict:
    """Pre-insert check that an ``ar_tag`` corresponds to a valid AR object.

    Queries ``public.ar_objects`` via ``postgres_pool()`` and validates the
    row through ``serialize_ar_object``.

    Raises:
        ARObjectConfigurationError: with code ``AR_OBJECT_NOT_CONFIGURED``
            when no document exists, or ``AR_OBJECT_SCHEMA_INVALID`` when
            the existing document fails the contract.
    """
    row = await postgres_pool().fetchrow(
        "SELECT * FROM public.ar_objects WHERE ar_tag=$1", ar_tag
    )
    if row is None:
        raise ARObjectConfigurationError("AR_OBJECT_NOT_CONFIGURED")
    raw = dict(row)
    # Synthesize tracking_mode for contract validation (not stored in table)
    if raw.get("mind_catalog_id") is not None and raw.get("mind_target_index") is not None:
        raw["tracking_mode"] = "catalog"
    else:
        raw["tracking_mode"] = "legacy"
    try:
        return serialize_ar_object(raw)
    except Exception as exc:  # pragma: no cover - serializer raises ValidationError
        raise ARObjectConfigurationError("AR_OBJECT_SCHEMA_INVALID") from exc


# ---------------------------------------------------------------------------
# Repository class
# ---------------------------------------------------------------------------

class AdminRepository:
    """
    Repository for admin dashboard operations.
    All queries are scoped to a specific teacher_id.
    """

    def __init__(self, teacher_id: str):
        self.teacher_id = teacher_id
        logger.debug(f"[AdminRepo] Initialized for teacher: {teacher_id}")

    # ========== Dashboard Stats ==========

    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics for the teacher."""
        import asyncio

        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        async def count_students():
            return await postgres_pool().fetchval(
                "SELECT count(*)::int FROM public.student_progress WHERE teacher_id=$1",
                self.teacher_id,
            ) or 0

        async def count_courses():
            return await postgres_pool().fetchval(
                "SELECT count(*)::int FROM public.courses WHERE teacher_id=$1 AND is_active=TRUE",
                self.teacher_id,
            ) or 0

        async def count_flashcards():
            return await postgres_pool().fetchval(
                "SELECT count(*)::int FROM public.flashcards WHERE teacher_id=$1 AND is_active=TRUE",
                self.teacher_id,
            ) or 0

        async def count_decks():
            return await postgres_pool().fetchval(
                "SELECT count(*)::int FROM public.flashcard_decks WHERE teacher_id=$1 AND is_active=TRUE",
                self.teacher_id,
            ) or 0

        async def count_active_sessions():
            student_ids = await _get_student_ids()
            if not student_ids:
                return 0
            return await postgres_pool().fetchval(
                """SELECT count(*)::int FROM public.usage_sessions
                   WHERE user_id = ANY($1::text[]) AND is_active=TRUE
                     AND started_at >= $2""",
                student_ids, today_start,
            ) or 0

        async def avg_progress():
            row = await postgres_pool().fetchval(
                """SELECT COALESCE(AVG((enr->>'progress_percent')::numeric), 0)
                   FROM public.student_progress sp,
                        jsonb_array_elements(COALESCE(sp.enrollments, '[]'::jsonb)) AS enr
                   WHERE sp.teacher_id=$1""",
                self.teacher_id,
            )
            return float(row) if row is not None else 0.0

        async def count_students_this_week():
            return await postgres_pool().fetchval(
                """SELECT count(*)::int FROM public.student_progress
                   WHERE teacher_id=$1 AND last_active >= $2""",
                self.teacher_id, week_ago,
            ) or 0

        async def top_students():
            rows = await postgres_pool().fetch(
                """SELECT user_id, user_name, user_avatar, total_xp, streak_days, last_active
                   FROM public.student_progress
                   WHERE teacher_id=$1
                   ORDER BY total_xp DESC
                   LIMIT 5""",
                self.teacher_id,
            )
            return [dict(r) for r in rows]

        async def _get_student_ids():
            rows = await postgres_pool().fetch(
                "SELECT DISTINCT user_id FROM public.student_progress WHERE teacher_id=$1",
                self.teacher_id,
            )
            return [r["user_id"] for r in rows]

        # Execute all counts in parallel
        student_count, course_count, flashcard_count, deck_count, active_sessions, \
            avg_progress_value, students_this_week, top = await asyncio.gather(
            count_students(),
            count_courses(),
            count_flashcards(),
            count_decks(),
            count_active_sessions(),
            avg_progress(),
            count_students_this_week(),
            top_students(),
        )

        return {
            "total_students": student_count,
            "total_courses": course_count,
            "total_flashcards": flashcard_count,
            "total_decks": deck_count,
            "active_sessions": active_sessions,
            "average_progress": round(avg_progress_value, 1),
            "total_enrollments": student_count,  # Simplified for now
            "students_this_week": students_this_week,
            "lessons_completed_today": 0,  # Would need session tracking
            "top_students": top,
        }

    # ========== Courses ==========

    async def get_courses(
        self,
        skip: int = 0,
        limit: int = 20,
        include_unpublished: bool = True,
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get all courses for this teacher with pagination."""
        clause = "teacher_id=$1 AND is_active=TRUE"
        params: List[Any] = [self.teacher_id]
        if not include_unpublished:
            clause += " AND is_published=TRUE"

        total = await postgres_pool().fetchval(
            f"SELECT count(*)::int FROM public.courses WHERE {clause}",
            *params,
        ) or 0

        rows = await postgres_pool().fetch(
            f"""SELECT c.*,
                       (SELECT count(*)::int FROM public.lessons
                        WHERE course_id=c.course_id) AS lesson_count
                FROM public.courses c
                WHERE {clause}
                ORDER BY c.created_at DESC NULLS LAST
                OFFSET ${len(params) + 1} LIMIT ${len(params) + 2}""",
            *params, skip, limit,
        )
        return [_row_course(r) for r in rows], total

    async def get_course_by_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific course by ID."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.courses WHERE course_id=$1 AND teacher_id=$2",
            course_id, self.teacher_id,
        )
        if row is None:
            return None
        course = _row_course(row)
        # Attach lessons from the lessons table
        lesson_rows = await postgres_pool().fetch(
            """SELECT * FROM public.lessons
               WHERE course_id=$1 ORDER BY lesson_order ASC""",
            course_id,
        )
        course["lessons"] = [dict(r) for r in lesson_rows]
        course["lesson_count"] = len(course["lessons"])
        return course

    async def create_course(self, course_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new course."""
        now = datetime.utcnow()
        course_data["course_id"] = course_data.get("course_id", str(uuid.uuid4()))
        course_data["teacher_id"] = self.teacher_id
        course_data["created_at"] = now
        course_data["updated_at"] = now
        course_data.setdefault("is_active", True)

        lessons_raw = course_data.pop("lessons", [])

        # Build dynamic INSERT for known course columns
        cols = [col for col in COURSE_COLUMNS if col in course_data]
        if not cols:
            cols = ["course_id", "teacher_id", "created_at", "updated_at"]
        vals = [course_data[col] for col in cols]
        placeholders = ", ".join(f"${i}" for i in range(1, len(vals) + 1))

        row = await postgres_pool().fetchrow(
            f"INSERT INTO public.courses ({', '.join(cols)}) VALUES ({placeholders}) RETURNING course_id",
            *vals,
        )
        course_id = row["course_id"]

        # Insert lessons into public.lessons if present
        for i, lesson in enumerate(lessons_raw):
            lesson_id = lesson.get("lesson_id", str(uuid.uuid4()))
            await postgres_pool().fetchrow(
                """INSERT INTO public.lessons
                       (lesson_id, course_id, title, title_vi, description,
                        lesson_order, duration_minutes, content)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   ON CONFLICT (lesson_id) DO NOTHING""",
                lesson_id,
                course_id,
                lesson.get("title", ""),
                lesson.get("title_vi", ""),
                lesson.get("description", ""),
                i + 1,
                lesson.get("duration_minutes", 3),
                lesson.get("content", ""),
            )

        return {
            "course_id": course_id,
            **course_data,
            "_id": course_id,
            "lesson_count": len(lessons_raw),
            "lessons": lessons_raw,
            "enrollment_count": 0,
        }

    async def update_course(self, course_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a course. Returns True if a row was updated."""
        update_data["updated_at"] = datetime.utcnow()
        # Handle lessons separately if present
        lessons_update = update_data.pop("lessons", None)

        set_clauses = []
        values: List[Any] = [course_id, self.teacher_id]
        for key in sorted(k for k in update_data if k in COURSE_COLUMNS):
            set_clauses.append(f"{key} = ${len(values) + 1}")
            values.append(update_data[key])
        if not set_clauses:
            return False

        row = await postgres_pool().fetchrow(
            f"""UPDATE public.courses
                SET {', '.join(set_clauses)}
                WHERE course_id=$1 AND teacher_id=$2 AND is_active=TRUE
                RETURNING course_id""",
            *values,
        )
        if row is None:
            return False

        # Replace lessons if provided
        if lessons_update is not None:
            await postgres_pool().execute(
                "DELETE FROM public.lessons WHERE course_id=$1", course_id,
            )
            for i, lesson in enumerate(lessons_update):
                lesson_id = lesson.get("lesson_id", str(uuid.uuid4()))
                await postgres_pool().fetchrow(
                    """INSERT INTO public.lessons
                           (lesson_id, course_id, title, title_vi, description,
                            lesson_order, duration_minutes, content)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                       ON CONFLICT (lesson_id) DO NOTHING""",
                    lesson_id, course_id,
                    lesson.get("title", ""), lesson.get("title_vi", ""),
                    lesson.get("description", ""), i + 1,
                    lesson.get("duration_minutes", 3), lesson.get("content", ""),
                )

        return True

    async def delete_course(self, course_id: str) -> bool:
        """Soft delete a course — sets is_active=False and deleted_at."""
        row = await postgres_pool().fetchrow(
            """UPDATE public.courses
               SET is_active=FALSE, deleted_at=$3, updated_at=$3
               WHERE course_id=$1 AND teacher_id=$2 AND is_active=TRUE
               RETURNING course_id""",
            course_id, self.teacher_id, datetime.utcnow(),
        )
        return row is not None

    # ========== Flashcard Decks ==========

    async def get_decks(
        self,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get all flashcard decks for this teacher."""
        total = await postgres_pool().fetchval(
            "SELECT count(*)::int FROM public.flashcard_decks WHERE teacher_id=$1 AND is_active=TRUE",
            self.teacher_id,
        ) or 0

        rows = await postgres_pool().fetch(
            """SELECT * FROM public.flashcard_decks
               WHERE teacher_id=$1 AND is_active=TRUE
               ORDER BY created_at DESC NULLS LAST
               OFFSET $2 LIMIT $3""",
            self.teacher_id, skip, limit,
        )
        return [_row_deck(r) for r in rows], total

    async def get_deck_by_id(self, deck_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific deck."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.flashcard_decks WHERE deck_id=$1 AND teacher_id=$2",
            deck_id, self.teacher_id,
        )
        return _row_deck(row) if row else None

    async def create_deck(self, deck_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new flashcard deck."""
        now = datetime.utcnow()
        deck_data["deck_id"] = deck_data.get("deck_id", str(uuid.uuid4()))
        deck_data["teacher_id"] = self.teacher_id
        deck_data["created_at"] = now
        deck_data["updated_at"] = now
        deck_data.setdefault("is_active", True)
        deck_data.setdefault("card_count", 0)

        # Serialize JSONB fields
        for jcol in ("name", "description", "tags"):
            val = deck_data.get(jcol)
            if val is not None and not isinstance(val, str):
                deck_data[jcol] = json.dumps(val, ensure_ascii=False)

        allowed = DECK_COLUMNS | {"name", "description", "category", "tags",
                                  "cover_image_url"}
        cols = [col for col in allowed if col in deck_data]
        vals = [deck_data[col] for col in cols]
        placeholders = ", ".join(f"${i}" for i in range(1, len(vals) + 1))

        row = await postgres_pool().fetchrow(
            f"INSERT INTO public.flashcard_decks ({', '.join(cols)}) VALUES ({placeholders}) RETURNING deck_id",
            *vals,
        )
        deck_data["_id"] = row["deck_id"]
        return deck_data

    async def update_deck(self, deck_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a flashcard deck."""
        update_data["updated_at"] = datetime.utcnow()
        # Serialize JSONB fields
        for jcol in ("name", "description", "tags"):
            val = update_data.get(jcol)
            if val is not None and not isinstance(val, str):
                update_data[jcol] = json.dumps(val, ensure_ascii=False)

        set_clauses = []
        values: List[Any] = [deck_id, self.teacher_id]
        allowed = DECK_COLUMNS | {"name", "description", "category", "tags",
                                  "cover_image_url"}
        for key in sorted(k for k in update_data if k in allowed):
            set_clauses.append(f"{key} = ${len(values) + 1}")
            values.append(update_data[key])
        if not set_clauses:
            return False

        row = await postgres_pool().fetchrow(
            f"""UPDATE public.flashcard_decks
                SET {', '.join(set_clauses)}
                WHERE deck_id=$1 AND teacher_id=$2 AND is_active=TRUE
                RETURNING deck_id""",
            *values,
        )
        return row is not None

    async def delete_deck(self, deck_id: str) -> bool:
        """Soft delete a flashcard deck."""
        return await self.update_deck(deck_id, {"is_active": False})

    # ========== Flashcards ==========

    async def get_flashcards(
        self,
        deck_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get flashcards with optional deck filtering."""
        clause = "teacher_id=$1 AND is_active=TRUE"
        params: List[Any] = [self.teacher_id]
        if deck_id:
            clause += " AND deck_id=$2"
            params.append(deck_id)

        total = await postgres_pool().fetchval(
            f"SELECT count(*)::int FROM public.flashcards WHERE {clause}",
            *params,
        ) or 0

        rows = await postgres_pool().fetch(
            f"""SELECT * FROM public.flashcards
                WHERE {clause}
                ORDER BY created_at DESC NULLS LAST
                OFFSET ${len(params) + 1} LIMIT ${len(params) + 2}""",
            *params, skip, limit,
        )
        return [_row_flashcard(r) for r in rows], total

    async def get_flashcard_by_id(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific flashcard."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.flashcards WHERE qr_id=$1 AND teacher_id=$2",
            qr_id, self.teacher_id,
        )
        return _row_flashcard(row) if row else None

    async def create_flashcard(self, card_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a flashcard. When ``ar_tag`` is supplied, the AR object must
        already exist and validate; no AR object is created or modified here.
        """
        now = datetime.utcnow()
        card_data["teacher_id"] = self.teacher_id
        card_data["created_at"] = now
        card_data["updated_at"] = now
        card_data.setdefault("is_active", True)

        # Auto-generate ar_tag from qr_id if not provided
        if not card_data.get("ar_tag") and card_data.get("qr_id"):
            card_data["ar_tag"] = card_data["qr_id"].lower().replace("-", "_") + "_marker"

        ar_tag = card_data.get("ar_tag")
        if ar_tag:
            await _require_valid_ar_object(ar_tag)

        # Serialize translation JSONB
        if "translation" in card_data and not isinstance(card_data["translation"], str):
            card_data["translation"] = json.dumps(card_data["translation"], ensure_ascii=False)

        # Build dynamic INSERT for known flashcard columns
        cols = [col for col in FLASHCARD_COLUMNS if col in card_data]
        if not cols:
            raise ValueError("create_flashcard requires at least one writable column")
        vals = [card_data[col] for col in cols]
        placeholders = ", ".join(f"${i}" for i in range(1, len(vals) + 1))

        row = await postgres_pool().fetchrow(
            f"INSERT INTO public.flashcards ({', '.join(cols)}) VALUES ({placeholders}) RETURNING qr_id",
            *vals,
        )
        qr_id = row["qr_id"]

        # Update deck card count
        if card_data.get("deck_id"):
            await self._update_deck_card_count(card_data["deck_id"])

        result = dict(card_data)
        result["_id"] = qr_id
        # Ensure pronunciation/tags are present for response models
        result.setdefault("pronunciation", None)
        result.setdefault("tags", [])
        return result

    # Legacy private helper retained as a no-op so older callers/tests that
    # imported ``_ensure_ar_object`` continue to receive an attribute. New
    # code must use ``_require_valid_ar_object`` instead.
    async def _ensure_ar_object(self, ar_tag: str, image_url: Optional[str] = None) -> None:
        """Deprecated. AR objects are now configured explicitly via
        ``ARObjectRepository.create_validated``. This method is kept as a
        no-op to preserve the import surface for older tests; it never
        writes to the database.
        """
        logger.warning(
            "[AdminRepo] _ensure_ar_object is deprecated and does nothing; "
            "configure AR objects via ARObjectRepository.create_validated()."
        )
        return None

    async def update_flashcard(self, qr_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a flashcard."""
        update_data["updated_at"] = datetime.utcnow()
        # Serialize translation if present
        if "translation" in update_data and not isinstance(update_data["translation"], str):
            update_data["translation"] = json.dumps(update_data["translation"], ensure_ascii=False)

        set_clauses = []
        values: List[Any] = [qr_id, self.teacher_id]
        for key in sorted(k for k in update_data if k in FLASHCARD_COLUMNS):
            set_clauses.append(f"{key} = ${len(values) + 1}")
            values.append(update_data[key])
        if not set_clauses:
            return False

        row = await postgres_pool().fetchrow(
            f"""UPDATE public.flashcards
                SET {', '.join(set_clauses)}
                WHERE qr_id=$1 AND teacher_id=$2 AND is_active=TRUE
                RETURNING qr_id""",
            *values,
        )
        return row is not None

    async def delete_flashcard(self, qr_id: str) -> bool:
        """Soft delete a flashcard."""
        # Get card to know deck_id before soft-delete
        card = await self.get_flashcard_by_id(qr_id)
        if card and card.get("deck_id"):
            await self._update_deck_card_count(card["deck_id"], decrement=True)

        row = await postgres_pool().fetchrow(
            """UPDATE public.flashcards
               SET is_active=FALSE, updated_at=$3
               WHERE qr_id=$1 AND teacher_id=$2 AND is_active=TRUE
               RETURNING qr_id""",
            qr_id, self.teacher_id, datetime.utcnow(),
        )
        return row is not None

    async def _update_deck_card_count(self, deck_id: str, decrement: bool = False):
        """Update the card count for a deck."""
        sign = "- 1" if decrement else "+ 1"
        await postgres_pool().execute(
            f"""UPDATE public.flashcard_decks
                SET card_count = GREATEST(0, card_count {sign})
                WHERE deck_id=$1""",
            deck_id,
        )

    # ========== Students ==========

    async def get_students(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get students enrolled in teacher's courses."""
        clause = "teacher_id=$1"
        params: List[Any] = [self.teacher_id]
        if search:
            escaped = search.strip()[:50]
            clause += " AND (user_name ILIKE $2 OR user_id ILIKE $2)"
            params.append(f"%{escaped}%")

        total = await postgres_pool().fetchval(
            f"SELECT count(*)::int FROM public.student_progress WHERE {clause}",
            *params,
        ) or 0

        rows = await postgres_pool().fetch(
            f"""SELECT * FROM public.student_progress
                WHERE {clause}
                ORDER BY last_active DESC NULLS LAST
                OFFSET ${len(params) + 1} LIMIT ${len(params) + 2}""",
            *params, skip, limit,
        )
        return [_row_progress(r) for r in rows], total

    async def get_student_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific student's progress."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.student_progress WHERE user_id=$1 AND teacher_id=$2",
            user_id, self.teacher_id,
        )
        return _row_progress(row) if row else None

    async def get_student_progress(self, user_id: str) -> Dict[str, Any]:
        """Get detailed progress for a student (enriched with course info)."""
        student = await self.get_student_by_id(user_id)
        if not student:
            return {}

        # Batch fetch course details
        course_ids = [e["course_id"] for e in student.get("enrollments", [])]
        courses = []
        if course_ids:
            rows = await postgres_pool().fetch(
                "SELECT course_id, title, thumbnail_url FROM public.courses WHERE course_id = ANY($1::text[])",
                course_ids,
            )
            courses = [dict(r) for r in rows]

        course_map = {c["course_id"]: c for c in courses}
        return _enrich_enrollments(student, course_map)

    # ========== Analytics ==========

    async def get_progress_analytics(
        self,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get progress analytics for the teacher."""
        start_date = datetime.utcnow() - timedelta(days=days)

        # Progress trends by date
        progress_rows = await postgres_pool().fetch(
            """SELECT sp.date::text AS date,
                       COALESCE(AVG((enr->>'progress_percent')::numeric), 0) AS avg_progress,
                       count(*)::int AS count
                FROM (
                    SELECT updated_at::date AS date, enrollments
                    FROM public.student_progress
                    WHERE teacher_id=$1 AND updated_at >= $2
                ) sp,
                jsonb_array_elements(COALESCE(sp.enrollments, '[]'::jsonb)) AS enr
                GROUP BY sp.date
                ORDER BY sp.date
                LIMIT 30""",
            self.teacher_id, start_date,
        )
        progress_trends = [
            {
                "date": str(r["date"]),
                "avg_progress": float(r["avg_progress"] or 0),
                "count": r["count"],
            }
            for r in progress_rows
        ]

        # XP distribution buckets
        xp_rows = await postgres_pool().fetch(
            """SELECT
                    CASE
                        WHEN total_xp < 100 THEN '0-100'
                        WHEN total_xp < 500 THEN '100-500'
                        WHEN total_xp < 1000 THEN '500-1000'
                        WHEN total_xp < 5000 THEN '1000-5000'
                        WHEN total_xp < 10000 THEN '5000-10000'
                        ELSE 'Other'
                    END AS range,
                    count(*)::int AS count
                FROM public.student_progress
                WHERE teacher_id=$1
                GROUP BY range
                ORDER BY range""",
            self.teacher_id,
        )
        xp_distribution = [
            {"range": r["range"], "count": r["count"]}
            for r in xp_rows
        ]

        return {
            "progress_trends": progress_trends,
            "xp_distribution": xp_distribution,
        }

    async def get_engagement_analytics(self) -> Dict[str, Any]:
        """Get engagement metrics."""
        # Activity by day of week (ISODOW: 1=Monday .. 7=Sunday)
        activity_rows = await postgres_pool().fetch(
            """SELECT EXTRACT(ISODOW FROM last_active)::int AS day,
                       count(*)::int AS count
                FROM public.student_progress
                WHERE teacher_id=$1 AND last_active IS NOT NULL
                GROUP BY day
                ORDER BY day""",
            self.teacher_id,
        )
        activity_by_day = [
            {"day": r["day"], "count": r["count"]}
            for r in activity_rows
        ]

        # Session stats
        student_ids = await self._get_teacher_student_ids()
        session_stats: Dict[str, Any] = {
            "avg_session_time": 0,
            "total_sessions": 0,
            "avg_xp": 0,
        }
        if student_ids:
            row = await postgres_pool().fetchrow(
                """SELECT
                        COALESCE(AVG(total_active_seconds), 0)::int AS avg_session_time,
                        count(*)::int AS total_sessions,
                        COALESCE(AVG(xp_earned), 0)::int AS avg_xp
                    FROM public.usage_sessions
                    WHERE user_id = ANY($1::text[]) AND is_active=FALSE""",
                student_ids,
            )
            if row:
                session_stats = dict(row)

        return {
            "activity_by_day": activity_by_day,
            "session_stats": session_stats,
        }

    async def _get_teacher_student_ids(self) -> List[str]:
        """Get all student user IDs enrolled under this teacher."""
        rows = await postgres_pool().fetch(
            "SELECT DISTINCT user_id FROM public.student_progress WHERE teacher_id=$1",
            self.teacher_id,
        )
        return [r["user_id"] for r in rows]

    # ========== Learning Goals ==========

    async def get_learning_goal(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get learning goal settings for a student."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.learning_goals WHERE user_id=$1 AND teacher_id=$2",
            user_id, self.teacher_id,
        )
        return _row_learning_goal(row) if row else None

    async def set_learning_goal(self, user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Set or update learning goal for a student (upsert)."""
        now = datetime.utcnow()

        # Serialize settings to JSONB
        settings_json = json.dumps(settings, ensure_ascii=False) if not isinstance(settings, str) else settings

        await postgres_pool().fetchrow(
            """INSERT INTO public.learning_goals
                   (user_id, teacher_id, settings, updated_at)
               VALUES ($1, $2, $3::jsonb, $4)
               ON CONFLICT (user_id, teacher_id)
               DO UPDATE SET
                   settings = EXCLUDED.settings,
                   updated_at = EXCLUDED.updated_at
               RETURNING user_id""",
            user_id, self.teacher_id, settings_json, now,
        )

        return await self.get_learning_goal(user_id) or {
            "user_id": user_id,
            "teacher_id": self.teacher_id,
            "settings": settings,
            "current_streak": 0,
            "longest_streak": 0,
            "total_xp_earned": 0,
            "total_minutes_learned": 0,
        }

    async def get_all_learning_goals(
        self,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get all learning goals for the teacher's students."""
        total = await postgres_pool().fetchval(
            "SELECT count(*)::int FROM public.learning_goals WHERE teacher_id=$1",
            self.teacher_id,
        ) or 0

        rows = await postgres_pool().fetch(
            """SELECT * FROM public.learning_goals
               WHERE teacher_id=$1
               ORDER BY updated_at DESC NULLS LAST
               OFFSET $2 LIMIT $3""",
            self.teacher_id, skip, limit,
        )
        return [_row_learning_goal(r) for r in rows], total


def get_admin_repository(teacher_id: str) -> AdminRepository:
    """Factory function to create AdminRepository instance."""
    return AdminRepository(teacher_id)