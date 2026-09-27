"""Canonical contract for the complete 24-pet XP unlock catalog migration."""

import re
from pathlib import Path

MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "database"
    / "postgres"
    / "migrations"
    / "20260924_01_complete_pet_xp_unlock_catalog.sql"
)

EXPECTED_RULES = {
    "cube_bunny": ("common", "free", 0),
    "cube_cat": ("common", "free", 0),
    "cube_dog": ("common", "free", 0),

    "cube_bee": ("rare", "xp", 500),
    "cube_chick": ("rare", "xp", 500),
    "cube_cow": ("rare", "xp", 500),
    "cube_deer": ("rare", "xp", 500),
    "cube_fox": ("rare", "xp", 500),
    "cube_koala": ("rare", "xp", 500),
    "cube_panda": ("rare", "xp", 500),
    "cube_pig": ("rare", "xp", 500),

    "cube_beaver": ("epic", "xp", 1500),
    "cube_caterpillar": ("epic", "xp", 1500),
    "cube_elephant": ("epic", "xp", 1500),
    "cube_fish": ("epic", "xp", 1500),
    "cube_giraffe": ("epic", "xp", 1500),
    "cube_hog": ("epic", "xp", 1500),
    "cube_lion": ("epic", "xp", 1500),
    "cube_monkey": ("epic", "xp", 1500),
    "cube_tiger": ("epic", "xp", 1500),

    "cube_crab": ("legendary", "xp", 5000),
    "cube_parrot": ("legendary", "xp", 5000),
    "cube_penguin": ("legendary", "xp", 5000),
    "cube_polar": ("legendary", "xp", 5000),
}

EXISTING_TEN_RULES = {
    "cube_deer": ("rare", "xp", 500),
    "cube_fox": ("rare", "xp", 500),
    "cube_koala": ("rare", "xp", 500),
    "cube_panda": ("rare", "xp", 500),
    "cube_elephant": ("epic", "xp", 1500),
    "cube_giraffe": ("epic", "xp", 1500),
    "cube_lion": ("epic", "xp", 1500),
    "cube_tiger": ("epic", "xp", 1500),
    "cube_parrot": ("legendary", "xp", 5000),
    "cube_polar": ("legendary", "xp", 5000),
}

RULE_RE = re.compile(
    r"\("
    r"'(?P<pet_id>cube_[a-z]+)'\s*,\s*"
    r"'(?P<rarity>common|rare|epic|legendary)'\s*,\s*"
    r"jsonb_build_object\("
    r"\s*'type'\s*,\s*'(?P<unlock_type>free|xp)'\s*,\s*"
    r"'value'\s*,\s*(?P<value>\d+)\s*"
    r"\)"
    r"\)"
)


def _read_sql() -> str:
    return MIGRATION_PATH.read_text(encoding="utf-8")


def _parse_rules(sql: str) -> dict[str, tuple[str, str, int]]:
    rules: dict[str, tuple[str, str, int]] = {}
    for match in RULE_RE.finditer(sql):
        pet_id = match.group("pet_id")
        assert pet_id not in rules, f"duplicate canonical rule for {pet_id}"
        rules[pet_id] = (
            match.group("rarity"),
            match.group("unlock_type"),
            int(match.group("value")),
        )
    return rules


def test_complete_pet_xp_migration_exists():
    assert MIGRATION_PATH.is_file()


def test_complete_pet_xp_migration_has_exact_24_pet_catalog():
    rules = _parse_rules(_read_sql())

    assert len(rules) == 24
    assert rules == EXPECTED_RULES


def test_only_three_cube_pets_are_free():
    rules = _parse_rules(_read_sql())

    free_pets = {
        pet_id
        for pet_id, (_, unlock_type, value) in rules.items()
        if unlock_type == "free" and value == 0
    }

    assert free_pets == {"cube_bunny", "cube_cat", "cube_dog"}


def test_all_non_starter_cube_pets_are_positive_xp_rules():
    rules = _parse_rules(_read_sql())

    xp_rules = {
        pet_id: value
        for pet_id, (_, unlock_type, value) in rules.items()
        if unlock_type == "xp"
    }

    assert len(xp_rules) == 21
    assert all(value > 0 for value in xp_rules.values())
    assert set(xp_rules.values()) == {500, 1500, 5000}


def test_original_ten_xp_rules_do_not_change():
    rules = _parse_rules(_read_sql())

    assert {pet_id: rules[pet_id] for pet_id in EXISTING_TEN_RULES} == EXISTING_TEN_RULES


def test_migration_is_catalog_only_and_replay_safe():
    sql = _read_sql()
    normalized = " ".join(sql.lower().split())

    assert "update public.pets as pets" in normalized
    assert "where pets.pet_id = canonical_rules.pet_id" in normalized
    assert normalized.count("is distinct from") >= 2

    forbidden_targets = (
        "update public.users",
        "update users",
        "unlocked_pets =",
        "active_pet =",
        "update public.user_points",
        "update user_points",
    )
    assert not any(target in normalized for target in forbidden_targets)


def test_canonical_contract_will_reject_an_unclassified_future_cube_pet():
    rules = _parse_rules(_read_sql())

    catalog_ids = set(EXPECTED_RULES)
    assert set(rules) == catalog_ids
