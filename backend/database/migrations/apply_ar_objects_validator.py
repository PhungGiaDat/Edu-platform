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
import json
import os
import re
import sys
from typing import Any, Mapping

import motor.motor_asyncio
import certifi  # noqa: F401  (re-exported for tests that patch ``certifi.where``)

# Module-level aliases so tests can monkeypatch the constructor used by
# ``_run_apply``. Aliasing here (rather than inside ``main``) keeps the
# dependency-injection seam stable across refactors.
AsyncIOMotorClient = motor.motor_asyncio.AsyncIOMotorClient


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


def _redact_mongo_url(url: str | None) -> str:
    """Return ``url`` with any embedded credentials stripped.

    MongoDB connection strings embed the username and password directly
    after ``://`` (``mongodb://user:pass@host`` or
    ``mongodb+srv://user:pass@host``). Logging the URL verbatim leaks
    secrets into CI/Render logs; this helper keeps the scheme and host so
    operators can still see which cluster was targeted.
    """
    if not url:
        return "<unset>"
    match = re.match(r"^(?P<scheme>[a-zA-Z][a-zA-Z0-9+.\-]*)://(?P<rest>.*)$", url)
    if not match:
        return url
    rest = match.group("rest")
    # Strip user:password@ prefix if present, keep host/db/query.
    credentials_end = rest.find("@")
    if credentials_end == -1:
        return url
    return f"{match.group('scheme')}://***@{rest[credentials_end + 1:]}"


def _print_plan(command: Mapping[str, Any], index_keys, index_options) -> None:
    plan = {
        "validator": command,
        "index": {"keys": index_keys, "options": index_options},
    }
    sys.stdout.write(json.dumps(plan, indent=2, sort_keys=True))
    sys.stdout.write("\n")


async def _fetch_validator_metadata(db) -> tuple[dict | None, str | None]:
    """Read the live validator/validationAction without mutating anything.

    The original "readback" called ``db.command({"collMod": ..., "validator": {}})``
    which actually clears the rule we just installed. The safe equivalent
    is to read the collection options via the official ``listCollections``
    helper. We support two equivalent shapes so the function works against
    any of:

    * ``db.list_collections(filter={"name": "ar_objects"})`` — the
      recommended Motor helper, which returns a CommandCursor. Only
      ``to_list`` and ``__aiter__`` are needed; both are part of the
      public cursor protocol.
    * ``db.command({"listCollections": 1, "filter": ...})`` — the raw
      command. PyMongo/Motor return a plain ``dict`` (the wire reply);
      we unpack ``firstBatch`` directly. This branch is the production
      truth and the previous ``hasattr`` ladder masked the
      "listCollections wire reply is a dict" fact, which made the
      helper crash on the very first production call.

    Both paths feed the same ``rows`` list, which is then mapped to the
    MongoDB wire shape ``{name, options: {validator, validationAction}}``.
    """
    rows: list[Mapping[str, Any]] = []
    if hasattr(db, "list_collections"):
        # Preferred Motor helper. ``list_collections`` is synchronous; it
        # returns a cursor; only ``to_list`` awaits.
        cursor = db.list_collections(filter={"name": "ar_objects"})
        if hasattr(cursor, "to_list"):
            rows = await cursor.to_list(length=1)
        else:
            async for row in cursor:  # pragma: no cover - defensive
                rows.append(row)
                if len(rows) >= 1:
                    break
    else:  # pragma: no cover - alternate path used by some fakes/tests
        reply = await db.command({"listCollections": 1, "filter": {"name": "ar_objects"}})
        if isinstance(reply, Mapping):
            first_batch = reply.get("cursor", {}).get("firstBatch") if isinstance(reply.get("cursor"), Mapping) else None
            if isinstance(first_batch, list):
                rows = first_batch[:1]
    if not rows:
        return None, "collection ar_objects not found"
    options = (rows[0] or {}).get("options") or {}
    validator = options.get("validator")
    action = options.get("validationAction")
    return validator, action


async def _run_apply(
    *,
    mongo_url: str,
    expected_db: str,
    command: Mapping[str, Any],
    index_keys: list[tuple[str, int]],
    index_options: dict[str, Any],
) -> int:
    client = AsyncIOMotorClient(
        mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
    )
    try:
        try:
            await client.admin.command("ping")
        except Exception as exc:
            sys.stderr.write(f"[validator] connection failed: {exc}\n")
            return 1

        db = client[expected_db]
        coll = db["ar_objects"]
        action = command.get("validationAction", "warn")
        sys.stderr.write(
            f"[validator] connecting to {_redact_mongo_url(mongo_url)} / {expected_db} "
            f"(action={action})\n"
        )

        # 1. Install the validator exactly once. NEVER collMod with an empty
        # validator — that wipes the rule we just installed.
        sys.stderr.write(f"[validator] applying collMod action={action}\n")
        try:
            await db.command(command)
        except Exception as exc:
            sys.stderr.write(f"[validator] collMod FAILED: {exc}\n")
            return 1
        sys.stderr.write("[validator] collMod applied successfully\n")

        # 2. Guard against duplicates that would block the partial unique index.
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
            cursor = coll.aggregate(dup_pipeline)
            duplicates = await cursor.to_list(length=None)
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

        # 3. Install the partial unique index. Errors propagate (no swallow).
        idx_name = index_options.get("name", "unknown")
        try:
            await coll.create_index(index_keys, **index_options)
        except Exception as exc:
            sys.stderr.write(f"[validator] create_index FAILED: {exc}\n")
            return 1
        sys.stderr.write(
            f"[validator] index {idx_name!r} created or already exists\n"
        )

        # 4. Verify state by reading collection options. NO collMod with empty
        # validator — that destroys what we just installed.
        try:
            installed_validator, installed_action = await _fetch_validator_metadata(db)
        except Exception as exc:
            sys.stderr.write(f"[validator] WARNING: could not read validator: {exc}\n")
            installed_validator = None
            installed_action = None

        if installed_validator is None:
            sys.stderr.write(
                f"[validator] ERROR: post-apply validator metadata missing — "
                f"the rule may not have been installed. Aborting.\n"
            )
            return 1
        sys.stderr.write(
            f"[validator] verified: validationAction={installed_action!r} "
            f"schemaKeys={sorted((installed_validator.get('$jsonSchema') or {}).keys())}\n"
        )

        try:
            indexes = await coll.index_information()
            idx_names = [v["name"] for v in indexes.values()]
            if idx_name in idx_names:
                sys.stderr.write(
                    f"[validator] verified: index {idx_name!r} exists in {idx_names}\n"
                )
            else:
                sys.stderr.write(
                    f"[validator] ERROR: index {idx_name!r} not found in {idx_names}\n"
                )
                return 1
        except Exception as exc:
            sys.stderr.write(
                f"[validator] WARNING: could not list indexes: {exc}\n"
            )

        sys.stderr.write(
            f"[validator] SUCCESS: validator={installed_action} "
            f"index={idx_name!r} active on {expected_db}\n"
        )
        return 0
    finally:
        client.close()


def main(argv: list[str] | None = None) -> int:
    import argparse

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
    args = parser.parse_args(argv)

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

    import asyncio

    try:
        return asyncio.run(
            _run_apply(
                mongo_url=mongo_url,
                expected_db=args.expected_db,
                command=command,
                index_keys=index_keys,
                index_options=index_options,
            )
        )
    except Exception as exc:
        sys.stderr.write(f"[validator] FATAL: {exc}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = ["build_index", "build_validator", "main", "_redact_mongo_url"]