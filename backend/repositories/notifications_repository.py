# backend/repositories/notifications_repository.py
"""
Repository for Web Push subscriptions + parent-controlled reminder prefs.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class NotificationsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Subscriptions ───────────────────────────────────────────────

    async def upsert_subscription(
        self,
        user_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: Optional[str] = None,
    ) -> None:
        await self.db.execute(
            text("""
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
            VALUES (:user_id, :endpoint, :p256dh, :auth, :user_agent)
            ON CONFLICT (endpoint) DO UPDATE
              SET user_id = EXCLUDED.user_id,
                  p256dh = EXCLUDED.p256dh,
                  auth = EXCLUDED.auth,
                  user_agent = EXCLUDED.user_agent,
                  last_pushed_at = NULL
        """),
            {
                "user_id": str(user_id),
                "endpoint": endpoint,
                "p256dh": p256dh,
                "auth": auth,
                "user_agent": user_agent,
            },
        )
        await self.db.commit()

    async def delete_subscription(self, user_id: UUID, endpoint: str) -> bool:
        result = await self.db.execute(
            text(
                "DELETE FROM push_subscriptions "
                "WHERE user_id = :user_id AND endpoint = :endpoint"
            ),
            {"user_id": str(user_id), "endpoint": endpoint},
        )
        await self.db.commit()
        return result.rowcount > 0

    async def get_subscriptions_for_user(self, user_id: UUID) -> List[Dict[str, Any]]:
        result = await self.db.execute(
            text(
                "SELECT id, user_id, endpoint, p256dh, auth "
                "FROM push_subscriptions WHERE user_id = :user_id"
            ),
            {"user_id": str(user_id)},
        )
        return [dict(r._mapping) for r in result.fetchall()]

    async def mark_pushed(self, subscription_id: str) -> None:
        await self.db.execute(
            text("UPDATE push_subscriptions SET last_pushed_at = NOW() WHERE id = :id"),
            {"id": subscription_id},
        )
        await self.db.commit()

    async def delete_subscription_by_id(self, subscription_id: str) -> None:
        await self.db.execute(
            text("DELETE FROM push_subscriptions WHERE id = :id"),
            {"id": subscription_id},
        )
        await self.db.commit()

    # ── Dispatch candidates (used by the daily cron endpoint) ───────

    async def get_dispatch_candidates(self, limit: int = 500) -> List[Dict[str, Any]]:
        """
        Users who: enabled prefs, have due cards, already own subscriptions,
        and were not pushed in the last 20 hours. Quiet hours are enforced
        by the caller (server clock).
        """
        result = await self.db.execute(
            text("""
            SELECT DISTINCT u.id AS user_id,
                   p.preferred_hour, p.timezone
            FROM notification_prefs p
            JOIN public.users u ON u.id = p.user_id
            JOIN notebook_entries ne
              ON ne.user_id = u.id
             AND (ne.next_review_at IS NULL OR ne.next_review_at <= NOW())
            JOIN push_subscriptions ps ON ps.user_id = u.id
            WHERE p.enabled = TRUE
              AND (ps.last_pushed_at IS NULL
                   OR ps.last_pushed_at < NOW() - INTERVAL '20 hours')
            LIMIT :limit
        """),
            {"limit": limit},
        )
        return [dict(r._mapping) for r in result.fetchall()]

    # ── Prefs ───────────────────────────────────────────────────────

    async def get_prefs(self, user_id: UUID) -> Optional[Dict[str, Any]]:
        result = await self.db.execute(
            text(
                "SELECT user_id, enabled, preferred_hour, timezone "
                "FROM notification_prefs WHERE user_id = :user_id"
            ),
            {"user_id": str(user_id)},
        )
        row = result.fetchone()
        return dict(row._mapping) if row else None

    async def upsert_prefs(
        self,
        user_id: UUID,
        enabled: bool,
        preferred_hour: int = 17,
        timezone: str = "Asia/Ho_Chi_Minh",
    ) -> Dict[str, Any]:
        await self.db.execute(
            text("""
            INSERT INTO notification_prefs (user_id, enabled, preferred_hour, timezone)
            VALUES (:user_id, :enabled, :preferred_hour, :timezone)
            ON CONFLICT (user_id) DO UPDATE
              SET enabled = EXCLUDED.enabled,
                  preferred_hour = EXCLUDED.preferred_hour,
                  timezone = EXCLUDED.timezone,
                  updated_at = NOW()
        """),
            {
                "user_id": str(user_id),
                "enabled": enabled,
                "preferred_hour": preferred_hour,
                "timezone": timezone,
            },
        )
        await self.db.commit()
        return await self.get_prefs(user_id)

    async def count_due_cards(self, user_id: UUID) -> int:
        result = await self.db.execute(
            text(
                "SELECT COUNT(*) FROM notebook_entries "
                "WHERE user_id = :user_id "
                "AND (next_review_at IS NULL OR next_review_at <= NOW())"
            ),
            {"user_id": str(user_id)},
        )
        return int(result.scalar() or 0)
