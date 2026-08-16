"""Learner-safe hydration contract for schema-v2 vocabulary activities."""

from pydantic import BaseModel, Field

from models.asset_contract import ResolvedLearnerAsset


class VocabularyActivityItem(BaseModel):
    vocabulary_id: str = Field(min_length=1)
    illustration: ResolvedLearnerAsset
    pronunciation_audio: ResolvedLearnerAsset


class VocabularyActivityHydration(BaseModel):
    activity_id: str = Field(min_length=1)
    items: list[VocabularyActivityItem] = Field(min_length=1)
