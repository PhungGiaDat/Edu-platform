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


COMBO_MIGRATION_PATH = MIGRATION_PATH.with_name("20260927_01_add_dog_bone_combo_rule.sql")


def test_dog_bone_combo_rule_is_additive_with_dog_as_actor():
    """Backend data, not a frontend fallback, must admit bone001 for dog001 sessions."""
    migration = COMBO_MIGRATION_PATH.read_text(encoding="utf-8")

    assert "'clay_dog_bone'" in migration
    assert "'\"claymorphic-animals-001\"'::jsonb" in migration
    assert "'[\"dog001\", \"bone001\"]'::jsonb" in migration
    assert "('clay_dog_bone', 'dog001', 0)" in migration
    assert "('clay_dog_bone', 'bone001', 1)" in migration
    assert "'\"SHIBA_EAT_BONE\"'::jsonb" in migration
    # Runtime ignores rules without proximity, so all four values are required.
    assert "0.62,
    0.70,
    300,
    0.25," in migration
    assert migration.count("ON CONFLICT") == 2
    assert "UPDATE " not in migration
    assert "DELETE FROM" not in migration
    assert "clay_cat_fish" not in migration
