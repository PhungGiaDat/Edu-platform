# backend/api/game.py
"""
Game API Router - Thin controller layer
"""
from fastapi import Depends, HTTPException, status, Query
from core.base_router import create_router
from services import GameService, get_game_service
from models import GameSessionSchema
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Create router
router = create_router(
    prefix="/game",
    tags=["Games"]
)


@router.get("/{qr_id}", response_model=GameSessionSchema)
async def get_game_by_flashcard(
    qr_id: str,
    game_type: Optional[str] = Query(None, description="Game type filter"),
    difficulty: Optional[str] = Query(None, description="Difficulty filter"),
    service: GameService = Depends(get_game_service)
):
    """
    Get game session for a specific flashcard
    
    Args:
        qr_id: Flashcard QR ID (e.g., 'ele123')
        game_type: Optional game type ('drag_match', 'catch_word', etc.)
        difficulty: Optional difficulty ('easy', 'medium', 'hard')
        
    Returns:
        Game session with challenges and configuration
    """
    logger.info(f"[API] GET /game/{qr_id}?game_type={game_type}&difficulty={difficulty}")
    
    result = await service.get_game_by_flashcard(qr_id, game_type, difficulty)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No game found for flashcard QR ID: {qr_id} with specified filters"
        )
    
    return result
