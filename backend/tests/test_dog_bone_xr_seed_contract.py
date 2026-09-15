from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "database"
    / "postgres"
    / "migrations"
    / "20260913_01_add_dog_bone_xr_targets.sql"
)


def test_dog_and_bone_xr_records_are_additive_and_use_the_printed_qr_ids():
    """The new printed cards must not repurpose legacy ``dog123`` data."""
    migration = MIGRATION_PATH.read_text(encoding="utf-8")

    for qr_id in ("dog001", "bone001"):
        assert f"'{qr_id}'" in migration
        assert f"images/flashcard/{qr_id}.png" in migration
        assert f"images/xr-targets/{qr_id}.json" in migration
        assert f"images/xr-targets/{qr_id}_luminance.png" in migration

    assert "shiba_mobile_v1.glb" in migration
    assert "bone_mobile_v1.glb" in migration
    assert "UPDATE public.flashcards" not in migration
    assert "DELETE FROM" not in migration
    assert "dog123" not in migration
