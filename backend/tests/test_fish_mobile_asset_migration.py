from pathlib import Path


MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "database"
    / "postgres"
    / "migrations"
    / "20260908_01_fish_mobile_visual_config.sql"
)


def test_fish_mobile_visual_config_is_canonical_and_fish_only():
    source = MIGRATION.read_text(encoding="utf-8")

    assert "fish_mobile_v1.glb" in source
    assert "scale = '0.30 0.30 0.30'" in source
    assert "WHERE ar_tag = 'fish001';" in source
    assert "physical_width" not in source
    assert "cat001" not in source
