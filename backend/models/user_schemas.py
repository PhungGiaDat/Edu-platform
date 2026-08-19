"""Pure Pydantic request/response schemas for user authentication.

No Beanie dependency — these can be imported from any layer.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

from models.pet import PetPreferences


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(min_length=8)
    full_name: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_superuser: bool = False
    role: str = "learner"
    roles: List[str] = Field(default_factory=list)
    created_at: datetime
    active_pet: Optional[str] = None
    unlocked_pets: List[str] = Field(default_factory=list)
    pet_preferences: Optional[PetPreferences] = None

    class Config:
        from_attributes = True
