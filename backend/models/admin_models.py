# backend/models/admin_models.py
"""
MongoDB Models for Teacher Admin Dashboard
Extended schemas for teacher-scoped content management
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional, Literal, Any
from datetime import datetime
from enum import Enum


# ========== Enums ==========

class UserRole(str, Enum):
    """User roles for RBAC"""
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class DeckStatus(str, Enum):
    """Flashcard deck status"""
    ACTIVE = "active"
    ARCHIVED = "archived"


class CourseStatus(str, Enum):
    """Course status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Difficulty(str, Enum):
    """Flashcard difficulty levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# ========== Flashcard Deck Document ==========

class FlashcardDeckDocument(Document):
    """
    Flashcard Deck - Groups flashcards for organization
    Collection: flashcard_decks
    """
    deck_id: Indexed(str, unique=True)
    teacher_id: Indexed(str)
    
    # Multilingual names
    name: Dict[str, str] = Field(
        default={"en": "", "vi": ""},
        description="Deck name in different languages"
    )
    description: Optional[Dict[str, str]] = Field(
        default=None,
        description="Deck description"
    )
    
    # Media
    cover_image_url: Optional[str] = None
    
    # Organization
    category: str = "general"
    tags: List[str] = Field(default_factory=list)
    is_active: bool = True
    
    # Stats (denormalized for performance)
    card_count: int = 0
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "flashcard_decks"
        indexes: list = [
            # Unique identifier
            [("deck_id", 1)],
            # Organization indexes
            [("teacher_id", 1)],
            [("is_active", 1)],
            [("category", 1)],
            # Compound indexes for common queries
            [("teacher_id", 1), ("is_active", 1)],  # Teacher's active decks
        ]


# ========== Extended Flashcard Document ==========

class FlashcardDocument(Document):
    """
    Flashcard Document - Extended with teacher_id and deck_id
    Collection: flashcards
    
    Note: This extends the existing Flashcard model with teacher scoping
    """
    qr_id: Indexed(str, unique=True)
    teacher_id: Optional[Indexed(str)] = Field(
        default=None,
        description="Teacher who created this flashcard"
    )
    deck_id: Optional[Indexed(str)] = Field(
        default=None,
        description="Deck grouping"
    )
    
    # Content
    word: str
    translation: Dict[str, str] = Field(
        default={"en": "", "vi": ""},
        description="Word translations"
    )
    pronunciation: Optional[str] = None
    
    # Media
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    
    # Organization
    category: str = "general"
    difficulty: str = "beginner"
    tags: List[str] = Field(default_factory=list)
    
    # AI
    vector_embedding: Optional[List[float]] = None
    definition: Optional[str] = None
    ar_tag: Optional[str] = None
    image_animation_type: Optional[str] = None
    
    # Status
    is_active: bool = True
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "flashcards"
        indexes: list = [
            # NOTE: qr_id unique index is auto-generated from the field-level
            # `qr_id: Indexed(str, unique=True)` declaration above (name="qr_id_1").
            # Do NOT add [("qr_id", 1)] here or MongoDB will raise
            # IndexKeySpecsConflict (code 86).
            # Organization indexes
            [("teacher_id", 1)],
            [("deck_id", 1)],
            [("category", 1)],
            [("difficulty", 1)],
            [("is_active", 1)],
            # Compound indexes for common queries
            [("deck_id", 1), ("created_at", 1)],  # Flashcards in deck by creation time
            [("category", 1), ("difficulty", 1)],  # Category + difficulty
        ]


# ========== Extended Course Document ==========

class CourseDocument(Document):
    """
    Course Document - Extended with teacher_id and enrollment tracking
    Collection: courses
    
    Note: This extends the existing Course model with teacher scoping
    """
    course_id: Indexed(str, unique=True)
    teacher_id: Indexed(str)
    
    # Course content (from CourseSchema)
    title: str = ""
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    subtitle_vi: str = ""
    theme: str = ""
    category_key: str = ""
    category_label: str = ""
    category_icon: str = ""
    age_range: str = "5-8"
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    description_vi: str = ""
    
    # Course structure
    lessons: List[Any] = Field(default_factory=list)
    
    # Teacher-specific flags
    is_template: bool = Field(
        default=False,
        description="Can be used as template for other courses"
    )
    is_published: bool = False
    
    # Enrollment tracking (denormalized for performance)
    enrolled_students: List[str] = Field(default_factory=list)
    enrollment_count: int = 0
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "courses"
        indexes: list = [
            # Unique identifier
            [("course_id", 1)],
            # Organization indexes
            [("teacher_id", 1)],
            [("is_published", 1)],
            [("is_template", 1)],
            [("category_key", 1)],
            [("level", 1)],
            # Compound indexes for common queries
            [("teacher_id", 1), ("is_published", 1)],  # Teacher's published courses
            [("teacher_id", 1), ("created_at", -1)],  # Teacher's courses (newest first)
            [("teacher_id", 1), ("is_active", 1)],  # Teacher's active courses
        ]


# ========== Student Progress Document ==========

class LessonProgress(BaseModel):
    """Embedded lesson progress within course enrollment"""
    lesson_id: str
    status: Literal["not_started", "started", "completed"] = "not_started"
    attempts: int = 0
    best_score: Optional[int] = None
    time_spent_minutes: int = 0
    completed_at: Optional[datetime] = None


class CourseEnrollment(BaseModel):
    """Embedded course enrollment"""
    course_id: str
    enrolled_at: datetime
    progress_percent: float = 0.0
    lessons: List[LessonProgress] = Field(default_factory=list)
    last_activity: Optional[datetime] = None
    status: Literal["active", "completed", "dropped"] = "active"


class StudentProgressDocument(Document):
    """
    Student Progress - Track learning progress scoped to a teacher
    Collection: student_progress
    """
    user_id: Indexed(str)
    teacher_id: Indexed(str)
    
    # User info (denormalized)
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    
    # Enrollments in teacher's courses
    enrollments: List[CourseEnrollment] = Field(default_factory=list)
    
    # Learning stats
    flashcards_practiced: int = 0
    flashcards_mastered: int = 0
    total_xp: int = 0
    total_time_minutes: int = 0
    streak_days: int = 0
    last_active: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "student_progress"
        indexes: list = [
            # Foreign key lookups
            [("user_id", 1)],
            [("teacher_id", 1)],
            # Activity queries
            [("last_active", 1)],
            # Compound indexes for common queries
            [("teacher_id", 1), ("last_active", -1)],  # Teacher's students by activity
            [("teacher_id", 1), ("total_xp", -1)],  # Leaderboard queries
        ]


# ========== Usage Session Document (Time Limit) ==========

class BreakData(BaseModel):
    """Embedded break data within usage session"""
    started_at: datetime
    planned_duration_minutes: int
    actual_duration_minutes: Optional[int] = None
    streak_preserved: bool = True
    was_auto_triggered: bool = False


class UsageSessionDocument(Document):
    """
    Usage Session - Track learning sessions with break support
    Collection: usage_sessions
    """
    session_id: Indexed(str, unique=True)
    user_id: Indexed(str)
    
    # Session timing
    started_at: datetime
    ended_at: Optional[datetime] = None
    timezone: str = "Asia/Ho_Chi_Minh"
    
    # Active time tracking
    total_active_seconds: int = 0
    last_activity_at: Optional[datetime] = None
    
    # Break tracking
    current_break: Optional[BreakData] = None
    break_history: List[BreakData] = Field(default_factory=list)
    
    # Gamification
    xp_earned: int = 0
    lessons_completed: int = 0
    quizzes_completed: int = 0
    
    # Metadata
    device_info: Optional[Dict[str, Any]] = None
    is_active: bool = True

    class Settings:
        name = "usage_sessions"
        indexes: list = [
            # Unique identifier
            [("session_id", 1)],
            # Foreign key lookups
            [("user_id", 1)],
            # Activity status
            [("is_active", 1)],
            # TTL index (365 days)
            {
                "fields": [("started_at", 1)],
                "expireAfterSeconds": 31536000,  # 365 days
                "name": "usage_sessions_ttl"
            },
        ]


# ========== Learning Goals Document ==========

class LearningGoalSettings(BaseModel):
    """Daily learning goal settings for a student"""
    daily_xp_goal: int = Field(default=100, ge=10, le=500)
    daily_minutes_goal: int = Field(default=15, ge=5, le=120)
    streak_protection_enabled: bool = True
    reminder_enabled: bool = True
    reminder_interval_minutes: int = Field(default=20, ge=5, le=60)


class LearningGoalDocument(Document):
    """
    Learning Goals - Store daily goal settings per student
    Collection: learning_goals
    """
    user_id: Indexed(str, unique=True)
    teacher_id: Indexed(str)
    
    settings: LearningGoalSettings = Field(default_factory=LearningGoalSettings)
    
    # Progress tracking
    current_streak: int = 0
    longest_streak: int = 0
    total_xp_earned: int = 0
    total_minutes_learned: int = 0
    
    # Last active
    last_goal_completed: Optional[datetime] = None
    last_active_date: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "learning_goals"
        indexes: list = [
            # Unique identifier
            [("user_id", 1)],
            # Organization indexes
            [("teacher_id", 1)],
        ]


# ========== Pydantic Schemas for API ==========

class FlashcardDeckCreate(BaseModel):
    """Schema for creating a flashcard deck"""
    name: Dict[str, str]
    description: Optional[Dict[str, str]] = None
    cover_image_url: Optional[str] = None
    category: str = "general"
    tags: List[str] = Field(default_factory=list)


class FlashcardDeckUpdate(BaseModel):
    """Schema for updating a flashcard deck"""
    name: Optional[Dict[str, str]] = None
    description: Optional[Dict[str, str]] = None
    cover_image_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class FlashcardDeckResponse(BaseModel):
    """Schema for flashcard deck response"""
    deck_id: str
    teacher_id: str
    name: Dict[str, str]
    description: Optional[Dict[str, str]] = None
    cover_image_url: Optional[str] = None
    category: str
    tags: List[str]
    card_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminFlashcardCreate(BaseModel):
    """Schema for creating a flashcard (admin)"""
    qr_id: str
    word: str
    translation: Dict[str, str]
    deck_id: Optional[str] = None
    pronunciation: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    category: str = "general"
    difficulty: str = "beginner"
    tags: List[str] = Field(default_factory=list)


class AdminFlashcardUpdate(BaseModel):
    """Schema for updating a flashcard (admin)"""
    word: Optional[str] = None
    translation: Optional[Dict[str, str]] = None
    deck_id: Optional[str] = None
    pronunciation: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class AdminFlashcardResponse(BaseModel):
    """Schema for flashcard response (admin)"""
    id: Optional[str] = Field(None, alias="_id")
    qr_id: str
    teacher_id: Optional[str]
    deck_id: Optional[str]
    word: str
    translation: Dict[str, str]
    pronunciation: Optional[str]
    image_url: Optional[str]
    audio_url: Optional[str]
    category: str
    difficulty: str
    tags: List[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminCourseCreate(BaseModel):
    """Schema for creating a course (admin)"""
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    subtitle_vi: str = ""
    theme: str = ""
    category_key: str = ""
    category_label: str = ""
    category_icon: str = ""
    age_range: str = "5-8"
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    description_vi: str = ""
    is_template: bool = False


class AdminCourseUpdate(BaseModel):
    """Schema for updating a course (admin)"""
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    subtitle_vi: Optional[str] = None
    theme: Optional[str] = None
    category_key: Optional[str] = None
    category_label: Optional[str] = None
    category_icon: Optional[str] = None
    age_range: Optional[str] = None
    level: Optional[Literal["beginner", "intermediate", "advanced"]] = None
    description_vi: Optional[str] = None
    is_template: Optional[bool] = None
    is_published: Optional[bool] = None
    lessons: Optional[List[Any]] = None


class AdminCourseResponse(BaseModel):
    """Schema for course response (admin)"""
    course_id: str
    teacher_id: str
    title: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    subtitle_vi: str
    theme: str
    category_key: str
    category_label: str
    category_icon: str
    age_range: str
    level: str
    description_vi: str
    is_template: bool
    is_published: bool
    enrollment_count: int
    lesson_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentProgressResponse(BaseModel):
    """Schema for student progress response"""
    user_id: str
    teacher_id: str
    user_name: Optional[str]
    user_avatar: Optional[str]
    enrollments: List[CourseEnrollment]
    flashcards_practiced: int
    flashcards_mastered: int
    total_xp: int
    total_time_minutes: int
    streak_days: int
    last_active: Optional[datetime]

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    """Schema for dashboard statistics"""
    total_students: int = 0
    total_courses: int = 0
    total_flashcards: int = 0
    total_decks: int = 0
    active_sessions: int = 0
    average_progress: float = 0.0
    total_enrollments: int = 0
    
    # Recent activity
    students_this_week: int = 0
    lessons_completed_today: int = 0
    
    # Top performers
    top_students: List[Dict[str, Any]] = Field(default_factory=list)


class LearningGoalCreate(BaseModel):
    """Schema for creating/updating learning goals"""
    daily_xp_goal: int = Field(default=100, ge=10, le=500)
    daily_minutes_goal: int = Field(default=15, ge=5, le=120)
    streak_protection_enabled: bool = True
    reminder_enabled: bool = True
    reminder_interval_minutes: int = Field(default=20, ge=5, le=60)


class LearningGoalResponse(BaseModel):
    """Schema for learning goal response"""
    user_id: str
    teacher_id: str
    settings: LearningGoalSettings
    current_streak: int
    longest_streak: int
    total_xp_earned: int
    total_minutes_learned: int
    last_goal_completed: Optional[datetime]
    last_active_date: Optional[datetime]

    class Config:
        from_attributes = True


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints"""
    skip: int = 0
    limit: int = 20

    @field_validator("skip", "limit")
    @classmethod
    def validate_pagination(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Pagination must be non-negative")
        return v


class PaginatedResponse(BaseModel):
    """Generic paginated response"""
    items: List[Any]
    total: int
    skip: int
    limit: int
    has_more: bool

    class Config:
        from_attributes = True
