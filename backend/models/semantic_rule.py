"""
Semantic Rule Model for AR Freeze Pose System
Defines the structure for semantic rules that trigger AR effects based on card combinations
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class ResultType(str, Enum):
    """Types of AR effects that can be triggered by semantic rules"""
    COMBO_JUNGLE = "combo_jungle"
    SPAWN_COIN = "spawn_coin"
    PARTICLE_BURST = "particle_burst"
    MODEL_SWAP = "model_swap"


class SemanticRule(BaseModel):
    """
    Semantic Rule model for AR card combination effects.
    
    Defines rules that map card combinations to specific AR results,
    animations, sounds, and visual feedback.
    """
    id: Optional[str] = Field(None, alias="_id")
    cards: List[str] = Field(..., description="Array of card qrIds that trigger this rule")
    result: str = Field(..., description="Result type (e.g., combo_jungle, spawn_coin)")
    animation: str = Field(..., description="Animation to play when rule triggers")
    sound: Optional[str] = Field(None, description="Sound effect URL to play")
    phrase: Optional[str] = Field(None, description="Text/phrase to display on trigger")
    priority: int = Field(0, description="Higher priority rules are evaluated first")
    active: bool = Field(True, description="Whether this rule is enabled")
    flashcardSet: str = Field(..., description="Associated flashcard set ID")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "cards": ["card_001", "card_002", "card_003"],
                "result": "combo_jungle",
                "animation": "jungle_entrance",
                "sound": "/audio/jungle_roar.mp3",
                "phrase": "Jungle Combo!",
                "priority": 10,
                "active": True,
                "flashcardSet": "set_animals_001"
            }
        }


class SemanticRuleCreate(BaseModel):
    """Model for creating a new semantic rule"""
    cards: List[str] = Field(..., description="Array of card qrIds")
    result: str = Field(..., description="Result type")
    animation: str = Field(..., description="Animation to play")
    sound: Optional[str] = Field(None, description="Sound effect URL")
    phrase: Optional[str] = Field(None, description="Text to display")
    priority: int = Field(0, description="Higher = evaluated first")
    active: bool = Field(True, description="Whether rule is enabled")
    flashcardSet: str = Field(..., description="Associated flashcard set")


class SemanticRuleUpdate(BaseModel):
    """Model for updating an existing semantic rule"""
    cards: Optional[List[str]] = None
    result: Optional[str] = None
    animation: Optional[str] = None
    sound: Optional[str] = None
    phrase: Optional[str] = None
    priority: Optional[int] = None
    active: Optional[bool] = None
    flashcardSet: Optional[str] = None
