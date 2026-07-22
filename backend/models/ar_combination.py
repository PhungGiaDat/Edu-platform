# backend/models/ar_combination.py
"""
AR Combination Models - Multi-marker combos

Architecture:
  - ARCombination:   Beanie Document — schema enforced on every write/insert
  - ArCombinationSchema: Pydantic BaseModel — DTO for API responses
  - TransformSchema:       Pydantic BaseModel — embedded sub-document

Beanie enforces the schema at the app boundary. The 9 existing MongoDB documents
may contain stray fields (reward_points, combo_name, target_order); Beanie's
default extra="ignore" passes reads silently and blocks writes of unknown fields.
"""
from beanie import Document, Indexed, PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Embedded sub-document
# ---------------------------------------------------------------------------

class TransformSchema(BaseModel):
    """Transform schema for AR objects"""
    position: Optional[str] = None
    rotation: Optional[str] = None
    scale: Optional[str] = None


# ---------------------------------------------------------------------------
# Beanie Document (enforced on every write)
# ---------------------------------------------------------------------------

class ARCombination(Document):
    """
    AR Combination Document — stored in MongoDB 'ar_combinations' collection.

    Enforces schema on every insert/update. Unknown fields (e.g. 'reward_points',
    'combo_name') from legacy documents are ignored on read and rejected on write.

    The 7 semantic fields (semantic_result, animation, sound, phrase, priority,
    active, flashcard_set) were migrated from semantic_rules in 2026-07.

    NOTE: target_order is deprecated. MindAR target indices are now determined
    by scan order; this field is ignored by the frontend.
    """

    # --- identity ---
    combo_id: Indexed(str, unique=True) = Field(
        ..., description="A unique string identifier for the combo"
    )

    # --- core combo ---
    description: str = Field(..., description="Description of the combination")
    required_tags: List[str] = Field(
        ...,
        min_length=2,
        description="List of ar_tag values that must ALL be visible to trigger this combo",
    )
    target_order: Optional[List[str]] = Field(
        default=None,
        description="DEPRECATED — MindAR target indices are now determined by scan order. Ignored.",
    )

    # --- assets ---
    model_3d_url: str
    texture_url: Optional[str] = None
    image_2d_url: str
    combo_mind_url: Optional[str] = None  # MindAR .mind file with both target images
    bonus_xp: int = Field(default=100, description="XP awarded when combo is triggered")

    # --- 3D transform ---
    center_transform: Optional[TransformSchema] = None

    # --- semantic fields (migrated from semantic_rules) ---
    semantic_result: Optional[str] = Field(
        default=None,
        description="Effect type: combo_jungle, spawn_coin, particle_burst, model_swap",
    )
    animation: Optional[str] = Field(
        default=None,
        description="Animation to play when this combo triggers",
    )
    sound: Optional[str] = Field(
        default=None,
        description="Sound effect URL to play on trigger",
    )
    phrase: Optional[str] = Field(
        default=None,
        description="Text/phrase to display on trigger",
    )
    priority: int = Field(
        default=0,
        description="Higher priority combos are evaluated first",
    )
    active: bool = Field(
        default=True,
        description="Whether this combo is enabled",
    )
    flashcard_set: Optional[str] = Field(
        default=None,
        description="Associated flashcard set ID (migrated from semantic_rules.flashcardSet)",
    )

    # Beanie requires an id field; None means MongoDB auto-generates one
    id: Optional[PydanticObjectId] = Field(default=None, alias="_id")

    class Settings:
        name = "ar_combinations"
        indexes = [
            # combo_id is already unique via Indexed above
            [("required_tags", 1)],                                    # find_by_tag
            [("flashcard_set", 1), ("active", 1)],                  # by-set + active filter
            [("semantic_result", 1)],                                 # filter by result type
        ]


# ---------------------------------------------------------------------------
# Pydantic DTO (API request/response — no database persistence)
# ---------------------------------------------------------------------------

class ArCombinationSchema(BaseModel):
    """
    DTO for serializing an ARCombination to API responses.

    This mirrors ARCombination's fields but is NOT a Beanie Document —
    it exists purely for request validation and response shaping.
    The API layer converts ARCombination instances to this schema via .model_dump().

    extra="forbid" mirrors Beanie's schema enforcement: unknown fields are rejected
    on the way in (catches the same class of bugs as Beanie writes).
    """
    combo_id: str
    description: str
    required_tags: List[str] = Field(..., min_length=2)
    target_order: Optional[List[str]] = None
    model_3d_url: str
    texture_url: Optional[str] = None
    image_2d_url: str
    combo_mind_url: Optional[str] = None
    bonus_xp: int = 100

    # ---- Semantic fields (migrated from semantic_rules) ----
    semantic_result: Optional[str] = None
    animation: Optional[str] = None
    sound: Optional[str] = None
    phrase: Optional[str] = None
    priority: int = 0
    active: bool = True
    flashcard_set: Optional[str] = None

    model_config = ConfigDict(extra="forbid", from_attributes=True)
