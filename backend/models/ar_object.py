# backend/models/ar_object.py
"""
AR Object Models - Request/Response Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from bson import ObjectId
from datetime import datetime


class ArObjectSchema(BaseModel):
    """AR Object schema matching database structure"""
    id: Optional[str] = Field(default=None, alias="_id")
    ar_tag: str
    description: str
    animation_type: str
    glb_size: float
    nft_base_url: str
    model_3d_url: str
    image_2d_url: str
    position: str
    rotation: str
    scale: str
    created_at: datetime
    
    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True
