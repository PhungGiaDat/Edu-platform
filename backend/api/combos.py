"""
Combo API Router - Controller Layer
Only handles HTTP Request/Response and calls Service layer.
NO business logic here.

Migrated from: api/semantic_rules.py
  - GET /semantic-rules?flashcardSet=xxx  ->  GET /combos?flashcard_set=xxx
  - POST /semantic-rules                  ->  POST /combos (with semantic fields)

All responses are now typed with ArCombinationSchema (Pydantic DTO).
Beanie documents are converted to dicts by ARCombinationRepository,
then validated into ArCombinationSchema by FastAPI's response_model.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from pydantic import BaseModel

from models.ar_combination import ArCombinationSchema, serialize_ar_combination
from services.ar_service import ARService, get_ar_service

router = APIRouter(prefix="/combos", tags=["combos"])


# ========== RESPONSE SCHEMAS ==========

class ComboRule(BaseModel):
    """Single combo rule for frontend"""
    tags: List[str]
    name: str
    combo_id: str
    animation_trigger: Optional[str] = None

class ComboRulesResponse(BaseModel):
    """Response for combo rules endpoint"""
    rules: List[ComboRule]
    total: int

class ComboCheckResponse(BaseModel):
    """Response for combo check endpoint"""
    found: bool
    combo: Optional[ArCombinationSchema] = None

    class Config:
        from_attributes = True


# ========== HELPER FUNCTIONS ==========

def _to_combo_response(combo: dict) -> ArCombinationSchema:
    """
    Validate a plain combo dict (from Beanie query) against the response schema.
    FastAPI's response_model=ArCombinationSchema calls this internally,
    but we call it explicitly for error clarity.
    """
    return serialize_ar_combination(combo)


# ========== ENDPOINTS (Controller) ==========

@router.get("/check", response_model=ComboCheckResponse)
async def check_combo(
    tags: str = Query(..., description="Comma-separated ar_tags"),
    ar_service: ARService = Depends(get_ar_service)
):
    """
    Check if the given ar_tags form a valid combo.

    Example: /api/combos/check?tags=animal_elephant_01,plant_palm_01
    """
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    if len(tag_list) < 2:
        raise HTTPException(status_code=400, detail="At least 2 valid tags required for combo")

    combo = await ar_service.check_combo(tag_list)

    if not combo:
        return ComboCheckResponse(found=False, combo=None)

    return ComboCheckResponse(
        found=True,
        combo=_to_combo_response(combo)
    )


@router.get("/", response_model=List[ArCombinationSchema])
async def list_combos(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    ar_service: ARService = Depends(get_ar_service)
):
    """List all combos with pagination"""
    combos = await ar_service.list_combos(skip=skip, limit=limit)
    return [_to_combo_response(c) for c in combos]


@router.get("/by-set", response_model=List[ArCombinationSchema])
async def get_combos_by_flashcard_set(
    flashcard_set: str = Query(..., description="Flashcard set ID"),
    active_only: bool = Query(True, description="Only return active combos"),
    ar_service: ARService = Depends(get_ar_service)
):
    """
    Get all combos for a flashcard set.
    REPLACES: GET /ar/semantic-rules?flashcardSet=xxx

    This endpoint was migrated from api/semantic_rules.py.
    It reads from ar_combinations (not a separate semantic_rules collection)
    and returns combos filtered by flashcard_set.
    """
    combos = await ar_service.list_combos(skip=0, limit=200)

    # Filter by flashcard_set
    filtered = [c for c in combos if c.get("flashcard_set") == flashcard_set]

    # Optionally filter by active
    if active_only:
        filtered = [c for c in filtered if c.get("active", True)]

    # Sort by priority (higher first)
    filtered.sort(key=lambda x: x.get("priority", 0), reverse=True)

    return [_to_combo_response(c) for c in filtered]


@router.get("/rules", response_model=ComboRulesResponse)
async def get_combo_rules(
    flashcard_set: Optional[str] = Query(None, description="Flashcard set ID to filter rules"),
    active_only: bool = Query(True, description="Only return active combos"),
    ar_service: ARService = Depends(get_ar_service)
):
    """
    Get combo rules for frontend AR engine.
    Returns simplified rule format: { tags: [], name: string }
    REPLACES: hardcoded comboRules in ar-xr.html

    Example: /api/v1/combinations/rules?flashcardSet=claymorphic-animals-001
    """
    combos = await ar_service.list_combos(skip=0, limit=200)

    # Filter by flashcard_set if provided
    if flashcard_set:
        combos = [c for c in combos if c.get("flashcard_set") == flashcard_set]

    # Filter by active if specified
    if active_only:
        combos = [c for c in combos if c.get("active", True)]

    # Convert to simple rules format
    rules = [
        {
            "tags": c.get("required_tags", []),
            "name": c.get("combo_name") or c.get("description") or "",
            "combo_id": c.get("combo_id", ""),
            "animation_trigger": c.get("animation_trigger"),
        }
        for c in combos
        if c.get("required_tags")
    ]

    return ComboRulesResponse(rules=rules, total=len(rules))


# Parameterized route MUST be last to avoid capturing /check, /, and /rules paths
@router.get("/{combo_id}", response_model=ArCombinationSchema)
async def get_combo(
    combo_id: str,
    ar_service: ARService = Depends(get_ar_service)
):
    """Get combo by ID"""
    combo = await ar_service.get_combo_by_id(combo_id)

    if not combo:
        raise HTTPException(status_code=404, detail="Combo not found")

    return _to_combo_response(combo)
