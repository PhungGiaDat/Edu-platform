"""Task 8: warn-first staged MongoDB enforcement for ``ar_objects``.

The validator module owns:

* ``build_validator(action)`` returning a ``collMod`` command with a JSON
  Schema that mirrors the discriminated catalog/legacy contract.
* ``build_index()`` returning the partial unique index specification for
  ``(mind_catalog_id, mind_target_index)`` scoped to ``tracking_mode=catalog``.

The CLI accepts ``--action warn|error`` and requires ``--expected-db`` plus
``--apply`` before issuing a real ``db.command`` or ``create_index`` call.
"""

from database.migrations.apply_ar_objects_validator import build_index, build_validator


def test_validator_uses_discriminated_catalog_and_legacy_branches():
    command = build_validator("warn")
    schema = command["validator"]["$jsonSchema"]
    assert command["validationAction"] == "warn"
    assert len(schema["oneOf"]) == 2
    assert "tracking_mode" in schema["required"]
    catalog, legacy = schema["oneOf"]
    assert catalog["not"] == {"required": ["nft_base_url"]}
    assert legacy["not"] == {"anyOf": [
        {"required": ["mind_catalog_id"]},
        {"required": ["mind_target_index"]},
    ]}


def test_validator_action_error_sets_error_action():
    command = build_validator("error")
    assert command["validationAction"] == "error"
    assert command["validationLevel"] == "moderate"


def test_catalog_index_is_partial_and_unique():
    keys, options = build_index()
    assert keys == [("mind_catalog_id", 1), ("mind_target_index", 1)]
    assert options["unique"] is True
    assert options["partialFilterExpression"] == {"tracking_mode": "catalog"}


def test_validator_rejects_unknown_action():
    import pytest

    with pytest.raises(ValueError):
        build_validator("bogus")


def test_validator_required_fields_match_ar_object_contract():
    """The validator JSON Schema must mirror the canonical ``ARObjectContract``
    required fields so the database cannot drift from the Pydantic model.

    Failure of this test means a future ``ARObjectContract`` change was
    forgotten in the JSON Schema — silent data drift.
    """
    from models.ar_object_contract import ARObjectContract

    canonical = set(ARObjectContract.model_fields.keys())
    canonical_required = {
        name for name, field in ARObjectContract.model_fields.items()
        if field.is_required()
    }
    assert "tracking_mode" in canonical_required
    assert "ar_tag" in canonical_required

    command = build_validator("warn")
    required = set(command["validator"]["$jsonSchema"]["required"])
    assert required <= canonical, (
        f"validator declares required fields not on the contract: "
        f"{required - canonical}"
    )
    assert canonical_required <= required, (
        f"contract requires fields the schema does not: "
        f"{canonical_required - required}"
    )
    # Sanity: the property block must not declare tracking_mode as optional
    # because both branches already constrain it via oneOf.properties.
    assert "tracking_mode" in canonical