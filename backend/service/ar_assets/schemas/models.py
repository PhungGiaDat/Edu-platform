from pydantic import BaseModel, Field
from typing import Dict, Optional,List
from bson import ObjectId
from datetime import datetime

class ArObjectSchema(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    ar_tag: str
    description: str
    animation_type: str
    glb_size: float
    nft_base_url: str
    model_3d_url: str
    image_2d_url:str
    position : str 
    rotation: str
    scale : str
    created_at: datetime

    class Config:
        json_encoders = {
            ObjectId: str
        }
        allow_population_by_field_name = True   
       
## Transform schema 
class TransformSchema(BaseModel):
    position: Optional[str] = None
    rotation: Optional[str] = None
    scale: Optional[str] = None
    
    
class ArCombinationSchema(BaseModel):
    """Schema for an ArCombination (multi-card context)"""
    id: Optional[str] = Field(default=None, alias="_id")
    combo_id: str = Field(..., description="A unique string identifer for the combo")
    description: str = Field(..., description="Description of the combination")

    # A list of 'ar_tag' values required to activate this combo.
    required_tags: List[str] = Field(..., min_items=2)

    # Asset URLs for the combined scene.
    model_3d_url: str
    image_2d_url: Optional[str] = None

    # Transformation for the combined model in the center.
    center_transform: Optional[TransformSchema] = None


    class Config:
        json_encoders = {
            ObjectId: str
        }
        allow_population_by_field_name = True
        
