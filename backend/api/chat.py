# api/chat.py
"""
Chat API Endpoints with Agentic RAG (Retrieval-Augmented Generation) support
"""
from fastapi import APIRouter, Depends, Body
from typing import List, Any, Dict, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime
import logging

from services.ai_service import AIService, get_ai_service
from services.agentic_rag_service import AgenticRAGService, get_agentic_rag_service
from repositories.postgres_chat_log_repository import (
    PostgresChatLogRepository,
    get_postgres_chat_log_repository,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ========== Request/Response Schemas ==========
class ModelInfo(BaseModel):
    id: str
    role: str
    description: str


class ChatModelsResponse(BaseModel):
    models: List[ModelInfo]
    defaults: Dict[str, str]


class RAGChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    # Per-stage model overrides (optional — defaults from settings used if omitted)
    planner_model: Optional[str] = None
    generator_model: Optional[str] = None
    validator_model: Optional[str] = None


class RAGChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    session_id: str
    agent_trace: List[str] = []


# ========== Legacy Chat Endpoint ==========
@router.post("/chat/message")
async def chat_message(
    message: str = Body(..., embed=True),
    context: str = Body("", embed=True),
    service: AIService = Depends(get_ai_service),
):
    """Basic chat endpoint (backward compatibility)."""
    response = await service.chat(message, context)
    return {"response": response}


# ──────────────────────────────────────────────
# GET /chat/models — available models + defaults
# ──────────────────────────────────────────────

MODELS_CATALOG: list[ModelInfo] = [
    ModelInfo(
        id="qwen/qwen3.8-max-free",
        role="planner",
        description="Fast structured extraction — good for JSON plan output",
    ),
    ModelInfo(
        id="deepseek/deepseek-v4-pro-0813-free",
        role="generator",
        description="Best for creative, kid-friendly narrative responses",
    ),
    ModelInfo(
        id="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        role="validator",
        description="Quality + age-appropriateness check",
    ),
]


@router.get("/chat/models", response_model=ChatModelsResponse)
async def get_chat_models():
    """Return the available TokenRouter models per pipeline stage."""
    from settings import settings as s

    defaults = {
        "planner": s.MODEL_PLANNER,
        "generator": s.MODEL_GENERATOR,
        "validator": s.MODEL_VALIDATOR,
    }
    return ChatModelsResponse(models=MODELS_CATALOG, defaults=defaults)


# ──────────────────────────────────────────────
# POST /chat/rag
# ──────────────────────────────────────────────

# ========== Agentic RAG Chat Endpoint ==========
@router.post("/chat/rag", response_model=RAGChatResponse)
async def rag_chat(
    request: RAGChatRequest,
    agentic_rag: AgenticRAGService = Depends(get_agentic_rag_service),
    chat_repo: PostgresChatLogRepository = Depends(get_postgres_chat_log_repository),
):
    """
    Agentic RAG chat — Planner → Generator → Validator pipeline.
    Optional model overrides per stage (planner_model, generator_model, validator_model).
    """
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"[RAG] Processing question: {request.question[:60]}...")

    result = await agentic_rag.run(
        question=request.question,
        user_id=request.user_id,
        session_id=session_id,
        planner_model=request.planner_model,
        generator_model=request.generator_model,
        validator_model=request.validator_model,
    )

    logger.info(
        f"[RAG] Done. cached={result.get('cached')} "
        f"sources={len(result.get('sources', []))} "
        f"trace={result.get('agent_trace', [])}"
    )

    # Log conversation (skip if served from cache)
    if not result.get("cached"):
        try:
            await chat_repo.log_message(
                session_id=session_id,
                user_id=request.user_id,
                message=request.question,
                sender="user",
            )
            await chat_repo.log_message(
                session_id=session_id,
                user_id=request.user_id,
                message=result["response"],
                sender="ai",
                context_flashcard_ids=[
                    s.get("word") for s in result.get("sources", []) if s.get("word")
                ],
            )
        except Exception as e:
            logger.warning(f"[RAG] Failed to log chat: {e}")

    return RAGChatResponse(
        response=result["response"],
        sources=result.get("sources", []),
        session_id=session_id,
        agent_trace=result.get("agent_trace", []),
    )


# ========== Pronunciation Endpoint ==========
@router.post("/chat/pronunciation")
async def analyze_pronunciation(
    target_text: str = Body(..., embed=True),
    audio_text: str = Body(..., embed=True),
    service: AIService = Depends(get_ai_service),
):
    """Analyze pronunciation by comparing target text with spoken text."""
    result = await service.analyze_pronunciation(target_text, audio_text)
    return result


# ========== Debug Endpoint (Development Only) ==========
@router.post("/chat/test-embedding")
async def test_embedding(
    text: str = Body(..., embed=True),
    service: AIService = Depends(get_ai_service),
):
    """Test endpoint to verify embedding generation."""
    embedding = await service.generate_embedding(text)
    return {
        "text": text,
        "embedding_length": len(embedding),
        "first_10_dims": embedding[:10] if embedding else [],
        "status": "success" if embedding else "failed",
    }
