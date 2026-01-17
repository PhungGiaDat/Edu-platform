# backend/api/ai.py
"""
AI API Router - Endpoints for AI-powered features
"""
from fastapi import Depends, HTTPException, status, Body
from core.base_router import create_router
from services.ai_service import AIService, get_ai_service
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = create_router(
    prefix="/ai",
    tags=["AI"]
)


class QuizGenerateRequest(BaseModel):
    word: str
    translation: str
    category: str = "general"
    difficulty: str = "easy"  # easy, medium, hard
    num_questions: int = 3


class PronunciationRequest(BaseModel):
    target_word: str
    transcript: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""


@router.post("/generate-quiz")
async def generate_quiz(
    request: QuizGenerateRequest,
    service: AIService = Depends(get_ai_service)
):
    """
    Generate AI-powered quiz questions for a vocabulary word.
    
    Uses Gemini to create kid-friendly multiple-choice questions.
    """
    logger.info(f"[API] POST /ai/generate-quiz - Word: {request.word}")
    
    try:
        questions = await service.generate_quiz(
            word=request.word,
            translation=request.translation,
            category=request.category,
            difficulty=request.difficulty,
            num_questions=request.num_questions
        )
        
        return {
            "success": True,
            "word": request.word,
            "questions": questions,
            "count": len(questions)
        }
    except Exception as e:
        logger.error(f"[API] Quiz generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quiz generation failed: {str(e)}"
        )


@router.post("/assess-pronunciation")
async def assess_pronunciation(
    request: PronunciationRequest,
    service: AIService = Depends(get_ai_service)
):
    """
    Assess pronunciation accuracy using AI.
    
    Compares expected word with speech recognition transcript.
    """
    logger.info(f"[API] POST /ai/assess-pronunciation - Target: {request.target_word}")
    
    try:
        result = await service.analyze_pronunciation(
            text=request.target_word,
            audio_transcription=request.transcript
        )
        
        return {
            "success": True,
            "target_word": request.target_word,
            "transcript": request.transcript,
            **result
        }
    except Exception as e:
        logger.error(f"[API] Pronunciation assessment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pronunciation assessment failed: {str(e)}"
        )


@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    service: AIService = Depends(get_ai_service)
):
    """
    Chat with AI tutor.
    
    Kid-friendly responses for learning assistance.
    """
    logger.info(f"[API] POST /ai/chat - Message: {request.message[:50]}...")
    
    try:
        response = await service.chat(
            message=request.message,
            context=request.context
        )
        
        return {
            "success": True,
            "response": response
        }
    except Exception as e:
        logger.error(f"[API] Chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}"
        )
