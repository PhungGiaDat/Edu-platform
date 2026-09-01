# models/ar_object.py
"""
AR Object Models - PostgreSQL via repositories

All database operations go through ARObjectRepository (PostgreSQL).
Pydantic schemas are used for API request/response validation.
"""
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime


# ========== Animations Mixin ==========
class _AnimationsMixin(BaseModel):
    """Mixin for AR objects that support multiple animations from a single 3D model."""
    animations: Optional[List[str]] = Field(
        default=None,
        description="List of available animations in the 3D model, e.g. ['CAT_IDLE', 'CAT_EAT']"
    )
    default_animation: Optional[str] = Field(
        default=None,
        description="Default animation to play when target is found"
    )
    combo_animation: Optional[str] = Field(
        default=None,
        description="Animation to play during combo (e.g. animal eating animation)"
    )


# ========== Pydantic Schemas (API) ==========
class _CatalogIdentityMixin(BaseModel):
    """Shared validator enforcing that catalog identity fields move together.

    Both ``ARObjectCreate`` (required) and ``ARObjectUpdate`` (optional)
    inherit this so that the runtime can always read a complete catalog
    triple from a persisted document.
    """

    mind_catalog_id: Optional[str] = None
    mind_target_index: Optional[int] = None

    @model_validator(mode="after")
    def _validate_catalog_identity(self) -> "_CatalogIdentityMixin":
        catalog = self.mind_catalog_id
        index = self.mind_target_index
        present = [v is not None for v in (catalog, index)]
        if any(present) and not all(present):
            raise ValueError(
                "mind_catalog_id and mind_target_index must be provided together"
            )
        if index is not None and index < 0:
            raise ValueError("mind_target_index must be a non-negative integer")
        return self


class ARObjectCreate(_CatalogIdentityMixin, _AnimationsMixin):
    """Schema for creating a new AR object.

    Catalog identity is mandatory on create — the runtime cannot resolve
    a MindAR anchor without the complete (catalog, index) pair.

    Supports multiple animations from a single 3D model (e.g. ragdollcat).
    """

    ar_tag: str
    description: str
    animation_type: str = "none"
    glb_size: float = 1.0
    # ``nft_base_url`` is now optional on create.  Existing admin tooling
    # that still wants to persist a per-target URL can supply it, but new
    # flashcards must rely on the catalog manifest's ``mindUrl``.
    nft_base_url: Optional[str] = None
    model_3d_url: str
    texture_url: Optional[str] = None
    image_2d_url: str
    position: str = "0 0 0"
    rotation: str = "0 0 0"
    scale: str = "1 1 1"
    mind_catalog_id: str
    mind_target_index: int = Field(ge=0)

    @model_validator(mode="after")
    def _require_catalog_identity(self) -> "ARObjectCreate":
        if self.mind_catalog_id is None or self.mind_target_index is None:
            raise ValueError(
                "mind_catalog_id and mind_target_index are required on create"
            )
        return self


class ARObjectUpdate(_CatalogIdentityMixin, _AnimationsMixin):
    """Schema for updating AR object - all fields optional.

    Catalog identity is optional here.  When the caller opts into a
    catalog migration they must pass both fields together (enforced by
    ``_CatalogIdentityMixin``).  Clearing both to ``None`` is rejected
    because persisted documents must always resolve a catalog slot.
    """

    description: Optional[str] = None
    animation_type: Optional[str] = None
    glb_size: Optional[float] = None
    nft_base_url: Optional[str] = None  # DEPRECATED — use manifest.mindUrl instead
    model_3d_url: Optional[str] = None
    texture_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    position: Optional[str] = None
    rotation: Optional[str] = None
    scale: Optional[str] = None

    @model_validator(mode="after")
    def _reject_clearing_catalog(self) -> "ARObjectUpdate":
        if (
            self.mind_catalog_id is None
            and self.mind_target_index is None
            and "mind_catalog_id" in self.model_fields_set
            and "mind_target_index" in self.model_fields_set
        ):
            raise ValueError(
                "Cannot clear mind_catalog_id and mind_target_index; "
                "AR objects must always resolve a catalog slot"
            )
        return self


class ARObjectResponse(BaseModel):
    """Schema for API responses

    ``nft_base_url`` is deprecated.  The runtime reads ``mindUrl`` from the
    catalog manifest resolved via ``mind_catalog_id`` + ``mind_target_index``
    on this document.  The field remains in the response payload as
    ``Optional[str]`` so legacy clients keep parsing without errors.

    Includes animations[] for multi-animation models (e.g. ragdollcat).
    """

    id: Optional[str] = Field(None, alias="_id")
    ar_tag: str
    description: str
    animation_type: str
    glb_size: float
    nft_base_url: Optional[str] = None
    model_3d_url: str
    texture_url: Optional[str] = None
    image_2d_url: str
    position: str
    rotation: str
    scale: str
    mind_catalog_id: Optional[str] = None
    mind_target_index: Optional[int] = None
    animations: Optional[List[str]] = None
    default_animation: Optional[str] = None
    combo_animation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# ========== Legacy Schema (Backward Compatibility) ==========
class ArObjectSchema(BaseModel):
    """
    Legacy AR Object schema - kept for backward compatibility
    Use ARObjectResponse for new code

    ``nft_base_url`` is now optional.  See ARObjectResponse for the
    rationale (manifest.mindUrl is the runtime source of truth).
    """

    id: Optional[str] = Field(default=None, alias="_id")
    ar_tag: str
    description: str
    animation_type: str
    glb_size: float
    nft_base_url: Optional[str] = None
    model_3d_url: str
    texture_url: Optional[str] = None
    image_2d_url: str
    position: str
    rotation: str
    scale: str
    # Imported legacy AR objects may not have MindAR catalog provenance.  This
    # response is also used by the native transition path, where absence must
    # stay explicit rather than being invented from a model or image URL.
    mind_catalog_id: Optional[str] = None
    mind_target_index: Optional[int] = None
    animations: Optional[List[str]] = None
    default_animation: Optional[str] = None
    combo_animation: Optional[str] = None
    created_at: datetime

    class Config:
        populate_by_name = True
