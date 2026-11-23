"""Session-bound reward persistence used only by course completion."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from models.gamification_model import XP_REWARDS, calculate_next_level_xp


class CompletionRewardRepository:
    """Uses the request's AsyncSession; it never begins or commits a transaction."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def award_lesson_completion(self, user_id: str, course_id: str, lesson_id: str) -> dict:
        event_id = f"legacy:{uuid4().hex}"
        action = "lesson_completed"
        user = await self.session.execute(text("SELECT 1 FROM users WHERE id=:user_id"), {"user_id": user_id})
        if user.scalar_one_or_none() is None:
            return {"success": False, "error": "USER_NOT_FOUND"}
        inserted = (await self.session.execute(text("""
            INSERT INTO gamification_events(user_id,event_id,action,metadata)
            VALUES (:user_id,:event_id,:action,CAST(:metadata AS jsonb))
            ON CONFLICT(user_id,event_id) DO NOTHING RETURNING *
        """), {"user_id": user_id, "event_id": event_id, "action": action,
                "metadata": json.dumps({"course_id": course_id, "lesson_id": lesson_id})})).mappings().first()
        if inserted is None:
            return {"success": False, "error": "CONCURRENT_PROCESSING"}
        await self.session.execute(text("INSERT INTO user_gamification(user_id) VALUES (:user_id) ON CONFLICT(user_id) DO NOTHING"), {"user_id": user_id})
        aggregate = (await self.session.execute(text("SELECT * FROM user_gamification WHERE user_id=:user_id FOR UPDATE"), {"user_id": user_id})).mappings().one()
        xp, level, threshold = int(XP_REWARDS[action]), int(aggregate["level"]), int(aggregate["xp_to_next_level"])
        remaining, level_up = int(aggregate["total_points"]) + xp, False
        while remaining >= threshold:
            remaining -= threshold
            level += 1
            threshold = calculate_next_level_xp(level)
            level_up = True
        total_after, now = int(aggregate["total_points"]) + xp, datetime.now(timezone.utc)
        await self.session.execute(text("""
            UPDATE user_gamification SET total_points=:total,level=:level,xp_to_next_level=:threshold,
            last_activity_date=:now,updated_at=:now WHERE user_id=:user_id
        """), {"user_id": user_id, "total": total_after, "level": level, "threshold": threshold, "now": now})
        event = (await self.session.execute(text("""
            UPDATE gamification_events SET xp_awarded=:xp,status='applied',total_xp_after=:total,
            level_after=:level,xp_to_next_after=:threshold,applied_at=:now
            WHERE user_id=:user_id AND event_id=:event_id RETURNING *
        """), {"user_id": user_id, "event_id": event_id, "xp": xp, "total": total_after,
                "level": level, "threshold": threshold, "now": now})).mappings().one()
        return {"success": True, "event_id": event["event_id"], "action": action, "xp_awarded": xp,
                "total_xp_after": total_after, "level_after": level, "xp_to_next_after": threshold,
                "level_up": level_up, "idempotent_replay": False, "status": "applied",
                "badges_earned": [], "sticker_earned": None, "streak": 0}
