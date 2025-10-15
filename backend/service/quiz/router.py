# backend/service/quiz/router.py

from fastapi import APIRouter, HTTPException
from .repository.quiz_repo import QuizRepository
from .schemas.models import QuizSessionSchema

router = APIRouter()
quiz_repo = QuizRepository()

@router.get("/quiz/{qr_id}", response_model=QuizSessionSchema)
async def get_quiz_by_flashcard(qr_id: str):
    """
    Get quiz questions for a specific flashcard
    
    Args:
        qr_id: Flashcard QR ID (e.g., 'ele123')
        
    Returns:
        QuizSessionSchema: Quiz questions and metadata
    """
    print(f"[API] GET /quiz/{qr_id}")
    
    quiz_data = await quiz_repo.get_by_flashcard_qr_id(qr_id)
    
    if not quiz_data:
        raise HTTPException(
            status_code=404, 
            detail=f"No quiz found for flashcard QR ID: {qr_id}"
        )
    
    # Remove MongoDB _id field
    quiz_data.pop("_id", None)
    
    return quiz_data