"""SQLAlchemy access to canonical learner media assets."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.orm_models.learner import CourseORM, MediaAssetORM


class MediaAssetRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_ready_asset(self, course_id: str, lesson_id: str, section_id: str, asset_key: str) -> MediaAssetORM | None:
        """Resolve one canonical asset, preferring its exact Lesson binding.

        Vocabulary roles are reusable across a Course. LC10 stores each asset
        once under its owner Lesson, while another Lesson may reference the
        same authored vocabulary ID. A unique course-wide semantic key is safe
        to reuse; ambiguity remains a hard failure.
        """
        rows = (await self.session.execute(
            select(MediaAssetORM)
            .where(
                MediaAssetORM.course_id == course_id,
                MediaAssetORM.lesson_id == lesson_id,
                MediaAssetORM.section_id == section_id,
                MediaAssetORM.asset_key == asset_key,
                MediaAssetORM.status == "ready",
            )
            .order_by(MediaAssetORM.updated_at.desc().nulls_last(), MediaAssetORM.id.desc())
        )).scalars().all()
        if len(rows) > 1:
            raise ValueError(f"Ambiguous ready media asset for {section_id}/{asset_key}")
        if rows:
            return rows[0]

        course_rows = (await self.session.execute(
            select(MediaAssetORM)
            .where(
                MediaAssetORM.course_id == course_id,
                MediaAssetORM.section_id == section_id,
                MediaAssetORM.asset_key == asset_key,
                MediaAssetORM.status == "ready",
            )
            .order_by(MediaAssetORM.updated_at.desc().nulls_last(), MediaAssetORM.id.desc())
        )).scalars().all()
        if len(course_rows) > 1:
            raise ValueError(f"Ambiguous ready Course media asset for {section_id}/{asset_key}")
        return course_rows[0] if course_rows else None

    async def get_course_cover_url(self, course_id: str) -> str | None:
        return (await self.session.execute(
            select(CourseORM.thumbnail_url).where(CourseORM.course_id == course_id)
        )).scalar_one_or_none()

    async def set_course_cover_url(self, course_id: str, public_url: str) -> str:
        course = (await self.session.execute(
            select(CourseORM).where(CourseORM.course_id == course_id)
        )).scalar_one_or_none()
        if course is None:
            raise ValueError(f"Missing canonical Course owner {course_id}")
        state = "unchanged" if course.thumbnail_url == public_url else "updated"
        if state == "updated":
            course.thumbnail_url = public_url
            course.updated_at = datetime.now(timezone.utc)
        return state

    async def upsert_ready_asset(self, values: dict[str, Any]) -> str:
        """Upsert one semantic learner asset without committing the session."""
        rows = (await self.session.execute(
            select(MediaAssetORM).where(
                MediaAssetORM.course_id == values["course_id"],
                MediaAssetORM.lesson_id == values["lesson_id"],
                MediaAssetORM.section_id == values["section_id"],
                MediaAssetORM.asset_key == values["asset_key"],
            ).order_by(MediaAssetORM.id)
        )).scalars().all()
        ready = [row for row in rows if row.status == "ready"]
        if len(ready) > 1:
            raise ValueError(f"Ambiguous ready media asset for {values['section_id']}/{values['asset_key']}")
        row = ready[0] if ready else (rows[0] if len(rows) == 1 else None)
        if row is None and rows:
            raise ValueError(f"Ambiguous media asset identity for {values['section_id']}/{values['asset_key']}")
        now = datetime.now(timezone.utc)
        owned = {
            "bucket": values["bucket"],
            "path": values["path"],
            "type": values["type"],
            "status": "ready",
            "public_url": values["public_url"],
            "provider": "supabase",
            "metadata_": values.get("metadata", {}),
        }
        if row is None:
            self.session.add(MediaAssetORM(
                course_id=values["course_id"],
                lesson_id=values["lesson_id"],
                section_id=values["section_id"],
                asset_key=values["asset_key"],
                created_at=now,
                updated_at=now,
                **owned,
            ))
            return "created"
        changed = any(getattr(row, key) != value for key, value in owned.items())
        for key, value in owned.items():
            setattr(row, key, value)
        if changed:
            row.updated_at = now
            return "updated"
        return "unchanged"
