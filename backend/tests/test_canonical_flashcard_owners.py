import pytest

from database.seed.canonical_flashcard_owners import (
    CAT_QR_ID,
    OwnerConflict,
    build_missing_owner_definitions,
    canonical_owner_mapping,
)


ASSET_URLS = {
    vocabulary_id: f"https://assets.example/{vocabulary_id}.png"
    for vocabulary_id in (
        "animals-v1-dog",
        "animals-v1-bird",
        "animals-v1-fish",
        "animals-v1-rabbit",
    )
}


def test_owner_mapping_preserves_cat_and_reuses_exact_lc7_ids_for_new_owners():
    assert canonical_owner_mapping() == {
        "animals-v1-cat": CAT_QR_ID,
        "animals-v1-dog": "animals-v1-dog",
        "animals-v1-bird": "animals-v1-bird",
        "animals-v1-fish": "animals-v1-fish",
        "animals-v1-rabbit": "animals-v1-rabbit",
    }


def test_missing_owner_definitions_contain_only_required_learner_fields():
    definitions = build_missing_owner_definitions(ASSET_URLS)
    assert len(definitions) == 4
    assert definitions["animals-v1-dog"] == {
        "qr_id": "animals-v1-dog",
        "word": "Dog",
        "translation": {"en": "dog", "vi": "con chó"},
        "category": "animals",
        "image_url": "https://assets.example/animals-v1-dog.png",
    }
    forbidden = {
        "ar_tag",
        "reference_image_url",
        "physical_width_m",
        "model_3d_url",
        "mind_catalog_id",
        "mind_target_index",
        "nft_base_url",
        "combo_mind_url",
    }
    assert all(forbidden.isdisjoint(values) for values in definitions.values())


def test_owner_definitions_fail_closed_when_a_required_illustration_is_missing():
    incomplete = dict(ASSET_URLS)
    incomplete.pop("animals-v1-rabbit")
    with pytest.raises(OwnerConflict, match="animals-v1-rabbit"):
        build_missing_owner_definitions(incomplete)
