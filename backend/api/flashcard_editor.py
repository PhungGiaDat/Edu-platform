# backend/api/flashcard_editor.py
"""
Flashcard Editor API Router - Canvas Editor State Management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from datetime import datetime
import json

from core.security import get_current_user, get_current_teacher
from repositories.postgres_user_repository import PostgresUser
from repositories.postgres_flashcard_editor_repository import (
    PostgresFlashcardEditorRepository,
    get_postgres_flashcard_editor_repository,
)
from models.flashcard_editor import (
    FlashcardEditorCreate,
    FlashcardEditorUpdate,
    FlashcardEditorResponse,
    FlashcardEditorSaveResponse,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_editor_or_404(
    flashcard_id: str,
    repo: PostgresFlashcardEditorRepository,
) -> dict:
    """Get flashcard editor by flashcard_id or raise 404."""
    editor = await repo.get_by_flashcard_id(flashcard_id)
    if not editor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard editor state not found for flashcard: {flashcard_id}",
        )
    return editor


@router.post("/save", response_model=FlashcardEditorSaveResponse)
async def save_flashcard_editor(
    editor_data: FlashcardEditorCreate,
    current_user: PostgresUser = Depends(get_current_teacher),
    repo: PostgresFlashcardEditorRepository = Depends(get_postgres_flashcard_editor_repository),
):
    """
    Save or update flashcard editor state.
    Creates a new editor document if one doesn't exist, or updates the existing one.
    """
    logger.info(f"[Editor] POST /flashcard-editor/save - flashcard: {editor_data.flashcard_id}")

    try:
        existing = await repo.get_by_flashcard_id(editor_data.flashcard_id)

        if existing:
            updated = await repo.update(
                existing["id"],
                elements=editor_data.elements,
                canvas_width=editor_data.canvas_width,
                canvas_height=editor_data.canvas_height,
                qr_position_x=editor_data.qr_position_x,
                qr_position_y=editor_data.qr_position_y,
                qr_size=editor_data.qr_size,
                show_qr_in_export=editor_data.show_qr_in_export,
            )
            return FlashcardEditorSaveResponse(
                success=True,
                message="Flashcard editor state updated",
                editor_id=str(existing["id"]),
                updated_at=updated.get("updated_at"),
            )
        else:
            created = await repo.create(
                flashcard_id=editor_data.flashcard_id,
                elements=editor_data.elements,
                canvas_width=editor_data.canvas_width,
                canvas_height=editor_data.canvas_height,
                qr_position_x=editor_data.qr_position_x,
                qr_position_y=editor_data.qr_position_y,
                qr_size=editor_data.qr_size,
                show_qr_in_export=editor_data.show_qr_in_export,
                created_by=current_user.id,
            )
            return FlashcardEditorSaveResponse(
                success=True,
                message="Flashcard editor state created",
                editor_id=str(created["id"]),
                updated_at=created.get("created_at"),
            )

    except Exception as e:
        logger.error(f"[Editor] Save error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save flashcard editor: {str(e)}",
        )


@router.get("/{flashcard_id}", response_model=FlashcardEditorResponse)
async def get_flashcard_editor(
    flashcard_id: str,
    current_user: PostgresUser = Depends(get_current_teacher),
    repo: PostgresFlashcardEditorRepository = Depends(get_postgres_flashcard_editor_repository),
):
    """
    Get flashcard editor state by flashcard ID.
    Returns the canvas elements and settings for the editor.
    """
    logger.info(f"[Editor] GET /flashcard-editor/{flashcard_id}")

    editor = await get_editor_or_404(flashcard_id, repo)

    return FlashcardEditorResponse(
        id=str(editor["id"]),
        flashcard_id=editor["flashcard_id"],
        elements=editor["elements"],
        canvas_width=editor["canvas_width"],
        canvas_height=editor["canvas_height"],
        qr_position_x=editor["qr_position_x"],
        qr_position_y=editor["qr_position_y"],
        qr_size=editor["qr_size"],
        show_qr_in_export=editor["show_qr_in_export"],
        created_by=editor["created_by"],
        created_at=editor["created_at"],
        updated_at=editor.get("updated_at"),
    )


@router.put("/{flashcard_id}", response_model=FlashcardEditorResponse)
async def update_flashcard_editor(
    flashcard_id: str,
    update_data: FlashcardEditorUpdate,
    current_user: PostgresUser = Depends(get_current_teacher),
    repo: PostgresFlashcardEditorRepository = Depends(get_postgres_flashcard_editor_repository),
):
    """
    Update flashcard editor state (partial update).
    Only updates the fields that are provided.
    """
    logger.info(f"[Editor] PUT /flashcard-editor/{flashcard_id}")

    editor = await get_editor_or_404(flashcard_id, repo)

    try:
        update_dict = update_data.model_dump(exclude_unset=True)
        updated = await repo.update(editor["id"], **update_dict)

        return FlashcardEditorResponse(
            id=str(editor["id"]),
            flashcard_id=updated["flashcard_id"],
            elements=updated["elements"],
            canvas_width=updated["canvas_width"],
            canvas_height=updated["canvas_height"],
            qr_position_x=updated["qr_position_x"],
            qr_position_y=updated["qr_position_y"],
            qr_size=updated["qr_size"],
            show_qr_in_export=updated["show_qr_in_export"],
            created_by=updated["created_by"],
            created_at=updated["created_at"],
            updated_at=updated.get("updated_at"),
        )

    except Exception as e:
        logger.error(f"[Editor] Update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update flashcard editor: {str(e)}",
        )


@router.delete("/{flashcard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard_editor(
    flashcard_id: str,
    current_user: PostgresUser = Depends(get_current_teacher),
    repo: PostgresFlashcardEditorRepository = Depends(get_postgres_flashcard_editor_repository),
):
    """
    Delete flashcard editor state.
    This removes the canvas editor state but doesn't affect the flashcard itself.
    """
    logger.info(f"[Editor] DELETE /flashcard-editor/{flashcard_id}")

    editor = await get_editor_or_404(flashcard_id, repo)
    await repo.delete(editor["id"])
