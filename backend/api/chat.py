# api/chat.py
"""
Chat API Endpoints with Agentic RAG (Retrieval-Augmented Generation) support

Endpoints:
- POST /chat/message        - Basic chat (legacy)
- POST /chat/rag            - Agentic RAG chat (Planner → Generator → Validator)
- POST /chat/pronunciation  - Pronunciation analysis
- POST /chat/test-embedding - Embedding debug
"""
from fastapi import APIRouter, Depends, Body
from typing import List, Any, Dict, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime
import logging

from services.ai_service import AIService, get_ai_service
from services.agentic_rag_service import AgenticRAGService, get_agentic_rag_service
from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository
from models.chat_log import ChatLog

logger = logging.getLogger(__name__)

router = APIRouter()


# ========== Request/Response Schemas ==========
class RAGChatRequest(BaseModel):
    """Request schema for RAG chat"""
    question: str
    session_id: Optional[str] = None  # For conversation tracking
    user_id: Optional[str] = None     # User ID if authenticated


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


# ========== Agentic RAG Chat Endpoint ==========
@router.post("/chat/rag", response_model=RAGChatResponse)
async def rag_chat(
    request: RAGChatRequest,
    agentic_rag: AgenticRAGService = Depends(get_agentic_rag_service),
    flashcard_repo: FlashcardRepository = Depends(get_flashcard_repository)
):
    """
    Agentic RAG chat — Planner → Generator → Validator pipeline.

    Flow:
    1. Check MongoDB rag_cache (24h TTL) — return immediately if hit
    2. PLANNER: Query user learning progress → determine topic/keywords/difficulty
    3. GENERATOR: Vector-search flashcards + LLM draft response
    4. VALIDATOR: Quality check, age-appropriateness, dedup vs session history
    5. Cache result and log conversation

    Rate-limit safety: 1s delay between agents + exponential backoff on 429.
    """
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"[RAG] Processing question: {request.question[:60]}...")

    result = await agentic_rag.run(
        question=request.question,
        user_id=request.user_id,
        session_id=session_id,
        flashcard_repo=flashcard_repo,
    )

    logger.info(
        f"[RAG] Done. cached={result.get('cached')} "
        f"sources={len(result.get('sources', []))} "
        f"trace={result.get('agent_trace', [])}"
    )

    # Log conversation (skip if served from cache to avoid duplicate logs)
    if not result.get("cached"):
        try:
            user_log = ChatLog(
                session_id=session_id,
                user_id=request.user_id,
                message=request.question,
                sender="user",
                timestamp=datetime.utcnow()
            )
            await user_log.insert()

            ai_log = ChatLog(
                session_id=session_id,
                user_id=request.user_id,
                message=result["response"],
                sender="ai",
                context_flashcard_ids=[
                    s.get("word") for s in result.get("sources", []) if s.get("word")
                ],
                timestamp=datetime.utcnow()
            )
            await ai_log.insert()
        except Exception as e:
            logger.warning(f"[RAG] Failed to log chat: {e}")

    return RAGChatResponse(
        response=result["response"],
        sources=result.get("sources", []),
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
    """Test endpoint to verify embedding generation."""
    embedding = await service.generate_embedding(text)
    return {
        "text": text,
        "embedding_length": len(embedding),
        "first_10_dims": embedding[:10] if embedding else [],
        "status": "success" if embedding else "failed"
    }
