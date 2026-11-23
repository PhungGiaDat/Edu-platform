# backend/api/dictionary.py
"""
Dictionary API Router - Tra từ endpoints
"""
from fastapi import Depends, HTTPException, status
from core.base_router import create_router
from core.security import get_current_user
from services.dictionary_service import DictionaryService
from services.content_safety_service import ContentSafetyError
from repositories.postgres_user_repository import PostgresUser
from models.dictionary import (
    TranslateRequest,
    TranslateResponse,
    LookupRequest,
    LookupResponse,
)
import logging

logger = logging.getLogger(__name__)

router = create_router(
    prefix="/dictionary",
    tags=["Dictionary"]
)


async def get_dictionary_service() -> DictionaryService:
    return DictionaryService()


@router.post("/lookup", response_model=LookupResponse)
async def lookup_word(
    request: LookupRequest,
    current_user: PostgresUser = Depends(get_current_user),
    service: DictionaryService = Depends(get_dictionary_service),
):
    """Look up a single word: hybrid Qdrant + Wikipedia, safety-gated."""
    logger.info(f"[API] POST /dictionary/lookup - User {current_user.id}: {request.word}")
    try:
        return await service.lookup(request.word)
    except ContentSafetyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Từ này không phù hợp để tra. Bạn thử từ khác nhé!")
    except Exception as e:
        logger.error(f"[API] Lookup failed: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Dịch vụ tra từ đang bận. Thử lại sau nhé!")


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

    except ContentSafetyError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Từ này không phù hợp để tra. Bạn thử từ khác nhé!")
    except Exception as e:
        logger.error(f"[API] Translation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )
