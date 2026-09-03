# backend/services/web_push_service.py
"""
Web Push sender (pywebpush) with kid-safe copy templates.

Copy rules (ages 5-8):
- Invitation voice from the pet — never "you missed", never urgency.
- Rotate templates so repeats feel fresh; due count is included softly.
"""

import json
import logging
import random
from typing import Any, Dict

from pywebpush import WebPushException, webpush
from settings import settings

logger = logging.getLogger(__name__)

TEMPLATES = [
    {
        "title": "Mimi có tin vui! 🌱",
        "body": "Vườn từ của con có {n} hạt cần tưới nè. Vào chơi cùng Mimi nhé?",
    },
    {
        "title": "Hoa đang đợi con kìa! 🌸",
        "body": "{n} bông hoa trong vườn từ chưa được tưới hôm nay. Cùng Mimi ghé qua nhé?",
    },
    {
        "title": "Lexi muốn học chung với con! 🐶",
        "body": "Có {n} từ mới thú vị đang chờ trong sổ tay. Mở app cùng Lexi nhé!",
    },
]


def _is_stale(exc: WebPushException) -> bool:
    """410 Gone / 404 → subscription dead, remove it."""
    response = getattr(exc, "response", None)
    return response is not None and response.status_code in (404, 410)


def send_review_reminder(subscription: Dict[str, Any], due_count: int) -> bool:
    """Send one reminder push. Returns success; False = remove subscription."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIM_SUB:
        logger.warning("[WebPush] VAPID not configured — skip send")
        return False

    tpl = random.choice(TEMPLATES)
    payload = json.dumps(
        {
            "title": tpl["title"],
            "body": tpl["body"].format(n=due_count),
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/icon-72x72.png",
            "tag": "notebook-review",
            "data": {"url": "/flashcards"},
        },
        ensure_ascii=False,
    )

    try:
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {
                    "p256dh": subscription["p256dh"],
                    "auth": subscription["auth"],
                },
            },
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY.get_secret_value(),
            vapid_claims={"sub": settings.VAPID_CLAIM_SUB},
        )
        return True
    except WebPushException as exc:
        if _is_stale(exc):
            logger.info(f"[WebPush] Stale subscription removed: {exc}")
        else:
            logger.warning(f"[WebPush] Send failed: {exc}")
        return False
    except Exception as exc:  # never crash the dispatch loop
        logger.error(f"[WebPush] Unexpected error: {exc}")
        return False
