# backend/api/flashcard_editor.py
"""
Flashcard Editor API Router - Canvas Editor State Management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import Optional
from datetime import datetime

from core.security import get_current_user, get_current_teacher
from models.user_mongo import UserDocument
from models.flashcard_editor import (
    FlashcardEditor,
    FlashcardEditorCreate,
    FlashcardEditorUpdate,
    FlashcardEditorResponse,
    FlashcardEditorSaveResponse,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_editor_or_404(flashcard_id: str) -> FlashcardEditor:
    """Get flashcard editor by flashcard_id or raise 404"""
    editor = await FlashcardEditor.find_one(
        FlashcardEditor.flashcard_id == flashcard_id
    )
    if not editor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard editor state not found for flashcard: {flashcard_id}"
        )
    return editor


@router.post("/save", response_model=FlashcardEditorSaveResponse)
async def save_flashcard_editor(
    editor_data: FlashcardEditorCreate,
    current_user: UserDocument = Depends(get_current_teacher)
):
    """
    Save or update flashcard editor state.

    Creates a new editor document if one doesn't exist for this flashcard,
    or updates the existing one.
    """
    logger.info(f"[Editor] POST /flashcard-editor/save - flashcard: {editor_data.flashcard_id}")

    try:
        # Check if editor exists
        existing = await FlashcardEditor.find_one(
            FlashcardEditor.flashcard_id == editor_data.flashcard_id
        )

        if existing:
            # Update existing
            existing.elements = editor_data.elements
            existing.canvas_width = editor_data.canvas_width
            existing.canvas_height = editor_data.canvas_height
            existing.qr_position_x = editor_data.qr_position_x
            existing.qr_position_y = editor_data.qr_position_y
            existing.qr_size = editor_data.qr_size
            existing.show_qr_in_export = editor_data.show_qr_in_export
            existing.updated_at = datetime.utcnow()

            await existing.save()

            return FlashcardEditorSaveResponse(
                success=True,
                message="Flashcard editor state updated",
                editor_id=str(existing.id),
                updated_at=existing.updated_at
            )
        else:
            # Create new
            new_editor = FlashcardEditor(
                flashcard_id=editor_data.flashcard_id,
                elements=editor_data.elements,
                canvas_width=editor_data.canvas_width,
                canvas_height=editor_data.canvas_height,
                qr_position_x=editor_data.qr_position_x,
                qr_position_y=editor_data.qr_position_y,
                qr_size=editor_data.qr_size,
                show_qr_in_export=editor_data.show_qr_in_export,
                created_by=str(current_user.id)
            )

            await new_editor.insert()

            return FlashcardEditorSaveResponse(
                success=True,
                message="Flashcard editor state created",
                editor_id=str(new_editor.id),
                updated_at=new_editor.created_at
            )

    except Exception as e:
        logger.error(f"[Editor] Save error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save flashcard editor: {str(e)}"
        )


@router.get("/{flashcard_id}", response_model=FlashcardEditorResponse)
async def get_flashcard_editor(
    flashcard_id: str,
    current_user: UserDocument = Depends(get_current_teacher)
):
    """
    Get flashcard editor state by flashcard ID.

    Returns the canvas elements and settings for the editor.
    """
    logger.info(f"[Editor] GET /flashcard-editor/{flashcard_id}")

    editor = await get_editor_or_404(flashcard_id)

    return FlashcardEditorResponse(
        id=str(editor.id),
        flashcard_id=editor.flashcard_id,
        elements=editor.elements,
        canvas_width=editor.canvas_width,
        canvas_height=editor.canvas_height,
        qr_position_x=editor.qr_position_x,
        qr_position_y=editor.qr_position_y,
        qr_size=editor.qr_size,
        show_qr_in_export=editor.show_qr_in_export,
        created_by=editor.created_by,
        created_at=editor.created_at,
        updated_at=editor.updated_at
    )


@router.put("/{flashcard_id}", response_model=FlashcardEditorResponse)
async def update_flashcard_editor(
    flashcard_id: str,
    update_data: FlashcardEditorUpdate,
    current_user: UserDocument = Depends(get_current_teacher)
):
    """
    Update flashcard editor state (partial update).

    Only updates the fields that are provided.
    """
    logger.info(f"[Editor] PUT /flashcard-editor/{flashcard_id}")

    editor = await get_editor_or_404(flashcard_id)

    try:
        # Apply updates
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(editor, key):
                setattr(editor, key, value)

        editor.updated_at = datetime.utcnow()
        await editor.save()

        return FlashcardEditorResponse(
            id=str(editor.id),
            flashcard_id=editor.flashcard_id,
            elements=editor.elements,
            canvas_width=editor.canvas_width,
            canvas_height=editor.canvas_height,
            qr_position_x=editor.qr_position_x,
            qr_position_y=editor.qr_position_y,
            qr_size=editor.qr_size,
            show_qr_in_export=editor.show_qr_in_export,
            created_by=editor.created_by,
            created_at=editor.created_at,
            updated_at=editor.updated_at
        )

    except Exception as e:
        logger.error(f"[Editor] Update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update flashcard editor: {str(e)}"
        )


@router.delete("/{flashcard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard_editor(
    flashcard_id: str,
    current_user: UserDocument = Depends(get_current_teacher)
):
    """
    Delete flashcard editor state.

    This removes the canvas editor state but doesn't affect the flashcard itself.
    """
    logger.info(f"[Editor] DELETE /flashcard-editor/{flashcard_id}")

    editor = await get_editor_or_404(flashcard_id)
    await editor.delete()
