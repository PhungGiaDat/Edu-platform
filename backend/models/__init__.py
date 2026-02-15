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
]
