# models/user.py
"""
User Models for PostgreSQL/Supabase using SQLModel

Architecture: Hybrid Database (SQLModel for Supabase)
- Type-safe models with SQLModel
- Compatible with Pydantic v2 for API schemas
- Relationships between tables
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
import uuid

# Forward references for circular imports
if TYPE_CHECKING:
    from .learning_progress import LearningProgress


# ========== User Model ==========
class UserBase(SQLModel):
    """Base user fields - shared by create, update, and response schemas"""
    email: str = Field(index=True, unique=True, max_length=255)
    username: str = Field(index=True, unique=True, max_length=100)
    full_name: Optional[str] = Field(default=None, max_length=255)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class User(UserBase, table=True):
    """
    User account model - stored in PostgreSQL/Supabase
    
    Table: users
    """
    __tablename__ = "users"
    
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        max_length=36
    )
    hashed_password: str = Field(max_length=255)
    
    # Status flags
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    is_superuser: bool = Field(default=False)
    
    # Timestamps
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    last_login: Optional[datetime] = Field(default=None)
    
    # Relationships (lazy loaded to avoid N+1)
    learning_progress: List["LearningProgress"] = Relationship(back_populates="user")
    quiz_attempts: List["QuizAttempt"] = Relationship(back_populates="user")
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


# ========== User API Schemas ==========
class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(min_length=8)


class UserUpdate(SQLModel):
    """Schema for updating user - all fields optional"""
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for API responses - excludes password"""
    id: str
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserPublic(SQLModel):
    """Public user info (for leaderboards, etc.)"""
    id: str
    username: str
    avatar_url: Optional[str] = None


# ========== Learning Progress Model ==========
class LearningProgressBase(SQLModel):
    """Base learning progress fields"""
    flashcard_qr_id: str = Field(index=True, max_length=50)
    times_viewed: int = Field(default=0)
    times_correct: int = Field(default=0)
    times_incorrect: int = Field(default=0)
    mastery_level: int = Field(default=0, ge=0, le=5)  # 0-5 scale


class LearningProgress(LearningProgressBase, table=True):
    """
    Track user's learning progress - stored in PostgreSQL
    
    Links user (SQL) to flashcard (MongoDB by qr_id)
    """
    __tablename__ = "learning_progress"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True, max_length=36)
    
    # Timestamps for spaced repetition
    first_seen_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    last_reviewed_at: Optional[datetime] = Field(default=None)
    next_review_at: Optional[datetime] = Field(default=None)
    
    # Relationship
    user: Optional[User] = Relationship(back_populates="learning_progress")
    
    def __repr__(self) -> str:
        return f"<LearningProgress(user={self.user_id}, flashcard={self.flashcard_qr_id})>"


class LearningProgressCreate(LearningProgressBase):
    """Schema for creating learning progress"""
    user_id: str


class LearningProgressResponse(LearningProgressBase):
    """Schema for API responses"""
    id: int
    user_id: str
    first_seen_at: Optional[datetime] = None
    last_reviewed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ========== Quiz Attempt Model ==========
class QuizAttemptBase(SQLModel):
    """Base quiz attempt fields"""
    quiz_type: str = Field(max_length=50)  # 'flashcard', 'ar', etc.
    flashcard_qr_id: Optional[str] = Field(default=None, max_length=50)
    score: int = Field(default=0)
    total_questions: int = Field(default=0)
    time_spent_seconds: int = Field(default=0)


class QuizAttempt(QuizAttemptBase, table=True):
    """
    Track quiz attempts - stored in PostgreSQL
    
    References MongoDB quiz by qr_id
    """
    __tablename__ = "quiz_attempts"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True, max_length=36)
    
    # Timestamp
    attempted_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    # Relationship
    user: Optional[User] = Relationship(back_populates="quiz_attempts")
    
    def __repr__(self) -> str:
        return f"<QuizAttempt(user={self.user_id}, score={self.score}/{self.total_questions})>"


class QuizAttemptCreate(QuizAttemptBase):
    """Schema for creating quiz attempt"""
    user_id: str


class QuizAttemptResponse(QuizAttemptBase):
    """Schema for API responses"""
    id: int
    user_id: str
    attempted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

