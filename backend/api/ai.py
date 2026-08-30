# backend/api/ai.py
"""
AI API Router - Endpoints for AI-powered features
"""
from fastapi import Depends, HTTPException, status, Body
from core.base_router import create_router
from core.security import get_current_user
from repositories.postgres_user_repository import PostgresUser
from services.ai_service import AIService, get_ai_service
from services.llm_health import snapshot as llm_health_snapshot
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
import logging

logger = logging.getLogger(__name__)

router = create_router(
    prefix="/ai",
    tags=["AI"]
)


@router.get("/llm-health")
async def get_llm_health(
    current_user: PostgresUser = Depends(get_current_user),
):
    """
    Which LLM provider keys are alive right now (startup ping + live outcomes).
    Keys are masked; diagnostics only.
    """
    return {"providers": llm_health_snapshot()}


class QuizGenerateRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=100)
    translation: str = Field(..., min_length=1, max_length=200)
    category: str = Field(default="general", max_length=50)
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    num_questions: int = Field(default=3, ge=1, le=10)


class PronunciationRequest(BaseModel):
    target_word: str = Field(..., min_length=1, max_length=100)
    transcript: str = Field(..., min_length=1, max_length=500)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[str] = Field(default="", max_length=4000)


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
            detail="Quiz generation failed. Please try again later."
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
            detail="Pronunciation assessment failed. Please try again later."
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
            detail="Chat failed. Please try again later."
        )
