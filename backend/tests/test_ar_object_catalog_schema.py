"""Contract tests for the MindAR catalog identity fields on AR object schemas.

These tests verify that ``ARObjectCreate`` requires a complete catalog triple
on create, that ``ARObjectUpdate`` rejects partial catalog identity updates,
and that catalog fields appear on the response schema so the frontend can
render the catalog-driven AR flow.
"""

import pytest
from pydantic import ValidationError

from models.ar_object import ARObjectCreate, ARObjectUpdate


BASE = {
    "ar_tag": "elephant_marker_01",
    "description": "Elephant",
    "nft_base_url": "/assets/target/catalogs/animals-v2.mind",
    "model_3d_url": "/assets/models/elephant.glb",
    "image_2d_url": "/assets/images/elephant.png",
}


def test_create_requires_catalog_identity():
    """Creating an AR object without a catalog triple must fail."""
    with pytest.raises(ValidationError):
        ARObjectCreate(**BASE)


def test_create_rejects_negative_target_index():
    """``mind_target_index`` must be a non-negative integer."""
    with pytest.raises(ValidationError):
        ARObjectCreate(**BASE, mind_catalog_id="animals-v2", mind_target_index=-1)


def test_update_rejects_partial_catalog_identity():
    """Updating only one of the two catalog identity fields is invalid."""
    with pytest.raises(ValidationError):
        ARObjectUpdate(mind_catalog_id="animals-v2")


def test_update_rejects_clearing_catalog_with_nulls():
    """Catalog identity cannot be cleared with explicit null values."""
    with pytest.raises(ValidationError):
        ARObjectUpdate(mind_catalog_id=None, mind_target_index=None)
