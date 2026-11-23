# backend/api/pets.py
"""
Pet API Router - 3D Pet Companion System
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import logging

from models.pet import (
    PetCreate,
    PetUpdate,
    PetResponse,
    PetListResponse,
    SetActivePetRequest,
    UnlockPetResponse,
)
from repositories.postgres_user_repository import PostgresUser
from services.gamification_service import GamificationService, get_gamification_service
from core.security import get_current_user
from repositories.postgres_user_repository import PostgresUserRepository
from repositories.postgres_pet_repository import PostgresPetRepository
from repositories.orm_pet_repository import ORMPetRepository
from utils.cache import pet_cache, user_stats_cache, CacheKeys, invalidate_pet_catalog

logger = logging.getLogger(__name__)

router = APIRouter()


def pet_to_response(
    pet: dict,
    user_unlocked_pets: List[str],
    user_active_pet: Optional[str],
    user_xp: int,
    user_streak: int,
) -> PetResponse:
    """Convert pet dict to PetResponse with user-specific fields."""
    is_unlocked = pet["pet_id"] in user_unlocked_pets
    is_active = pet["pet_id"] == user_active_pet

    can_unlock = False
    if not is_unlocked:
        condition = pet.get("unlock_condition") or {"type": "free", "value": 0}
        condition_type = condition.get("type") if isinstance(condition, dict) else "free"
        condition_value = condition.get("value", 0) if isinstance(condition, dict) else 0
        if condition_type == "free":
            can_unlock = True
        elif condition_type == "xp":
            can_unlock = user_xp >= condition_value
        elif condition_type == "streak":
            can_unlock = user_streak >= condition_value

    return PetResponse(
        pet_id=pet["pet_id"],
        name=pet["name"],
        name_vi=pet.get("name_vi") or "",
        model_url=pet.get("model_url") or "",
        texture_url=pet.get("texture_url"),
        thumbnail_url=pet.get("thumbnail_url"),
        category=pet.get("category") or "character",
        pack_source=pet.get("pack_source") or "",
        rarity=pet.get("rarity") or "common",
        color=pet.get("color") or "#FF6B6B",
        animations=pet.get("animations") or ["idle"],
        unlock_condition=pet.get("unlock_condition") or {"type": "free", "value": 0},
        is_unlocked=is_unlocked,
        is_active=is_active,
        can_unlock=can_unlock,
    )


async def _user_stats(user_id: str) -> dict:
    cache_key = CacheKeys.user_stats(user_id)
    cached = await user_stats_cache.get(cache_key)
    if cached is not None:
        return cached
    stats = await get_gamification_service().get_user_stats(user_id)
    await user_stats_cache.set(cache_key, stats, ttl=60)
    return stats


# ========== Pet Catalog ==========

@router.get("/pets", response_model=PetListResponse)
async def list_pets(
    category: Optional[str] = None,
    rarity: Optional[str] = None,
    current_user: PostgresUser = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """Get all available pets with user's unlock status."""
    user_id = current_user.id
    stats = await _user_stats(user_id)

    pets = await PostgresPetRepository().list_active(category, rarity)
    pet_responses = [
        pet_to_response(p, list(current_user.unlocked_pets or []), current_user.active_pet,
                        stats.get("total_points", 0), stats.get("streak_days", 0))
        for p in pets
    ]

    stats_resp = {
        "total": len(pet_responses),
        "unlocked": sum(1 for p in pet_responses if p.is_unlocked),
        "common": sum(1 for p in pet_responses if p.rarity == "common"),
        "rare": sum(1 for p in pet_responses if p.rarity == "rare"),
        "epic": sum(1 for p in pet_responses if p.rarity == "epic"),
        "legendary": sum(1 for p in pet_responses if p.rarity == "legendary"),
    }

    return PetListResponse(pets=pet_responses, stats=stats_resp)


