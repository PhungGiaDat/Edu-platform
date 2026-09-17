# api/chat.py
"""
Chat API Endpoints with Agentic RAG (Retrieval-Augmented Generation) support
"""
from fastapi import APIRouter, Depends, Body
from fastapi.responses import StreamingResponse
from typing import List, Any, Dict, Optional
from pydantic import BaseModel
import uuid
import json
from datetime import datetime
import logging

from core.security import get_current_user
from repositories.postgres_user_repository import PostgresUser
from services.ai_service import AIService, get_ai_service
from services.agentic_rag_service import AgenticRAGService, get_agentic_rag_service
from services.openrouter_chat_service import stream_chat_with_fallback
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


class ChatStreamRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    lesson_context: Optional[Any] = None


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
    current_user: PostgresUser = Depends(get_current_user),
):
    """Basic chat endpoint (backward compatibility). Requires login."""
    response = await service.chat(message, context)
    return {"response": response}


# ──────────────────────────────────────────────
# GET /chat/models — available models + defaults
# ──────────────────────────────────────────────

MODELS_CATALOG: list[ModelInfo] = [
    ModelInfo(
        id="google/gemini-flash-lite-latest",
        role="planner",
        description="Fast structured extraction — good for JSON plan output",
    ),
    ModelInfo(
        id="google/gemini-flash-latest",
        role="generator",
        description="Best for creative, kid-friendly narrative responses",
    ),
    ModelInfo(
        id="google/gemini-flash-lite-latest",
        role="validator",
        description="Quality + age-appropriateness check",
    ),
]


@router.get("/chat/models", response_model=ChatModelsResponse)
async def get_chat_models():
    """Return the available pipeline models per stage (provider-prefixed ids)."""
    from settings import settings as s

    defaults = {
        "planner": s.MODEL_PLANNER,
        "generator": s.MODEL_GENERATOR,
        "validator": s.MODEL_VALIDATOR,
    }
    return ChatModelsResponse(models=MODELS_CATALOG, defaults=defaults)


# ──────────────────────────────────────────────
# POST /chat/stream — OpenRouter SSE Streaming
# ──────────────────────────────────────────────
@router.post("/chat/stream")
async def chat_stream(
    request: ChatStreamRequest,
    chat_repo: PostgresChatLogRepository = Depends(get_postgres_chat_log_repository),
    current_user: PostgresUser = Depends(get_current_user),
):
    """
    Stream chat tokens via OpenRouter with 2-model failover.
    Yields real-time Server-Sent Events (text/event-stream).
    Saves user question and AI full reply to PostgresChatLogRepository upon stream completion.
    """
    session_id = request.session_id or str(uuid.uuid4())
    user_id = str(current_user.id)

    recent_history: List[Dict[str, Any]] = []
    try:
        recent_history = await chat_repo.get_session_history(session_id=session_id, limit=4)
    except Exception as e:
        logger.debug(f"[LexiChat] Could not load session history: {e}")

    async def event_generator():
        accumulated_tokens: List[str] = []
        try:
            async for chunk in stream_chat_with_fallback(
                question=request.question,
                recent_history=recent_history,
                lesson_context=request.lesson_context,
            ):
                if chunk.startswith("data: ") and not chunk.startswith("data: ["):
                    try:
                        data = json.loads(chunk[6:].strip())
                        token = data.get("token")
                        if token:
                            accumulated_tokens.append(token)
                    except Exception:
                        pass
                yield chunk
        finally:
            full_reply = "".join(accumulated_tokens).strip()
            if full_reply:
                try:
                    await chat_repo.log_message(
                        session_id=session_id,
                        user_id=user_id,
                        message=request.question,
                        sender="user",
                    )
                    await chat_repo.log_message(
                        session_id=session_id,
                        user_id=user_id,
                        message=full_reply,
                        sender="ai",
                    )
                except Exception as e:
                    logger.warning(f"[LexiChat] Failed to log chat: {e}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ──────────────────────────────────────────────
# POST /chat/rag
# ──────────────────────────────────────────────

# ========== Agentic RAG Chat Endpoint ==========
@router.post("/chat/rag", response_model=RAGChatResponse)
async def rag_chat(
    request: RAGChatRequest,
    agentic_rag: AgenticRAGService = Depends(get_agentic_rag_service),
    chat_repo: PostgresChatLogRepository = Depends(get_postgres_chat_log_repository),
    current_user: PostgresUser = Depends(get_current_user),
):
    """
    Agentic RAG chat — Planner → Generator → Validator pipeline. Requires login.
    Optional model overrides per stage (planner_model, generator_model, validator_model).

    Identity comes from the JWT (`current_user`); the body's `user_id` field is
    accepted for backward compatibility but IGNORED — clients cannot spoof who
    is asking, and guest/an anonymous calls are rejected with 401 upstream.
    """
    session_id = request.session_id or str(uuid.uuid4())
    user_id = str(current_user.id)
    logger.info("[LegacyChat] route=/api/v1/chat/rag")

    result = await agentic_rag.run(
        question=request.question,
        user_id=user_id,
        session_id=session_id,
        planner_model=request.planner_model,
        generator_model=request.generator_model,
        validator_model=request.validator_model,
    )

    # Log conversation (skip if served from cache)
    if not result.get("cached"):
        try:
            await chat_repo.log_message(
                session_id=session_id,
                user_id=user_id,
                message=request.question,
                sender="user",
            )
            await chat_repo.log_message(
                session_id=session_id,
                user_id=user_id,
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
    current_user: PostgresUser = Depends(get_current_user),
):
    """Analyze pronunciation by comparing target text with spoken text. Requires login."""
    result = await service.analyze_pronunciation(target_text, audio_text)
    return result


# ========== Debug Endpoint (Development Only) ==========
@router.post("/chat/test-embedding")
async def test_embedding(
    text: str = Body(..., embed=True),
    service: AIService = Depends(get_ai_service),
    current_user: PostgresUser = Depends(get_current_user),
):
    """Test endpoint to verify embedding generation. Requires login (dev-only)."""
    embedding = await service.generate_embedding(text)
    return {
        "text": text,
        "embedding_length": len(embedding),
        "first_10_dims": embedding[:10] if embedding else [],
        "status": "success" if embedding else "failed",
    }
