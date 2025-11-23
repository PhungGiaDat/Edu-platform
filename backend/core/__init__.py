# backend/core/__init__.py
"""
Core Package - Abstract Base Classes and Utilities
"""
from .base_repository import BaseRepository
from .base_router import BaseAPIRouter, create_router

__all__ = ["BaseRepository", "BaseAPIRouter", "create_router"]
