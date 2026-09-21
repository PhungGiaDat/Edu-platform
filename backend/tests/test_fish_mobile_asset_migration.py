from pathlib import Path


MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "database"
    / "postgres"
    / "migrations"
    / "20260908_01_fish_mobile_visual_config.sql"
)
HOTFIX_MIGRATION = MIGRATION.parent / "20260921_01_ar_cat_fish_demo_hotfix.sql"


def test_fish_mobile_visual_config_is_canonical_and_fish_only():
    source = MIGRATION.read_text(encoding="utf-8")

    assert "fish_mobile_v1.glb" in source
    assert "scale = '0.30 0.30 0.30'" in source
    assert "WHERE ar_tag = 'fish001';" in source
    assert "physical_width" not in source
    assert "cat001" not in source


def test_cat_fish_demo_hotfix_updates_declarative_scale_and_rule_values():
    source = HOTFIX_MIGRATION.read_text(encoding="utf-8")

    assert "scale = '0.36 0.36 0.36'" in source
    assert "WHERE ar_tag = 'fish001';" in source
    assert "proximity_enter_distance = 0.62" in source
    assert "proximity_exit_distance = 0.70" in source
    assert "proximity_stable_ms = 300" in source
    assert "proximity_smoothing_alpha = 0.25" in source
