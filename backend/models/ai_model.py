from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AIConfigSchema(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    model_name: str = Field(..., description="Name of the AI model (e.g., gemini-pro)")
    temperature: float = Field(0.7, description="Creativity level")
    max_tokens: int = Field(1000, description="Max tokens for response")
    system_prompt: str = Field(..., description="Base system prompt for the AI")
    is_active: bool = Field(True, description="Whether this config is active")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}
