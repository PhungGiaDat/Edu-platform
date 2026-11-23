# backend/models/admin_models.py
"""
Admin Models - PostgreSQL via repositories

Extended schemas for teacher-scoped content management.
All database operations go through admin repositories (PostgreSQL).
"""
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional, Literal, Any
from datetime import datetime
from enum import Enum
import uuid


# ========== Enums ==========

class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class DeckStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class CourseStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Difficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# ========== Embedded Models ==========

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


class LearningGoalSettings(BaseModel):
    daily_xp_goal: int = Field(default=100, ge=10, le=500)
    daily_minutes_goal: int = Field(default=15, ge=5, le=120)
    streak_protection_enabled: bool = True
    reminder_enabled: bool = True
    reminder_interval_minutes: int = Field(default=20, ge=5, le=60)


# ========== API Schemas ==========

class FlashcardDeckCreate(BaseModel):
    name: str | Dict[str, str] = "New Deck"
    description: Optional[str | Dict[str, str]] = None
    cover_image_url: Optional[str] = None
    category: str = "general"
    tags: List[str] = Field(default_factory=list)

    @field_validator('name', mode='before')
    @classmethod
    def normalize_name(cls, v):
        if isinstance(v, str):
            return {"en": v, "vi": v}
        return v

    @field_validator('description', mode='before')
    @classmethod
    def normalize_description(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return {"en": v, "vi": v}
        return v


class FlashcardDeckUpdate(BaseModel):
    name: Optional[str | Dict[str, str]] = None
    description: Optional[str | Dict[str, str]] = None
    cover_image_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

    @field_validator('name', mode='before')
    @classmethod
    def normalize_name(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return {"en": v, "vi": v}
        return v

    @field_validator('description', mode='before')
    @classmethod
    def normalize_description(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return {"en": v, "vi": v}
        return v


class FlashcardDeckResponse(BaseModel):
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
    ar_tag: Optional[str] = None


class AdminFlashcardUpdate(BaseModel):
    word: Optional[str] = None
    translation: Optional[Dict[str, str]] = None
    deck_id: Optional[str] = None
    pronunciation: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    ar_tag: Optional[str] = None
    is_active: Optional[bool] = None


class AdminFlashcardResponse(BaseModel):
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
    ar_tag: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminCourseLesson(BaseModel):
    lesson_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(min_length=1)
    description: Optional[str] = None
    title_vi: str = ""
    order: int = Field(ge=1)
    duration_minutes: int = Field(default=5, ge=3, le=7)
    content: Optional[str] = None
    video_url: Optional[str] = None
    video_thumbnail: Optional[str] = None
    intro_video_url: Optional[str] = None
    intro_video_thumbnail: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    is_completed: bool = False


class AdminCourseCreate(BaseModel):
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
    is_published: bool = False
    lessons: List[AdminCourseLesson] = Field(min_length=1)


class AdminCourseUpdate(BaseModel):
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
    lessons: Optional[List[AdminCourseLesson]] = Field(default=None, min_length=1)


class AdminCourseResponse(BaseModel):
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
    lessons: List[Any] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentProgressResponse(BaseModel):
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
    total_students: int = 0
    total_courses: int = 0
    total_flashcards: int = 0
    total_decks: int = 0
    active_sessions: int = 0
    average_progress: float = 0.0
    total_enrollments: int = 0
    students_this_week: int = 0
    lessons_completed_today: int = 0
    top_students: List[Dict[str, Any]] = Field(default_factory=list)


class LearningGoalCreate(BaseModel):
    # user_id moves from a query param to the body — the frontend sends it
    # in the JSON body (adminApi.ts setStudentLearningGoal), so declaring it
    # as a query param made every call 422 (research CRITICAL evidence).
    user_id: str = Field(..., description="Target student's user ID")
    daily_xp_goal: int = Field(default=100, ge=10, le=500)
    daily_minutes_goal: int = Field(default=15, ge=5, le=120)
    streak_protection_enabled: bool = True
    reminder_enabled: bool = True
    reminder_interval_minutes: int = Field(default=20, ge=5, le=60)


class LearningGoalResponse(BaseModel):
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


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    skip: int
    limit: int
    has_more: bool

    class Config:
        from_attributes = True


# ===========================================================================
# Admin Games (2026-09-09 activation — spec §3.2)
# ===========================================================================

GameTypeLiteral = Literal["drag_match", "catch_word", "word_scramble", "memory_match"]


class GameConfigBase(BaseModel):
    """Raw config payload persisted as JSONB. The teacher-facing difficulty
    presets (Dễ/Vừa/Khó) are a FRONTEND-only transform — the API always
    receives concrete values (spec §3.2 revised)."""


class DragMatchConfig(GameConfigBase):
    pair_count: int = Field(default=6, ge=1, le=8)
    timer_seconds: int = Field(default=90, ge=30, le=300)


class CatchWordConfig(GameConfigBase):
    fall_speed: float = Field(default=1.2, ge=0.3, le=3.0)
    spawn_interval: int = Field(default=800, ge=200, le=3000)


class WordScrambleConfig(GameConfigBase):
    word_count: int = Field(default=8, ge=3, le=12)
    hint_letters: int = Field(default=2, ge=0, le=5)


class MemoryMatchConfig(GameConfigBase):
    pair_count: int = Field(default=6, ge=2, le=8)
    flip_duration_ms: int = Field(default=1000, ge=400, le=3000)


GAME_CONFIG_MODELS: Dict[str, type] = {
    "drag_match": DragMatchConfig,
    "catch_word": CatchWordConfig,
    "word_scramble": WordScrambleConfig,
    "memory_match": MemoryMatchConfig,
}


class GameTopicCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    name_vi: str = ""
    slug: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_published: bool = False
    sort_order: int = 0


class GameTopicUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    name_vi: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_published: Optional[bool] = None
    sort_order: Optional[int] = None


class GameTopicResponse(BaseModel):
    id: str
    slug: str
    name: str
    name_vi: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_published: bool
    sort_order: int
    _id: str = ""

    class Config:
        from_attributes = True


class GameVocabItemCreate(BaseModel):
    word: str = Field(..., min_length=1, max_length=60)
    translation_vi: str = Field(default="", max_length=120)
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    sort_order: int = 0


class GameVocabItemUpdate(BaseModel):
    word: Optional[str] = Field(default=None, min_length=1, max_length=60)
    translation_vi: Optional[str] = Field(default=None, max_length=120)
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    sort_order: Optional[int] = None


class GameVocabItemResponse(BaseModel):
    id: str
    topic_id: str
    word: str
    translation_vi: str
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    sort_order: int
    _id: str = ""

    class Config:
        from_attributes = True


class GameCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    title_vi: str = ""
    slug: Optional[str] = None
    game_type: GameTypeLiteral
    topic_id: str
    config: Dict[str, Any] = Field(default_factory=dict)
    is_published: bool = False

    @field_validator("config")
    @classmethod
    def validate_config(cls, v: Dict[str, Any], info) -> Dict[str, Any]:
        game_type = info.data.get("game_type") if info.data else None
        model = GAME_CONFIG_MODELS.get(game_type or "")
        if model is not None:
            model(**v)  # raises pydantic ValidationError → 422
        return v


class GameUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    title_vi: Optional[str] = None
    slug: Optional[str] = None
    game_type: Optional[GameTypeLiteral] = None
    topic_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_published: Optional[bool] = None


class GameResponse(BaseModel):
    id: str
    _id: str = ""
    slug: str
    title: str
    title_vi: str
    game_type: GameTypeLiteral
    topic_id: str
    config: Dict[str, Any] = Field(default_factory=dict)
    is_published: bool
    teacher_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GameCatalogTopic(BaseModel):
    id: str
    slug: str
    name: str
    name_vi: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None


class GameCatalogGame(BaseModel):
    id: str
    slug: str
    title: str
    title_vi: str
    game_type: GameTypeLiteral
    topic_id: str
    config: Dict[str, Any] = Field(default_factory=dict)


class GameCatalogResponse(BaseModel):
    topics: List[GameCatalogTopic] = Field(default_factory=list)
    games: List[GameCatalogGame] = Field(default_factory=list)


class GameRoleUpdate(BaseModel):
    role: Literal["teacher", "learner"]
    is_superuser: Optional[bool] = None
