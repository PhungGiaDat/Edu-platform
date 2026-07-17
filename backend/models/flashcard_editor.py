# backend/models/flashcard_editor.py
"""
Flashcard Editor Models - Beanie Documents and Pydantic Schemas

Architecture: Hybrid Database (Beanie for MongoDB)
- Beanie Document for database operations
- Pydantic schemas for API request/response

Collection: flashcard_editor
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import Dict, Optional, List, Any
from datetime import datetime


# ========== Beanie Document (MongoDB) ==========
class FlashcardEditor(Document):
    """
    FlashcardEditor Document - stores canvas editor state

    Collection: flashcard_editor
    """
    # Link to existing flashcard
    flashcard_id: Indexed(str)  # Link to the flashcard document

    # Canvas elements (serialized as dict)
    elements: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Canvas elements: text, image, qr objects with position, style, content"
    )

    # Canvas dimensions (in pixels, 300dpi equivalent)
    canvas_width: int = 1056  # 3.5 inches at 300dpi
    canvas_height: int = 816   # 2.7 inches at 300dpi

    # QR overlay settings
    qr_position_x: int = 876  # Default position (bottom-right)
    qr_position_y: int = 636
    qr_size: int = 150
    show_qr_in_export: bool = True

    # Metadata
    created_by: str  # User ID of creator
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "flashcard_editor"  # MongoDB collection name
        indexes: list = [
            [("flashcard_id", 1)],
            [("created_by", 1)],
            [("created_at", -1)],
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "flashcard_id": "apple_001",
                "elements": [
                    {
                        "id": "text_1",
                        "type": "text",
                        "x": 100,
                        "y": 100,
                        "width": 400,
                        "height": 80,
                        "rotation": 0,
                        "opacity": 1,
                        "zIndex": 1,
                        "text": "Apple",
                        "fontSize": 48,
                        "fontFamily": "system-ui",
                        "fontColor": "#1e3a8a",
                        "fontStyle": "bold",
                        "textAlign": "center"
                    }
                ],
                "canvas_width": 1056,
                "canvas_height": 816,
                "created_by": "teacher_123"
            }
        }


# ========== Pydantic Schemas (API) ==========
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
    # Type-specific properties
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
