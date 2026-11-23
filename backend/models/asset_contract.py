"""LC5 learner-safe semantic asset contracts.

These are API/domain projections, not ``media_assets`` ORM records.  AR tracking
and model fields intentionally have no representation in this learner vocabulary.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from models.lesson_media import MediaType


class AssetRole(str, Enum):
    COURSE_COVER = "course_cover"
    WARM_UP_VISUAL = "warm_up_visual"
    VOCABULARY_ILLUSTRATION = "vocabulary_illustration"
    PRONUNCIATION_AUDIO = "pronunciation_audio"
    COLORING_OUTLINE = "coloring_outline"


_ROLE_MEDIA_TYPES: dict[AssetRole, set[MediaType]] = {
    AssetRole.COURSE_COVER: {MediaType.IMAGE},
    AssetRole.WARM_UP_VISUAL: {MediaType.IMAGE},
    AssetRole.VOCABULARY_ILLUSTRATION: {MediaType.IMAGE},
    AssetRole.PRONUNCIATION_AUDIO: {MediaType.AUDIO},
    AssetRole.COLORING_OUTLINE: {MediaType.IMAGE},
}


def asset_role_media_type(role: AssetRole) -> MediaType:
    """Return the single canonical learner media type for an asset role."""
    media_types = _ROLE_MEDIA_TYPES[role]
    if len(media_types) != 1:
        raise ValueError(f"{role.value} does not have one canonical media type")
    return next(iter(media_types))


class ResolvedLearnerAsset(BaseModel):
    """A render-safe reference resolved by the backend content layer."""

    model_config = ConfigDict(extra="forbid")

    role: AssetRole
    url: str = Field(min_length=1)
    media_type: MediaType
    metadata: dict[str, object] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_role_media_type(self) -> "ResolvedLearnerAsset":
        if self.media_type not in _ROLE_MEDIA_TYPES[self.role]:
            raise ValueError(f"{self.role.value} is incompatible with {self.media_type.value}")
        return self


def vocabulary_asset_key(vocabulary_id: str, role: AssetRole) -> str:
    """Canonical manifest/storage-independent key for vocabulary media."""
    if role not in {
        AssetRole.VOCABULARY_ILLUSTRATION,
        AssetRole.PRONUNCIATION_AUDIO,
        AssetRole.COLORING_OUTLINE,
    }:
        raise ValueError(f"{role.value} is not a vocabulary asset role")
    if not vocabulary_id:
        raise ValueError("vocabulary_id is required")
    return f"vocabulary:{vocabulary_id}:{role.value}"
