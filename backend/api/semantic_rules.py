"""
Semantic Rules API for AR Freeze Pose System
CRUD endpoints for managing semantic rules that trigger AR effects
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/ar", tags=["AR"])

# In-memory storage for demo (replace with MongoDB in production)
RULES_DB: List[dict] = []


@router.get("/semantic-rules", response_model=List[dict])
async def get_semantic_rules(
    flashcardSet: str = Query(..., description="Flashcard set ID"),
    active_only: bool = Query(True, description="Only return active rules")
):
    """
    Get all semantic rules for a flashcard set.
    
    - **flashcardSet**: The ID of the flashcard set to fetch rules for
    - **active_only**: If true, only return rules where active=true
    """
    rules = [r for r in RULES_DB if r.get("flashcardSet") == flashcardSet]
    if active_only:
        rules = [r for r in rules if r.get("active", True)]
    # Sort by priority (higher first)
    rules.sort(key=lambda x: x.get("priority", 0), reverse=True)
    return rules


@router.post("/semantic-rules", response_model=dict)
async def create_semantic_rule(rule: dict):
    """
    Create a new semantic rule.
    
    The rule should include:
    - cards: Array of card qrIds
    - result: Result type (combo_jungle, spawn_coin, particle_burst, model_swap)
    - animation: Animation name to play
    - flashcardSet: Associated flashcard set ID
    
    Optional fields:
    - sound: Sound effect URL
    - phrase: Text to display
    - priority: Higher = evaluated first (default: 0)
    - active: Whether rule is enabled (default: true)
    """
    # Validate required fields
    if not rule.get("cards"):
        raise HTTPException(status_code=400, detail="cards field is required")
    if not rule.get("result"):
        raise HTTPException(status_code=400, detail="result field is required")
    if not rule.get("animation"):
        raise HTTPException(status_code=400, detail="animation field is required")
    if not rule.get("flashcardSet"):
        raise HTTPException(status_code=400, detail="flashcardSet field is required")
    
    # Generate ID if not provided
    if not rule.get("id"):
        rule["id"] = str(ObjectId())
    
    # Set timestamps
    now = datetime.utcnow()
    rule["createdAt"] = now.isoformat()
    rule["updatedAt"] = now.isoformat()
    
    # Ensure active defaults to True
    rule["active"] = rule.get("active", True)
    
    # Ensure priority defaults to 0
    rule["priority"] = rule.get("priority", 0)
    
    RULES_DB.append(rule)
    return rule


@router.put("/semantic-rules/{rule_id}", response_model=dict)
async def update_semantic_rule(rule_id: str, rule: dict):
    """
    Update an existing semantic rule.
    
    - **rule_id**: The ID of the rule to update
    - **rule**: Partial rule object with fields to update
    """
    for i, r in enumerate(RULES_DB):
        if r.get("id") == rule_id:
            # Update timestamp
            rule["updatedAt"] = datetime.utcnow().isoformat()
            
            # Merge existing rule with updates
            updated_rule = {**r, **rule}
            updated_rule["id"] = r.get("id")  # Preserve original ID
            if "createdAt" in r:
                updated_rule["createdAt"] = r["createdAt"]  # Preserve createdAt
            
            RULES_DB[i] = updated_rule
            return updated_rule
    
    raise HTTPException(status_code=404, detail="Rule not found")


@router.delete("/semantic-rules/{rule_id}")
async def delete_semantic_rule(rule_id: str):
    """
    Delete a semantic rule.
    
    - **rule_id**: The ID of the rule to delete
    """
    global RULES_DB
    original_length = len(RULES_DB)
    RULES_DB = [r for r in RULES_DB if r.get("id") != rule_id]
    
    if len(RULES_DB) == original_length:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"status": "deleted", "rule_id": rule_id}


@router.get("/semantic-rules/available-results", response_model=List[str])
async def get_available_results():
    """
    Get list of available result types for semantic rules.
    Useful for populating dropdowns in admin UIs.
    """
    return [
        "combo_jungle",
        "spawn_coin",
        "particle_burst",
        "model_swap"
    ]
