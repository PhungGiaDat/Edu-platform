# backend/api/notifications.py
"""
Kid-friendly Web Push reminders.

Ethics baked in (ages 5-8):
- Max ONE push per user per day (20h suppression window).
- No guilt framing — copy is an invitation from the pet, never a failure notice.
- Parent-controlled: prefs + quiet hours enforced server-side.
- iOS 16.4+: push only works in the installed standalone PWA; the frontend
  gates subscription behind display-mode detection.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user
from database.orm_session import get_db_session
from repositories.notifications_repository import NotificationsRepository
from repositories.postgres_user_repository import PostgresUser
from settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_notifications_repository(
    db: AsyncSession = Depends(get_db_session),
) -> NotificationsRepository:
    return NotificationsRepository(db)


# ── Models ──────────────────────────────────────────────────────────


class SubscribeRequest(BaseModel):
    endpoint: str = Field(..., min_length=1, max_length=2048)
    keys_p256dh: str = Field(..., min_length=1, max_length=256)
    keys_auth: str = Field(..., min_length=1, max_length=256)
    user_agent: Optional[str] = Field(None, max_length=512)


class UnsubscribeRequest(BaseModel):
    endpoint: str = Field(..., min_length=1, max_length=2048)


class PrefsRequest(BaseModel):
    enabled: bool = True
    preferred_hour: int = Field(17, ge=6, le=21)
    timezone: str = Field("Asia/Ho_Chi_Minh", max_length=64)


# ── Endpoints ───────────────────────────────────────────────────────


@router.get("/vapid-key")
async def get_vapid_key():
    """Public application server key for pushManager.subscribe()."""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web push is not configured on this server",
        )
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe(
    payload: SubscribeRequest,
    current_user: PostgresUser = Depends(get_current_user),
    repo: NotificationsRepository = Depends(get_notifications_repository),
):
    await repo.upsert_subscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys_p256dh,
        auth=payload.keys_auth,
        user_agent=payload.user_agent,
    )
    logger.info(f"[Notifications] Subscribed user {current_user.id}")
    return {"success": True}


@router.post("/unsubscribe")
async def unsubscribe(
    payload: UnsubscribeRequest,
    current_user: PostgresUser = Depends(get_current_user),
    repo: NotificationsRepository = Depends(get_notifications_repository),
):
    deleted = await repo.delete_subscription(current_user.id, payload.endpoint)
    return {"success": True, "deleted": deleted}


@router.get("/prefs")
async def get_prefs(
    current_user: PostgresUser = Depends(get_current_user),
    repo: NotificationsRepository = Depends(get_notifications_repository),
):
    prefs = await repo.get_prefs(current_user.id)
    return prefs or {
        "user_id": str(current_user.id),
        "enabled": False,
        "preferred_hour": 17,
        "timezone": "Asia/Ho_Chi_Minh",
    }


@router.put("/prefs")
async def update_prefs(
    payload: PrefsRequest,
    current_user: PostgresUser = Depends(get_current_user),
    repo: NotificationsRepository = Depends(get_notifications_repository),
):
    prefs = await repo.upsert_prefs(
        user_id=current_user.id,
        enabled=payload.enabled,
        preferred_hour=payload.preferred_hour,
        timezone=payload.timezone,
    )
    return prefs


# ── Internal dispatch (called once daily by GitHub Actions cron) ────


class DispatchRequest(BaseModel):
    dry_run: bool = False


@router.post("/internal/dispatch")
async def dispatch_daily(
    payload: DispatchRequest,
    x_dispatch_secret: str = Header(default=""),
    repo: NotificationsRepository = Depends(get_notifications_repository),
):
    if not settings.NOTIFICATION_DISPATCH_SECRET:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Dispatch not configured"
        )
    if x_dispatch_secret != settings.NOTIFICATION_DISPATCH_SECRET.get_secret_value():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid dispatch secret")

    # Quiet hours on the dispatch host clock (UTC+7 operator assumption;
    # per-user timezone refinement is a future item — hour is informational).
    hour = __import__("datetime").datetime.now().hour
    minute = __import__("datetime").datetime.now().minute
    if (
        hour > settings.NOTIFICATION_QUIET_START
        or (hour == settings.NOTIFICATION_QUIET_START and minute >= 30)
        or hour < settings.NOTIFICATION_QUIET_END
        or (hour == settings.NOTIFICATION_QUIET_END and minute < 30)
    ):
        return {"skipped": "quiet_hours", "sent": 0}

    candidates = await repo.get_dispatch_candidates()

    if payload.dry_run:
        return {"dry_run": True, "candidates": len(candidates), "sent": 0}

    from services.web_push_service import send_review_reminder

    sent, failed = 0, 0
    for cand in candidates:
        user_id = (
            UUID(cand["user_id"])
            if isinstance(cand["user_id"], str)
            else cand["user_id"]
        )
        due_count = await repo.count_due_cards(user_id)
        subs = await repo.get_subscriptions_for_user(user_id)
        for sub in subs:
            ok = await send_review_reminder(sub, due_count)
            if ok:
                await repo.mark_pushed(sub["id"])
                sent += 1
            else:
                await repo.delete_subscription_by_id(sub["id"])
                failed += 1
            break  # one push per user per day even with multiple devices

    logger.info(f"[Notifications] Dispatch: sent={sent}, failed={failed}")
    return {"sent": sent, "failed": failed, "candidates": len(candidates)}
