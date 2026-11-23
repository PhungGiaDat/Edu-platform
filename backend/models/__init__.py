# backend/models/__init__.py
"""
Models Package - Pydantic Request/Response Schemas
All database operations go through PostgreSQL repositories.
"""
from .flashcard import FlashcardSchema
from .ar_object import ArObjectSchema
from .ar_combination import (
    ArCombinationSchema,
    TransformSchema,
)
from .ar_experience import ARExperienceResponseSchema
from .quiz import QuizQuestion, QuizSessionSchema
from .game import MemoryPair, GameChallenge, GameSessionSchema
from .pet import (
    PetCreate,
    PetUpdate,
    PetResponse,
    PetListResponse,
    PetPreferences,
    UnlockCondition,
    SetActivePetRequest,
    UnlockPetResponse,
)
from .feedback_template import (
    FeedbackTemplateCreate,
    FeedbackTemplateUpdate,
    FeedbackTemplateResponse,
    GeneratedFeedback,
    ScoreCategory,
    get_score_category,
    score_to_stars,
    SCORE_RANGES,
    DEFAULT_ENCOURAGEMENTS,
)
from .admin_models import (
    FlashcardDeckCreate,
    FlashcardDeckUpdate,
    FlashcardDeckResponse,
    AdminFlashcardCreate,
    AdminFlashcardUpdate,
    AdminFlashcardResponse,
    AdminCourseCreate,
    AdminCourseUpdate,
    AdminCourseResponse,
    StudentProgressResponse,
    LearningGoalCreate,
    LearningGoalResponse,
    DashboardStats,
    PaginatedResponse,
)
from .course_lesson import (
    LessonStatus,
    LessonType,
    MediaAsset,
    VocabularyItem,
)
from .session_log import (
    SessionStartRequest,
    SessionEndRequest,
    SessionLogResponse,
    SessionSummary,
)
from .user_session import (
    SessionStatus,
    ActivityEntry,
)
from .pronunciation import (
    PronunciationAttemptCreate,
    PronunciationAttemptResponse,
    AttemptStatus,
)
from .user_schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
)

__all__ = [
    # Flashcard
    "FlashcardSchema",
    # AR Object
    "ArObjectSchema",
    # AR Combination
    "ArCombinationSchema",
    "TransformSchema",
    # AR Experience
    "ARExperienceResponseSchema",
    # Quiz
    "QuizQuestion",
    "QuizSessionSchema",
    # Game
    "MemoryPair",
    "GameChallenge",
    "GameSessionSchema",
    # Pet
    "PetCreate",
    "PetUpdate",
    "PetResponse",
    "PetListResponse",
    "PetPreferences",
    "UnlockCondition",
    "SetActivePetRequest",
    "UnlockPetResponse",
    # Feedback Template
    "FeedbackTemplateCreate",
    "FeedbackTemplateUpdate",
    "FeedbackTemplateResponse",
    "GeneratedFeedback",
    "ScoreCategory",
    "get_score_category",
    "score_to_stars",
    "SCORE_RANGES",
    "DEFAULT_ENCOURAGEMENTS",
    # Admin Models
    "FlashcardDeckCreate",
    "FlashcardDeckUpdate",
    "FlashcardDeckResponse",
    "AdminFlashcardCreate",
    "AdminFlashcardUpdate",
    "AdminFlashcardResponse",
    "AdminCourseCreate",
    "AdminCourseUpdate",
    "AdminCourseResponse",
    "StudentProgressResponse",
    "LearningGoalCreate",
    "LearningGoalResponse",
    "DashboardStats",
    "PaginatedResponse",
    # Course Lesson
    "LessonStatus",
    "LessonType",
    "MediaAsset",
    "VocabularyItem",
    # Session Log
    "SessionStartRequest",
    "SessionEndRequest",
    "SessionLogResponse",
    "SessionSummary",
    # User Session
    "SessionStatus",
    "ActivityEntry",
    # Pronunciation
    "PronunciationAttemptCreate",
    "PronunciationAttemptResponse",
    "AttemptStatus",
    # User auth
    "UserCreate",
    "UserUpdate",
    "UserResponse",
]
