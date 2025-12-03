from fastapi import APIRouter, Depends, HTTPException
from typing import List, Any, Dict
from services.gamification_service import GamificationService, get_gamification_service
from models.gamification_model import UserPointsSchema

router = APIRouter()

@router.get("/gamification/leaderboard", response_model=List[Dict[str, Any]])
async def get_leaderboard(
    service: GamificationService = Depends(get_gamification_service)
):
    return await service.get_leaderboard()

@router.get("/gamification/user/{user_id}", response_model=UserPointsSchema)
async def get_user_stats(
    user_id: str,
    service: GamificationService = Depends(get_gamification_service)
):
    return await service.get_user_stats(user_id)
