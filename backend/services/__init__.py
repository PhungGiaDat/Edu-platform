"""
Services Package - Business Logic Layer
Exports all service classes for easy import
"""
from .flashcard_service import FlashcardService, get_flashcard_service
from .ar_service import ARService, get_ar_service
from .quiz_service import QuizService, get_quiz_service
from .game_service import GameService, get_game_service
from .feedback_service import FeedbackService, get_feedback_service
from .speech_processing_service import (
    SpeechProcessingService,
    get_speech_processing_service,
    TranscriptionError,
    RateLimitError,
)
# NOTE: VerificationService requires OpenCV (cv2) which is not installed
# QR detection is handled on frontend, so this service is optional
# from .verification_service import VerificationService, get_verification_service

__all__ = [
    "FlashcardService",
    "get_flashcard_service",
    "ARService",
    "get_ar_service",
    "QuizService",
    "get_quiz_service",
    "GameService",
    "get_game_service",
    "FeedbackService",
    "get_feedback_service",
    "SpeechProcessingService",
    "get_speech_processing_service",
    "TranscriptionError",
    "RateLimitError",
    # "VerificationService",
    # "get_verification_service",
]
