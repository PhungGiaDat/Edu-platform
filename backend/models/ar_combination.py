# backend/models/ar_combination.py
"""
AR Combination Models - Multi-marker combos
"""
from pydantic import BaseModel, Field
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
    model_3d_url: str
    image_2d_url: Optional[str] = None
    center_transform: Optional[TransformSchema] = None
    
    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True
