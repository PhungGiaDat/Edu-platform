"""PostgreSQL repository for chat history (De-Mongo Wave 5).

Maps to ``public.chat_logs`` table (per-message rows).
"""
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from database.postgres_connection import postgres_pool

logger = logging.getLogger(__name__)


class ChatRepository:
    """PostgreSQL repository for chat history."""

    async def get_user_sessions(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get distinct chat sessions for a user."""
        rows = await postgres_pool().fetch(
            """SELECT session_id, user_id, message, sender, timestamp
               FROM public.chat_logs
               WHERE user_id=$1
               ORDER BY timestamp DESC
               LIMIT $2""",
            user_id, limit,
        )
        return [dict(r) for r in rows]

    async def add_message(self, session_id: str, message: Dict[str, Any]) -> bool:
        """Add a message to the chat log."""
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.chat_logs(session_id, user_id, message, sender, timestamp)
               VALUES($1, $2, $3, $4, $5) RETURNING id""",
            session_id,
            message.get("user_id"),
            message.get("message", ""),
            message.get("sender", "user"),
            message.get("timestamp", datetime.utcnow()),
        )
        return row is not None

    async def find_many(
        self,
        filter: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        skip: int = 0,
        sort: Optional[List[tuple]] = None,
    ) -> List[Dict[str, Any]]:
        """Generic find_many over chat_logs (supports simple equality filters)."""
        clauses = []
        values: List[Any] = []
        for i, (key, value) in enumerate((filter or {}).items(), start=1):
            if key in ("session_id", "user_id", "sender"):
                clauses.append(f"{key} = ${i}")
                values.append(value)
            elif key == "is_active":
                clauses.append(f"{key} = ${i}")
                values.append(value)
        where = "WHERE " + " AND ".join(clauses) if clauses else ""

        order_clause = ""
        if sort:
            parts = []
            for col, direction in sort:
                dir_sql = "DESC" if direction == -1 else "ASC"
                parts.append(f"{col} {dir_sql}")
            order_clause = "ORDER BY " + ", ".join(parts)

        rows = await postgres_pool().fetch(
            f"SELECT * FROM public.chat_logs {where} {order_clause} OFFSET ${len(values) + 1} LIMIT ${len(values) + 2}",
            *values, skip, limit,
        )
        return [dict(r) for r in rows]


def get_chat_repository() -> ChatRepository:
    return ChatRepository()