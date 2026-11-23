"""PostgreSQL repository for chat logs."""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from database.postgres_connection import postgres_pool


class PostgresChatLogRepository:
    async def log_message(
        self,
        session_id: str,
        user_id: Optional[str],
        message: str,
        sender: str,
        context_flashcard_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.chat_logs(session_id,user_id,message,sender,context_flashcard_ids,timestamp)
               VALUES($1,$2,$3,$4,$5,now()) RETURNING *""",
            session_id, user_id, message, sender,
            json.dumps(context_flashcard_ids) if context_flashcard_ids else None,
        )
        return dict(row) if row else {}

    async def get_session_history(
        self,
        session_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch(
            "SELECT * FROM public.chat_logs WHERE session_id=$1 ORDER BY timestamp ASC LIMIT $2",
            session_id, limit,
        )
        return [dict(row) for row in rows]


def get_postgres_chat_log_repository() -> PostgresChatLogRepository:
    return PostgresChatLogRepository()
