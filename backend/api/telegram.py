"""Authenticated Telegram gateway for AR debug reports."""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from core.security import get_current_teacher
from repositories.postgres_user_repository import PostgresUser
from settings import settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/telegram", tags=["Telegram"])

TELEGRAM_MAX_MESSAGE_LENGTH = 4096
TELEGRAM_CHUNK_CONTENT_LENGTH = 3900
TELEGRAM_MAX_REPORT_LENGTH = 200_000


class TelegramSyncRequest(BaseModel):
    """Text payload accepted by the Telegram debug sync endpoint."""

    text: str = Field(min_length=1, max_length=TELEGRAM_MAX_REPORT_LENGTH)


def split_telegram_report(text: str) -> list[str]:
    """Split a report without losing content, preferring line boundaries."""

    chunks: list[str] = []
    start = 0

    while start < len(text):
        end = min(start + TELEGRAM_CHUNK_CONTENT_LENGTH, len(text))
        if end < len(text):
            line_break = text.rfind("\n", start, end)
            if line_break > start:
                end = line_break + 1

        chunks.append(text[start:end])
        start = end

    return chunks


async def send_telegram_message(
    client: httpx.AsyncClient,
    telegram_url: str,
    chat_id: str,
    text: str,
) -> None:
    """Send one Telegram message and normalize upstream failures."""

    response: httpx.Response | None = None
    try:
        response = await client.post(
            telegram_url,
            json={"chat_id": chat_id, "text": text},
        )
        response.raise_for_status()
        telegram_result = response.json()
    except httpx.TimeoutException:
        logger.warning("[TelegramSync] Telegram request timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Telegram request timed out",
        )
    except httpx.HTTPError:
        # Do not log the exception: httpx includes the full bot URL, which
        # would expose the bot token in application logs.
        logger.warning(
            "[TelegramSync] Telegram request failed with status %s",
            response.status_code if response is not None else "unknown",
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Telegram is unavailable",
        )
    except ValueError:
        logger.warning("[TelegramSync] Telegram returned invalid JSON")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Telegram returned an invalid response",
        )

    if not isinstance(telegram_result, dict) or telegram_result.get("ok") is not True:
        logger.warning("[TelegramSync] Telegram rejected the message")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Telegram rejected the message",
        )


@router.post("/sync")
async def sync_to_telegram(
    payload: TelegramSyncRequest,
    current_user: PostgresUser = Depends(get_current_teacher),
):
    """Forward an authenticated AR debug report to the configured Telegram chat."""

    bot_token = (
        settings.TELEGRAM_BOT_TOKEN.get_secret_value()
        if settings.TELEGRAM_BOT_TOKEN
        else ""
    )
    chat_id = settings.TELEGRAM_CHAT_ID

    if not bot_token or not chat_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram sync is not configured",
        )

    telegram_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    report_chunks = split_telegram_report(payload.text)
    total_chunks = len(report_chunks)

    async with httpx.AsyncClient(timeout=10.0) as client:
        for index, chunk in enumerate(report_chunks, start=1):
            message = chunk
            if total_chunks > 1:
                message = f"[AR Sync {index}/{total_chunks}]\n{chunk}"
            await send_telegram_message(client, telegram_url, chat_id, message)

    logger.info("[TelegramSync] AR report sent for user_id=%s", current_user.id)
    return {"ok": True}
