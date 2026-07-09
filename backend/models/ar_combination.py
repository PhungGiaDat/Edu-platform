# backend/models/ar_combination.py
"""
AR Combination Models - Multi-marker combos
"""
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from bson import ObjectId


class TransformSchema(BaseModel):
    """Transform schema for AR objects"""
    position: Optional[str] = None
    rotation: Optional[str] = None
    scale: Optional[str] = None


class ArCombinationSchema(BaseModel):
    """Schema for an ArCombination (multi-card context)"""
    id: Optional[str] = Field(default=None, alias="_id")
    combo_id: str = Field(..., description="A unique string identifier for the combo")
    description: str = Field(..., description="Description of the combination")
    required_tags: List[str] = Field(..., min_length=2)
    target_order: Optional[List[str]] = Field(
        default=None,
        description="DEPRECATED: MindAR target indices are now determined by scan order. This field is ignored.",
    )
    model_3d_url: str
    texture_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    combo_mind_url: Optional[str] = None  # MindAR .mind file with both target images
    bonus_xp: int = Field(default=100, description="XP awarded when combo is triggered")
    center_transform: Optional[TransformSchema] = None

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True
