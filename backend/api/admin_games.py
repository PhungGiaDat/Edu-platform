"""
Admin games management API — /api/v1/admin/games (spec §3.2, approved 2026-09-09).

Teacher-gated CRUD for games/topics/vocab + Supabase media upload.
List endpoints deliberately do NOT scope by teacher_id (research MEDIUM-8:
teacher-scoped invisibility strandled admin-created content).

Supabase upload copies the existing flashcards upload-image pattern
(backend/api/admin.py).
"""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status

from core.security import get_current_teacher, get_current_active_superuser
from models.admin_models import (
    GameCreate, GameUpdate, GameResponse,
    GameTopicCreate, GameTopicUpdate, GameTopicResponse,
    GameVocabItemCreate, GameVocabItemUpdate, GameVocabItemResponse,
)
from repositories.postgres_user_repository import PostgresUser
from services.admin_games_service import AdminGamesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/games", tags=["admin-games"])

_service = AdminGamesService()


def _svc() -> AdminGamesService:
    return _service


# ---------------------------------------------------------------- Games ----

@router.get("", response_model=list[GameResponse])
async def list_games(
    skip: int = 0,
    limit: int = 100,
    topic_id: Optional[str] = None,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    return await repo.list_games(skip=skip, limit=limit, topic_id=topic_id)


@router.post("", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
async def create_game(
    data: GameCreate,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    logger.info(f"[Admin] POST /admin/games — {data.title} ({data.game_type})")
    if not await repo.get_topic(data.topic_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Topic not found")
    try:
        return await repo.create_game(data.model_dump(), teacher_id=current_user.id)
    except ValueError as e:
        if str(e) == "SLUG_CONFLICT":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Tên game đã tồn tại (slug trùng) — chọn tên khác",
            )
        raise


@router.get("/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: str,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    game = await repo.get_game(game_id)
    if not game:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game


@router.put("/{game_id}", response_model=GameResponse)
async def update_game(
    game_id: str,
    data: GameUpdate,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if payload.get("game_type"):
        from models.admin_models import GAME_CONFIG_MODELS
        model = GAME_CONFIG_MODELS.get(payload["game_type"])
        if model is not None and payload.get("config"):
            model(**payload["config"])  # 422 on invalid config
    try:
        game = await repo.update_game(game_id, payload)
    except ValueError as e:
        if str(e) == "SLUG_CONFLICT":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Tên game đã tồn tại (slug trùng) — chọn tên khác",
            )
        raise
    if not game:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(
    game_id: str,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    if not await repo.delete_game(game_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Game not found")


# --------------------------------------------------------------- Topics ----

@router.get("/topics", response_model=list[GameTopicResponse])
async def list_topics(
    include_unpublished: bool = True,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    return await repo.list_topics(include_unpublished=include_unpublished)


@router.post("/topics", response_model=GameTopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    data: GameTopicCreate,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    try:
        return await repo.create_topic(data.model_dump())
    except ValueError as e:
        if str(e) == "SLUG_CONFLICT":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Chủ đề đã tồn tại (slug trùng) — chọn tên khác",
            )
        raise


@router.put("/topics/{topic_id}", response_model=GameTopicResponse)
async def update_topic(
    topic_id: str,
    data: GameTopicUpdate,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    topic = await repo.update_topic(topic_id, payload)
    if not topic:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return topic


# ---------------------------------------------------------------- Vocab ----

@router.get("/topics/{topic_id}/vocab", response_model=list[GameVocabItemResponse])
async def list_vocab(
    topic_id: str,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    if not await repo.get_topic(topic_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return await repo.list_vocab(topic_id)


@router.post(
    "/topics/{topic_id}/vocab",
    response_model=GameVocabItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_vocab(
    topic_id: str,
    data: GameVocabItemCreate,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    if not await repo.get_topic(topic_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Topic not found")
    try:
        return await repo.add_vocab(topic_id, data.model_dump())
    except ValueError as e:
        if str(e) == "VOCAB_CONFLICT":
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="Từ này đã có trong chủ đề",
            )
        raise


@router.put("/vocab/{item_id}", response_model=GameVocabItemResponse)
async def update_vocab(
    item_id: str,
    data: GameVocabItemUpdate,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    item = await repo.update_vocab(item_id, payload)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vocab item not found")
    return item


@router.delete("/vocab/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vocab(
    item_id: str,
    repo: AdminGamesService = Depends(_svc),
    current_user: PostgresUser = Depends(get_current_teacher),
):
    if not await repo.delete_vocab(item_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vocab item not found")


# --------------------------------------------------------------- Upload ----

@router.post(
    "/upload-media",
    status_code=status.HTTP_201_CREATED,
    summary="Upload game vocab media (image/audio) to Supabase Storage",
)
async def upload_game_media(
    request: Request,
    current_user: PostgresUser = Depends(get_current_teacher),
):
    """
    Accept base64-encoded media bytes, upload to Supabase Storage
    (learnar-assets bucket, game-vocab/* folder) — same pattern as
    flashcards upload-image.

    Request body (JSON):
        {
            "data_b64": "base64-encoded file bytes",
            "content_type": "image/png | image/jpeg | image/webp | audio/mpeg | ...",
            "filename": "optional original filename"
        }

    Returns:
        {"url": "...", "path": "...", "bucket": "..."}
    """
    import base64

    from services.game_media_upload_service import GameMediaUploadService

    logger.info(f"[Admin] POST /admin/games/upload-media")

    body = await request.json()
    b64 = body.get("data_b64", "")
    content_type = (body.get("content_type") or "").lower().strip()
    filename = body.get("filename") or ""

    if not b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="data_b64 is required",
        )

    try:
        data = base64.b64decode(b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 media data",
        )

    service = GameMediaUploadService()
    try:
        return await service.upload_media(data, content_type, filename)
    except ValueError as e:
        msg = str(e)
        if msg.startswith("UNSUPPORTED_TYPE"):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsupported media type: {msg.split(':', 1)[-1]}",
            )
        if msg == "TOO_LARGE":
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="File exceeds 10 MB limit",
            )
        if msg == "STORAGE_NOT_CONFIGURED":
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Media storage is not configured on the server",
            )
        raise
    except Exception as e:
        logger.error(f"[Admin] game media upload failed: {e}")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Media upload failed",
        )


# ------------------------------------------------------------ Role (BE5) ----

# NOTE: role-promotion endpoint lives on the admin router (users namespace) —
# registered separately in api/admin.py to keep /admin/users paths together.
