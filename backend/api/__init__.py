# backend/api/__init__.py
"""
API Package - Thin Router/Controller Layer
Exports all API routers for easy registration
"""
from .flashcards import router as flashcard_router
from .quiz import router as quiz_router
from .game import router as game_router

__all__ = [
    "flashcard_router",
    "quiz_router",
    "game_router",
]
