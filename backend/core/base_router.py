# backend/core/base_router.py
"""
Base Router - Common functionality for all API routers
"""
from fastapi import APIRouter, HTTPException, status
from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)


class BaseAPIRouter(APIRouter):
    """
    Extended APIRouter with common functionality
    All API routers should inherit from this
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    @staticmethod
    def handle_not_found(resource: str, identifier: str) -> HTTPException:
        """Standard 404 error"""
        logger.warning(f"[404] {resource} not found: {identifier}")
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with identifier '{identifier}' not found"
        )
    
    @staticmethod
    def handle_bad_request(message: str) -> HTTPException:
        """Standard 400 error"""
        logger.warning(f"[400] Bad request: {message}")
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    @staticmethod
    def handle_server_error(error: Exception) -> HTTPException:
        """Standard 500 error"""
        logger.error(f"[500] Server error: {error}", exc_info=True)
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error occurred"
        )


def create_router(
    prefix: str,
    tags: list[str],
    **kwargs
) -> BaseAPIRouter:
    """
    Factory function to create standardized routers
    
    Args:
        prefix: URL prefix (e.g., "/flashcards")
        tags: OpenAPI tags
        **kwargs: Additional router kwargs
        
    Returns:
        Configured BaseAPIRouter instance
    """
    return BaseAPIRouter(
        prefix=prefix,
        tags=tags,
        **kwargs
    )
