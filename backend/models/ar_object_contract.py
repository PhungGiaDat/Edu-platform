"""Shared AR object contract used at every persistence and serialization boundary.

This module is the single source of truth for catalog-vs-legacy AR object
identity. Repository reads normalize raw Mongo documents through
:func:`serialize_ar_object`; repository writes persist the validated
:func:`ARObjectContract` payload.

The contract deliberately diverges from the legacy ``ARObject`` Beanie
document by requiring an explicit ``tracking_mode`` discriminator. Existing
documents that are already valid catalog records will continue to pass
validation unchanged; legacy documents that lack ``tracking_mode`` will
require an explicit repair step (see Task 6).
"""

from __future__ import annotations

import json
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class TrackingMode(str, Enum):
    CATALOG = "catalog"
    LEGACY = "legacy"


def _number(value: Any) -> str:
    number = float(value)
    return str(int(number)) if number.is_integer() else format(number, ".12g")


def normalize_vec3(value: Any) -> str:
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("{"):
            value = json.loads(stripped)
        else:
            parts = stripped.split()
            if len(parts) != 3:
                raise ValueError("VECTOR3_INVALID")
            return " ".join(_number(part) for part in parts)
    if isinstance(value, dict):
        value = [value.get("x"), value.get("y"), value.get("z")]
    if isinstance(value, (list, tuple)) and len(value) == 3:
        return " ".join(_number(part) for part in value)
    raise ValueError("VECTOR3_INVALID")


class ARObjectContract(BaseModel):
    tracking_mode: TrackingMode
    ar_tag: str = Field(min_length=1)
    description: str = Field(min_length=1)
    animation_type: str
    glb_size: float = Field(gt=0)
    nft_base_url: Optional[str] = None
    model_3d_url: str = Field(min_length=1)
    texture_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    position: str
    rotation: str
    scale: str
    mind_catalog_id: Optional[str] = None
    mind_target_index: Optional[int] = Field(default=None, ge=0)
    created_at: datetime
    updated_at: Optional[datetime] = None

    _vectors = field_validator("position", "rotation", "scale", mode="before")(normalize_vec3)

    @model_validator(mode="after")
    def validate_tracking_identity(self):
        if self.tracking_mode is TrackingMode.CATALOG:
            if not self.mind_catalog_id or self.mind_target_index is None or self.nft_base_url is not None:
                raise ValueError("CATALOG_IDENTITY_INVALID")
        elif not self.nft_base_url or self.mind_catalog_id is not None or self.mind_target_index is not None:
            raise ValueError("LEGACY_IDENTITY_INVALID")
        return self


def serialize_ar_object(document: Any) -> dict:
    if hasattr(document, "model_dump"):
        raw = document.model_dump()
    else:
        raw = dict(document)
    raw.pop("_id", None)
    raw.pop("id", None)
    return ARObjectContract.model_validate(raw).model_dump(mode="json")


__all__ = [
    "ARObjectContract",
    "TrackingMode",
    "normalize_vec3",
    "serialize_ar_object",
]
