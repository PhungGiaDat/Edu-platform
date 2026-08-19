"""PostgreSQL repository for gamification (user_gamification table on Supabase)."""
from typing import List, Optional, Dict, Any
import json
import logging
from datetime import datetime

from database.postgres_connection import postgres_pool

logger = logging.getLogger(__name__)


class GamificationRepository:
    """Thin asyncpg wrapper around user_gamification table."""

    # ---------- helpers ----------

    async def _row(self, user_id: str) -> Optional[dict]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.user_gamification WHERE user_id=$1", user_id
        )
        return dict(row) if row else None

    def _serialize_pet(self, pet: Optional[dict]) -> Optional[str]:
        return json.dumps(pet) if pet else None

    def _deserialize_pet(self, raw: Any) -> Optional[dict]:
        if raw is None:
            return None
        if isinstance(raw, dict):
            return raw
        try:
            return json.loads(raw)
        except Exception:
            return None

    # ---------- read ----------

    async def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        row = await self._row(user_id)
        if row:
            # Normalize "pet_state" → "pet" for service compatibility
            row["pet"] = self._deserialize_pet(row.get("pet_state"))
            badges = row.get("badges")
            if isinstance(badges, str):
                row["badges"] = json.loads(badges)
        return row

    async def get_streak(self, user_id: str) -> Dict[str, Any]:
        row = await self._row(user_id)
        if not row:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_activity": None,
                "streak_active_today": False,
                "daily_goal_minutes": 15,
                "minutes_today": 0,
            }
        last = row.get("last_activity_date")
        is_today = False
        if last:
            last_date = last.date() if hasattr(last, "date") else last
            is_today = last_date == datetime.utcnow().date()
        return {
            "current_streak": row.get("streak_days", 0),
            "longest_streak": row.get("longest_streak", 0),
            "last_activity": last.isoformat() if last else None,
            "streak_active_today": is_today,
            "daily_goal_minutes": 15,
            "minutes_today": 0,
        }

    async def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.user_gamification ORDER BY total_points DESC LIMIT $1", limit
        )
        results = []
        for row in rows:
            r = dict(row)
            badges = r.get("badges")
            r["badges"] = json.loads(badges) if isinstance(badges, str) else badges
            r["pet_state"] = self._deserialize_pet(r.get("pet_state"))
            results.append(r)
        return results

    # ---------- write ----------

    async def update_points(
        self,
        user_id: str,
        points: int,
        new_level: Optional[int] = None,
        new_xp_to_next: Optional[int] = None,
    ) -> Dict[str, Any]:
        sets = ["total_points = total_points + $2", "last_activity_date = NOW()"]
        args: list = [user_id, points]
        if new_level is not None:
            args.append(new_level)
            sets.append(f"level = ${len(args)}")
        if new_xp_to_next is not None:
            args.append(new_xp_to_next)
            sets.append(f"xp_to_next_level = ${len(args)}")
        query = f"""
            INSERT INTO public.user_gamification (user_id, total_points, last_activity_date)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET {', '.join(sets)}
            RETURNING *
        """
        row = await postgres_pool().fetchrow(query, *args)
        return dict(row) if row else {}

    async def add_xp(
        self,
        user_id: str,
        xp_amount: int,
        new_level: Optional[int] = None,
        new_xp_to_next: Optional[int] = None,
    ) -> Dict[str, Any]:
        return await self.update_points(user_id, xp_amount, new_level, new_xp_to_next)

    async def add_badge(self, user_id: str, badge_id: str) -> Dict[str, Any]:
        query = """
            INSERT INTO public.user_gamification (user_id, badges)
            VALUES ($1, '[]'::jsonb)
            ON CONFLICT (user_id)
            DO UPDATE SET badges = user_gamification.badges || $2::jsonb
            RETURNING *
        """
        row = await postgres_pool().fetchrow(
            query, user_id, json.dumps([badge_id])
        )
        return dict(row) if row else {}

    async def update_streak(self, user_id: str, streak: int, longest: int) -> Dict[str, Any]:
        query = """
            INSERT INTO public.user_gamification (user_id, streak_days, longest_streak, last_activity_date)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                streak_days = $2,
                longest_streak = GREATEST(user_gamification.longest_streak, $3),
                last_activity_date = NOW()
            RETURNING *
        """
        row = await postgres_pool().fetchrow(query, user_id, streak, longest)
        return dict(row) if row else {}

    # ---------- pet ----------

    async def get_pet(self, user_id: str) -> Optional[Dict[str, Any]]:
        row = await self._row(user_id)
        return self._deserialize_pet(row.get("pet_state")) if row else None

    async def update_pet(self, user_id: str, pet_data: Dict[str, Any]) -> Dict[str, Any]:
        query = """
            INSERT INTO public.user_gamification (user_id, pet_state)
            VALUES ($1, $2::jsonb)
            ON CONFLICT (user_id)
            DO UPDATE SET pet_state = $2::jsonb, updated_at = NOW()
            RETURNING *
        """
        row = await postgres_pool().fetchrow(
            query, user_id, json.dumps(pet_data)
        )
        return dict(row) if row else {}

    async def feed_pet(self, user_id: str, happiness_boost: int = 10) -> Dict[str, Any]:
        pet = await self.get_pet(user_id)
        now = datetime.utcnow()
        if pet is None:
            pet = {
                "type": "bunny",
                "happiness": 50,
                "hunger": 45,
                "energy": 70,
                "mood": "content",
                "last_fed": None,
                "last_played": None,
                "last_care_at": now,
                "last_mood_update": now,
                "outfit": "none",
                "xp_earned": 0,
                "stage": "baby",
            }
        pet.update({
            "happiness": min(100, pet.get("happiness", 50) + happiness_boost),
            "hunger": max(0, pet.get("hunger", 45) - 35),
            "energy": min(100, pet.get("energy", 70) + 5),
            "mood": "happy",
            "last_fed": now,
            "last_care_at": now,
            "last_mood_update": now,
            "last_action": "feed",
            "animation_clip": "feed",
        })
        await self.update_pet(user_id, pet)
        # Return with "pet" key so service's result.get("pet") works
        return {"pet": pet}

    async def play_pet(self, user_id: str, happiness_boost: int = 15) -> Dict[str, Any]:
        pet = await self.get_pet(user_id)
        now = datetime.utcnow()
        if pet is None:
            pet = {
                "type": "bunny",
                "happiness": 50,
                "hunger": 45,
                "energy": 70,
                "mood": "content",
                "last_fed": None,
                "last_played": None,
                "last_care_at": now,
                "last_mood_update": now,
                "outfit": "none",
                "xp_earned": 0,
                "stage": "baby",
            }
        pet.update({
            "happiness": min(100, pet.get("happiness", 50) + happiness_boost),
            "hunger": min(100, pet.get("hunger", 45) + 10),
            "energy": max(0, pet.get("energy", 70) - 15),
            "mood": "happy" if pet.get("energy", 70) > 20 else "tired",
            "last_played": now,
            "last_care_at": now,
            "last_mood_update": now,
            "last_action": "play",
            "animation_clip": "play",
        })
        await self.update_pet(user_id, pet)
        return {"pet": pet}

    async def update_pet_xp(self, user_id: str, pet_xp: int) -> Dict[str, Any]:
        pet = await self.get_pet(user_id) or {}
        pet["xp_earned"] = pet_xp
        return await self.update_pet(user_id, pet)

    async def update_pet_stage(self, user_id: str, stage: str) -> Dict[str, Any]:
        pet = await self.get_pet(user_id) or {}
        pet["stage"] = stage
        return await self.update_pet(user_id, pet)

    async def update_pet_outfit(self, user_id: str, outfit: str) -> Dict[str, Any]:
        pet = await self.get_pet(user_id) or {}
        pet["outfit"] = outfit
        return await self.update_pet(user_id, pet)

    # ---------- stickers (stub — user_gamification_stickers table separate) ----------

    async def get_stickers(self, user_id: str) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.user_gamification_stickers WHERE user_id=$1 ORDER BY earned_at DESC",
            user_id,
        )
        return [dict(r) for r in rows]

    async def add_sticker(self, user_id: str, sticker: Dict[str, Any]) -> Dict[str, Any]:
        sticker["earned_at"] = datetime.utcnow()
        cols = list(sticker.keys())
        vals = list(sticker.values())
        placeholders = ", ".join(f"${i+2}" for i in range(len(cols)))
        query = f"""
            INSERT INTO public.user_gamification_stickers (user_id, {', '.join(cols)})
            VALUES ($1, {placeholders})
            ON CONFLICT DO NOTHING
            RETURNING *
        """
        row = await postgres_pool().fetchrow(query, user_id, *vals)
        return dict(row) if row else {}

    async def has_sticker(self, user_id: str, sticker_id: str) -> bool:
        row = await postgres_pool().fetchrow(
            "SELECT 1 FROM public.user_gamification_stickers WHERE user_id=$1 AND sticker_id=$2",
            user_id, sticker_id,
        )
        return row is not None

    # ---------- progress (PostgreSQL: daily_learning_progress) ----------

    async def add_daily_stat(
        self, user_id: str, words_learned: int, time_mins: int
    ) -> Dict[str, Any]:
        today = datetime.utcnow().date()
        row = await postgres_pool().fetchrow(
            """
            INSERT INTO public.daily_learning_progress
                (user_id, progress_date, words_learned, time_spent_mins)
            VALUES ($1, $2::date, $3, $4)
            ON CONFLICT (user_id, progress_date)
            DO UPDATE SET
                words_learned = daily_learning_progress.words_learned + EXCLUDED.words_learned,
                time_spent_mins = daily_learning_progress.time_spent_mins + EXCLUDED.time_spent_mins,
                updated_at = NOW()
            RETURNING *
            """,
            user_id, today, words_learned, time_mins,
        )
        return dict(row) if row else {}

    async def get_daily_stats(self, user_id: str, days: int = 7) -> List[Dict[str, Any]]:
        return await self.get_daily_stats_v2(user_id, days)

    async def get_daily_stats_v2(
        self, user_id: str, days: int = 7
    ) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            """
            SELECT progress_date, words_learned, time_spent_mins,
                   games_played, pronunciation_attempts,
                   (SELECT COUNT(*) FROM public.lesson_sessions ls
                    WHERE ls.user_id = dlp.user_id
                      AND DATE(ls.started_at) = dlp.progress_date) as sessions_count
            FROM public.daily_learning_progress dlp
            WHERE dlp.user_id = $1
              AND dlp.progress_date >= CURRENT_DATE - INTERVAL '1 day' * $2
            ORDER BY dlp.progress_date DESC
            """,
            user_id, days,
        )
        results = []
        for row in rows:
            d = dict(row)
            d["date"] = str(d.pop("progress_date"))
            d["time_mins"] = d.pop("time_spent_mins")
            results.append(d)
        return results


def get_gamification_repository() -> GamificationRepository:
    return GamificationRepository()
