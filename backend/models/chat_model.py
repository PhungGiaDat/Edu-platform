from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from bson import ObjectId
from datetime import datetime

class ChatMessageSchema(BaseModel):
    role: Literal["user", "model"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    audio_url: Optional[str] = None  # For pronunciation practice

class ChatSessionSchema(BaseModel):
    user_id: str  # Supabase User ID
    title: Optional[str] = "New Chat"
    messages: List[ChatMessageSchema] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True
