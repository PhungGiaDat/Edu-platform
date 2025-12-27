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

__all__ = [
    "flashcard_router",
    "quiz_router",
    "game_router",
    "course_router",
    "chat_router",
    "gamification_router",
    "auth_router",
]
