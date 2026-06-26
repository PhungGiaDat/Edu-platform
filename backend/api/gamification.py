"""
Gamification API Router - Controller Layer
Handles HTTP for XP, badges, pets, stickers, and progress reports.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Any, Dict, Optional
from pydantic import BaseModel
from services.gamification_service import GamificationService, get_gamification_service
from models.gamification_model import UserPointsSchema
from models.user_mongo import UserDocument
from core.security import get_current_user

router = APIRouter()


# ========== REQUEST/RESPONSE SCHEMAS ==========

class AddXPRequest(BaseModel):
    user_id: str
    action: str
    metadata: Optional[Dict[str, Any]] = None


class FeedPetRequest(BaseModel):
    user_id: str


class ChoosePetRequest(BaseModel):
    user_id: str
    pet_type: str


class PlayPetRequest(BaseModel):
    user_id: str


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


# ========== EXISTING ENDPOINTS ==========

@router.get("/gamification/leaderboard", response_model=List[Dict[str, Any]])
async def get_leaderboard(
    service: GamificationService = Depends(get_gamification_service)
):
    """Get top users leaderboard"""
    return await service.get_leaderboard()


@router.get("/gamification/user/{user_id}", response_model=UserPointsSchema)
async def get_user_stats(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Get user gamification stats"""
    user_id = str(current_user.id)
    return await service.get_user_stats(user_id)


@router.post("/gamification/add-xp")
async def add_xp(
    request: AddXPRequest,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Add XP for completing an action"""
    user_id = str(current_user.id)
    result = await service.add_xp(user_id, request.action, request.metadata)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to add XP"))
    return result


@router.post("/gamification/award-badge")
async def award_badge(
    badge_id: str,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Award a badge to user"""
    user_id = str(current_user.id)
    result = await service.award_badge(user_id, badge_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to award badge"))
    return result


# ========== PET ENDPOINTS ==========

@router.get("/gamification/pet/{user_id}")
async def get_pet(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Get user's virtual pet"""
    user_id = str(current_user.id)
    return await service.get_pet(user_id)


@router.post("/gamification/pet/feed")
async def feed_pet(
    request: FeedPetRequest,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Feed user's pet to increase happiness"""
    user_id = str(current_user.id)
    return await service.feed_pet(user_id)


@router.post("/gamification/pet/choose")
async def choose_pet(
    request: ChoosePetRequest,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Choose/change pet type"""
    user_id = str(current_user.id)
    result = await service.choose_pet(user_id, request.pet_type)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/gamification/pet/play")
async def play_pet(
    request: PlayPetRequest,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Play with user's pet to increase happiness"""
    user_id = str(current_user.id)
    return await service.play_with_pet(user_id)


@router.post("/gamification/pet/outfit")
async def change_pet_outfit(
    request: ChangePetOutfitRequest,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Change pet's outfit/accessory"""
    user_id = str(current_user.id)
    result = await service.change_pet_outfit(user_id, request.outfit)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.get("/gamification/pet-xp/{user_id}")
async def get_pet_xp(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Get pet XP and evolution progress"""
    user_id = str(current_user.id)
    return await service.get_pet_xp(user_id)


# ========== STICKER ENDPOINTS ==========

@router.get("/gamification/stickers/catalog")
async def get_sticker_catalog(
    service: GamificationService = Depends(get_gamification_service)
):
    """Get full sticker catalog with all available stickers"""
    return service.get_sticker_catalog()


@router.get("/gamification/stickers/{user_id}")
async def get_stickers(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Get user's sticker collection"""
    user_id = str(current_user.id)
    return await service.get_stickers(user_id)


@router.post("/gamification/stickers/collect")
async def collect_sticker(
    request: CollectStickerRequest,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Collect a sticker for user"""
    user_id = str(current_user.id)
    result = await service.collect_sticker(user_id, request.sticker_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


# ========== STREAK & DAILY GOAL ==========

@router.get("/gamification/streak/{user_id}")
async def get_streak(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Get streak data including daily goal progress for a user"""
    user_id = str(current_user.id)
    return await service.get_streak(user_id)


# ========== PROGRESS REPORT ENDPOINTS ==========

@router.post("/gamification/track-learning")
async def track_learning(
    request: TrackLearningRequest,
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """Track daily learning progress"""
    user_id = str(current_user.id)
    return await service.track_learning(
        user_id, 
        request.words_learned, 
        request.time_mins
    )


@router.get("/reports/child/{user_id}/summary")
async def get_progress_report(
    user_id: str,
    days: int = Query(7, ge=1, le=30, description="Number of days to include"),
    current_user: UserDocument = Depends(get_current_user),
    service: GamificationService = Depends(get_gamification_service)
):
    """
    Get comprehensive progress report for parent dashboard.
    Includes XP, level, streak, learning stats, pet status.
    """
    user_id = str(current_user.id)
    return await service.get_progress_report(user_id, days)

