# backend/api/__init__.py
"""
API Package - Thin Router/Controller Layer
Exports all API routers for easy registration
"""
from .flashcards import router as flashcard_router
from .quiz import router as quiz_router
from .game import router as game_router
from .courses import router as course_router
from .chat import router as chat_router
from .gamification import router as gamification_router
from .auth import router as auth_router
from .user import router as user_router
from .learning_path import router as learning_path_router
from .pets import router as pet_router
from .combos import router as combos_router
from .pronunciation import router as pronunciation_router
from .pronunciation_enhanced import router as pronunciation_enhanced_router
from .sessions import router as sessions_router
from .lessons import router as lessons_router
from .session_tracking import router as session_tracking_router
from .course_lessons import router as course_lessons_router
from .admin import router as admin_router
from .profile import router as profile_router
from .notebook import router as notebook_router
from .dictionary import router as dictionary_router
from .vocabulary_topics import router as vocabulary_topics_router

__all__ = [
    "flashcard_router",
    "quiz_router",
    "game_router",
    "course_router",
    "chat_router",
    "gamification_router",
    "auth_router",
    "user_router",
    "learning_path_router",
    "pet_router",
    "combos_router",
    "pronunciation_router",
    "pronunciation_enhanced_router",
    "sessions_router",
    "lessons_router",
    "session_tracking_router",
    "admin_router",
    "profile_router",
    "course_lessons_router",
    "notebook_router",
    "dictionary_router",
    "vocabulary_topics_router",
]

