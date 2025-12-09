# models/chat_log.py
"""
ChatLog Model - Beanie Document for storing RAG chat history

Used for:
- Analytics and improvement of AI responses
- Session history tracking
- Debugging and monitoring
"""
from beanie import Document, Indexed
from pydantic import Field
from typing import Optional, List
from datetime import datetime


class ChatLog(Document):
    """
    Chat Log Document - stored in MongoDB
    
    Collection: chat_logs
    """
    session_id: Indexed(str)
    user_id: Optional[str] = None  # Supabase User ID (if authenticated)
    
    # Message content
    message: str
    sender: str  # "user" | "ai"
    
    # RAG metadata (only for AI responses)
    context_flashcard_ids: Optional[List[str]] = None  # Retrieved flashcard IDs
    
    # Timestamps
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "chat_logs"
        indexes = [
            "session_id",
            "timestamp"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "session_abc123",
                "user_id": "user_xyz",
                "message": "Con thỏ tiếng Anh là gì?",
                "sender": "user",
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }
