# backend/models/flashcard_editor.py
"""
Flashcard Editor Models - PostgreSQL via repositories

Stores canvas editor state for custom flashcard creation.
All database operations go through flashcard editor repositories (PostgreSQL).
"""
from pydantic import BaseModel, Field
from typing import Dict, Optional, List, Any
from datetime import datetime


# ========== API Schemas ==========
class CanvasElement(BaseModel):
    """Schema for a canvas element"""
    id: str
    type: str  # 'text' | 'image' | 'qr'
    x: float
    y: float
    width: float
    height: float
    rotation: float = 0
    opacity: float = 1
    zIndex: int = 0
    props: Dict[str, Any] = Field(default_factory=dict)


class FlashcardEditorCreate(BaseModel):
    """Schema for creating a new flashcard editor state"""
    flashcard_id: str
    elements: List[Dict[str, Any]] = Field(default_factory=list)
    canvas_width: int = 1056
    canvas_height: int = 816
    qr_position_x: int = 876
    qr_position_y: int = 636
    qr_size: int = 150
    show_qr_in_export: bool = True


class FlashcardEditorUpdate(BaseModel):
    """Schema for updating flashcard editor state"""
    elements: Optional[List[Dict[str, Any]]] = None
    canvas_width: Optional[int] = None
    canvas_height: Optional[int] = None
    qr_position_x: Optional[int] = None
    qr_position_y: Optional[int] = None
    qr_size: Optional[int] = None
    show_qr_in_export: Optional[bool] = None


class FlashcardEditorResponse(BaseModel):
    """Schema for API responses"""
    id: Optional[str] = Field(None, alias="_id")
    flashcard_id: str
    elements: List[Dict[str, Any]]
    canvas_width: int
    canvas_height: int
    qr_position_x: int
    qr_position_y: int
    qr_size: int
    show_qr_in_export: bool
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class FlashcardEditorSaveResponse(BaseModel):
    """Response for save operation"""
    success: bool
    message: str
    editor_id: Optional[str] = None
    updated_at: Optional[datetime] = None
