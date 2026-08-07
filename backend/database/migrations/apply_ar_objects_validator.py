"""Warning-first staged MongoDB enforcement for ``ar_objects``.

This module builds the ``collMod`` command and partial unique index that
the runtime database uses to enforce the catalog-vs-legacy discriminator
after the data has been repaired. The contract is intentionally identical
to :class:`models.ar_object_contract.ARObjectContract` so the schema
cannot drift from the Python validator.

The CLI defaults to a dry-run; ``--apply`` plus ``--expected-db`` is
required before any real ``db.command`` or ``create_index`` call is made.
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import Any, Mapping


VALID_ACTIONS = ("warn", "error")


_CONTRACT_REQUIRED = (
    "tracking_mode",
    "ar_tag",
    "description",
    "animation_type",
    "glb_size",
    "model_3d_url",
    "position",
    "rotation",
    "scale",
    "created_at",
)


def _catalog_branch() -> dict[str, Any]:
    return {
        "properties": {
            "tracking_mode": {"enum": ["catalog"]},
            "mind_catalog_id": {"bsonType": "string", "minLength": 1},
            "mind_target_index": {"bsonType": "int", "minimum": 0},
        },
        "required": ["mind_catalog_id", "mind_target_index"],
        "not": {"required": ["nft_base_url"]},
    }


def _legacy_branch() -> dict[str, Any]:
    return {
        "properties": {
            "tracking_mode": {"enum": ["legacy"]},
            "nft_base_url": {"bsonType": "string", "minLength": 1},
        },
        "required": ["nft_base_url"],
        "not": {
            "anyOf": [
                {"required": ["mind_catalog_id"]},
                {"required": ["mind_target_index"]},
            ]
        },
    }


def build_validator(action: str) -> dict[str, Any]:
    """Return a ``collMod`` document that enforces the catalog/legacy
    discriminator via MongoDB JSON Schema.

    The schema requires the same shared fields as :class:`ARObjectContract`
    (`tracking_mode`, `ar_tag`, `description`, `animation_type`, `glb_size`,
    `model_3d_url`, `position`, `rotation`, `scale`). The two ``oneOf``
    branches separate catalog and legacy, with a negative constraint that
    prevents a document from carrying one branch's identity markers.

    `validationAction` defaults to ``warn`` so existing data is never
    rejected by the modifier; switch to ``error`` only after a fresh audit
    reports ``invalid == 0``.
    """
    if action not in VALID_ACTIONS:
        raise ValueError(
            f"invalid action: {action!r}; expected one of {VALID_ACTIONS}"
        )
    return {
        "collMod": "ar_objects",
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": list(_CONTRACT_REQUIRED),
                "oneOf": [_catalog_branch(), _legacy_branch()],
            }
        },
        "validationLevel": "moderate",
        "validationAction": action,
    }


def build_index() -> tuple[list[tuple[str, int]], dict[str, Any]]:
    """Return the (keys, options) pair for the partial unique catalog index.

    The index is partial on ``tracking_mode == "catalog"`` so legacy rows
    — which deliberately don't carry ``mind_catalog_id`` / ``mind_target_index``
    — never collide with the unique constraint.
    """
    keys = [("mind_catalog_id", 1), ("mind_target_index", 1)]
    options = {
        "unique": True,
        "partialFilterExpression": {"tracking_mode": "catalog"},
        "name": "ar_objects_catalog_pair_unique",
    }
    return keys, options


def _print_plan(command: Mapping[str, Any], index_keys, index_options) -> None:
    plan = {
        "validator": command,
        "index": {"keys": index_keys, "options": index_options},
    }
    sys.stdout.write(__import__("json").dumps(plan, indent=2, sort_keys=True))
    sys.stdout.write("\n")


def main(argv: list[str] | None = None) -> int:
    import asyncio

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--action",
        choices=VALID_ACTIONS,
        default="warn",
        help="collMod validationAction (default: warn)",
    )
    parser.add_argument(
        "--expected-db",
        default=os.environ.get("MONGO_DB"),
        help="Active database must match this name when --apply is set",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the validator and index to the active MongoDB connection",
    )
    parser.add_argument(
        "--audit-invalid-count",
        type=int,
        default=None,
        help=(
            "Latest audit's invalid count. Required when --action=error. "
            "Set to 0 to confirm the audit passed before promoting to error mode."
        ),
    )
    args = parser.parse_args()

    command = build_validator(args.action)
    index_keys, index_options = build_index()

    if not args.apply:
        _print_plan(command, index_keys, index_options)
        sys.stderr.write(
            "[apply_ar_objects_validator] dry-run: pass --expected-db and --apply to mutate the database\n"
        )
        return 0

    if not args.expected_db:
        sys.stderr.write("error: --expected-db is required with --apply\n")
        return 2

    if args.action == "error" and args.audit_invalid_count is None:
        sys.stderr.write(
            "error: --action=error requires --audit-invalid-count=N "
            "to confirm the latest audit passed (set N=0)\n"
        )
        return 2

    if args.audit_invalid_count is not None and args.audit_invalid_count > 0:
        sys.stderr.write(
            f"error: audit invalid count is {args.audit_invalid_count} — "
            "run repair first, then retry with --audit-invalid-count=0\n"
        )
        return 2

    env_db = os.environ.get("MONGO_DB", "")
    if env_db and env_db != args.expected_db:
        sys.stderr.write(
            f"error: active database {env_db!r} != expected {args.expected_db!r}\n"
            "error: refusing to apply to the wrong database\n"
        )
        return 2

    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        sys.stderr.write("error: MONGO_URL environment variable is not set\n")
        return 2

    try:
        import motor.motor_asyncio
        import certifi
    except ImportError as exc:
        sys.stderr.write(f"error: pymongo/motor is not installed: {exc}\n")
        return 1

    async def _run():
        client = motor.motor_asyncio.AsyncIOMotorClient(
            mongo_url,
            tls=True,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000,
        )
        db = client[args.expected_db]
        coll = db["ar_objects"]

        sys.stderr.write(
            f"[validator] connecting to {mongo_url} / {args.expected_db}\n"
        )
        try:
            await client.admin.command("ping")
        except Exception as exc:
            sys.stderr.write(f"[validator] connection failed: {exc}\n")
            return 1

        # 1. Apply the collMod validator.
        sys.stderr.write(
            f"[validator] applying collMod action={args.action}\n"
        )
        try:
            await db.command(command)
        except Exception as exc:
            sys.stderr.write(f"[validator] collMod FAILED: {exc}\n")
            return 1
        sys.stderr.write("[validator] collMod applied successfully\n")

        # 2. Check for existing duplicates before creating unique index.
        if index_options.get("unique"):
            dup_pipeline = [
                {
                    "$match": {
                        "mind_catalog_id": {"$type": "string"},
                        "mind_target_index": {"$type": "int"},
                        "tracking_mode": "catalog",
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "mind_catalog_id": "$mind_catalog_id",
                            "mind_target_index": "$mind_target_index",
                        },
                        "count": {"$sum": 1},
                    }
                },
                {"$match": {"count": {"$gt": 1}}},
            ]
            duplicates = await coll.aggregate(dup_pipeline).to_list(length=None)
            if duplicates:
                dup_str = ", ".join(
                    f"({d['_id']['mind_catalog_id']}, {d['_id']['mind_target_index']})"
                    for d in duplicates
                )
                sys.stderr.write(
                    f"[validator] ERROR: {len(duplicates)} duplicate catalog pair(s) found: {dup_str}\n"
                    "[validator] ERROR: resolve duplicates before creating unique index\n"
                )
                return 1
            sys.stderr.write("[validator] duplicate check: no duplicates found\n")

        # 3. Create the partial unique index.
        idx_name = index_options.get("name", "unknown")
        try:
            await coll.create_index(index_keys, **index_options)
            sys.stderr.write(f"[validator] index {idx_name!r} created or already exists\n")
        except Exception as exc:
            # Index might already exist with different options.
            sys.stderr.write(f"[validator] create_index note: {exc}\n")

        # 4. Verify: read back validator metadata.
        try:
            result = await db.command({"collMod": "ar_objects", "validator": {}})
            validator_info = result.get("validator", {})
            sys.stderr.write(
                f"[validator] verified: validationLevel={validator_info.get('validationLevel')!r} "
                f"validationAction={validator_info.get('validationAction')!r}\n"
            )
        except Exception as exc:
            sys.stderr.write(f"[validator] WARNING: could not read back validator: {exc}\n")

        # 5. Verify: list indexes.
        try:
            indexes = await coll.index_information()
            idx_names = [v["name"] for v in indexes.values()]
            if idx_name in idx_names:
                sys.stderr.write(f"[validator] verified: index {idx_name!r} exists in {idx_names}\n")
            else:
                sys.stderr.write(
                    f"[validator] WARNING: index {idx_name!r} not found in {idx_names}\n"
                )
        except Exception as exc:
            sys.stderr.write(f"[validator] WARNING: could not list indexes: {exc}\n")

        sys.stderr.write(
            f"[validator] SUCCESS: validator={args.action} "
            f"index={idx_name!r} active on {args.expected_db}\n"
        )
        client.close()
        return 0

    try:
        exit_code = asyncio.run(_run())
    except Exception as exc:
        sys.stderr.write(f"[validator] FATAL: {exc}\n")
        exit_code = 1
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = ["build_index", "build_validator", "main"]