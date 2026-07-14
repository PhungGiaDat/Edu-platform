"""Authenticated aggregate profile endpoint."""
from fastapi import APIRouter, Depends

from core.security import get_current_user
from models.profile import ProfileResponse
from models.user_mongo import UserDocument
from services.profile_service import ProfileService, get_profile_service

router = APIRouter(prefix="/profile")


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: UserDocument = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
):
    """Return only the authenticated user's aggregate profile (no IDOR input)."""
    return await service.get_profile(current_user)
