# backend/api/flashcards.py
"""
Flashcard API Router - Thin controller layer
Only handles HTTP request/response, delegates business logic to service
"""
from fastapi import Depends, HTTPException, status
from core.base_router import create_router
from services import FlashcardService, get_flashcard_service, ARService, get_ar_service
from models import FlashcardSchema, ARExperienceResponseSchema
from typing import List
import logging

logger = logging.getLogger(__name__)

# Create router
router = create_router(
    prefix="/flashcard",
    tags=["Flashcards"]
)


@router.get("/{qr_id}", response_model=ARExperienceResponseSchema)
async def get_ar_experience(
    qr_id: str,
    ar_service: ARService = Depends(get_ar_service)
):
    """
    Get complete AR experience data by QR ID
    
    Returns:
        - Flashcard data
        - AR target (NFT marker + 3D model)
        - Related multi-marker combos
    """
    logger.info(f"[API] GET /flashcard/{qr_id}")
    
    result = await ar_service.get_ar_experience(qr_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard or AR data not found for QR ID: {qr_id}"
        )
    
    return result


@router.get("/category/{category}", response_model=List[FlashcardSchema])
async def get_flashcards_by_category(
    category: str,
    skip: int = 0,
    limit: int = 50,
    service: FlashcardService = Depends(get_flashcard_service)
):
    """
    Get flashcards by category with pagination
    
    Args:
        category: Category name (e.g., 'animals', 'fruits')
        skip: Number to skip (default: 0)
        limit: Max results (default: 50, max: 100)
    """
    logger.info(f"[API] GET /flashcard/category/{category}?skip={skip}&limit={limit}")
    
    if limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit cannot exceed 100"
        )
    
    results = await service.get_by_category(category, skip, limit)
    
    return results


@router.get("/search/{query}", response_model=List[FlashcardSchema])
async def search_flashcards(
    query: str,
    service: FlashcardService = Depends(get_flashcard_service)
):
    """
    Search flashcards by word (case-insensitive)
    
    Args:
        query: Search term
    """
    logger.info(f"[API] GET /flashcard/search/{query}")
    
    if len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters"
        )
    
    results = await service.search(query)
    
    return results
