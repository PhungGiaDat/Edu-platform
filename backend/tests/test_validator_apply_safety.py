"""Regression tests for the ar_objects validator apply path.

The bugs these tests pin down (per audit on 2026-08-08):

1. The CLI used to ``collMod`` the collection with an empty ``validator={}``
   as a "readback" step. That call clears the validator entirely; a script
   that calls it can claim SUCCESS while silently removing enforcement.
2. ``create_index`` failures were swallowed and never propagated; a failed
   index creation was treated as success.
3. The validator readback ignored the just-applied schema and never
   asserted the on-disk state matched the schema we expected to apply.
4. ``MONGO_URL`` was logged in plaintext when opening a Motor connection,
   exposing credentials through CI / Render logs.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"


def _run_cli(*args: str, env: dict[str, str] | None = None):
    """Invoke the validator CLI in-process and capture (rc, stdout, stderr).

    We deliberately do not need a live MongoDB connection here — the tests
    use a fake Motor client to drive the apply path.
    """
    import os
    import subprocess

    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)

    return subprocess.run(
        [sys.executable, "-m", "database.migrations.apply_ar_objects_validator", *args],
        capture_output=True,
        text=True,
        cwd=str(BACKEND_ROOT),
        env=merged_env,
        check=False,
    )


def test_dry_run_is_unaffected_and_exits_zero(tmp_path):
    out = _run_cli("--action", "warn")
    assert out.returncode == 0, out.stderr
    plan = json.loads(out.stdout)
    assert plan["validator"]["validationAction"] == "warn"
    assert plan["validator"]["collMod"] == "ar_objects"
    assert plan["index"]["options"]["unique"] is True


def test_apply_path_verifies_validator_was_not_removed_by_readback(monkeypatch):
    """Readback MUST inspect the on-disk validator without re-collMod-ing it.

    Bug: the apply path ran ``collMod(..., validator={})`` as a "readback"
    step. That call removes enforcement; a SUCCESS message followed a
    destruction of the rule we just installed. The readback must use a
    listCollections / collStats style inspection, never collMod with an
    empty validator.
    """

    captured_collmod_calls: list[dict] = []

    class _FakeCommandCursor:
        def __aiter__(self):
            return self

        async def __anext__(self):
            raise StopAsyncIteration

        async def to_list(self, length=None):
            return [
                {
                    "name": "ar_objects",
                    "options": {
                        "validator": {
                            "$jsonSchema": {
                                "required": ["tracking_mode"],
                                "oneOf": [],
                            }
                        },
                        "validationLevel": "moderate",
                        "validationAction": "warn",
                    },
                }
            ]

    class _FakeAggregateCursor:
        def __init__(self, rows):
            self._rows = list(rows)

        async def to_list(self, length=None):
            return list(self._rows)

    class _FakeCollection:
        def __init__(self):
            self.duplicate_rows = []

        def aggregate(self, _pipeline):
            return _FakeAggregateCursor(self.duplicate_rows)

        async def index_information(self):
            return {
                "ar_objects_catalog_pair_unique": {"name": "ar_objects_catalog_pair_unique"}
            }

        async def create_index(self, _keys, **_kwargs):
            return "ar_objects_catalog_pair_unique"

    class _FakeDatabase:
        def __init__(self):
            self.collection = _FakeCollection()

        async def command(self, command_doc):
            captured_collmod_calls.append(command_doc)
            if "listCollections" in command_doc:
                cursor = _FakeCommandCursor()
                cursor.next = lambda: {
                    "name": "ar_objects",
                    "options": {
                        "validator": {
                            "$jsonSchema": {
                                "required": ["tracking_mode"],
                                "oneOf": [],
                            }
                        },
                        "validationLevel": "moderate",
                        "validationAction": "warn",
                    },
                }
                return cursor
            return {}

        def __getitem__(self, name):
            assert name == "ar_objects"
            return self.collection

    class _FakeClient:
        def __init__(self, *_args, **_kwargs):
            self.admin = _FakeDatabase()
            self.db = _FakeDatabase()

        async def server_info(self):
            return {}

        def close(self):
            pass

        def __getitem__(self, _name):
            return self.db

    fake_admin_ping = {"calls": 0}

    async def _fake_admin_ping(self):
        fake_admin_ping["calls"] += 1
        return {}

    monkeypatch.setattr("motor.motor_asyncio.AsyncIOMotorClient", _FakeClient)
    monkeypatch.setattr(
        "database.migrations.apply_ar_objects_validator.AsyncIOMotorClient", _FakeClient
    )

    from database.migrations import apply_ar_objects_validator as validator_mod

    monkeypatch.setattr(validator_mod, "AsyncIOMotorClient", _FakeClient)

    rc = validator_mod.main(
        [
            "--apply",
            "--expected-db",
            "test_eduplatform",
            "--action",
            "warn",
        ]
    )
    assert rc == 0

    # No call may use an empty validator (the original bug) — and no call
    # after the initial collMod may re-issue a collMod.
    collmod_calls = [
        c for c in captured_collmod_calls if isinstance(c, dict) and "collMod" in c
    ]
    assert len(collmod_calls) == 1, (
        "apply path must only collMod once — the install. Found: "
        f"{collmod_calls}"
    )
    first = collmod_calls[0]
    assert first["validator"] != {}, (
        "collMod install payload must include a non-empty validator"
    )


def test_apply_path_propagates_create_index_failure(monkeypatch, capsys):
    """A failed create_index MUST cause the script to exit non-zero.

    Bug: the original code caught create_index exceptions and logged a
    "note" then continued to verification. A script that silently swallows
    index-creation failure is worse than no script — it makes a partial
    state look like SUCCESS.
    """

    class _FakeAggregateCursor:
        def __init__(self, rows):
            self._rows = list(rows)

        async def to_list(self, length=None):
            return list(self._rows)

    class _FakeCollection:
        def __init__(self):
            self.duplicate_rows = []

        def aggregate(self, _pipeline):
            return _FakeAggregateCursor(self.duplicate_rows)

        async def index_information(self):
            return {}

        async def create_index(self, _keys, **_kwargs):
            raise RuntimeError("synthetic index failure")

    class _FakeDatabase:
        def __init__(self):
            self.collection = _FakeCollection()

        async def command(self, _command_doc):
            return {}

        def __getitem__(self, name):
            assert name == "ar_objects"
            return self.collection

    class _FakeClient:
        def __init__(self, *_args, **_kwargs):
            self.admin = _FakeDatabase()
            self.db = _FakeDatabase()

        async def server_info(self):
            return {}

        def close(self):
            pass

        def __getitem__(self, _name):
            return self.db

    from database.migrations import apply_ar_objects_validator as validator_mod

    monkeypatch.setattr(validator_mod, "AsyncIOMotorClient", _FakeClient)

    rc = validator_mod.main(
        [
            "--apply",
            "--expected-db",
            "test_eduplatform",
            "--action",
            "warn",
        ]
    )
    captured = capsys.readouterr()
    assert rc != 0
    assert "synthetic index failure" in captured.err


def test_apply_path_redacts_mongo_url_in_logs(monkeypatch, capsys):
    """``MONGO_URL`` contains credentials; logs must never contain the URL.

    Bug: both validator and repair printed ``f"connecting to {mongo_url}"``
    verbatim. CI logs and Render deploy logs would capture the URL with
    the embedded username and password. The fix redacts username:password
    while still printing host, db, and driver diagnostics.
    """

    class _FakeAggregateCursor:
        def __init__(self, rows):
            self._rows = list(rows)

        async def to_list(self, length=None):
            return list(self._rows)

    class _FakeCollection:
        def __init__(self):
            self.duplicate_rows = []

        def aggregate(self, _pipeline):
            return _FakeAggregateCursor(self.duplicate_rows)

        async def index_information(self):
            return {
                "ar_objects_catalog_pair_unique": {"name": "ar_objects_catalog_pair_unique"}
            }

        async def create_index(self, _keys, **_kwargs):
            return "ar_objects_catalog_pair_unique"

        async def create_index(self, _keys, **_kwargs):
            return "ar_objects_catalog_pair_unique"

    class _FakeDatabase:
        def __init__(self):
            self.collection = _FakeCollection()

        async def command(self, command_doc):
            if isinstance(command_doc, dict) and "listCollections" in command_doc:
                class _Cursor:
                    async def to_list(self, length=None):
                        return [
                            {
                                "name": "ar_objects",
                                "options": {
                                    "validator": {"$jsonSchema": {"required": ["tracking_mode"]}},
                                    "validationLevel": "moderate",
                                    "validationAction": "warn",
                                },
                            }
                        ]

                    def __aiter__(self):
                        return self

                    async def __anext__(self):
                        raise StopAsyncIteration

                    def next(self):
                        return {
                            "name": "ar_objects",
                            "options": {
                                "validator": {"$jsonSchema": {"required": ["tracking_mode"]}},
                                "validationLevel": "moderate",
                                "validationAction": "warn",
                            },
                        }

                return _Cursor()
            return {}

        def __getitem__(self, name):
            assert name == "ar_objects"
            return self.collection

    class _FakeClient:
        def __init__(self, *_args, **_kwargs):
            self.admin = _FakeDatabase()
            self.db = _FakeDatabase()

        async def server_info(self):
            return {}

        def close(self):
            pass

        def __getitem__(self, _name):
            return self.db

    from database.migrations import apply_ar_objects_validator as validator_mod

    monkeypatch.setattr(validator_mod, "AsyncIOMotorClient", _FakeClient)

    secret_url = (
        "mongodb+srv://prod_user:hunter2@cluster0.example.net/"
        "edu-platform?retryWrites=true&w=majority"
    )
    monkeypatch.setenv("MONGO_URL", secret_url)

    rc = validator_mod.main(
        [
            "--apply",
            "--expected-db",
            "test_eduplatform",
            "--action",
            "warn",
        ]
    )
    captured = capsys.readouterr()
    combined = captured.out + captured.err

    assert rc == 0
    assert "hunter2" not in combined, "password must never be logged"
    assert "prod_user:hunter2" not in combined, "user:password must never be logged"
    assert secret_url not in combined, "full connection string must never be logged"


def test_redact_mongo_url_strips_credentials():
    from database.migrations.apply_ar_objects_validator import _redact_mongo_url

    assert (
        _redact_mongo_url("mongodb+srv://prod_user:hunter2@cluster0.example.net/db")
        == "mongodb+srv://***@cluster0.example.net/db"
    )
    assert _redact_mongo_url("not-a-url") == "not-a-url"


def test_apply_path_detects_validator_wiped_after_collmod(monkeypatch, capsys):
    """After collMod succeeds, the post-state MUST still have a validator.

    Companion to ``test_apply_path_verifies_validator_was_not_removed_by_readback``.
    That test pins down "no destructive collMod"; this one pins down
    "the post-apply readback detects a missing validator and fails loudly
    instead of reporting SUCCESS".

    Bug shape: a future refactor could replace the readback with a
    success-only branch (e.g., ``except: pass``) that returns 0 even
    when ``listCollections`` reports ``validator is None``. The original
    audit flagged exactly this risk category — a script that returns 0
    without enforcing anything.
    """

    class _FakeAggregateCursor:
        def __init__(self, rows):
            self._rows = list(rows)

        async def to_list(self, length=None):
            return list(self._rows)

    class _FakeCollection:
        def __init__(self):
            self.duplicate_rows = []

        def aggregate(self, _pipeline):
            return _FakeAggregateCursor(self.duplicate_rows)

        async def index_information(self):
            return {
                "ar_objects_catalog_pair_unique": {"name": "ar_objects_catalog_pair_unique"}
            }

        async def create_index(self, _keys, **_kwargs):
            return "ar_objects_catalog_pair_unique"

    class _WipedValidatorCursor:
        """Simulates a database where the validator is gone after collMod.

        Real-world causes this models:
        * A separate operator ran ``db.command({"collMod": ..., "validator": {}})``
          between our collMod and our readback.
        * A bad replica promotion that lost the collMod metadata.
        * A bug in our own code path that wipes the rule we just set.
        """

        async def to_list(self, length=None):
            return [
                {
                    "name": "ar_objects",
                    "options": {
                        # No ``validator`` key at all — the worst case.
                        "validationLevel": "moderate",
                        "validationAction": "warn",
                    },
                }
            ]

        def __aiter__(self):
            return self

        async def __anext__(self):
            raise StopAsyncIteration

    class _FakeDatabase:
        def __init__(self):
            self.collection = _FakeCollection()

        async def command(self, command_doc):
            if isinstance(command_doc, dict) and "listCollections" in command_doc:
                return _WipedValidatorCursor()
            return {}

        def __getitem__(self, name):
            assert name == "ar_objects"
            return self.collection

    class _FakeClient:
        def __init__(self, *_args, **_kwargs):
            self.admin = _FakeDatabase()
            self.db = _FakeDatabase()

        async def server_info(self):
            return {}

        def close(self):
            pass

        def __getitem__(self, _name):
            return self.db

    from database.migrations import apply_ar_objects_validator as validator_mod

    monkeypatch.setattr(validator_mod, "AsyncIOMotorClient", _FakeClient)

    rc = validator_mod.main(
        [
            "--apply",
            "--expected-db",
            "test_eduplatform",
            "--action",
            "warn",
        ]
    )
    captured = capsys.readouterr()
    assert rc != 0, (
        "apply MUST exit non-zero when post-state shows no validator; "
        "a 0 exit would falsely advertise enforcement."
    )
    assert "post-apply validator metadata missing" in captured.err, (
        "error message must explain that the validator is gone — "
        "an operator reading logs needs the reason to debug"
    )
    assert "SUCCESS" not in captured.err, (
        "the wiped-validator path must not log SUCCESS — that wording "
        "implies enforcement is active"
    )


def test_apply_action_error_requires_audit_invalid_count_zero():
    """The strict-serializer gate must be enforced before any DB mutation.

    Without --audit-invalid-count=0, the CLI must refuse to promote the
    validator to ``validationAction=error``. This guards Item #5 of the
    migration plan: a strict serializer must only be turned on after a
    fresh audit reports zero invalid documents.

    Three cases:
        1. ``--action=error`` without ``--audit-invalid-count`` → exit 2.
        2. ``--action=error --audit-invalid-count=3`` → exit 2 (non-zero audit).
        3. ``--action=error --audit-invalid-count=0`` → passes the gate
           (does not assert rc=0; would need a live MongoDB. We only assert
           the gate accepts the input.)
    """
    # Case 1: missing audit-invalid-count
    out = _run_cli(
        "--apply",
        "--expected-db",
        "test_eduplatform",
        "--action",
        "error",
    )
    assert out.returncode == 2, (
        "missing --audit-invalid-count must exit 2 (CLI usage error); "
        f"got rc={out.returncode}, stderr={out.stderr!r}"
    )
    assert "--audit-invalid-count" in out.stderr, (
        "error message must name the missing flag so the operator knows "
        "what to add"
    )

    # Case 2: non-zero audit count
    out = _run_cli(
        "--apply",
        "--expected-db",
        "test_eduplatform",
        "--action",
        "error",
        "--audit-invalid-count",
        "3",
    )
    assert out.returncode == 2, (
        "non-zero audit-invalid-count must exit 2 (refusal); "
        f"got rc={out.returncode}, stderr={out.stderr!r}"
    )
    assert "audit invalid count is 3" in out.stderr, (
        "error message must echo the offending count so the operator "
        "can verify the audit ran correctly"
    )
    assert "run repair first" in out.stderr, (
        "error message must tell the operator what to do next — "
        "run repair before retrying"
    )

    # Case 3: gate accepts audit-invalid-count=0 (the happy path)
    # We do NOT assert rc=0 here because the CLI would proceed to open a
    # Motor connection which will fail without a real MongoDB. We assert
    # the gate message does NOT appear, which proves the gate passed.
    out = _run_cli(
        "--apply",
        "--expected-db",
        "test_eduplatform",
        "--action",
        "error",
        "--audit-invalid-count",
        "0",
    )
    combined = out.stdout + out.stderr
    assert "audit invalid count" not in combined, (
        "with --audit-invalid-count=0 the gate must pass and the gate "
        "refusal message must NOT appear"
    )
    assert "--audit-invalid-count" not in combined or "requires" not in combined, (
        "the missing-flag refusal message must NOT appear when the flag "
        "is provided with value 0"
    )
