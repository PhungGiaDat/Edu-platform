# backend/repositories/user_session_repository.py
"""
UserSession Repository - STRIPPED (De-Mongo Wave 4)

De-Mongo Wave 4: this repository had **no consumers** anywhere in the codebase
and no corresponding PostgreSQL table, so it was not migrated.  Creating a
``user_sessions`` table for unused legacy data would violate the migration
rule "do not migrate unused legacy data merely for theoretical parity".

Session tracking is served by:
- ``SessionTrackingRepository`` (active_sessions table) for heartbeat/lock state
- ``SessionLogRepository`` (session_logs table) for start/end/duration logs
- the Redis-backed ``SessionService`` for ephemeral session state

This module remains import-compatible so that nothing breaks, but every method
raises ``NotImplementedError`` to fail loudly rather than silently drop writes.
"""
from typing import Optional, List, Dict, Any


class UserSessionRepository:
    """Stub kept for import compatibility. Raises NotImplementedError."""

    def __init__(self):
        self.collection_name = "user_sessions"  # legacy Mongo collection, not migrated

    async def create_session(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table). Use SessionLogRepository / SessionTrackingRepository."
        )

    async def get_active_session(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table). Use SessionLogRepository / SessionTrackingRepository."
        )

    async def get_session(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )

    async def get_user_sessions(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )

    async def update_session_activity(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )

    async def update_session_metrics(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )

    async def pause_session(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )

    async def resume_session(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )

    async def end_session(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )

    async def abandon_session(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )

    async def get_user_session_stats(self, *args, **kwargs):
        raise NotImplementedError(
            "UserSessionRepository was stripped in De-Mongo W4 (no consumers, "
            "no PostgreSQL table)."
        )


# Singleton instance (kept for import compatibility)
user_session_repo = UserSessionRepository()


def get_user_session_repository() -> UserSessionRepository:
    return user_session_repo
