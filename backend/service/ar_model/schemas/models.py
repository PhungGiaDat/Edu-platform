from pydantic import BaseModel, Field
from typing import Dict, Optional
from bson import ObjectId
from datetime import datetime

class ArObjectSchema(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    ar_tag: str
    description: str
    animation_type: str
    glb_size: float
    mind_file_url: str
    model_3d_url: str
    position : str 
    rotation: str
    scale : str
    created_at: datetime

    class Config:
        json_encoders = {
            ObjectId: str
        }
        allow_population_by_field_name = True   
        
