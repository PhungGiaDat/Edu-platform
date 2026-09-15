"""Canonical learner pet rarity and XP-unlock rules for PostgreSQL imports."""

from __future__ import annotations

from typing import Any, Final


# Keep these values aligned with the existing rarity thresholds documented in
# scripts/fix_pet_unlock_conditions.py. The starter companions remain free.
CANONICAL_PET_CATALOG_RULES: Final[dict[str, dict[str, Any]]] = {
    "cube_deer": {
        "rarity": "rare",
        "unlock_condition": {"type": "xp", "value": 500},
    },
    "cube_fox": {
        "rarity": "rare",
        "unlock_condition": {"type": "xp", "value": 500},
    },
    "cube_koala": {
        "rarity": "rare",
        "unlock_condition": {"type": "xp", "value": 500},
    },
    "cube_panda": {
        "rarity": "rare",
        "unlock_condition": {"type": "xp", "value": 500},
    },
    "cube_elephant": {
        "rarity": "epic",
        "unlock_condition": {"type": "xp", "value": 1500},
    },
    "cube_giraffe": {
        "rarity": "epic",
        "unlock_condition": {"type": "xp", "value": 1500},
    },
    "cube_lion": {
        "rarity": "epic",
        "unlock_condition": {"type": "xp", "value": 1500},
    },
    "cube_tiger": {
        "rarity": "epic",
        "unlock_condition": {"type": "xp", "value": 1500},
    },
    "cube_parrot": {
        "rarity": "legendary",
        "unlock_condition": {"type": "xp", "value": 5000},
    },
    "cube_polar": {
        "rarity": "legendary",
        "unlock_condition": {"type": "xp", "value": 5000},
    },
}


def canonical_pet_catalog_values(
    pet_id: str,
    fallback_rarity: str,
    fallback_unlock_condition: Any,
) -> tuple[str, dict[str, Any]]:
    """Return the canonical rule for selected pets, else preserve source data."""
    rule = CANONICAL_PET_CATALOG_RULES.get(pet_id)
    if rule is not None:
        return rule["rarity"], dict(rule["unlock_condition"])

    if isinstance(fallback_unlock_condition, dict):
        unlock_condition = dict(fallback_unlock_condition)
    else:
        unlock_condition = {"type": "free", "value": 0}
    return fallback_rarity, unlock_condition
