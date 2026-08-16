"""PostgreSQL pronunciation attempt lifecycle."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List
from uuid import uuid4

from database.postgres_connection import postgres_pool


class PronunciationRepository:
    async def create_attempt(self, data: Dict[str, Any]) -> Dict[str, Any]:
        attempt_id = uuid4().hex
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.pronunciation_attempts(attempt_id,user_id,flashcard_qr_id,audio_url,audio_duration_seconds,
               spoken_text,target_text,score,pronunciation_score,fluency_score,clarity_score,ai_model,evaluation_confidence,
               feedback,word_by_word_feedback,course_id,lesson_id,section_id,session_id,status,device_info,client_timestamp,attempted_at)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19,'pending','{}'::jsonb,$20,$21)
               RETURNING *""",
            attempt_id, data["user_id"], data["flashcard_qr_id"], data.get("audio_url"), data.get("audio_duration_seconds"),
            data["spoken_text"], data.get("target_text"), data.get("score", 0), data.get("pronunciation_score"),
            data.get("fluency_score"), data.get("clarity_score"), data.get("ai_model"), data.get("evaluation_confidence"),
            data.get("feedback"), json.dumps(data.get("word_by_word_feedback") or []), data.get("course_id"), data.get("lesson_id"),
            data.get("section_id"), data.get("session_id"), data.get("client_timestamp"), data.get("attempted_at") or datetime.utcnow(),
        )
        return dict(row)

    async def set_xp_awarded(self, attempt_id: str, xp_awarded: int) -> None:
        await postgres_pool().execute("UPDATE public.pronunciation_attempts SET xp_awarded=$2,status='completed' WHERE attempt_id=$1", attempt_id, xp_awarded)

    async def get_attempts(self, user_id: str, flashcard_qr_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch("SELECT * FROM public.pronunciation_attempts WHERE user_id=$1 AND flashcard_qr_id=$2 ORDER BY attempted_at DESC LIMIT $3", user_id, flashcard_qr_id, limit)
        return [self._public(row) for row in rows]

    @staticmethod
    def _public(row) -> Dict[str, Any]:
        value = dict(row)
        value["_id"] = value["attempt_id"]
        return value

    async def get_stats(self, user_id: str, flashcard_qr_id: str) -> Dict[str, Any]:
        row = await postgres_pool().fetchrow(
            """SELECT count(*) AS total_attempts,coalesce(max(score),0) AS best_score,coalesce(avg(score),0) AS average_score,
               max(attempted_at) AS last_attempted_at FROM public.pronunciation_attempts WHERE user_id=$1 AND flashcard_qr_id=$2""",
            user_id, flashcard_qr_id,
        )
        return {"flashcard_qr_id": flashcard_qr_id, "total_attempts": row["total_attempts"], "best_score": row["best_score"],
                "average_score": round(float(row["average_score"]), 1), "last_attempted_at": row["last_attempted_at"]}

    async def count_attempts_for_user(self, user_id: str) -> int:
        return int(await postgres_pool().fetchval("SELECT count(*) FROM public.pronunciation_attempts WHERE user_id=$1", user_id))

    async def get_recent_attempts(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch("SELECT * FROM public.pronunciation_attempts WHERE user_id=$1 ORDER BY attempted_at DESC LIMIT $2", user_id, limit)
        return [self._public(row) for row in rows]


def get_pronunciation_repository() -> PronunciationRepository:
    return PronunciationRepository()
