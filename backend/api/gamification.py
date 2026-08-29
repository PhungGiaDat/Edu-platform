"""
Gamification API Router - Controller Layer
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, field_validator

from services.gamification_service import GamificationService, get_gamification_service
from models.gamification_model import UserPointsSchema
from repositories.postgres_user_repository import PostgresUser
from core.security import get_current_user


# ========== Response Schemas ==========

class LeaderboardEntry(BaseModel):
    """Public learner-facing leaderboard entry."""
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    points: int
    level: int
    streak_days: int
    rank: int


class LeaderboardRank(BaseModel):
    """Current learner rank for a selected leaderboard period."""
    user_id: str
    rank: Optional[int] = None
    points: int = 0
    period: Literal["all", "weekly", "daily"]

router = APIRouter()


# ========== Request Schemas ==========

class AddXPRequest(BaseModel):
    user_id: str
    action: str
    metadata: Optional[Dict[str, Any]] = None


class AddXPEventRequest(BaseModel):
    action: str
    event_id: str
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    attempt_id: Optional[str] = None
    session_id: Optional[str] = None
    learning_path_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("event_id")
    @classmethod
    def validate_event_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("event_id cannot be None, empty, or whitespace-only")
        return v.strip()


class ChoosePetRequest(BaseModel):
    user_id: str
    pet_type: str


class ChangePetOutfitRequest(BaseModel):
    user_id: str
    outfit: str


class CollectStickerRequest(BaseModel):
    user_id: str
    sticker_id: str


class TrackLearningRequest(BaseModel):
    user_id: str
    words_learned: int
    time_mins: int


# ========== XP & Stats ==========

@router.get("/gamification/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    period: Literal["all", "weekly", "daily"] = Query("all"),
    limit: int = Query(50, ge=1, le=100),
    service: GamificationService = Depends(get_gamification_service),
):
    """Get the top learners for a selected period."""
    raw = await service.get_leaderboard(period=period, limit=limit)
    return [
        LeaderboardEntry(
            user_id=str(entry.get("user_id", "")),
            username=str(entry.get("username") or entry.get("full_name") or "Learner"),
            avatar_url=entry.get("avatar_url"),
            points=int(entry.get("total_points", entry.get("points", 0)) or 0),
            level=int(entry.get("level", 1) or 1),
            streak_days=int(entry.get("streak_days", 0) or 0),
            rank=idx + 1,
        )
        for idx, entry in enumerate(raw)
    ]


@router.get("/gamification/leaderboard/rank/{user_id}", response_model=LeaderboardRank)
async def get_user_rank(
    user_id: str,
    period: Literal["all", "weekly", "daily"] = Query("all"),
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    """Get the authenticated learner's rank, including ranks beyond the top 50."""
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Cannot view another learner's rank")

    entry = await service.get_user_rank(user_id=user_id, period=period)
    if not entry:
        return LeaderboardRank(user_id=user_id, period=period)

    return LeaderboardRank(
        user_id=user_id,
        rank=int(entry["rank"]) if entry.get("rank") is not None else None,
        points=int(entry.get("points", entry.get("total_points", 0)) or 0),
        period=period,
    )


@router.get("/gamification/user/{user_id}", response_model=UserPointsSchema)
async def get_user_stats(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    """Get user gamification stats."""
    user_id = current_user.id
    return await service.get_user_stats(user_id)


@router.post("/gamification/add-xp")
async def add_xp(
    request: AddXPRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    """Add XP for completing an action. Legacy — prefer POST /gamification/xp-event."""
    user_id = current_user.id
    result = await service.add_xp(user_id, request.action, request.metadata)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to add XP"))
    return result


@router.post("/gamification/xp-event")
async def add_xp_event(
    request: AddXPEventRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    """Idempotent XP event — guarantees exactly-once semantics."""
    user_id = current_user.id
    result = await service.add_xp_with_event_id(
        user_id=user_id,
        event_id=request.event_id,
        action=request.action,
        source_type=request.source_type,
        source_id=request.source_id,
        attempt_id=request.attempt_id,
        session_id=request.session_id,
        learning_path_id=request.learning_path_id,
        metadata=request.metadata,
    )
    if not result.get("success"):
        error = result.get("error", "Failed to process XP event")
        if error in {"CONCURRENT_PROCESSING", "EVENT_SEMANTIC_CONFLICT"}:
            raise HTTPException(status_code=409, detail="Event is being processed by another request")
        raise HTTPException(status_code=400, detail=error)
    return result


@router.post("/gamification/award-badge")
async def award_badge(
    badge_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    """Award a badge to user."""
    user_id = current_user.id
    result = await service.award_badge(user_id, badge_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to award badge"))
    return result


# ========== Pets ==========

@router.get("/gamification/pet/{user_id}")
async def get_pet(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    return await service.get_pet(user_id)


@router.post("/gamification/pet/feed")
async def feed_pet(
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    return await service.feed_pet(user_id)


@router.post("/gamification/pet/choose")
async def choose_pet(
    request: ChoosePetRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    result = await service.choose_pet(user_id, request.pet_type)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/gamification/pet/play")
async def play_pet(
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    return await service.play_with_pet(user_id)


@router.post("/gamification/pet/outfit")
async def change_pet_outfit(
    request: ChangePetOutfitRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    result = await service.change_pet_outfit(user_id, request.outfit)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/gamification/pet-xp/{user_id}")
async def get_pet_xp(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    return await service.get_pet_xp(user_id)


# ========== Stickers ==========

@router.get("/gamification/stickers/catalog")
async def get_sticker_catalog(
    service: GamificationService = Depends(get_gamification_service),
):
    return service.get_sticker_catalog()


@router.get("/gamification/stickers/{user_id}")
async def get_stickers(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    return await service.get_stickers(user_id)


@router.post("/gamification/stickers/collect")
async def collect_sticker(
    request: CollectStickerRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    result = await service.collect_sticker(user_id, request.sticker_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


# ========== Streak & Daily Goal ==========

@router.get("/gamification/streak/{user_id}")
async def get_streak(
    user_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    return await service.get_streak(user_id)


@router.post("/gamification/track-learning")
async def track_learning(
    request: TrackLearningRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    return await service.track_learning(user_id, request.words_learned, request.time_mins)


@router.get("/reports/child/{user_id}/summary")
async def get_progress_report(
    user_id: str,
    days: int = 7,
    current_user: PostgresUser = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service),
):
    user_id = current_user.id
    return await service.get_progress_report(user_id, days)
