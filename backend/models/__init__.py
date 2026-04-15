# backend/models/__init__.py
"""
Models Package - Pydantic Request/Response Schemas
"""
from .flashcard import FlashcardSchema
from .ar_object import ArObjectSchema
from .ar_combination import ArCombinationSchema, TransformSchema
from .ar_experience import ARExperienceResponseSchema
from .quiz import QuizQuestion, QuizSessionSchema
from .game import MemoryPair, GameChallenge, GameSessionSchema
from .pet import (
    PetDocument,
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
    FeedbackTemplateDocument,
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
    "PetDocument",
    "PetCreate",
    "PetUpdate",
    "PetResponse",
    "PetListResponse",
    "PetPreferences",
    "UnlockCondition",
    "SetActivePetRequest",
    "UnlockPetResponse",
    # Feedback Template
    "FeedbackTemplateDocument",
    "FeedbackTemplateCreate",
    "FeedbackTemplateUpdate",
    "FeedbackTemplateResponse",
    "GeneratedFeedback",
    "ScoreCategory",
    "get_score_category",
    "score_to_stars",
    "SCORE_RANGES",
    "DEFAULT_ENCOURAGEMENTS",
]
