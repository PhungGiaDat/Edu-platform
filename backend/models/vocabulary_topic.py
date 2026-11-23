# backend/models/vocabulary_topic.py
"""
Pydantic models for Vocabulary Topics
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class VocabularyTopicResponse(BaseModel):
    """Response model for vocabulary topic"""
    id: UUID
    slug: str
    name: str
    name_vi: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_ielts: bool = False
    ielts_band: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class VocabularyTopicListResponse(BaseModel):
    """List of vocabulary topics"""
    items: List[VocabularyTopicResponse]
    total: int
