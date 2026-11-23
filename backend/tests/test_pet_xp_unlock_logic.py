"""Pin the runtime XP-unlock and ownership semantics of pet_to_response()."""

import pytest

from api.pets import pet_to_response


def make_pet(*, pet_id: str, rarity: str, unlock_type: str, value: int) -> dict:
    return {
        "pet_id": pet_id,
        "name": pet_id.removeprefix("cube_").title(),
        "name_vi": "",
        "model_url": "https://example.test/pet.glb",
        "texture_url": None,
        "thumbnail_url": None,
        "category": "animal",
        "pack_source": "kenney_cube-pets",
        "rarity": rarity,
        "color": "#4ECDC4",
        "animations": ["idle"],
        "unlock_condition": {
            "type": unlock_type,
            "value": value,
        },
    }


@pytest.mark.parametrize(
    ("threshold", "rarity"),
    [
        (500, "rare"),
        (1500, "epic"),
        (5000, "legendary"),
    ],
)
def test_xp_pet_is_not_unlockable_below_threshold(threshold: int, rarity: str):
    pet = make_pet(
        pet_id=f"cube_threshold_{threshold}",
        rarity=rarity,
        unlock_type="xp",
        value=threshold,
    )

    result = pet_to_response(
        pet=pet,
        user_unlocked_pets=[],
        user_active_pet=None,
        user_xp=threshold - 1,
        user_streak=0,
    )

    assert result.is_unlocked is False
    assert result.can_unlock is False


@pytest.mark.parametrize(
    ("threshold", "rarity"),
    [
        (500, "rare"),
        (1500, "epic"),
        (5000, "legendary"),
    ],
)
def test_xp_pet_is_unlockable_at_exact_threshold(threshold: int, rarity: str):
    pet = make_pet(
        pet_id=f"cube_threshold_{threshold}",
        rarity=rarity,
        unlock_type="xp",
        value=threshold,
    )

    result = pet_to_response(
        pet=pet,
        user_unlocked_pets=[],
        user_active_pet=None,
        user_xp=threshold,
        user_streak=0,
    )

    assert result.is_unlocked is False
    assert result.can_unlock is True


@pytest.mark.parametrize(
    ("threshold", "rarity"),
    [
        (500, "rare"),
        (1500, "epic"),
        (5000, "legendary"),
    ],
)
def test_xp_pet_is_unlockable_above_threshold(threshold: int, rarity: str):
    pet = make_pet(
        pet_id=f"cube_threshold_{threshold}",
        rarity=rarity,
        unlock_type="xp",
        value=threshold,
    )

    result = pet_to_response(
        pet=pet,
        user_unlocked_pets=[],
        user_active_pet=None,
        user_xp=threshold + 1,
        user_streak=0,
    )

    assert result.is_unlocked is False
    assert result.can_unlock is True


def test_owned_pet_stays_unlocked_when_current_xp_is_below_new_requirement():
    pet = make_pet(
        pet_id="cube_penguin",
        rarity="legendary",
        unlock_type="xp",
        value=5000,
    )

    result = pet_to_response(
        pet=pet,
        user_unlocked_pets=["cube_penguin"],
        user_active_pet=None,
        user_xp=0,
        user_streak=0,
    )

    assert result.is_unlocked is True
    assert result.can_unlock is False


def test_owned_active_pet_stays_active_when_current_xp_is_below_requirement():
    pet = make_pet(
        pet_id="cube_penguin",
        rarity="legendary",
        unlock_type="xp",
        value=5000,
    )

    result = pet_to_response(
        pet=pet,
        user_unlocked_pets=["cube_penguin"],
        user_active_pet="cube_penguin",
        user_xp=0,
        user_streak=0,
    )

    assert result.is_unlocked is True
    assert result.is_active is True
    assert result.can_unlock is False


def test_free_starter_pet_is_immediately_eligible_if_not_owned():
    pet = make_pet(
        pet_id="cube_bunny",
        rarity="common",
        unlock_type="free",
        value=0,
    )

    result = pet_to_response(
        pet=pet,
        user_unlocked_pets=[],
        user_active_pet=None,
        user_xp=0,
        user_streak=0,
    )

    assert result.is_unlocked is False
    assert result.can_unlock is True
