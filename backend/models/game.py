# backend/models/game.py
"""
Game Models - Request/Response Schemas
"""
from pydantic import BaseModel, Field
from typing import List, Literal, Dict, Any, Optional


class MemoryPair(BaseModel):
    """Memory pair for memory match game"""
    id: str
    type: Literal["image", "word"]
    content: str


class GameChallenge(BaseModel):
    """Single game challenge schema"""
    game_type: Literal["drag_match", "catch_word", "word_scramble", "memory_match"]
    flashcard_qr_id: str
    difficulty: Literal["easy", "medium", "hard"]
    question: str
    image_url: Optional[str] = None
    
    # For drag_match and catch_word
    correct_answer: Optional[str] = None
    choices: Optional[List[str]] = None
    
    # For word_scramble
    scrambled_word: Optional[str] = None
    
    # For memory_match
    pairs: Optional[List[MemoryPair]] = None
    
    hint: Optional[str] = Field(None, description="Helpful hint for kids")
    encouragement_wrong: Optional[str] = Field(None, description="Positive message when wrong")
    celebration_right: Optional[str] = Field(None, description="Celebration message when correct")
    time_limit: Optional[int] = Field(None, description="Time limit in seconds (null = no limit)")
    stars_reward: int = Field(1, description="Stars earned for correct answer")
    game_config: Optional[Dict[str, Any]] = Field(None, description="Game-specific configuration")


class GameSessionSchema(BaseModel):
    """Game session schema"""
    flashcard_qr_id: str
    challenges: List[GameChallenge]
    difficulty: Optional[str] = None
    game_type: Optional[str] = None
