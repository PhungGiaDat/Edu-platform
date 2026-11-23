# models/pet.py
"""
Pet Models - PostgreSQL via repositories

Pet companion system for AR flashcard learning.
All database operations go through pet repositories (PostgreSQL).
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ========== Embedded Documents ==========

class UnlockCondition(BaseModel):
    """Unlock condition for a pet"""
    type: Literal["free", "xp", "streak", "achievement", "purchase"] = "free"
    value: int = 0


class PetPreferences(BaseModel):
    """User preferences for pet display"""
    show_in_ar: bool = True
    animation_speed: float = 1.0
    position: Literal["bottom-right", "bottom-left", "top-right", "top-left"] = "bottom-right"


# ========== API Schemas ==========

class PetCreate(BaseModel):
    """Schema for creating a new pet"""
    pet_id: str
    name: str
    name_vi: str
    model_url: str
    texture_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: str = "character"
    pack_source: str = "kenney_blocky-characters"
    rarity: Literal["common", "rare", "epic", "legendary"] = "common"
    color: str = "#FF6B6B"
    animations: List[str] = Field(default_factory=lambda: ["idle"])
    unlock_condition: Optional[UnlockCondition] = None


class PetUpdate(BaseModel):
    """Schema for updating a pet"""
    name: Optional[str] = None
    name_vi: Optional[str] = None
    model_url: Optional[str] = None
    texture_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    rarity: Optional[Literal["common", "rare", "epic", "legendary"]] = None
    color: Optional[str] = None
    animations: Optional[List[str]] = None
    unlock_condition: Optional[UnlockCondition] = None
    is_active: Optional[bool] = None


class PetResponse(BaseModel):
    """Schema for pet API response"""
    pet_id: str
    name: str
    name_vi: str
    model_url: str
    texture_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: str
    pack_source: str
    rarity: str
    color: str
    animations: List[str]
    unlock_condition: UnlockCondition

    # User-specific fields (populated at runtime)
    is_unlocked: bool = False
    is_active: bool = False
    can_unlock: bool = False

    class Config:
        from_attributes = True


class PetListResponse(BaseModel):
    """Schema for pet list API response"""
    pets: List[PetResponse]
    stats: dict


class SetActivePetRequest(BaseModel):
    """Schema for setting active pet"""
    pet_id: str


class UnlockPetResponse(BaseModel):
    """Schema for unlock pet response"""
    success: bool
    message: str
    pet: Optional[PetResponse] = None
