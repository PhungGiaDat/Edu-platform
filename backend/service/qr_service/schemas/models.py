from pydantic import BaseModel, Field
from typing import Optional, Dict
from bson import ObjectId
from ...ar_model.schemas.models import ArObjectSchema

class FlashcardSchema(BaseModel):
    qr_id: str
    word: str
    translation: Dict[str, str] = Field(..., description="Từ vựng và bản dịch của nó")
    category: str
    image_url: str
    audio_url: Optional[str] = None
    difficulty: str
    ar_object: Optional[ArObjectSchema]  # 👈 Add field này

    class Config:
        json_encoders = {
            ObjectId: str  # nếu có ObjectId thì stringify nó
        }
        allow_population_by_field_name = True  # Cho phép sử dụng tên trường trong JSON để điền vào mô hình
        
  
        