# backend/api/dictionary.py
"""
Dictionary API Router - Tra từ endpoints
"""
from fastapi import Depends, HTTPException, status
from core.base_router import create_router
from core.security import get_current_user
from services.dictionary_service import DictionaryService
from repositories.postgres_user_repository import PostgresUser
from models.dictionary import (
    TranslateRequest,
    TranslateResponse,
)
import logging

logger = logging.getLogger(__name__)

router = create_router(
    prefix="/dictionary",
    tags=["Dictionary"]
)


async def get_dictionary_service() -> DictionaryService:
    return DictionaryService()


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(
    request: TranslateRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: DictionaryService = Depends(get_dictionary_service),
):
    """
    Translate text using AI with contextual awareness.

    Uses Qdrant wiki knowledge for accurate, child-friendly translations.
    Returns translation, word breakdown, and related vocabulary.
    """
    logger.info(f"[API] POST /dictionary/translate - User {current_user.id}")

    try:
        result = await service.translate(
            text=request.text,
            context=request.context,
            target_lang=request.target_lang,
        )
        return result

    except Exception as e:
        logger.error(f"[API] Translation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )
