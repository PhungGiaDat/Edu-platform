"""Safely validate or explicitly ingest the audited animal RAG dataset."""

from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path
import sys
from typing import Sequence


def load_animal_dataset(dataset_root: Path):
    """Load the standalone validator without triggering eager service imports."""
    module_path = Path(__file__).resolve().parents[1] / "services" / "animal_rag_dataset.py"
    spec = importlib.util.spec_from_file_location("_animal_rag_dataset", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("animal dataset validator is unavailable")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.load_animal_dataset(dataset_root)


def _parse_args(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate the animal RAG dataset, or explicitly ingest it into Qdrant."
    )
    parser.add_argument("--dataset-path", type=Path, required=True)
    parser.add_argument("--apply", action="store_true", help="Upload only after local validation succeeds.")
    return parser.parse_args(argv)


def _new_qdrant_service():
    """Import Qdrant only for explicit live application."""
    from services.qdrant_rag_service import QdrantRAGService

    return QdrantRAGService()


def main(argv: Sequence[str] | None = None) -> int:
    """Validate offline by default; contact Qdrant only with ``--apply``."""
    args = _parse_args(argv)
    documents = load_animal_dataset(args.dataset_path.resolve())
    if not args.apply:
        print(f"Dry run validated {len(documents)} documents")
        return 0

    from services.qdrant_rag_service import QdrantRAGUnavailable

    try:
        service = _new_qdrant_service()
        service.ensure_collection()
        service.upsert_documents(documents)
        service.verify_document_ids([document.point_id for document in documents])
    except QdrantRAGUnavailable as exc:
        print(str(exc), file=sys.stderr)
        return 1
    from settings import settings

    print(f"Applied {len(documents)} documents to {settings.QDRANT_COLLECTION}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
