# models/ar_object.py
"""
AR Object Models - Beanie Documents and Pydantic Schemas

Architecture: Hybrid Database (Beanie for MongoDB)
- Beanie Document for database operations
- Pydantic schemas for API request/response
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ========== Beanie Document (MongoDB) ==========
class ARObject(Document):
    """
    AR Object Document - stored in MongoDB
    
    Collection: ar_objects
    Contains NFT marker data and 3D model references
    """
    ar_tag: Indexed(str, unique=True)  # Unique AR marker/target identifier
    description: str
    animation_type: str = Field(default="none")  # none, rotate, bounce, etc.
    glb_size: float = Field(default=1.0)
    
    # NFT marker URLs (for AR.js NFT tracking)
    nft_base_url: str  # Base URL for .fset, .fset3, .iset files
    
    # Model URLs
    model_3d_url: str  # URL to .glb/.gltf 3D model
    image_2d_url: str  # URL to 2D fallback image
    
    # Transform properties
    position: str = Field(default="0 0 0")  # x y z
    rotation: str = Field(default="0 0 0")  # x y z (degrees)
    scale: str = Field(default="1 1 1")  # x y z
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "ar_objects"  # MongoDB collection name
        indexes = [
            "animation_type"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "ar_tag": "apple_marker",
                "description": "3D apple model for vocabulary learning",
                "animation_type": "rotate",
                "glb_size": 0.5,
                "nft_base_url": "/static/assets/target/apple",
                "model_3d_url": "/static/assets/models/apple.glb",
                "image_2d_url": "/static/images/apple.png",
                "position": "0 0.5 0",
                "rotation": "0 0 0",
                "scale": "0.5 0.5 0.5"
            }
        }


# ========== Pydantic Schemas (API) ==========
class ARObjectCreate(BaseModel):
    """Schema for creating a new AR object"""
    ar_tag: str
    description: str
    animation_type: str = "none"
    glb_size: float = 1.0
    nft_base_url: str
    model_3d_url: str
    image_2d_url: str
    position: str = "0 0 0"
    rotation: str = "0 0 0"
    scale: str = "1 1 1"


class ARObjectUpdate(BaseModel):
    """Schema for updating AR object - all fields optional"""
    description: Optional[str] = None
    animation_type: Optional[str] = None
    glb_size: Optional[float] = None
    nft_base_url: Optional[str] = None
    model_3d_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    position: Optional[str] = None
    rotation: Optional[str] = None
    scale: Optional[str] = None


class ARObjectResponse(BaseModel):
    """Schema for API responses"""
    id: Optional[str] = Field(None, alias="_id")
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
        from_attributes = True
        populate_by_name = True


# ========== Legacy Schema (Backward Compatibility) ==========
class ArObjectSchema(BaseModel):
    """
    Legacy AR Object schema - kept for backward compatibility
    Use ARObjectResponse for new code
    """
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
        populate_by_name = True
