# backend/api/vocabulary_topics.py
"""
Vocabulary Topics API Router
"""
from fastapi import Depends, HTTPException, status
from core.base_router import create_router
from repositories.vocabulary_topic_repository import VocabularyTopicRepository
from models.vocabulary_topic import (
    VocabularyTopicResponse,
    VocabularyTopicListResponse,
)
from typing import List
import logging

logger = logging.getLogger(__name__)

router = create_router(
    prefix="/vocabulary/topics",
    tags=["Vocabulary Topics"]
)


async def get_topic_repository():
    """Get topic repository"""
    from database import get_db_session
    async with get_db_session() as db:
        yield VocabularyTopicRepository(db)


@router.get("", response_model=VocabularyTopicListResponse)
async def list_topics(
    repo=Depends(get_topic_repository)
):
    """
    List all active vocabulary topics.

    Returns conversation topics and IELTS band topics.
    """
    logger.info("[API] GET /vocabulary/topics")

    topics = await repo.get_all_active()

    return {
        "items": [_format_topic(t) for t in topics],
        "total": len(topics),
    }


@router.get("/{slug}", response_model=VocabularyTopicResponse)
async def get_topic(
    slug: str,
    repo=Depends(get_topic_repository)
):
    """Get a specific vocabulary topic by slug."""
    logger.info(f"[API] GET /vocabulary/topics/{slug}")

    topic = await repo.get_by_slug(slug)

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found"
        )

    return _format_topic(topic)


def _format_topic(data: dict) -> dict:
    """Format database row to response"""
    return {
        "id": data['id'],
        "slug": data['slug'],
        "name": data['name'],
        "name_vi": data['name_vi'],
        "description": data.get('description'),
        "icon": data.get('icon'),
        "color": data.get('color'),
        "is_ielts": data.get('is_ielts', False),
        "ielts_band": data.get('ielts_band'),
        "sort_order": data.get('sort_order', 0),
        "is_active": data.get('is_active', True),
    }
