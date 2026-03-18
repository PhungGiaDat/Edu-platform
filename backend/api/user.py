"""
User API Router - Controller Layer
Only handles HTTP Request/Response, delegates to UserService.
NO business logic here.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from services.user_service import UserService, get_user_service
from models.user_mongo import UserDocument
from core.security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


# ========== REQUEST SCHEMAS ==========

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


# ========== ENDPOINTS ==========

@router.get("/profile/{user_id}")
async def get_user_profile(
    user_id: str,
    current_user: UserDocument = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Get user profile by ID"""
    user_id = str(current_user.id)
    profile = await user_service.get_user_profile(user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    return profile


@router.put("/profile/{user_id}")
async def update_profile(
    user_id: str,
    request: UpdateProfileRequest,
    current_user: UserDocument = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """Update user profile"""
    user_id = str(current_user.id)
    result = await user_service.update_profile(
        user_id=user_id,
        full_name=request.full_name,
        avatar_url=request.avatar_url
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result
