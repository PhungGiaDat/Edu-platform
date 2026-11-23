"""Regression contracts for the PostgreSQL pet XP unlock catalog."""

from pathlib import Path

from database.postgres.pet_catalog import (
    CANONICAL_PET_CATALOG_RULES,
    canonical_pet_catalog_values,
)


def test_xp_gated_pets_use_the_existing_rarity_thresholds():
    assert CANONICAL_PET_CATALOG_RULES["cube_fox"] == {
        "rarity": "rare",
        "unlock_condition": {"type": "xp", "value": 500},
    }
    assert CANONICAL_PET_CATALOG_RULES["cube_lion"] == {
        "rarity": "epic",
        "unlock_condition": {"type": "xp", "value": 1500},
    }
    assert CANONICAL_PET_CATALOG_RULES["cube_polar"] == {
        "rarity": "legendary",
        "unlock_condition": {"type": "xp", "value": 5000},
    }
    # Full 24-pet catalog: 3 free starters + 21 XP-gated. Mirrors
    # 20260924_01_complete_pet_xp_unlock_catalog.sql so the Mongo importer
    # can no longer revert the newly gated pets to free.
    assert len(CANONICAL_PET_CATALOG_RULES) == 24
    for starter in ("cube_bunny", "cube_cat", "cube_dog"):
        assert CANONICAL_PET_CATALOG_RULES[starter] == {
            "rarity": "common",
            "unlock_condition": {"type": "free", "value": 0},
        }
    assert CANONICAL_PET_CATALOG_RULES["cube_bee"] == {
        "rarity": "rare",
        "unlock_condition": {"type": "xp", "value": 500},
    }
    assert CANONICAL_PET_CATALOG_RULES["cube_penguin"] == {
        "rarity": "legendary",
        "unlock_condition": {"type": "xp", "value": 5000},
    }


def test_canonical_catalog_rules_override_only_the_selected_pet_ids():
    rarity, unlock_condition = canonical_pet_catalog_values(
        "cube_fox",
        "common",
        {"type": "free", "value": 0},
    )
    assert rarity == "rare"
    assert unlock_condition == {"type": "xp", "value": 500}

    # An unclassified pet id still preserves the source values.
    fallback_rarity, fallback_condition = canonical_pet_catalog_values(
        "cube_unknown_future",
        "common",
        {"type": "free", "value": 0},
    )
    assert fallback_rarity == "common"
    assert fallback_condition == {"type": "free", "value": 0}


def test_postgres_migration_matches_the_canonical_xp_unlock_catalog():
    migration = (
        Path(__file__).resolve().parents[1]
        / "database"
        / "postgres"
        / "migrations"
        / "20260924_01_complete_pet_xp_unlock_catalog.sql"
    )

    assert migration.is_file()
    sql = migration.read_text(encoding="utf-8")
    for pet_id, rule in CANONICAL_PET_CATALOG_RULES.items():
        assert pet_id in sql
        assert rule["rarity"] in sql
        assert str(rule["unlock_condition"]["value"]) in sql
