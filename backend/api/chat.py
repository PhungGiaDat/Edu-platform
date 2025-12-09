# api/chat.py
"""
Chat API Endpoints with RAG (Retrieval-Augmented Generation) support

Endpoints:
- POST /chat/message - Basic chat (legacy)
- POST /chat/rag - RAG-enabled chat with flashcard context
- POST /chat/pronunciation - Pronunciation analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Any, Dict, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime
import logging

from services.ai_service import AIService, get_ai_service
from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository
from models.chat_model import ChatMessageSchema
from models.chat_log import ChatLog

logger = logging.getLogger(__name__)

router = APIRouter()


# ========== Request/Response Schemas ==========
class RAGChatRequest(BaseModel):
    """Request schema for RAG chat"""
    question: str
    session_id: Optional[str] = None  # For conversation tracking
    user_id: Optional[str] = None  # Supabase user ID if authenticated


class RAGChatResponse(BaseModel):
    """Response schema for RAG chat"""
    response: str
    sources: List[Dict[str, Any]]  # Retrieved flashcard words with scores
    session_id: str


# ========== Legacy Chat Endpoint ==========
@router.post("/chat/message")
async def chat_message(
    message: str = Body(..., embed=True),
    context: str = Body("", embed=True),
    service: AIService = Depends(get_ai_service)
):
    """Basic chat endpoint (backward compatibility)"""
    response = await service.chat(message, context)
    return {"response": response}


# ========== RAG Chat Endpoint ==========
@router.post("/chat/rag", response_model=RAGChatResponse)
async def rag_chat(
    request: RAGChatRequest,
    ai_service: AIService = Depends(get_ai_service),
    flashcard_repo: FlashcardRepository = Depends(get_flashcard_repository)
):
    """
    RAG-enabled chatbot endpoint.
    
    Flow:
    1. Generate embedding for user question
    2. Vector search for relevant flashcards (top 3)
    3. Build context from retrieved flashcards
    4. Generate AI response with context
    5. Log conversation for analytics
    
    Returns:
        RAGChatResponse with AI response and source flashcards
    """
    # Generate or use provided session ID
    session_id = request.session_id or str(uuid.uuid4())
    
    logger.info(f"[RAG] Processing question: {request.question[:50]}...")
    
    # Step 1: Generate query embedding
    query_embedding = await ai_service.generate_query_embedding(request.question)
    
    if not query_embedding:
        logger.warning("[RAG] Failed to generate query embedding")
        # Fallback: Return basic response without RAG
        return RAGChatResponse(
            response="Xin lỗi, mình không thể tìm kiếm lúc này. Bạn thử lại nhé! 🙏",
            sources=[],
            session_id=session_id
        )
    
    # Step 2: Vector search for relevant flashcards
    context_flashcards = await flashcard_repo.vector_search(
        query_vector=query_embedding,
        limit=3
    )
    
    logger.info(f"[RAG] Found {len(context_flashcards)} relevant flashcards")
    
    # Step 3 & 4: Generate AI response with context
    result = await ai_service.chat_with_rag(
        question=request.question,
        context_flashcards=context_flashcards
    )
    
    # Step 5: Log conversation (async, don't wait)
    try:
        # Log user message
        user_log = ChatLog(
            session_id=session_id,
            user_id=request.user_id,
            message=request.question,
            sender="user",
            timestamp=datetime.utcnow()
        )
        await user_log.insert()
        
        # Log AI response
        ai_log = ChatLog(
            session_id=session_id,
            user_id=request.user_id,
            message=result["response"],
            sender="ai",
            context_flashcard_ids=[fc.get("qr_id") for fc in context_flashcards],
            timestamp=datetime.utcnow()
        )
        await ai_log.insert()
    except Exception as e:
        # Don't fail request if logging fails
        logger.warning(f"[RAG] Failed to log chat: {e}")
    
    return RAGChatResponse(
        response=result["response"],
        sources=result["sources"],
        session_id=session_id
    )


# ========== Pronunciation Endpoint ==========
@router.post("/chat/pronunciation")
async def analyze_pronunciation(
    target_text: str = Body(..., embed=True),
    audio_text: str = Body(..., embed=True),
    service: AIService = Depends(get_ai_service)
):
    """Analyze pronunciation by comparing target text with spoken text"""
    result = await service.analyze_pronunciation(target_text, audio_text)
    return result


# ========== Debug Endpoint (Development Only) ==========
@router.post("/chat/test-embedding")
async def test_embedding(
    text: str = Body(..., embed=True),
    service: AIService = Depends(get_ai_service)
):
    """
    Test endpoint to verify embedding generation.
    Returns first 10 dimensions for debugging.
    """
    embedding = await service.generate_embedding(text)
    return {
        "text": text,
        "embedding_length": len(embedding),
        "first_10_dims": embedding[:10] if embedding else [],
        "status": "success" if embedding else "failed"
    }

