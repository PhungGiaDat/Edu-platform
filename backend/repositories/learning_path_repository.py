"""PostgreSQL learning-path preferences repository."""
from typing import Optional, Dict, Any
import json
from database.postgres_connection import postgres_pool


class LearningPathRepository:
    async def get_by_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow("SELECT * FROM public.learning_paths WHERE user_id=$1", user_id)
        return dict(row) if row else None

    async def upsert(self, data: Dict[str, Any]) -> Dict[str, Any]:
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.learning_paths(user_id,priority_topics,daily_time_goal_mins,daily_words_goal,notifications_enabled,created_at,updated_at)
               VALUES($1,$2::jsonb,$3,$4,$5,now(),now()) ON CONFLICT(user_id) DO UPDATE SET priority_topics=EXCLUDED.priority_topics,
               daily_time_goal_mins=EXCLUDED.daily_time_goal_mins,daily_words_goal=EXCLUDED.daily_words_goal,
               notifications_enabled=EXCLUDED.notifications_enabled,updated_at=now() RETURNING *""",
            data["user_id"], json.dumps(data.get("priority_topics", [])), data.get("daily_time_goal_mins", 15),
            data.get("daily_words_goal", 5), data.get("notifications_enabled", True),
        )
        return dict(row)

    async def update_topics(self, user_id: str, priority_topics: list) -> bool:
        await self.upsert({"user_id": user_id, "priority_topics": priority_topics})
        return True


def get_learning_path_repository() -> LearningPathRepository:
    return LearningPathRepository()