@router.get("/pets/{pet_id}", response_model=PetResponse)
async def get_pet(
    pet_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """Get a specific pet by ID with user's unlock status."""
    pet = await PostgresPetRepository().get(pet_id)
    if not pet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pet not found: {pet_id}")

    stats = await _user_stats(current_user.id)
    return pet_to_response(
        pet, list(current_user.unlocked_pets or []), current_user.active_pet,
        stats.get("total_points", 0), stats.get("streak_days", 0),
    )


# ========== Unlock ==========

@router.post("/pets/{pet_id}/unlock", response_model=UnlockPetResponse)
async def unlock_pet(
    pet_id: str,
    current_user: PostgresUser = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """Unlock a pet for the user."""
    pet = await PostgresPetRepository().get(pet_id)
    if not pet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pet not found: {pet_id}")

    user_id = current_user.id
    unlocked = list(current_user.unlocked_pets or [])

    if pet_id in unlocked:
        stats = await _user_stats(user_id)
        return UnlockPetResponse(
            success=True,
            message="Pet already unlocked",
            pet=pet_to_response(pet, unlocked, current_user.active_pet,
                                stats.get("total_points", 0), stats.get("streak_days", 0)),
        )

    condition = pet.get("unlock_condition") or {"type": "free", "value": 0}
    condition_type = condition.get("type") if isinstance(condition, dict) else "free"
    condition_value = condition.get("value", 0) if isinstance(condition, dict) else 0
    stats = await _user_stats(user_id)
    can_unlock = False
    reason = ""

    if condition_type == "free":
        can_unlock = True
    elif condition_type == "xp":
        if stats.get("total_points", 0) >= condition_value:
            can_unlock = True
        else:
            reason = f"Need {condition_value} XP (you have {stats.get('total_points', 0)})"
    elif condition_type == "streak":
        if stats.get("streak_days", 0) >= condition_value:
            can_unlock = True
        else:
            reason = f"Need {condition_value} day streak (you have {stats.get('streak_days', 0)})"

    if not can_unlock:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Cannot unlock pet: {reason}")

    user = await PostgresUserRepository().unlock_pet(user_id, pet_id)
    unlocked = list(user.unlocked_pets or [])

    logger.info(f"User {user_id} unlocked pet {pet_id}")
    return UnlockPetResponse(
        success=True,
        message=f"Successfully unlocked {pet['name']}!",
        pet=pet_to_response(pet, unlocked, user.active_pet,
                            stats.get("total_points", 0), stats.get("streak_days", 0)),
    )


# ========== Active Pet ==========

@router.put("/pets/active", response_model=PetResponse)
async def set_active_pet(
    request: SetActivePetRequest,
    current_user: PostgresUser = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """Set the user's active pet for display in AR."""
    user_id = current_user.id
    pet_id = request.pet_id
    unlocked = list(current_user.unlocked_pets or [])

    pet = await PostgresPetRepository().get(pet_id)
    if not pet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pet not found: {pet_id}")

    if pet_id not in unlocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Pet not unlocked")

    await PostgresUserRepository().set_active_pet(user_id, pet_id)
    stats = await _user_stats(user_id)
    return pet_to_response(pet, unlocked, pet_id, stats.get("total_points", 0), stats.get("streak_days", 0))


@router.get("/pets/active/current", response_model=Optional[PetResponse])
async def get_active_pet(
    current_user: PostgresUser = Depends(get_current_user),
    gamification_service: GamificationService = Depends(get_gamification_service),
):
    """Get the user's currently active pet."""
    if not current_user.active_pet:
        return None

    pet = await PostgresPetRepository().get(current_user.active_pet, active_only=False)
    if not pet:
        await PostgresUserRepository().set_active_pet(current_user.id, None)
        return None

    stats = await _user_stats(current_user.id)
    unlocked = list(current_user.unlocked_pets or [])
    return pet_to_response(pet, unlocked, current_user.active_pet,
                            stats.get("total_points", 0), stats.get("streak_days", 0))


@router.delete("/pets/active")
async def clear_active_pet(current_user: PostgresUser = Depends(get_current_user)):
    """Clear the user's active pet."""
    await PostgresUserRepository().set_active_pet(current_user.id, None)
    return {"success": True, "message": "Active pet cleared"}


# ========== Admin ==========

@router.post("/pets/admin/create", response_model=PetResponse)
async def create_pet(pet_data: PetCreate):
    """[ADMIN] Create a new pet in the catalog."""
    existing = await PostgresPetRepository().get(pet_data.pet_id, active_only=False)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Pet '{pet_data.pet_id}' already exists")

    repo = ORMPetRepository()
    pet = await repo.create(
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
        unlock_condition=pet_data.unlock_condition,
    )
    await invalidate_pet_catalog()

    return PetResponse(
        pet_id=pet["pet_id"], name=pet["name"], name_vi=pet.get("name_vi") or "",
        model_url=pet.get("model_url") or "", texture_url=pet.get("texture_url"),
        thumbnail_url=pet.get("thumbnail_url"), category=pet.get("category") or "character",
        pack_source=pet.get("pack_source") or "", rarity=pet.get("rarity") or "common",
        color=pet.get("color") or "#FF6B6B", animations=pet.get("animations") or ["idle"],
        unlock_condition=pet.get("unlock_condition") or {"type": "free", "value": 0},
        is_unlocked=False, is_active=False, can_unlock=False,
    )


@router.put("/pets/admin/{pet_id}", response_model=PetResponse)
async def update_pet(pet_id: str, pet_data: PetUpdate):
    """[ADMIN] Update an existing pet in the catalog."""
    existing = await PostgresPetRepository().get(pet_id, active_only=False)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pet not found: {pet_id}")

    repo = ORMPetRepository()
    update_data = {k: v for k, v in pet_data.model_dump(exclude_unset=True).items() if v is not None}
    pet = await repo.update(pet_id, **update_data)
    await invalidate_pet_catalog()

    return PetResponse(
        pet_id=pet["pet_id"], name=pet["name"], name_vi=pet.get("name_vi") or "",
        model_url=pet.get("model_url") or "", texture_url=pet.get("texture_url"),
        thumbnail_url=pet.get("thumbnail_url"), category=pet.get("category") or "character",
        pack_source=pet.get("pack_source") or "", rarity=pet.get("rarity") or "common",
        color=pet.get("color") or "#FF6B6B", animations=pet.get("animations") or ["idle"],
        unlock_condition=pet.get("unlock_condition") or {"type": "free", "value": 0},
        is_unlocked=False, is_active=False, can_unlock=False,
    )


@router.delete("/pets/admin/{pet_id}")
async def delete_pet(pet_id: str):
    """[ADMIN] Soft-delete a pet."""
    repo = ORMPetRepository()
    updated = await repo.update(pet_id, is_active=False)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pet not found: {pet_id}")
    await invalidate_pet_catalog()
    return {"success": True, "message": f"Pet '{pet_id}' has been deactivated"}
