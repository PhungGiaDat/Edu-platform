# backend/service/game/schemas/models.py

from pydantic import BaseModel, Field
from typing import List, Literal, Dict, Any

class MemoryPair(BaseModel):
    id: str
    type: Literal["image", "word"]
    content: str

class GameChallenge(BaseModel):
    game_type: Literal["drag_match", "catch_word", "word_scramble", "memory_match"]
    flashcard_qr_id: str
    difficulty: Literal["easy", "medium", "hard"]
    question: str
    image_url: str | None = None
    
    # For drag_match and catch_word
    correct_answer: str | None = None
    choices: List[str] | None = None
    
    # For word_scramble
    scrambled_word: str | None = None
    
    # For memory_match
    pairs: List[MemoryPair] | None = None
    
    hint: str | None = Field(None, description="Helpful hint for kids")
    encouragement_wrong: str | None = Field(None, description="Positive message when wrong")
    celebration_right: str | None = Field(None, description="Celebration message when correct")
    time_limit: int | None = Field(None, description="Time limit in seconds (null = no limit)")
    stars_reward: int = Field(1, description="Stars earned for correct answer")
    game_config: Dict[str, Any] | None = Field(None, description="Game-specific configuration")

class GameSessionSchema(BaseModel):
    flashcard_qr_id: str
    challenges: List[GameChallenge]
    difficulty: str | None = None
    game_type: str | None = None