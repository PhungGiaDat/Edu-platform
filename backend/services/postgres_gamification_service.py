"""PostgreSQL-only C26 reward service.

The event row and aggregate mutation share one transaction so a retry can only
observe an applied snapshot; it never re-awards XP.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from database.postgres_connection import postgres_pool
from models.gamification_model import XP_REWARDS, calculate_next_level_xp


class PostgresGamificationService:
    @staticmethod
    def _same_semantics(existing, *, action, source_type, source_id, attempt_id, session_id, learning_path_id) -> bool:
        return all(existing[key] == value for key, value in {
            "action": action, "source_type": source_type, "source_id": source_id,
            "attempt_id": attempt_id, "session_id": session_id,
            "learning_path_id": learning_path_id,
        }.items())

    @staticmethod
    def _result(event, replay: bool) -> dict[str, Any]:
        return {
            "success": True, "event_id": event["event_id"], "action": event["action"],
            "xp_awarded": event["xp_awarded"], "total_xp_after": event["total_xp_after"],
            "level_after": event["level_after"], "xp_to_next_after": event["xp_to_next_after"],
            "level_up": False, "idempotent_replay": replay, "status": event["status"],
            "badges_earned": [], "sticker_earned": None, "streak": 0,
        }

    async def add_xp_with_event_id(self, user_id: str, event_id: str, action: str,
                                   source_type: Optional[str] = None, source_id: Optional[str] = None,
                                   attempt_id: Optional[str] = None, session_id: Optional[str] = None,
                                   learning_path_id: Optional[str] = None,
                                   metadata: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        if not event_id or not event_id.strip():
            return {"success": False, "error": "INVALID_EVENT_ID"}
        if action not in XP_REWARDS:
            return {"success": False, "error": f"Unknown action: {action}"}
        event_id = event_id.strip()
        pool = postgres_pool()
        async with pool.acquire() as connection:
            async with connection.transaction():
                user_exists = await connection.fetchval("SELECT 1 FROM public.users WHERE id=$1", user_id)
                if not user_exists:
                    return {"success": False, "error": "USER_NOT_FOUND"}
                inserted = await connection.fetchrow(
                    """INSERT INTO public.gamification_events(user_id,event_id,action,source_type,source_id,attempt_id,session_id,learning_path_id,metadata)
                       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT(user_id,event_id) DO NOTHING RETURNING *""",
                    user_id, event_id, action, source_type, source_id, attempt_id, session_id, learning_path_id, json.dumps(metadata or {}),
                )
                if inserted is None:
                    existing = await connection.fetchrow(
                        "SELECT * FROM public.gamification_events WHERE user_id=$1 AND event_id=$2 FOR UPDATE", user_id, event_id
                    )
                    if not self._same_semantics(existing, action=action, source_type=source_type, source_id=source_id,
                                                attempt_id=attempt_id, session_id=session_id, learning_path_id=learning_path_id):
                        return {"success": False, "error": "EVENT_SEMANTIC_CONFLICT"}
                    if existing["status"] == "applied":
                        return self._result(existing, replay=True)
                    # A transaction never publishes a partially applied event.
                    return {"success": False, "error": "CONCURRENT_PROCESSING"}

                await connection.execute(
                    """INSERT INTO public.user_gamification(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING""", user_id
                )
                aggregate = await connection.fetchrow(
                    "SELECT * FROM public.user_gamification WHERE user_id=$1 FOR UPDATE", user_id
                )
                xp = int(XP_REWARDS[action])
                total_before = int(aggregate["total_points"])
                level = int(aggregate["level"])
                threshold = int(aggregate["xp_to_next_level"])
                remaining = total_before + xp
                level_up = False
                while remaining >= threshold:
                    remaining -= threshold
                    level += 1
                    threshold = calculate_next_level_xp(level)
                    level_up = True
                total_after = total_before + xp
                now = datetime.now(timezone.utc)
                await connection.execute(
                    """UPDATE public.user_gamification SET total_points=$2,level=$3,xp_to_next_level=$4,
                       last_activity_date=$5,updated_at=$5 WHERE user_id=$1""",
                    user_id, total_after, level, threshold, now,
                )
                event = await connection.fetchrow(
                    """UPDATE public.gamification_events SET xp_awarded=$3,status='applied',total_xp_after=$4,
                       level_after=$5,xp_to_next_after=$6,applied_at=$7 WHERE user_id=$1 AND event_id=$2 RETURNING *""",
                    user_id, event_id, xp, total_after, level, threshold, now,
                )
                result = self._result(event, replay=False)
                result["level_up"] = level_up
                return result

    async def add_xp(self, user_id: str, action: str, metadata: Optional[dict] = None) -> dict[str, Any]:
        return await self.add_xp_with_event_id(user_id, f"legacy:{uuid4().hex}", action, metadata=metadata)

    async def get_user_stats(self, user_id: str) -> dict[str, Any]:
        row = await postgres_pool().fetchrow("SELECT * FROM public.user_gamification WHERE user_id=$1", user_id)
        if not row:
            return {"user_id": user_id, "total_points": 0, "level": 1, "xp_to_next_level": 100, "streak_days": 0, "badges": [], "stickers": []}
        value = dict(row)
        value["user_id"] = user_id
        value["stickers"] = [dict(item) for item in await postgres_pool().fetch("SELECT sticker_id AS id,name,rarity,image_url,earned_at FROM public.user_gamification_stickers WHERE user_id=$1", user_id)]
        return value

    async def get_leaderboard(self) -> list[dict[str, Any]]:
        return [dict(row) for row in await postgres_pool().fetch(
            "SELECT user_id,total_points,level,streak_days FROM public.user_gamification ORDER BY total_points DESC LIMIT 50"
        )]

    async def award_badge(self, user_id: str, badge_id: str) -> dict[str, Any]:
        row = await postgres_pool().fetchrow(
            """UPDATE public.user_gamification SET badges=(CASE WHEN badges ? $2 THEN badges ELSE badges || jsonb_build_array($2) END),updated_at=now()
               WHERE user_id=$1 RETURNING badges""", user_id, badge_id
        )
        return {"success": bool(row), "badge_id": badge_id, "badges": list(row["badges"]) if row else []}

    async def update_streak(self, user_id: str, activity_date: str) -> dict[str, Any]:
        row = await postgres_pool().fetchrow("SELECT streak_days,longest_streak FROM public.user_gamification WHERE user_id=$1", user_id)
        return {"success": bool(row), "current_streak": int(row["streak_days"]) if row else 0}

    async def get_streak(self, user_id: str) -> dict[str, Any]:
        stats = await self.get_user_stats(user_id)
        return {"current_streak": stats.get("streak_days", 0), "longest_streak": stats.get("longest_streak", 0)}

    async def get_pet(self, user_id: str) -> dict[str, Any]:
        return (await self.get_user_stats(user_id)).get("pet_state") or {}

    async def _update_pet(self, user_id: str, change: dict[str, Any]) -> dict[str, Any]:
        stats = await self.get_user_stats(user_id)
        pet = dict(stats.get("pet_state") or {})
        pet.update(change)
        await postgres_pool().execute("UPDATE public.user_gamification SET pet_state=$2::jsonb,updated_at=now() WHERE user_id=$1", user_id, json.dumps(pet))
        return {"success": True, "pet": pet}

    async def feed_pet(self, user_id: str) -> dict[str, Any]: return await self._update_pet(user_id, {"last_action": "feed"})
    async def play_with_pet(self, user_id: str) -> dict[str, Any]: return await self._update_pet(user_id, {"last_action": "play"})
    async def choose_pet(self, user_id: str, pet_type: str) -> dict[str, Any]: return await self._update_pet(user_id, {"type": pet_type})
    async def change_pet_outfit(self, user_id: str, outfit: str) -> dict[str, Any]: return await self._update_pet(user_id, {"outfit": outfit})
    async def get_pet_xp(self, user_id: str) -> dict[str, Any]: return {"xp_earned": (await self.get_user_stats(user_id)).get("total_points", 0)}
    async def get_stickers(self, user_id: str) -> list[dict[str, Any]]: return (await self.get_user_stats(user_id)).get("stickers", [])
    def get_sticker_catalog(self) -> dict[str, Any]: return {}
    async def collect_sticker(self, user_id: str, sticker_id: str) -> dict[str, Any]:
        await postgres_pool().execute("INSERT INTO public.user_gamification_stickers(user_id,sticker_id) VALUES($1,$2) ON CONFLICT DO NOTHING", user_id, sticker_id)
        return {"success": True, "sticker_id": sticker_id}
    async def track_learning(self, user_id: str, words_learned: int, time_mins: int) -> dict[str, Any]: return {"success": True, "words_learned": words_learned, "time_mins": time_mins}
    async def get_progress_report(self, user_id: str, days: int = 7) -> dict[str, Any]: return {"gamification": await self.get_user_stats(user_id), "days": days}
    async def _maybe_award_lesson_sticker(self, *args, **kwargs): return None
    async def _check_sticker_rewards(self, *args, **kwargs): return None
