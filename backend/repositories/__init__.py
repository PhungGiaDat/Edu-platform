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
from .feedback_template_repository import FeedbackTemplateRepository, get_feedback_template_repository
from .lesson_media_repository import LessonMediaRepository, get_lesson_media_repository
from .session_tracking_repository import SessionTrackingRepository, get_session_tracking_repository
from .pronunciation_repository import PronunciationRepository, get_pronunciation_repository
from .session_log_repository import SessionLogRepository, get_session_log_repository

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
    "FeedbackTemplateRepository",
    "get_feedback_template_repository",
    "LessonMediaRepository",
    "get_lesson_media_repository",
    "SessionTrackingRepository",
    "get_session_tracking_repository",
    "PronunciationRepository",
    "get_pronunciation_repository",
    "SessionLogRepository",
    "get_session_log_repository",
]
