# backend/repositories/lesson_media_repository.py
"""
Lesson Media Repository - Data Access Layer for media_assets table (PostgreSQL)

De-Mongo Wave 1: PostgreSQL is the sole persistence path.  The ``media_assets``
table uses a BIGINT identity ``id`` as the primary key; repository methods
expose that id as the ``asset_id`` string so the FastAPI lesson-media contract
remains unchanged.
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from database.postgres_connection import postgres_pool

logger = logging.getLogger(__name__)

# Columns writable via update_media_asset (excludes the identity id).
_UPDATE_COLUMNS = {
    "course_id", "lesson_id", "section_id", "asset_key", "bucket", "path",
    "type", "status", "public_url", "provider", "metadata",
}


def _row(row) -> Dict[str, Any]:
    """Map an asyncpg media_assets row into the media asset dict contract."""
    value = dict(row)
    if "id" in value:
        value["asset_id"] = str(value["id"])
    if isinstance(value.get("metadata"), str):
        try:
            value["metadata"] = json.loads(value["metadata"])
        except json.JSONDecodeError:
            pass
    return value


class LessonMediaRepository:
    """
    Repository for media_assets table.
    Stores media assets associated with lessons (video, images, audio).
    """

    # ------------------------------------------------------------------
    # WRITE
    # ------------------------------------------------------------------

    async def create_media_asset(self, asset_data: Dict[str, Any]) -> str:
        """
        Create a new media asset record.
        Returns the inserted row id as string (the ``asset_id`` contract).
        """
        asset_data.setdefault("created_at", datetime.utcnow())
        asset_data.setdefault("updated_at", datetime.utcnow())
        asset_data.setdefault("status", "ready")
        section_id = asset_data.get("section_id") or "root"
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.media_assets
               (course_id, lesson_id, section_id, asset_key, bucket, path,
                type, status, public_url, provider, metadata, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
               RETURNING id""",
            asset_data.get("course_id"),
            asset_data.get("lesson_id"),
            section_id,
            asset_data.get("asset_key"),
            asset_data.get("bucket"),
            asset_data.get("path"),
            asset_data.get("type"),
            asset_data.get("status", "ready"),
            asset_data.get("public_url"),
            asset_data.get("provider", "supabase"),
            json.dumps(asset_data.get("metadata", {})),
            asset_data.get("created_at") or datetime.utcnow(),
            asset_data.get("updated_at") or datetime.utcnow(),
        )
        doc_id = str(row["id"])
        logger.info(
            f"[Media] Created asset: lesson={asset_data.get('lesson_id')} "
            f"type={asset_data.get('type')} id={doc_id}"
        )
        return doc_id

    async def update_media_asset(
        self,
        asset_id: str,
        update_data: Dict[str, Any]
    ) -> bool:
        """Update a media asset record (whitelisted columns)."""
        update_data["updated_at"] = datetime.utcnow()
        sets: List[str] = []
        args: List[Any] = []
        for key, value in update_data.items():
            if key not in _UPDATE_COLUMNS:
                continue
            if key == "metadata":
                args.append(json.dumps(value if isinstance(value, (dict, list)) else {}))
                sets.append(f"metadata=${len(args)}::jsonb")
            elif key == "updated_at":
                args.append(value)
                sets.append(f"updated_at=${len(args)}")
            else:
                args.append(value)
                sets.append(f"{key}=${len(args)}")
        if not sets:
            return False
        args.append(asset_id)
        row = await postgres_pool().fetchrow(
            "UPDATE public.media_assets SET "
            + ", ".join(sets)
            + f" WHERE id=${len(args)}::bigint RETURNING id",
            *args,
        )
        return row is not None

    async def delete_media_asset(self, asset_id: str) -> bool:
        """Delete a media asset record."""
        row = await postgres_pool().fetchrow(
            "DELETE FROM public.media_assets WHERE id=$1::bigint RETURNING id", asset_id
        )
        return row is not None

    async def delete_media_assets(self, asset_ids: List[str]) -> int:
        """Delete multiple media assets by IDs."""
        if not asset_ids:
            return 0
        rows = await postgres_pool().fetch(
            "DELETE FROM public.media_assets WHERE id = ANY($1::bigint[]) RETURNING id",
            [int(a) for a in asset_ids],
        )
        return len(rows)

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_media_by_lesson(
        self,
        lesson_id: str,
        course_id: Optional[str] = None,
        media_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all media assets for a lesson."""
        clauses = ["lesson_id=$1"]
        args: List[Any] = [lesson_id]
        if course_id:
            args.append(course_id)
            clauses.append(f"course_id=${len(args)}")
        if media_type:
            args.append(media_type)
            clauses.append(f"type=${len(args)}")
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.media_assets WHERE "
            + " AND ".join(clauses)
            + " ORDER BY created_at ASC NULLS LAST, id ASC",
            *args,
        )
        return [_row(row) for row in rows]

    async def get_media_by_section(
        self,
        lesson_id: str,
        section_id: str
    ) -> List[Dict[str, Any]]:
        """Get all media assets for a lesson section."""
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.media_assets
               WHERE lesson_id=$1 AND section_id=$2
               ORDER BY created_at ASC NULLS LAST, id ASC""",
            lesson_id, section_id,
        )
        return [_row(row) for row in rows]

    async def get_media_asset(self, asset_id: str) -> Optional[Dict[str, Any]]:
        """Get a single media asset by id."""
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.media_assets WHERE id=$1::bigint", asset_id
        )
        return _row(row) if row else None

    async def get_video_for_lesson(
        self,
        lesson_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get video asset for a lesson (if exists)."""
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.media_assets
               WHERE lesson_id=$1 AND type='video' AND status='ready'
               ORDER BY created_at ASC NULLS LAST, id ASC LIMIT 1""",
            lesson_id,
        )
        return _row(rows[0]) if rows else None

    async def get_images_for_lesson(
        self,
        lesson_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get all image assets for a lesson."""
        rows = await postgres_pool().fetch(
            """SELECT * FROM public.media_assets
               WHERE lesson_id=$1 AND type='image' AND status='ready'
               ORDER BY created_at ASC NULLS LAST, id ASC LIMIT $2""",
            lesson_id, limit,
        )
        return [_row(row) for row in rows]


def get_lesson_media_repository() -> LessonMediaRepository:
    """Factory function for FastAPI dependency injection."""
    return LessonMediaRepository()
