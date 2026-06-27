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

from .pet import PetPreferences

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
    
    # Pet system fields
    active_pet: Optional[str] = None  # pet_id of currently active pet
    unlocked_pets: List[str] = Field(default_factory=list)  # List of unlocked pet_ids
    pet_preferences: Optional[PetPreferences] = None  # User's pet display preferences
    
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

    # Mastery timestamp
    mastered_at: Optional[datetime] = None  # When mastery_level >= 3 was reached

    class Settings:
        name = "learning_progress"
        indexes: list = [
            # Foreign key lookups
            [("user_id", 1)],
            [("flashcard_qr_id", 1)],
            # Unique constraint on user + flashcard
            [("user_id", 1), ("flashcard_qr_id", 1)],  # Unique compound index
            # Mastery/leaderboard queries
            [("user_id", 1), ("mastery_level", -1)],  # User's mastery ranking
            # Partial index for mastered items (mastery_level >= 3)
            {
                "fields": [("mastery_level", -1)],
                "partialFilterExpression": {"mastery_level": {"$gte": 3}},
                "name": "mastered_items_partial"
            },
            # Spaced repetition queries
            [("next_review_at", 1)],  # Review queue (sparse - nullable field)
        ]


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
        indexes: list = [
            # Foreign key lookups
            [("user_id", 1)],
            # Quiz type queries
            [("quiz_type", 1)],
            # History queries
            [("user_id", 1), ("attempted_at", -1)],  # User's quiz history
            [("user_id", 1), ("quiz_type", 1)],  # User's attempts by type
            # TTL index (90 days)
            {
                "fields": [("attempted_at", 1)],
                "expireAfterSeconds": 7776000,  # 90 days
                "name": "quiz_attempts_ttl"
            },
        ]


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
    
    # Pet system fields
    active_pet: Optional[str] = None
    unlocked_pets: List[str] = Field(default_factory=list)
    pet_preferences: Optional[PetPreferences] = None

    class Config:
        from_attributes = True
