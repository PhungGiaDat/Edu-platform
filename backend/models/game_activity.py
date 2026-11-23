"""Learner-safe LC4 memory-match contracts over existing JSONB payloads."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from models.asset_contract import AssetRole, ResolvedLearnerAsset

class MemoryPayloadCard(BaseModel):
    id: str = Field(min_length=1)
    type: Literal['word', 'image']
    content: str | None = Field(default=None, min_length=1)
    vocabulary_id: str | None = Field(default=None, min_length=1)
    asset_role: Literal[AssetRole.VOCABULARY_ILLUSTRATION] | None = None
    @model_validator(mode='after')
    def content_source(self):
        if self.type == 'word' and not self.content:
            raise ValueError('word cards require content')
        if self.type == 'image' and not self.content and not (self.vocabulary_id and self.asset_role):
            raise ValueError('image cards require legacy content or a vocabulary illustration reference')
        if self.asset_role and not self.vocabulary_id:
            raise ValueError('asset_role requires vocabulary_id')
        return self
class MemoryMatchPayload(BaseModel):
    pairs: list[MemoryPayloadCard] = Field(min_length=2, max_length=2)
    @model_validator(mode='after')
    def pair_shape(self):
        if {card.type for card in self.pairs} != {'word', 'image'}: raise ValueError('memory_match payload requires one word and one image card')
        return self
class MemoryMatchCard(BaseModel):
    card_id: str
    pair_id: str
    type: Literal['word', 'image']
    content: str | None = None
    asset: ResolvedLearnerAsset | None = None
class MiniGameActivityHydration(BaseModel):
    activity_id: str
    game_type: Literal['memory_match']
    cards: list[MemoryMatchCard] = Field(min_length=2)
class MiniGameCompleteRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    matched_pair_ids: list[str] = Field(min_length=1)
class MiniGameCompleteResult(BaseModel):
    completed: bool
    session: dict
