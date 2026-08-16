# backend/api/pets.py
"""
Pet API Router - 3D Pet Companion System
Handles pet catalog, unlocking, and activation for AR rendering
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from beanie import PydanticObjectId
import logging

from models.pet import (
    PetDocument,
    PetCreate,
    PetUpdate,
    PetResponse,
    PetListResponse,
    SetActivePetRequest,
    UnlockPetResponse,
)
from models.user_mongo import UserDocument
from services.gamification_service import GamificationService, get_gamification_service
from core.security import get_current_user
from repositories.postgres_user_repository import PostgresUserRepository
from repositories.postgres_pet_repository import PostgresPetRepository
from utils.cache import pet_cache, user_stats_cache, CacheKeys, invalidate_pet_catalog

logger = logging.getLogger(__name__)

router = APIRouter()


def pet_to_response(
    pet,
    user_unlocked_pets: List[str], 
    user_active_pet: Optional[str],
    user_xp: int,
    user_streak: int
) -> PetResponse:
    """Convert PetDocument to PetResponse with user-specific fields"""
    value = pet if isinstance(pet, dict) else pet.model_dump()
    is_unlocked = value["pet_id"] in user_unlocked_pets
    is_active = value["pet_id"] == user_active_pet
    
    # Check if user can unlock this pet
    can_unlock = False
    if not is_unlocked:
        condition = value.get("unlock_condition") or {"type": "free", "value": 0}
        condition_type = condition.get("type") if isinstance(condition, dict) else condition.type
        condition_value = condition.get("value", 0) if isinstance(condition, dict) else condition.value
        if condition_type == "free":
            can_unlock = True
        elif condition_type == "xp":
            can_unlock = user_xp >= condition_value
        elif condition_type == "streak":
            can_unlock = user_streak >= condition_value
        # Achievement-based unlocks would need additional logic
    
    return PetResponse(
        pet_id=value["pet_id"], name=value["name"], name_vi=value.get("name_vi") or "",
        model_url=value.get("model_url") or "", texture_url=value.get("texture_url"), thumbnail_url=value.get("thumbnail_url"),
        category=value.get("category") or "character", pack_source=value.get("pack_source") or "", rarity=value.get("rarity") or "common",
        color=value.get("color") or "#FF6B6B", animations=value.get("animations") or ["idle"],
        unlock_condition=value.get("unlock_condition") or {"type": "free", "value": 0},
        is_unlocked=is_unlocked,
        is_active=is_active,
        can_unlock=can_unlock,
    )


# ========== Pet Catalog Endpoints ==========

@router.get("/pets", response_model=PetListResponse)
async def list_pets(
    category: Optional[str] = None,
    rarity: Optional[str] = None,
    current_user: UserDocument = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service)
):
    """
    Get all available pets with user's unlock status.
    
    - **category**: Optional filter by category (character, animal, robot)
    - **rarity**: Optional filter by rarity (common, rare, epic, legendary)
    """
    # Get user data
    user_id = str(current_user.id)
    user = current_user
    
    # Try to get user stats from cache first
    cache_key = CacheKeys.user_stats(user_id)
    user_stats = await user_stats_cache.get(cache_key)
    
    if user_stats is None:
        user_stats = await gamification_service.get_user_stats(user_id)
        await user_stats_cache.set(cache_key, user_stats, ttl=60)  # Cache for 1 minute
    
    user_xp = user_stats.get("total_points", 0)
    user_streak = user_stats.get("streak_days", 0)
    user_unlocked = user.unlocked_pets or []
    user_active = user.active_pet
    
    pets = await PostgresPetRepository().list_active(category, rarity)
    
    # Convert to response with user-specific data
    pet_responses = [
        pet_to_response(pet, user_unlocked, user_active, user_xp, user_streak)
        for pet in pets
    ]
    
    # Calculate stats
    stats = {
        "total": len(pet_responses),
        "unlocked": sum(1 for p in pet_responses if p.is_unlocked),
        "common": sum(1 for p in pet_responses if p.rarity == "common"),
        "rare": sum(1 for p in pet_responses if p.rarity == "rare"),
        "epic": sum(1 for p in pet_responses if p.rarity == "epic"),
        "legendary": sum(1 for p in pet_responses if p.rarity == "legendary"),
    }
    
    logger.info(f"Listed {len(pet_responses)} pets for user {user_id}")
    
    return PetListResponse(pets=pet_responses, stats=stats)


@router.get("/pets/{pet_id}", response_model=PetResponse)
async def get_pet(
    pet_id: str,
    current_user: UserDocument = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service)
):
    """
    Get a specific pet by ID with user's unlock status.
    """
    # Get pet
    pet = await PostgresPetRepository().get(pet_id)
    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pet not found: {pet_id}"
        )

    # Get user data
    user_id = str(current_user.id)
    user = current_user
    user_stats = await gamification_service.get_user_stats(user_id)
    
    user_xp = user_stats.get("total_points", 0)
    user_streak = user_stats.get("streak_days", 0)
    user_unlocked = user.unlocked_pets or []
    user_active = user.active_pet
    
    return pet_to_response(pet, user_unlocked, user_active, user_xp, user_streak)


# ========== Pet Unlock Endpoints ==========

@router.post("/pets/{pet_id}/unlock", response_model=UnlockPetResponse)
async def unlock_pet(
    pet_id: str,
    current_user: UserDocument = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service)
):
    """
    Unlock a pet for the user.
    
    Checks if the user meets the unlock requirements (XP, streak, etc.)
    and adds the pet to their unlocked_pets list.
    """
    # Get pet
    pet = await PostgresPetRepository().get(pet_id)
    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pet not found: {pet_id}"
        )

    # Get user data
    user_id = str(current_user.id)
    user = current_user
    user_stats = await gamification_service.get_user_stats(user_id)
    
    user_xp = user_stats.get("total_points", 0)
    user_streak = user_stats.get("streak_days", 0)
    user_unlocked = user.unlocked_pets or []
    
    # Check if already unlocked
    if pet_id in user_unlocked:
        return UnlockPetResponse(
            success=True,
            message="Pet already unlocked",
            pet=pet_to_response(pet, user_unlocked, user.active_pet, user_xp, user_streak)
        )
    
    # Check unlock conditions
    condition = pet.get("unlock_condition") or {"type": "free", "value": 0}
    condition_type = condition.get("type") if isinstance(condition, dict) else condition.type
    condition_value = condition.get("value", 0) if isinstance(condition, dict) else condition.value
    can_unlock = False
    reason = ""
    
    if condition_type == "free":
        can_unlock = True
    elif condition_type == "xp":
        if user_xp >= condition_value:
            can_unlock = True
        else:
            reason = f"Need {condition_value} XP (you have {user_xp})"
    elif condition_type == "streak":
        if user_streak >= condition_value:
            can_unlock = True
        else:
            reason = f"Need {condition_value} day streak (you have {user_streak})"
    elif condition_type == "achievement":
        # Check achievements/badges
        user_badges = user_stats.get("badges", [])
        achievement_id = str(condition_value)
        if achievement_id in user_badges:
            can_unlock = True
        else:
            reason = f"Need achievement: {achievement_id}"
    
    if not can_unlock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot unlock pet: {reason}"
        )
    
    # Unlock the pet
    user = await PostgresUserRepository().unlock_pet(user_id, pet_id)
    user_unlocked = user.unlocked_pets or []
    
    logger.info(f"User {user_id} unlocked pet {pet_id}")
    
    return UnlockPetResponse(
        success=True,
        message=f"Successfully unlocked {pet['name']}!",
        pet=pet_to_response(pet, user_unlocked, user.active_pet, user_xp, user_streak)
    )


# ========== Active Pet Endpoints ==========

@router.put("/pets/active", response_model=PetResponse)
async def set_active_pet(
    request: SetActivePetRequest,
    current_user: UserDocument = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service)
):
    """
    Set the user's active pet for display in AR.
    
    The pet must be unlocked before it can be set as active.
    """
    # Get user data
    user_id = str(current_user.id)
    user = current_user
    pet_id = request.pet_id
    user_stats = await gamification_service.get_user_stats(user_id)
    
    user_xp = user_stats.get("total_points", 0)
    user_streak = user_stats.get("streak_days", 0)
    user_unlocked = user.unlocked_pets or []

    # Get pet
    pet = await PostgresPetRepository().get(pet_id)
    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pet not found: {pet_id}"
        )
    
    # Check if pet is unlocked
    if pet_id not in user_unlocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Pet not unlocked: {pet_id}"
        )
    
    # Set as active
    await PostgresUserRepository().set_active_pet(user_id, pet_id)
    
    logger.info(f"User {user_id} set active pet to {pet_id}")
    
    return pet_to_response(pet, user_unlocked, pet_id, user_xp, user_streak)


@router.get("/pets/active/current", response_model=Optional[PetResponse])
async def get_active_pet(
    current_user: UserDocument = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service)
):
    """
    Get the user's currently active pet.
    
    Returns null if no pet is set as active.
    """
    # Get user data
    user_id = str(current_user.id)
    user = current_user
    
    if not user.active_pet:
        return None
    
    # Get pet
    pet = await PostgresPetRepository().get(user.active_pet, active_only=False)
    if not pet:
        # Pet was deleted or invalid - clear active pet
        await PostgresUserRepository().set_active_pet(user_id, None)
        return None
    
    user_stats = await gamification_service.get_user_stats(user_id)
    user_xp = user_stats.get("total_points", 0)
    user_streak = user_stats.get("streak_days", 0)
    user_unlocked = user.unlocked_pets or []
    
    return pet_to_response(pet, user_unlocked, user.active_pet, user_xp, user_streak)


@router.delete("/pets/active")
async def clear_active_pet(
    current_user: UserDocument = Depends(get_current_user)
):
    """
    Clear the user's active pet (no pet displayed in AR).
    """
    user_id = str(current_user.id)
    user = current_user
    await PostgresUserRepository().set_active_pet(user_id, None)
    
    logger.info(f"User {user_id} cleared active pet")
    
    return {"success": True, "message": "Active pet cleared"}


# ========== Admin Endpoints ==========

@router.post("/pets/admin/create", response_model=PetResponse)
async def create_pet(pet_data: PetCreate):
    """
    [ADMIN] Create a new pet in the catalog.
    
    Note: This endpoint should be protected with admin authentication.
    """
    # Check if pet_id already exists
    existing = await PetDocument.find_one(PetDocument.pet_id == pet_data.pet_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Pet with ID '{pet_data.pet_id}' already exists"
        )
    
    # Create pet document
    pet = PetDocument(
        pet_id=pet_data.pet_id,
        name=pet_data.name,
        name_vi=pet_data.name_vi,
        model_url=pet_data.model_url,
        texture_url=pet_data.texture_url,
        thumbnail_url=pet_data.thumbnail_url,
        category=pet_data.category,
        pack_source=pet_data.pack_source,
        rarity=pet_data.rarity,
        color=pet_data.color,
        animations=pet_data.animations,
        unlock_condition=pet_data.unlock_condition or {"type": "free", "value": 0},
    )
    
    await pet.insert()
    
    # Invalidate pet catalog cache
    await invalidate_pet_catalog()
    
    logger.info(f"Created new pet: {pet_data.pet_id}")
    
    # Return response (no user context for admin creation)
    return PetResponse(
        pet_id=pet.pet_id,
        name=pet.name,
        name_vi=pet.name_vi,
        model_url=pet.model_url,
        thumbnail_url=pet.thumbnail_url,
        category=pet.category,
        pack_source=pet.pack_source,
        rarity=pet.rarity,
        color=pet.color,
        animations=pet.animations,
        unlock_condition=pet.unlock_condition,
        is_unlocked=False,
        is_active=False,
        can_unlock=False,
    )


@router.put("/pets/admin/{pet_id}", response_model=PetResponse)
async def update_pet(pet_id: str, pet_data: PetUpdate):
    """
    [ADMIN] Update an existing pet in the catalog.
    """
    pet = await PetDocument.find_one(PetDocument.pet_id == pet_id)
    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pet not found: {pet_id}"
        )
    
    # Update fields
    update_data = pet_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pet, field, value)
    
    from datetime import datetime
    pet.updated_at = datetime.utcnow()
    
    await pet.save()
    
    # Invalidate pet catalog cache
    await invalidate_pet_catalog()
    
    logger.info(f"Updated pet: {pet_id}")
    
    return PetResponse(
        pet_id=pet.pet_id,
        name=pet.name,
        name_vi=pet.name_vi,
        model_url=pet.model_url,
        texture_url=pet.texture_url,
        thumbnail_url=pet.thumbnail_url,
        category=pet.category,
        pack_source=pet.pack_source,
        rarity=pet.rarity,
        color=pet.color,
        animations=pet.animations,
        unlock_condition=pet.unlock_condition,
        is_unlocked=False,
        is_active=False,
        can_unlock=False,
    )


@router.delete("/pets/admin/{pet_id}")
async def delete_pet(pet_id: str):
    """
    [ADMIN] Soft-delete a pet (sets is_active to False).
    """
    pet = await PetDocument.find_one(PetDocument.pet_id == pet_id)
    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pet not found: {pet_id}"
        )
    
    pet.is_active = False
    await pet.save()
    
    # Invalidate pet catalog cache
    await invalidate_pet_catalog()
    
    logger.info(f"Soft-deleted pet: {pet_id}")
    
    return {"success": True, "message": f"Pet '{pet_id}' has been deactivated"}
