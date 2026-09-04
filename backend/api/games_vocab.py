# backend/api/games_vocab.py
"""
Topic vocabulary for mini-games (DragMatch / MemoryPairs / ColorAnimal).

GET /api/v1/games/vocab?topic=animals&limit=8  (auth required)

Returns the learner's notebook words for the topic merged with seed
vocabulary (momo course themes) so a round is always playable. XP for
game completion is awarded separately via POST /gamification/xp-event —
this endpoint never grants rewards.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user
from database.orm_session import get_db_session
from repositories.postgres_user_repository import PostgresUser
from services.games_vocab_service import get_game_vocab, normalize_topic

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/games", tags=["Games Vocabulary"])


class GameVocabItem(BaseModel):
    word: str
    translation_vi: str
    image_url: str
    source: str


class GameVocabResponse(BaseModel):
    topic: str | None
    items: list[GameVocabItem]
    source: str


@router.get("/vocab", response_model=GameVocabResponse)
async def get_games_vocab(
    topic: str = Query(..., description="animals | home | nature | school_food"),
    limit: int = Query(8, ge=4, le=12),
    current_user: PostgresUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    norm = normalize_topic(topic)
    data = await get_game_vocab(db, current_user.id, norm or topic, limit)
    if data.get("source") == "unknown_topic":
        logger.info(f"[GamesVocab] Unknown topic '{topic}' requested by {current_user.id}")
    return data
