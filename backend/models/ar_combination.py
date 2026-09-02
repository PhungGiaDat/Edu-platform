# backend/models/ar_combination.py
"""
AR Combination Models - PostgreSQL via repositories

All database operations go through ARCombinationRepository (PostgreSQL).
Pydantic schemas are used for API request/response validation.
"""
import json
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Any, List, Mapping, Optional


# ---------------------------------------------------------------------------
# Embedded sub-document
# ---------------------------------------------------------------------------

class TransformSchema(BaseModel):
    """Transform schema for AR objects"""
    position: Optional[str] = None
    rotation: Optional[str] = None
    scale: Optional[str] = None


# ---------------------------------------------------------------------------
# Pydantic DTO (API request/response — no database persistence)
# ---------------------------------------------------------------------------

class ArCombinationSchema(BaseModel):
    """
    DTO for serializing an ARCombination to API responses.

    This mirrors ARCombination's fields. Extra="forbid" mirrors schema
    enforcement: unknown fields are rejected on the way in.
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
    center_transform: Optional[TransformSchema] = None

    # ---- Semantic fields (migrated from semantic_rules) ----
    semantic_result: Optional[str] = None
    animation: Optional[str] = None
    sound: Optional[str] = None
    phrase: Optional[str] = None
    priority: int = 0
    active: bool = True
    flashcard_set: Optional[str] = None
    cross_category_allowed: bool = Field(default=False)
    combo_name: Optional[str] = None
    reward_points: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(extra="forbid", from_attributes=True)


def serialize_ar_combination(combo: Mapping[str, Any]) -> ArCombinationSchema:
    """
    Serialize an AR combination dict (from repository) to ArCombinationSchema.
    Handles JSON-parsed fields and transforms.
    """
    # Parse nested JSON fields if still strings
    data = dict(combo)
    for key in ("center_transform",):
        val = data.get(key)
        if isinstance(val, str) and val:
            try:
                data[key] = json.loads(val)
            except json.JSONDecodeError:
                pass

    # Ensure required_tags is a list
    if "required_tags" not in data or not isinstance(data["required_tags"], list):
        data["required_tags"] = []

    return ArCombinationSchema.model_validate(data)
