# backend/service/game/router.py

from fastapi import APIRouter, HTTPException, Query
from .repository.game_repo import GameRepository
from .schemas.models import GameSessionSchema

router = APIRouter()
game_repo = GameRepository()

@router.get("/game/{qr_id}", response_model=GameSessionSchema)
async def get_game_by_flashcard(
    qr_id: str,
    difficulty: str = Query(None, regex="^(easy|medium|hard)$"),
    game_type: str = Query(None, regex="^(drag_match|catch_word|word_scramble|memory_match)$")
):
    """
    Get game challenges for a specific flashcard
    
    Args:
        qr_id: Flashcard QR ID (e.g., 'ele123')
        difficulty: Optional difficulty filter ('easy', 'medium', 'hard')
        game_type: Optional game type filter
        
    Returns:
        GameSessionSchema: Game challenges and metadata
    """
    print(f"[API] GET /game/{qr_id}?difficulty={difficulty}&game_type={game_type}")
    
    challenges = await game_repo.get_by_filters(qr_id, difficulty, game_type)
    
    if not challenges:
        raise HTTPException(
            status_code=404, 
            detail=f"No games found for flashcard QR ID: {qr_id}"
        )
    
    return {
        "flashcard_qr_id": qr_id,
        "challenges": challenges,
        "difficulty": difficulty,
        "game_type": game_type
    }