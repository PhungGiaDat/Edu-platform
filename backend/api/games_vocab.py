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
    audio_url: str | None = None
    source: str


class GameVocabResponse(BaseModel):
    topic: str | None
    items: list[GameVocabItem]
    source: str


@router.get("/vocab", response_model=GameVocabResponse)
async def get_games_vocab(
    topic: str = Query(..., description="Topic slug, e.g. animals | home | nature | school_food | admin-created"),
    limit: int = Query(8, ge=4, le=12),
    current_user: PostgresUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    # Admin-created topics take priority: if the topic exists in
    # game_topics AND has game_vocab_items, serve those (source='admin')
    # so teachers' curated word lists reach learners (spec §3.2 BE4).
    try:
        from services.admin_games_service import AdminGamesService
        svc = AdminGamesService()
        admin_topic = await svc.get_topic_by_slug(topic)
        if admin_topic is not None:
            admin_items = await svc.list_vocab(admin_topic["id"])
            if admin_items:
                items = [
                    GameVocabItem(
                        word=it["word"],
                        translation_vi=it.get("translation_vi", ""),
                        image_url=it.get("image_url") or "",
                        audio_url=it.get("audio_url"),
                        source="admin",
                    )
                    for it in admin_items[:limit]
                ]
                return GameVocabResponse(topic=admin_topic["slug"], items=items, source="admin")
    except Exception as admin_err:  # non-fatal: fall through to legacy source
        logger.warning(f"[GamesVocab] admin vocab lookup failed, falling back: {admin_err}")

    norm = normalize_topic(topic)
    data = await get_game_vocab(db, current_user.id, norm or topic, limit)
    if data.get("source") == "unknown_topic":
        logger.info(f"[GamesVocab] Unknown topic '{topic}' requested by {current_user.id}")
    return data


class GameCatalogTopic(BaseModel):
    id: str
    slug: str
    name: str
    name_vi: str
    description: str | None = None
    cover_image_url: str | None = None


class GameCatalogGame(BaseModel):
    id: str
    slug: str
    title: str
    title_vi: str
    game_type: str
    topic_id: str
    config: dict = {}


class GameCatalogResponse(BaseModel):
    topics: list[GameCatalogTopic] = []
    games: list[GameCatalogGame] = []


@router.get("/catalog", response_model=GameCatalogResponse)
async def get_games_catalog(
    current_user: PostgresUser = Depends(get_current_user),
):
    """Learner-facing game catalog: published topics + games only.

    Replaces the hardcoded frontend GAMES/GAME_TOPICS when reachable;
    the frontend falls back to its hardcoded catalog if this fails.
    """
    from services.admin_games_service import AdminGamesService

    svc = AdminGamesService()
    topics = await svc.list_topics(include_unpublished=False)
    games = await svc.list_games(limit=200)
    published_games = [g for g in games if g.get("is_published")]
    return GameCatalogResponse(
        topics=[
            GameCatalogTopic(
                id=t["id"], slug=t["slug"], name=t["name"],
                name_vi=t.get("name_vi") or t["name"],
                description=t.get("description"),
                cover_image_url=t.get("cover_image_url"),
            )
            for t in topics
        ],
        games=[
            GameCatalogGame(
                id=g["id"], slug=g["slug"], title=g["title"],
                title_vi=g.get("title_vi") or "",
                game_type=g["game_type"], topic_id=g["topic_id"],
                config=g.get("config") or {},
            )
            for g in published_games
        ],
    )
