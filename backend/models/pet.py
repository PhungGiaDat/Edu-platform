# models/pet.py
"""
MongoDB Pet Models using Beanie ODM
Pet companion system for AR flashcard learning
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ========== Embedded Documents ==========

class UnlockCondition(BaseModel):
    """Unlock condition for a pet"""
    type: Literal["free", "xp", "streak", "achievement", "purchase"] = "free"
    value: int = 0  # Threshold value (0 for free)


class PetPreferences(BaseModel):
    """User preferences for pet display"""
    show_in_ar: bool = True
    animation_speed: float = 1.0
    position: Literal["bottom-right", "bottom-left", "top-right", "top-left"] = "bottom-right"


# ========== Beanie Documents ==========

class PetDocument(Document):
    """
    Pet companion document - stored in MongoDB
    Collection: pets
    """
    pet_id: Indexed(str, unique=True)  # Unique identifier e.g., "kenney_character_a"
    name: str  # English name
    name_vi: str  # Vietnamese name
    
    # Asset URLs (hosted on Supabase)
    model_url: str  # GLB model URL
    texture_url: Optional[str] = None  # Separate texture URL
    thumbnail_url: Optional[str] = None  # Preview image URL
    
    # Categorization
    category: str = "character"  # character, animal, robot, etc.
    pack_source: str = "kenney_blocky-characters"  # Asset pack source
    rarity: Literal["common", "rare", "epic", "legendary"] = "common"
    color: str = "#FF6B6B"  # Theme color for UI
    
    # Animations available
    animations: List[str] = Field(default_factory=lambda: ["idle"])
    
    # Unlock requirements
    unlock_condition: UnlockCondition = Field(default_factory=UnlockCondition)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    is_active: bool = True  # Whether pet is available in catalog

    class Settings:
        name = "pets"

    def __repr__(self) -> str:
        return f"<PetDocument(pet_id={self.pet_id}, name={self.name}, rarity={self.rarity})>"


# ========== API Schemas (Pydantic) ==========

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
    stats: dict  # {total, unlocked, common, rare, epic, legendary}


class SetActivePetRequest(BaseModel):
    """Schema for setting active pet"""
    pet_id: str


class UnlockPetResponse(BaseModel):
    """Schema for unlock pet response"""
    success: bool
    message: str
    pet: Optional[PetResponse] = None
