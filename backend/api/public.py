# backend/api/public.py
"""
Public API Router - Endpoints accessible without authentication
"""
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

from models.flashcard import Flashcard
from services.flashcard_service import FlashcardService, get_flashcard_service
from models.flashcard_editor import FlashcardEditor

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Public"])


class PublicFlashcardResponse(BaseModel):
    """Public flashcard response for QR code scanning"""
    qr_id: str
    word: str
    translation: Dict[str, str]
    image_url: str
    audio_url: Optional[str] = None
    category: str
    ar_tag: Optional[str] = None
    image_animation_type: Optional[str] = None
    # Canvas editor state (if available)
    editor_elements: Optional[List[Dict[str, Any]]] = None
    canvas_width: Optional[int] = None
    canvas_height: Optional[int] = None


@router.get("/f/{qr_id}", response_model=PublicFlashcardResponse)
async def get_flashcard_by_qr(
    qr_id: str
):
    """
    Get flashcard data by QR ID.
    
    This endpoint is used when users scan a QR code on a flashcard.
    It returns the flashcard data including image URL, audio URL, and
    any canvas editor state.
    
    The QR URL pattern is: /f/{qr_id}
    """
    logger.info(f"[Public] GET /f/{qr_id}")

    try:
        # Get flashcard from database
        flashcard = await Flashcard.find_one(Flashcard.qr_id == qr_id)
        
        if not flashcard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Flashcard not found for QR ID: {qr_id}"
            )

        # Try to get canvas editor state
        editor_state = await FlashcardEditor.find_one(
            FlashcardEditor.flashcard_id == qr_id
        )

        editor_elements = None
        canvas_width = None
        canvas_height = None
        
        if editor_state:
            editor_elements = editor_state.elements
            canvas_width = editor_state.canvas_width
            canvas_height = editor_state.canvas_height

        return PublicFlashcardResponse(
            qr_id=flashcard.qr_id,
            word=flashcard.word,
            translation=flashcard.translation,
            image_url=flashcard.image_url,
            audio_url=flashcard.audio_url,
            category=flashcard.category,
            ar_tag=flashcard.ar_tag,
            image_animation_type=flashcard.image_animation_type,
            editor_elements=editor_elements,
            canvas_width=canvas_width,
            canvas_height=canvas_height
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Public] Error fetching flashcard {qr_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch flashcard data"
        )


@router.get("/verify_qr", response_model=Dict[str, Any])
async def verify_qr_code(
    qr_data: str = Query(..., description="QR code data to verify")
):
    """
    Verify if a scanned QR code corresponds to a valid flashcard.
    
    Returns basic info about the flashcard if found.
    """
    logger.info(f"[Public] GET /verify_qr?qr_data={qr_data}")

    flashcard = await Flashcard.find_one(Flashcard.qr_id == qr_data)
    
    if not flashcard:
        return {
            "valid": False,
            "message": "QR code not recognized"
        }
    
    return {
        "valid": True,
        "flashcard_id": flashcard.qr_id,
        "word": flashcard.word,
        "category": flashcard.category
    }


@router.get("/ar_data/{qr_id}", response_model=Dict[str, Any])
async def get_ar_data(
    qr_id: str
):
    """
    Get AR (Augmented Reality) data for a flashcard QR code.
    
    Returns AR model URLs and configuration for AR experiences.
    """
    logger.info(f"[Public] GET /ar_data/{qr_id}")

    flashcard = await Flashcard.find_one(Flashcard.qr_id == qr_id)
    
    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard not found: {qr_id}"
        )
    
    return {
        "qr_id": flashcard.qr_id,
        "ar_tag": flashcard.ar_tag,
        "image_url": flashcard.image_url,
        "has_ar": bool(flashcard.ar_tag),
        "has_audio": bool(flashcard.audio_url),
        "audio_url": flashcard.audio_url
    }
