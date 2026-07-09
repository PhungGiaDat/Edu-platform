"""
Debug logging endpoint — mirrors AR_DEBUG messages from the mobile frontend
to the backend log stream so they appear in Render's log stream.

View in Render: render.com → your service → Logs tab.
Or: render logs <service-id> --watch
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
import logging

router = APIRouter(prefix="/debug", tags=["debug"])
logger = logging.getLogger("ar_debug")


class DebugLogPayload(BaseModel):
    label: str
    details: dict
    source: str = "unknown"
    timestamp: int = 0


@router.post("/ar-log")
async def log_ar_debug(payload: DebugLogPayload, request: Request):
    """
    Receives AR_DEBUG payloads from the mobile web app and emits them to
    Render's log stream via the standard Python logger.
    """
    session_id = request.headers.get("x-session-id", "no-session")

    log_line = (
        f"[AR_DEBUG:{payload.label}] "
        f"session={session_id} "
        f"source={payload.source} "
        f"ts={payload.timestamp} "
        f"details={payload.details}"
    )
    logger.info(log_line)
    return {"ok": True, "received": payload.label}


@router.get("/ping")
async def ping():
    return {"pong": True}
