# backend/api/notebook.py
"""
Notebook API Router - Sổ tay endpoints
"""
from fastapi import Depends, HTTPException, status, Query
from core.base_router import create_router
from core.security import get_current_user
from services.notebook_service import NotebookService
from repositories.notebook_repository import NotebookRepository
from repositories.postgres_user_repository import PostgresUser
from models.notebook_entry import (
    NotebookEntryCreate,
    NotebookEntryUpdate,
    NotebookEntryResponse,
    NotebookListResponse,
    ReviewSubmit,
    ReviewResultResponse,
    DueCardsResponse,
)
from typing import Optional, List
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

router = create_router(
    prefix="/notebook",
    tags=["Notebook"]
)


async def get_notebook_repository():
    """Get notebook repository"""
    from database import get_db_session
    async with get_db_session() as db:
        yield NotebookRepository(db)


async def get_notebook_service(
    repo=Depends(get_notebook_repository)
) -> NotebookService:
    return NotebookService(repo)


@router.post("", response_model=NotebookEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    entry: NotebookEntryCreate,
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """Create a new notebook entry."""
    logger.info(f"[API] POST /notebook - User {current_user.id}: {entry.word}")

    try:
        result = await service.create_entry(
            user_id=current_user.id,
            word=entry.word,
            translation_vi=entry.translation_vi,
            translation_en=entry.translation_en,
            context=entry.context,
            source=entry.source.value if hasattr(entry.source, 'value') else entry.source,
            topic=entry.topic,
            difficulty=entry.difficulty.value if hasattr(entry.difficulty, 'value') else entry.difficulty,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create notebook entry"
            )

        return _format_entry(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] Notebook create failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("", response_model=NotebookListResponse)
async def list_entries(
    topic: Optional[str] = Query(None, description="Filter by topic"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search word/translation"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """List notebook entries for current user."""
    logger.info(f"[API] GET /notebook - User {current_user.id}, page={page}")

    items, total, total_pages = await service.list_entries(
        user_id=current_user.id,
        topic=topic,
        difficulty=difficulty,
        search=search,
        page=page,
        per_page=per_page,
    )

    return {
        "items": [_format_entry(item) for item in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


@router.get("/due", response_model=DueCardsResponse)
async def get_due_cards(
    limit: int = Query(20, ge=1, le=50, description="Max cards to return"),
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """Get cards due for review."""
    logger.info(f"[API] GET /notebook/due - User {current_user.id}")

    cards = await service.get_due_cards(current_user.id, limit)

    return {
        "items": [_format_entry(card) for card in cards],
        "count": len(cards),
    }


@router.get("/{entry_id}", response_model=NotebookEntryResponse)
async def get_entry(
    entry_id: UUID,
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """Get a specific notebook entry by ID."""
    entry = await service.get_entry(entry_id, current_user.id)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook entry not found"
        )

    return _format_entry(entry)


@router.put("/{entry_id}", response_model=NotebookEntryResponse)
async def update_entry(
    entry_id: UUID,
    update: NotebookEntryUpdate,
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """Update a notebook entry."""
    logger.info(f"[API] PUT /notebook/{entry_id} - User {current_user.id}")

    update_data = update.model_dump(exclude_unset=True)

    if 'source' in update_data and update_data['source']:
        update_data['source'] = update_data['source'].value
    if 'difficulty' in update_data and update_data['difficulty']:
        update_data['difficulty'] = update_data['difficulty'].value

    entry = await service.update_entry(entry_id, current_user.id, **update_data)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook entry not found"
        )

    return _format_entry(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: UUID,
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """Delete a notebook entry."""
    logger.info(f"[API] DELETE /notebook/{entry_id} - User {current_user.id}")

    deleted = await service.delete_entry(entry_id, current_user.id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook entry not found"
        )


@router.post("/review", response_model=ReviewResultResponse)
async def submit_review(
    review: ReviewSubmit,
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """
    Submit a review result for a notebook entry.
    Uses SM-2 algorithm to calculate next review interval.
    """
    logger.info(f"[API] POST /notebook/review - User {current_user.id}")

    entry = await service.submit_review(
        entry_id=review.entry_id,
        user_id=current_user.id,
        quality=review.quality,
    )

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook entry not found"
        )

    return {
        "entry_id": entry['id'],
        "quality": review.quality,
        "new_ease_factor": float(entry['ease_factor']),
        "new_interval_days": entry['interval_days'],
        "next_review_at": entry['next_review_at'],
        "review_count": entry['review_count'],
    }


def _format_entry(data: dict) -> dict:
    """Format database row to response model"""
    return {
        "id": data['id'],
        "user_id": data['user_id'],
        "word": data['word'],
        "translation_vi": data['translation_vi'],
        "translation_en": data.get('translation_en'),
        "context": data.get('context'),
        "source": data['source'],
        "topic": data.get('topic'),
        "difficulty": data.get('difficulty'),
        "created_at": data['created_at'],
        "last_reviewed_at": data.get('last_reviewed_at'),
        "review_count": data.get('review_count', 0),
        "ease_factor": float(data.get('ease_factor', 2.5)),
        "interval_days": data.get('interval_days', 0),
        "next_review_at": data.get('next_review_at'),
    }
