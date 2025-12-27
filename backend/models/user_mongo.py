# models/user_mongo.py
"""
MongoDB User Models using Beanie ODM
Replacing PostgreSQL/SQLModel implementation
"""
from beanie import Document, Indexed
from pydantic import Field, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

# ========== Beanie Documents ==========

class UserDocument(Document):
    """
    User account document - stored in MongoDB
    Collection: users
    """
    email: Indexed(EmailStr, unique=True)
    username: Indexed(str, unique=True)
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    hashed_password: str
    
    # Status flags
    is_active: bool = True
    is_verified: bool = False
    is_superuser: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Settings:
        name = "users"

    def __repr__(self) -> str:
        return f"<UserDocument(id={self.id}, email={self.email})>"


class LearningProgressDocument(Document):
    """
    Track user's learning progress in MongoDB
    Collection: learning_progress
    """
    user_id: Indexed(str) # Reference to UserDocument.id (as string)
    flashcard_qr_id: Indexed(str)
    
    times_viewed: int = 0
    times_correct: int = 0
    times_incorrect: int = 0
    mastery_level: int = 0 # 0-5 scale
    
    # Timestamps for spaced repetition
    first_seen_at: datetime = Field(default_factory=datetime.utcnow)
    last_reviewed_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None

    class Settings:
        name = "learning_progress"


class QuizAttemptDocument(Document):
    """
    Track quiz attempts in MongoDB
    Collection: quiz_attempts
    """
    user_id: Indexed(str)
    quiz_type: str # 'flashcard', 'ar', etc.
    flashcard_qr_id: Optional[str] = None
    
    score: int = 0
    total_questions: int = 0
    time_spent_seconds: int = 0
    attempted_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "quiz_attempts"


# ========== API Schemas (Pydantic) ==========
# These are used for request/response validation

from pydantic import BaseModel

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(min_length=8)
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True
