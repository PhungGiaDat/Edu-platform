"""
Combo API Router - Controller Layer
Only handles HTTP Request/Response and calls Service layer.
NO business logic here.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from pydantic import BaseModel

from services.ar_service import ARService, get_ar_service

router = APIRouter(prefix="/combos", tags=["combos"])


# ========== RESPONSE SCHEMAS ==========

class ComboResponse(BaseModel):
    """Combo response schema"""
    combo_id: str
    description: str
    required_tags: List[str]
    # Optional only while legacy records await a physical target-index audit.
    # New records require this field through ArCombinationSchema.
    target_order: Optional[List[str]] = None
    model_3d_url: str
    texture_url: Optional[str] = None
    image_2d_url: str
    combo_mind_url: Optional[str] = None  # Mind file with both targets
    bonus_xp: int = 100
    
    class Config:
        from_attributes = True


class ComboCheckResponse(BaseModel):
    """Response for combo check endpoint"""
    found: bool
    combo: Optional[ComboResponse] = None


# ========== HELPER FUNCTIONS ==========

def _to_combo_response(combo: dict) -> ComboResponse:
    """Convert raw combo dict to response schema"""
    required_tags = combo.get("required_tags", [])
    target_order = combo.get("target_order")
    # DEPRECATED: target_order is ignored. MindAR target indices are determined
    # by scan order in the frontend via the merged mind buffer.
    # Do not turn malformed legacy data into a plausible-but-wrong binding.
    # The client will reject a combo without a valid explicit compile order and
    # continue through the independent MULTI path instead.
    if (
        not isinstance(target_order, list)
        or len(target_order) != len(required_tags)
        or len(set(target_order)) != len(target_order)
        or set(target_order) != set(required_tags)
    ):
        target_order = None
    return ComboResponse(
        combo_id=combo.get("combo_id", ""),
        description=combo.get("description", ""),
        required_tags=required_tags,
        target_order=target_order,
        model_3d_url=combo.get("model_3d_url", ""),
        texture_url=combo.get("texture_url"),
        image_2d_url=combo.get("image_2d_url", ""),
        combo_mind_url=combo.get("combo_mind_url"),
        bonus_xp=combo.get("bonus_xp", combo.get("reward_xp", 100))
    )


# ========== ENDPOINTS (Controller) ==========
# NOTE: Route order matters! Specific paths first, parameterized last.

@router.get("/check", response_model=ComboCheckResponse)
async def check_combo(
    tags: str = Query(..., description="Comma-separated ar_tags"),
    ar_service: ARService = Depends(get_ar_service)
):
    """
    Check if the given ar_tags form a valid combo.
    
    Example: /api/combos/check?tags=animal_elephant_01,plant_palm_01
    """
    # Filter empty tags after split
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    
    if len(tag_list) < 2:
        raise HTTPException(status_code=400, detail="At least 2 valid tags required for combo")
    
    # Delegate to service
    combo = await ar_service.check_combo(tag_list)
    
    if not combo:
        return ComboCheckResponse(found=False, combo=None)
    
    return ComboCheckResponse(
        found=True,
        combo=_to_combo_response(combo)
    )


@router.get("/", response_model=List[ComboResponse])
async def list_combos(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    ar_service: ARService = Depends(get_ar_service)
):
    """List all combos with pagination"""
    # Delegate to service
    combos = await ar_service.list_combos(skip=skip, limit=limit)
    
    return [_to_combo_response(c) for c in combos]


# Parameterized route MUST be last to avoid capturing /check and / paths
@router.get("/{combo_id}", response_model=ComboResponse)
async def get_combo(
    combo_id: str,
    ar_service: ARService = Depends(get_ar_service)
):
    """Get combo by ID"""
    # Delegate to service
    combo = await ar_service.get_combo_by_id(combo_id)
    
    if not combo:
        raise HTTPException(status_code=404, detail="Combo not found")
    
    return _to_combo_response(combo)
