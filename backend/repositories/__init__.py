# backend/repositories/__init__.py
"""
Repositories Package - Data Access Layer
Exports all repository classes for easy import
"""
from .flashcard_repository import FlashcardRepository, get_flashcard_repository
from .ar_object_repository import ARObjectRepository, get_ar_object_repository
from .ar_combination_repository import ARCombinationRepository, get_ar_combination_repository
from .quiz_repository import QuizRepository, get_quiz_repository
from .game_repository import GameRepository, get_game_repository

__all__ = [
    "FlashcardRepository",
    "get_flashcard_repository",
    "ARObjectRepository",
    "get_ar_object_repository",
    "ARCombinationRepository",
    "get_ar_combination_repository",
    "QuizRepository",
    "get_quiz_repository",
    "GameRepository",
    "get_game_repository",
]
