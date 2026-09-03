# backend/api/notebook.py
"""
Notebook API Router - Sổ tay endpoints
"""

from fastapi import Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from core.base_router import create_router
from core.security import get_current_user
from database.orm_session import get_db_session
from services.notebook_service import NotebookService
from services.content_safety_service import ContentSafetyError
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
from typing import Optional, List, Dict, Any
from uuid import UUID
from services.gamification_service import get_gamification_service
import logging

logger = logging.getLogger(__name__)

router = create_router(prefix="/notebook", tags=["Notebook"])


async def get_notebook_repository(
    db: AsyncSession = Depends(get_db_session),
):
    """Get notebook repository bound to a request-scoped ORM session"""
    yield NotebookRepository(db)


async def get_notebook_service(
    repo=Depends(get_notebook_repository),
) -> NotebookService:
    return NotebookService(repo)


@router.post(
    "", response_model=NotebookEntryResponse, status_code=status.HTTP_201_CREATED
)
async def create_entry(
    entry: NotebookEntryCreate,
    response: Response,
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """Create a new notebook entry. Duplicate (user, word) returns the existing entry with 200."""
    logger.info(f"[API] POST /notebook - User {current_user.id}: {entry.word}")

    try:
        result, created = await service.get_or_create_entry(
            user_id=current_user.id,
            word=entry.word,
            translation_vi=entry.translation_vi,
            translation_en=entry.translation_en,
            context=entry.context,
            source=entry.source.value
            if hasattr(entry.source, "value")
            else entry.source,
            topic=entry.topic,
            difficulty=entry.difficulty.value
            if hasattr(entry.difficulty, "value")
            else entry.difficulty,
            pronunciation=entry.pronunciation,
            part_of_speech=entry.part_of_speech,
            definition_en=entry.definition_en,
            wiki_summary=entry.wiki_summary,
            explanation_vi=entry.explanation_vi,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create notebook entry",
            )

        if not created:
            response.status_code = status.HTTP_200_OK

        return _format_entry(result)

    except ContentSafetyError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Từ này không phù hợp để lưu.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] Notebook create failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lưu từ vào sổ tay chưa thành công. Bạn thử lại nhé!",
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
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook entry not found"
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

    if "source" in update_data and update_data["source"]:
        update_data["source"] = update_data["source"].value
    if "difficulty" in update_data and update_data["difficulty"]:
        update_data["difficulty"] = update_data["difficulty"].value

    entry = await service.update_entry(entry_id, current_user.id, **update_data)

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook entry not found"
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
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook entry not found"
        )


