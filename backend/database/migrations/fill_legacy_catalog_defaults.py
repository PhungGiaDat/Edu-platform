"""Fill in legacy catalog defaults for AR object seeds that predate the Shared-Mind plan.

Run from the backend directory:

    python scripts/fill_legacy_catalog_defaults.py

The script mutates ``database/seed/ar_objects.json`` in place. Rows that
already have ``mind_catalog_id`` and ``mind_target_index`` (e.g. the
``animals-v2`` catalog rows) are left untouched. Every other row is
tagged with catalog ``legacy-singletons`` and a stable
``mind_target_index`` derived from the row order so each marker stays
unique inside the placeholder catalog.

This is intentionally a one-shot editor, not an idempotent migration —
re-running it after the catalog pair is already set is a no-op.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

LEGACY_CATALOG_ID = "legacy-singletons"
SEED_PATH = Path(__file__).resolve().parents[1] / "seed" / "ar_objects.json"


def main() -> int:
    if not SEED_PATH.exists():
        print(f"[fill_legacy_catalog_defaults] missing seed file: {SEED_PATH}")
        return 1

    documents = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    seen_indices: set[int] = set()

    for document in documents:
        if "mind_catalog_id" in document and "mind_target_index" in document:
            continue

        index = 0
        while index in seen_indices:
            index += 1
        seen_indices.add(index)

        document["mind_catalog_id"] = LEGACY_CATALOG_ID
        document["mind_target_index"] = index

    SEED_PATH.write_text(
        json.dumps(documents, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"[fill_legacy_catalog_defaults] wrote {SEED_PATH} "
        f"({len(documents)} rows, catalog={LEGACY_CATALOG_ID})"
    )
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    sys.exit(main())
