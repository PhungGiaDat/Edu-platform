# backend/api/quiz.py
"""
Quiz API Router - Thin controller layer
"""
from fastapi import Depends, HTTPException, status
from core.base_router import create_router
from services import QuizService, get_quiz_service
from models import QuizSessionSchema
import logging

logger = logging.getLogger(__name__)

# Create router
router = create_router(
    prefix="/quiz",
    tags=["Quiz"]
)


@router.get("/{qr_id}", response_model=QuizSessionSchema)
async def get_quiz_by_flashcard(
    qr_id: str,
    service: QuizService = Depends(get_quiz_service)
):
    """
    Get quiz questions for a specific flashcard
    
    Args:
        qr_id: Flashcard QR ID (e.g., 'ele123')
        
    Returns:
        Quiz session with questions and configuration
    """
    logger.info(f"[API] GET /quiz/{qr_id}")
    
    result = await service.get_quiz_by_flashcard(qr_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No quiz found for flashcard QR ID: {qr_id}"
        )
    
    return result
