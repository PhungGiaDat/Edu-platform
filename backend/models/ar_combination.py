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
    target_order: List[str] = Field(
        ...,
        min_length=2,
        description="AR tags in the exact order used to compile combo_mind_url",
    )
    model_3d_url: str
    texture_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    combo_mind_url: Optional[str] = None  # MindAR .mind file with both target images
    bonus_xp: int = Field(default=100, description="XP awarded when combo is triggered")
    center_transform: Optional[TransformSchema] = None

    @model_validator(mode="after")
    def validate_target_order(self):
        """Never allow compile order to drift from the combo's required cards."""
        if len(self.target_order) != len(self.required_tags):
            raise ValueError("target_order must contain every required_tag exactly once")
        if len(set(self.target_order)) != len(self.target_order):
            raise ValueError("target_order must not contain duplicate tags")
        if set(self.target_order) != set(self.required_tags):
            raise ValueError("target_order must be a permutation of required_tags")
        return self

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True
