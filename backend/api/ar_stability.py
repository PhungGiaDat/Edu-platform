# backend/api/ar_stability.py
"""
AR Stability Configuration API
Provides environment-specific stability thresholds for AR pose detection
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/ar", tags=["AR"])

class StabilityConfigResponse(BaseModel):
    """Response model for stability configuration"""
    positionThreshold: float = 0.02
    rotationThreshold: float = 0.1
    requiredFrames: int = 15
    environment: str = "indoor"

# Environment-specific configurations
ENV_CONFIGS = {
    "indoor": {
        "positionThreshold": 0.02,
        "rotationThreshold": 0.1,
        "requiredFrames": 15,
    },
    "outdoor": {
        "positionThreshold": 0.05,
        "rotationThreshold": 0.15,
        "requiredFrames": 20,
    },
}

@router.get("/stability-config", response_model=StabilityConfigResponse)
async def get_stability_config(
    environment: Optional[str] = Query(
        "indoor", 
        description="Environment type: indoor or outdoor"
    )
):
    """
    Get stability configuration for AR pose detection.
    
    - **indoor**: Tighter thresholds for controlled environments
    - **outdoor**: Looser thresholds for variable lighting/conditions
    """
    config = ENV_CONFIGS.get(environment.lower(), ENV_CONFIGS["indoor"])
    return StabilityConfigResponse(environment=environment.lower(), **config)