@router.post("/review", response_model=ReviewResultResponse)
async def submit_review(
    review: ReviewSubmit,
    current_user: PostgresUser = Depends(get_current_user),
    service: NotebookService = Depends(get_notebook_service),
):
    """
    Submit a review result for a notebook entry.

    Kid SM-2 (no-fail box ladder): quality >= 3 moves the word up one box
    (max 5); lower quality keeps the box and re-asks tomorrow. Boxes only
    ever go up — no punishment path for young children.

    XP is backend-authoritative and idempotent: when the client supplies
    event_id, replaying the same swipe never double-awards.
    """
    logger.info(f"[API] POST /notebook/review - User {current_user.id}")

    # ── Idempotency pre-check (BEFORE any state mutation) ──────────────
    # The CLIENT event_id is the idempotency key. If this swipe was already
    # applied, return the current entry state + cached XP WITHOUT re-running
    # SM-2 — a network retry must never double-apply progress.
    idem_base: Optional[str] = None
    if review.event_id and review.event_id.strip():
        idem_base = review.event_id.strip()
        try:
            gam_pre = get_gamification_service()
            applied_event = await gam_pre.find_event(
                str(current_user.id), f"notebook_review:{idem_base}"
            )
        except Exception as e:
            logger.warning(f"[API] Event pre-check failed (proceeding): {e}")
            applied_event = None

        if applied_event and applied_event.get("status") == "applied":
            entry = await service.get_entry(review.entry_id, current_user.id)
            if not entry:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Notebook entry not found",
                )
            logger.info(f"[API] Idempotent replay for event {idem_base}")
            return {
                "entry_id": entry["id"],
                "quality": review.quality,
                "new_ease_factor": float(entry["ease_factor"]),
                "new_interval_days": entry["interval_days"],
                "next_review_at": entry["next_review_at"],
                "review_count": entry["review_count"],
                "mastery_box": int(entry.get("mastery_box", 1) or 1),
                "box_up": False,
                "xp_awarded": int(applied_event.get("xp_awarded") or 0),
                "total_xp": applied_event.get("total_xp_after"),
                "level": applied_event.get("level_after"),
                "level_up": False,
                "sticker_earned": None,
            }

    # Snapshot pre-review box for correct box_up on cap boundary
    entry_before = await service.get_entry(review.entry_id, current_user.id)
    box_before = int(entry_before.get("mastery_box", 1) or 1) if entry_before else None

    entry = await service.submit_review(
        entry_id=review.entry_id,
        user_id=current_user.id,
        quality=review.quality,
        event_id=review.event_id,
    )

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notebook entry not found"
        )

    box_now = int(entry.get("mastery_box", 1) or 1)
    box_before = box_before if box_before is not None else box_now

    result: Dict[str, Any] = {
        "entry_id": entry["id"],
        "quality": review.quality,
        "new_ease_factor": float(entry["ease_factor"]),
        "new_interval_days": entry["interval_days"],
        "next_review_at": entry["next_review_at"],
        "review_count": entry["review_count"],
        "mastery_box": box_now,
        "box_up": review.quality >= 3 and box_now > box_before,
        "xp_awarded": None,
        "total_xp": None,
        "level": None,
        "level_up": None,
        "sticker_earned": None,
    }

    # ── Reward processing (backend-authoritative, idempotent) ──────────
    if review.event_id:
        try:
            gam = get_gamification_service()
            user_id_str = str(current_user.id)
            idem_base = (
                review.event_id.strip() or f"{entry['id']}:{entry['review_count']}"
            )
            event_key = f"notebook_review:{idem_base}"

            base = await gam.add_xp_with_event_id(
                user_id=user_id_str,
                event_id=event_key,
                action="notebook_review_completed",
                source_type="notebook",
                source_id=str(entry["id"]),
                metadata={"quality": review.quality, "mastery_box": box_now},
            )

            xp_awarded = base.get("xp_awarded", 0) if base.get("success") else 0

            # Box-up bonus as a separate semantic event (only when box increased)
            if result["box_up"]:
                bonus_key = f"notebook_boxup:{idem_base}"
                bonus = await gam.add_xp_with_event_id(
                    user_id=user_id_str,
                    event_id=bonus_key,
                    action="notebook_box_up",
                    source_type="notebook",
                    source_id=str(entry["id"]),
                    metadata={"mastery_box": box_now},
                )
                if bonus.get("success"):
                    xp_awarded += bonus.get("xp_awarded", 0)
                    if bonus.get("level_up"):
                        result["level_up"] = True
                    result["level"] = bonus.get("level_after") or base.get(
                        "level_after"
                    )

            # Milestone: reaching box 5 for the first time → sticker
            if box_now >= 5:
                has = await gam.has_sticker(user_id_str, "word_mastered")
                if not has:
                    await gam.collect_sticker(user_id_str, "word_mastered")
                    result["sticker_earned"] = {
                        "id": "word_mastered",
                        "name": "Word Master",
                        "rarity": "rare",
                    }

            result["xp_awarded"] = xp_awarded
            result["total_xp"] = base.get("total_xp_after")
            if not result["level"]:
                result["level"] = base.get("level_after")
        except Exception as e:
            # XP is a side reward — a gamification outage must never fail a review
            logger.error(f"[API] Notebook review XP processing failed: {e}")

    return result


def _format_entry(data: dict) -> dict:
    """Format database row to response model"""
    uid = data["user_id"]
    # Normalize UUID (stored without dashes) to dashed form
    if uid and len(uid) == 32 and "-" not in uid:
        uid = f"{uid[0:8]}-{uid[8:12]}-{uid[12:16]}-{uid[16:20]}-{uid[20:32]}"
    return {
        "id": data["id"],
        "user_id": uid,
        "word": data["word"],
        "translation_vi": data["translation_vi"],
        "translation_en": data.get("translation_en"),
        "context": data.get("context"),
        "source": data["source"],
        "topic": data.get("topic"),
        "difficulty": data.get("difficulty"),
        "created_at": data["created_at"],
        "last_reviewed_at": data.get("last_reviewed_at"),
        "review_count": data.get("review_count", 0),
        "ease_factor": float(data.get("ease_factor", 2.5)),
        "interval_days": data.get("interval_days", 0),
        "next_review_at": data.get("next_review_at"),
        "pronunciation": data.get("pronunciation"),
        "part_of_speech": data.get("part_of_speech"),
        "definition_en": data.get("definition_en"),
        "wiki_summary": data.get("wiki_summary"),
        "explanation_vi": data.get("explanation_vi"),
        "mastery_box": data.get("mastery_box", 1),
    }
