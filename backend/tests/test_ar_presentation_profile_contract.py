from pathlib import Path

from models.ar_object import ARObjectResponse, ARObjectUpdate


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
MIGRATION_PATH = (
    REPOSITORY_ROOT
    / "backend"
    / "database"
    / "postgres"
    / "migrations"
    / "20260913_02_add_ar_model_presentation_profiles.sql"
)


def test_ar_object_contract_exposes_opt_in_presentation_metadata():
    fields = {
        "presentation_profile",
        "presentation_scale_multiplier",
        "presentation_position_offset",
        "presentation_forward_axis",
    }

    assert fields.issubset(ARObjectUpdate.model_fields)
    assert fields.issubset(ARObjectResponse.model_fields)

    update = ARObjectUpdate(
        presentation_profile="pet",
        presentation_scale_multiplier=1.25,
        presentation_position_offset="0.01 0 0",
        presentation_forward_axis="+Z",
    )

    assert update.presentation_profile == "pet"
    assert update.presentation_scale_multiplier == 1.25
    assert update.presentation_position_offset == "0.01 0 0"
    assert update.presentation_forward_axis == "+Z"


def test_presentation_metadata_has_a_migration_and_deck_projection_contract():
    migration = MIGRATION_PATH.read_text(encoding="utf-8")
    repository = (REPOSITORY_ROOT / "backend" / "repositories" / "ar_object_repository.py").read_text(
        encoding="utf-8"
    )

    for column in (
        "presentation_profile",
        "presentation_scale_multiplier",
        "presentation_position_offset",
        "presentation_forward_axis",
    ):
        assert column in migration
        assert f"ao.{column}" in repository

    assert "tt.physical_width_m" in repository
    assert "UPDATE public.ar_objects" in migration
    assert "dog001" in migration
    assert "dog123" not in migration
