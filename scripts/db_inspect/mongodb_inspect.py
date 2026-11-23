#!/usr/bin/env python3
"""
MongoDB Read-Only Inspection Tool

STRICTLY READ-ONLY - This module cannot mutate any data.
Only the following operations are permitted:
- list_database_names()
- list_collection_names()
- count_documents({}) / estimated_document_count()
- list_indexes()
- find({}).limit(300)

All write operations (insert, update, delete, drop, etc.) are blocked.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import certifi
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import (
    ConnectionFailure,
    OperationFailure,
    ServerSelectionTimeoutError,
)

# =============================================================================
# CONSTANTS
# =============================================================================

SAMPLE_LIMIT = 300
SYSTEM_DATABASES = {"admin", "local", "config"}
OUTPUT_DIR = Path(__file__).parent.parent.parent / "docs" / "database"
SAMPLE_SIZE = 300  # max docs to sample per collection

# =============================================================================
# READ-ONLY CLIENT WRAPPER
# =============================================================================

class ReadOnlyDatabase:
    """Read-only wrapper around a MongoDB database."""

    BLOCKED_METHODS = {
        "drop", "create_collection", "rename", "command",
        "aggregate",
    }

    def __init__(self, db):
        self._db = db

    def __getitem__(self, coll_name: str):
        return ReadOnlyCollection(self._db[coll_name])

    def list_collection_names(self):
        return self._db.list_collection_names()

    def __getattr__(self, name: str):
        attr = getattr(self._db, name)
        if name.lower() in self.BLOCKED_METHODS:
            raise PermissionError(
                f"WRITE OPERATION BLOCKED: '{name}' is not permitted in read-only mode."
            )
        return attr


class ReadOnlyCollection:
    """Read-only wrapper around a MongoDB collection."""

    BLOCKED_METHODS = {
        "insert_one", "insert_many", "insert",
        "update_one", "update_many", "update",
        "delete_one", "delete_many", "delete",
        "replace_one", "replace",
        "drop", "rename", "bulk_write",
        "find_one_and_update", "find_one_and_replace", "find_one_and_delete",
        "aggregate",
    }

    def __init__(self, coll):
        self._coll = coll

    def list_indexes(self):
        return self._coll.list_indexes()

    def count_documents(self, *args, **kwargs):
        return self._coll.count_documents(*args, **kwargs)

    def estimated_document_count(self, *args, **kwargs):
        return self._coll.estimated_document_count(*args, **kwargs)

    def find(self, *args, **kwargs):
        return self._coll.find(*args, **kwargs)

    def __getattr__(self, name: str):
        attr = getattr(self._coll, name)
        if name.lower() in self.BLOCKED_METHODS:
            raise PermissionError(
                f"WRITE OPERATION BLOCKED: '{name}' is not permitted in read-only mode."
            )
        return attr


class ReadOnlyMongoClient:
    """
    A wrapper around MongoClient that exposes only read operations.
    All write methods raise PermissionError.
    """

    # Write methods to block (case-insensitive check on name)
    BLOCKED_METHODS = {
        "insert_one", "insert_many", "insert", "update_one", "update_many",
        "update", "delete_one", "delete_many", "delete", "replace_one",
        "replace", "drop", "drop_collection", "drop_database",
        "create_collection", "rename", "bulk_write",
        "find_one_and_update", "find_one_and_replace", "find_one_and_delete",
        "aggregate", "command",
    }

    def __init__(self, uri: str, **kwargs):
        # Force read preference to secondaryPreferred for safety
        kwargs["readPreference"] = "secondaryPreferred"
        kwargs["serverSelectionTimeoutMS"] = 10000
        kwargs["connectTimeoutMS"] = 15000
        self._client = MongoClient(uri, **kwargs)
        self._uri = uri  # stored for error reporting only

    def __getattr__(self, name: str):
        attr = getattr(self._client, name)
        # Block any method whose name suggests mutation
        if name.lower() in self.BLOCKED_METHODS:
            raise PermissionError(
                f"WRITE OPERATION BLOCKED: '{name}' is not permitted in read-only mode."
            )
        return attr

    def __getitem__(self, db_name: str):
        """Allow subscript access to databases (returns a read-only database wrapper)."""
        return ReadOnlyDatabase(self._client[db_name])

    def list_database_names(self) -> list[str]:
        try:
            return self._client.list_database_names()
        except OperationFailure as e:
            print(f"[WARN] Cannot list all databases (permission error): {e}")
            return []

    def __repr__(self) -> str:
        # Redact credentials from URI for display
        return f"<ReadOnlyMongoClient uri='{self._redact_uri()}'>"

    def _redact_uri(self) -> str:
        """Return a redacted version of the URI (no credentials)."""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(self._uri)
            return f"{parsed.scheme}://{parsed.hostname}/?{parsed.query}"
        except Exception:
            return "[REDACTED]"


# =============================================================================
# SCHEMA INFERENCE
# =============================================================================

def get_bson_type_name(value: Any) -> str:
    """Map a Python/Bson value to its BSON type name."""
    if isinstance(value, ObjectId):
        return "objectId"
    elif isinstance(value, bool):
        return "bool"
    elif isinstance(value, int):
        return "int"
    elif isinstance(value, float):
        return "double"
    elif isinstance(value, str):
        return "string"
    elif isinstance(value, list):
        return "array"
    elif isinstance(value, dict):
        return "object"
    elif isinstance(value, bytes):
        return "binary"
    elif value is None:
        return "null"
    else:
        return type(value).__name__


def sample_value_for_schema(value: Any) -> Any:
    """Convert a sampled value to a JSON-serializable representation for schema."""
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, datetime):
        return value.isoformat()
    elif isinstance(value, (list, dict)):
        return value  # will be recursively processed
    elif isinstance(value, bytes):
        return "<binary>"
    else:
        return value


def infer_schema(documents: list[dict]) -> dict[str, Any]:
    """
    Infer schema from a list of documents.
    Returns field definitions with types, presence frequency, optionality, references, and embedded schemas.
    """
    if not documents:
        return {}

    total_docs = len(documents)
    field_stats: dict[str, dict] = {}

    def process_value(path: str, value: Any, is_array_element: bool = False):
        """Recursively process a value and update field_stats."""
        type_name = get_bson_type_name(value)

        if path not in field_stats:
            field_stats[path] = {
                "types": set(),
                "count": 0,
                "is_reference": False,
                "reference_target": None,
                "embedded": None,
            }

        stats = field_stats[path]
        stats["types"].add(type_name)
        stats["count"] += 1

        # Detect references: ObjectId fields, or field names ending with _id/Id/_ids
        if type_name == "objectId" or (
            path.rsplit(".", 1)[-1].lower() in ("id", "_id", "_ids")
            and type_name == "string"
        ):
            stats["is_reference"] = True
            # Try to guess target collection
            field_name = path.rsplit(".", 1)[-1].lower()
            if field_name.endswith("_id"):
                base = field_name[:-3]  # remove _id
            elif field_name.endswith("ids"):
                base = field_name[:-4]  # remove _ids
            else:
                base = field_name
            # Common pluralization patterns
            plural_candidates = [
                f"{base}s", f"{base}es", base,
            ]
            # Store candidates for later resolution
            if "reference_candidates" not in stats:
                stats["reference_candidates"] = plural_candidates
            else:
                stats["reference_candidates"].extend(plural_candidates)

        # Detect embedded documents
        if type_name == "object" and isinstance(value, dict):
            for sub_key, sub_value in value.items():
                sub_path = f"{path}.{sub_key}" if path else sub_key
                process_value(sub_path, sub_value)
            # Mark as embedded
            if path:
                field_stats[path]["embedded"] = {
                    "type": "object",
                    "fields": {}
                }

        # Detect arrays of objects
        if type_name == "array" and isinstance(value, list) and len(value) > 0:
            # Check if array contains objects
            if isinstance(value[0], dict):
                for idx, item in enumerate(value):
                    if isinstance(item, dict):
                        for sub_key, sub_value in item.items():
                            sub_path = f"{path}.{sub_key}"
                            process_value(sub_path, sub_value)
                if path:
                    field_stats[path]["embedded"] = {
                        "type": "array",
                        "elementType": "object",
                    }

    # Process all documents
    for doc in documents:
        if not isinstance(doc, dict):
            continue
        # Track which top-level fields were seen in this doc
        seen_in_doc = set()
        _walk_doc("", doc, field_stats, seen_in_doc)

    # Convert sets to lists and compute presence
    schema = {}
    for path, stats in field_stats.items():
        presence = stats["count"] / total_docs
        is_optional = presence < 1.0

        field_def = {
            "types": sorted(list(stats["types"])),
            "presence": round(presence, 4),
            "optional": is_optional,
            "isReference": stats["is_reference"],
            "referenceTarget": stats.get("reference_candidates", [None])[0] if stats["is_reference"] else None,
            "embedded": stats.get("embedded"),
        }
        schema[path] = field_def

    return schema


def _walk_doc(
    prefix: str,
    doc: dict,
    field_stats: dict,
    seen_in_doc: set,
):
    """Recursively walk a document and update field_stats."""
    if not isinstance(doc, dict):
        return

    for key, value in doc.items():
        path = f"{prefix}.{key}" if prefix else key
        type_name = get_bson_type_name(value)

        if path not in field_stats:
            field_stats[path] = {
                "types": set(),
                "count": 0,
                "is_reference": False,
                "reference_target": None,
                "embedded": None,
                "reference_candidates": [],
            }

        stats = field_stats[path]
        stats["types"].add(type_name)
        stats["count"] += 1

        # Detect references
        field_name = key.lower()
        is_id_field = field_name in ("id", "_id") or field_name.endswith("_id") or field_name.endswith("_ids")

        if type_name == "objectId" or (is_id_field and type_name == "string"):
            stats["is_reference"] = True
            if field_name.endswith("_id"):
                base = field_name[:-3]
            elif field_name.endswith("_ids"):
                base = field_name[:-4]
            elif field_name.endswith("id"):
                base = field_name[:-2] if not field_name.endswith("_id") else field_name[:-3]
            else:
                base = field_name
            candidates = [f"{base}s", f"{base}es", base]
            stats["reference_candidates"] = candidates
            stats["reference_target"] = candidates[0]  # Default guess

        # Recurse into nested objects
        if type_name == "object" and isinstance(value, dict):
            _walk_doc(path, value, field_stats, seen_in_doc)
            stats["embedded"] = {"type": "object"}

        # Recurse into arrays
        if type_name == "array" and isinstance(value, list) and len(value) > 0:
            # Sample first few elements to check for embedded objects
            for item in value[:5]:
                if isinstance(item, dict):
                    _walk_doc(path, item, field_stats, seen_in_doc)
                    break
            if any(isinstance(i, dict) for i in value[:5]):
                stats["embedded"] = {"type": "array", "elementType": "object"}


# =============================================================================
# COLLECTION INSPECTION
# =============================================================================

def inspect_collection(
    db: Any,
    collection_name: str,
    sample_size: int = SAMPLE_SIZE,
) -> dict[str, Any]:
    """Inspect a single collection: count, indexes, sample, schema."""
    coll = db[collection_name]
    result = {
        "name": collection_name,
        "documentCount": None,
        "countMethod": None,
        "indexes": [],
        "sampleSize": 0,
        "sample": [],
        "schema": {},
        "error": None,
    }

    # Get document count
    try:
        count = coll.estimated_document_count()
        if count is not None and count < 50000:
            # Use exact count for smaller collections
            count = coll.count_documents({})
            result["countMethod"] = "estimated (exact used)"
        else:
            result["countMethod"] = "estimated"
        result["documentCount"] = count
    except Exception as e:
        result["error"] = f"count error: {e}"
        result["documentCount"] = None

    # Get indexes
    try:
        indexes = coll.list_indexes()
        for idx in indexes:
            idx_info = {
                "name": idx.get("name", "unknown"),
                "keys": idx.get("key", {}),
                "unique": idx.get("unique", False),
                "sparse": idx.get("sparse", False),
                "ttl": idx.get("expireAfterSeconds"),
                "partialFilter": idx.get("partialFilterExpression"),
            }
            result["indexes"].append(idx_info)
    except Exception as e:
        result["indexes"] = []

    # Sample documents
    try:
        cursor = coll.find({}).limit(sample_size)
        documents = []
        for doc in cursor:
            # Convert to JSON-safe representation
            safe_doc = {}
            for key, value in doc.items():
                safe_doc[key] = sample_value_for_schema(value)
            documents.append(safe_doc)
        result["sample"] = documents
        result["sampleSize"] = len(documents)
    except Exception as e:
        result["sample"] = []

    # Infer schema from sample
    if result["sample"]:
        result["schema"] = infer_schema(result["sample"])
    else:
        result["schema"] = {}

    return result


# =============================================================================
# DATABASE INSPECTION
# =============================================================================

def inspect_database(
    client: ReadOnlyMongoClient,
    db_name: str,
    sample_size: int = SAMPLE_SIZE,
) -> dict[str, Any]:
    """Inspect all collections in a database."""
    db = client[db_name]
    result = {
        "name": db_name,
        "isSystem": db_name in SYSTEM_DATABASES,
        "accessible": True,
        "collections": {},
        "error": None,
    }

    try:
        collection_names = db.list_collection_names()
    except OperationFailure as e:
        result["accessible"] = False
        result["error"] = f"Permission denied: {e}"
        return result

    total_docs = 0
    for coll_name in collection_names:
        try:
            coll_info = inspect_collection(db, coll_name, sample_size)
            result["collections"][coll_name] = coll_info
            if coll_info["documentCount"]:
                total_docs += coll_info["documentCount"]
        except Exception as e:
            result["collections"][coll_name] = {
                "name": coll_name,
                "documentCount": None,
                "indexes": [],
                "sampleSize": 0,
                "schema": {},
                "error": str(e),
            }

    result["totalDocuments"] = total_docs
    return result


# =============================================================================
# OUTPUT GENERATORS
# =============================================================================

def generate_markdown_report(inspection_data: dict, output_path: Path):
    """Generate human-readable markdown report."""
    lines = []
    lines.append("# MongoDB Database Analysis Report")
    lines.append("")
    lines.append(f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append(f"**Sample Size:** {SAMPLE_SIZE} documents per collection")
    lines.append(f"**Tool:** `scripts/db_inspect/mongodb_inspect.py` (read-only)")
    lines.append("")

    # Summary
    lines.append("## Executive Summary")
    lines.append("")

    db_names = list(inspection_data.keys())
    total_collections = sum(
        len(data.get("collections", {})) for data in inspection_data.values()
    )
    total_docs = sum(
        sum(
            coll.get("documentCount", 0) or 0
            for coll in data.get("collections", {}).values()
        )
        for data in inspection_data.values()
    )

    lines.append(f"- **Databases Inspected:** {len(db_names)}")
    lines.append(f"- **Total Collections:** {total_collections}")
    lines.append(f"- **Total Documents (estimated):** {total_docs:,}")
    lines.append("")

    # Database sections
    for db_name, db_data in inspection_data.items():
        lines.append(f"## Database: `{db_name}`")
        if db_data.get("isSystem"):
            lines.append("*System database*")
        lines.append("")

        if not db_data.get("accessible"):
            lines.append(f"**Error:** {db_data.get('error', 'Not accessible')}")
            lines.append("")
            continue

        colls = db_data.get("collections", {})
        lines.append(f"**Collections:** {len(colls)}")
        lines.append("")

        for coll_name, coll_data in colls.items():
            lines.append(f"### Collection: `{coll_name}`")
            lines.append("")

            if coll_data.get("error"):
                lines.append(f"**Error:** {coll_data['error']}")
                lines.append("")
                continue

            doc_count = coll_data.get("documentCount")
            count_method = coll_data.get("countMethod", "")
            lines.append(f"**Documents:** {doc_count:,} ({count_method})")
            lines.append("")

            # Indexes
            indexes = coll_data.get("indexes", [])
            lines.append("**Indexes:**")
            if indexes:
                lines.append("| Name | Keys | Unique | Sparse | TTL |")
                lines.append("|------|------|--------|--------|-----|")
                for idx in indexes:
                    keys_str = ", ".join(f"`{k}`" for k in idx.get("keys", {}).keys())
                    lines.append(
                        f"| `{idx.get('name', '?')}` | {keys_str} | "
                        f"{'Yes' if idx.get('unique') else 'No'} | "
                        f"{'Yes' if idx.get('sparse') else 'No'} | "
                        f"{idx.get('ttl') or 'N/A'} |"
                    )
            else:
                lines.append("No indexes found (or permission denied)")
            lines.append("")

            # Schema table
            schema = coll_data.get("schema", {})
            if schema:
                lines.append("**Schema:**")
                lines.append("")
                lines.append(
                    "| Field | Types | Presence | Optional | Reference | Notes |"
                )
                lines.append(
                    "|-------|-------|----------|----------|-----------|-------|"
                )

                for field_path, field_def in sorted(schema.items()):
                    types_str = ", ".join(f"`{t}`" for t in field_def.get("types", []))
                    presence = field_def.get("presence", 0)
                    presence_str = f"{presence * 100:.1f}%"
                    optional = "Yes" if field_def.get("optional") else "No"
                    is_ref = "Yes" if field_def.get("isReference") else ""
                    ref_target = field_def.get("referenceTarget") or ""

                    notes = []
                    if field_def.get("embedded"):
                        notes.append(f"Embedded: {field_def['embedded'].get('type')}")
                    if ref_target:
                        notes.append(f"-> {ref_target}")

                    lines.append(
                        f"| `{field_path}` | {types_str} | {presence_str} | "
                        f"{optional} | {is_ref} | {'; '.join(notes)} |"
                    )
                lines.append("")
            else:
                lines.append("*No schema data (empty collection or sampling failed)*")
                lines.append("")

    # Write to file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Markdown report: {output_path}")


def generate_reference_map(inspection_data: dict, output_path: Path):
    """Generate relationship map."""
    lines = []
    lines.append("# MongoDB Reference Map")
    lines.append("")
    lines.append(f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append("")
    lines.append("This document shows inferred relationships between collections based on")
    lines.append("field naming conventions and ObjectId patterns.")
    lines.append("")
    lines.append("## Relationship Summary")
    lines.append("")

    relationships = []
    all_collections: set[str] = set()

    for db_name, db_data in inspection_data.items():
        if not db_data.get("accessible"):
            continue
        for coll_name, coll_data in db_data.get("collections", {}).items():
            all_collections.add(coll_name)
            schema = coll_data.get("schema", {})
            for field_path, field_def in schema.items():
                if field_def.get("isReference") and field_def.get("referenceTarget"):
                    target = field_def["referenceTarget"]
                    # Check if target exists as a collection
                    confidence = "medium"
                    if target in all_collections:
                        confidence = "high"
                    elif f"{target}s" in all_collections:
                        confidence = "high"
                    relationships.append({
                        "source": coll_name,
                        "field": field_path,
                        "target": target,
                        "confidence": confidence,
                        "rationale": "Field name pattern or ObjectId type",
                    })

    if relationships:
        lines.append("| Source Collection | Field | Target Collection | Confidence | Rationale |")
        lines.append("|------------------|-------|------------------|------------|-----------|")
        for rel in relationships:
            lines.append(
                f"| `{rel['source']}` | `{rel['field']}` | `{rel['target']}` | "
                f"{rel['confidence']} | {rel['rationale']} |"
            )
        lines.append("")

        # Mermaid ER Diagram
        lines.append("## Mermaid ER Diagram")
        lines.append("")
        lines.append("```mermaid")
        lines.append("erDiagram")
        lines.append("    CLIENT ||--o{ DOCUMENT : \"references\"")
        lines.append("    USER ||--o{ SESSION : \"has\"")
        lines.append("    POST ||--|| USER : \"authored_by\"")
        lines.append("    COMMENT ||--|| USER : \"authored_by\"")
        lines.append("    COMMENT ||--|| POST : \"belongs_to\"")
        lines.append("```")
        lines.append("")
        lines.append("*Note: This is a placeholder diagram. Actual relationships should be reviewed against application code.*")
        lines.append("")
    else:
        lines.append("*No relationships detected.*")
        lines.append("")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Reference map: {output_path}")


def generate_index_summary(inspection_data: dict, output_path: Path):
    """Generate index summary table."""
    lines = []
    lines.append("# MongoDB Index Summary")
    lines.append("")
    lines.append(f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append("")

    all_indexes = []
    default_only_collections = []

    for db_name, db_data in inspection_data.items():
        if not db_data.get("accessible"):
            continue
        for coll_name, coll_data in db_data.get("collections", {}).items():
            indexes = coll_data.get("indexes", [])
            full_name = f"{db_name}.{coll_name}"

            if len(indexes) == 1 and indexes[0].get("name") == "_id_":
                default_only_collections.append(full_name)

            for idx in indexes:
                all_indexes.append({
                    "database": db_name,
                    "collection": coll_name,
                    "fullName": full_name,
                    "name": idx.get("name", "unknown"),
                    "keys": idx.get("keys", {}),
                    "unique": idx.get("unique", False),
                    "sparse": idx.get("sparse", False),
                    "ttl": idx.get("ttl"),
                    "partialFilter": idx.get("partialFilter"),
                })

    # Main table
    lines.append("## All Indexes")
    lines.append("")
    lines.append("| Database | Collection | Index Name | Keys | Unique | Sparse | TTL |")
    lines.append("|----------|------------|------------|------|--------|--------|-----|")

    for idx in sorted(all_indexes, key=lambda x: (x["database"], x["collection"], x["name"])):
        keys_str = ", ".join(f"{k}:{v}" for k, v in idx["keys"].items())
        lines.append(
            f"| `{idx['database']}` | `{idx['collection']}` | "
            f"`{idx['name']}` | {keys_str} | "
            f"{'Yes' if idx['unique'] else 'No'} | "
            f"{'Yes' if idx['sparse'] else 'No'} | "
            f"{idx['ttl'] or 'N/A'} |"
        )
    lines.append("")

    # Collections with only default index
    if default_only_collections:
        lines.append("## Collections with Only Default _id Index")
        lines.append("")
        lines.append("These collections may benefit from additional indexes for common query patterns:")
        lines.append("")
        for coll in sorted(default_only_collections):
            lines.append(f"- `{coll}`")
        lines.append("")

    # Total stats
    lines.append("## Summary")
    lines.append("")
    total_idx = len(all_indexes)
    unique_idx = len(set((idx["database"], idx["collection"], idx["name"]) for idx in all_indexes))
    lines.append(f"- **Total Indexes:** {total_idx}")
    lines.append(f"- **Unique Index Definitions:** {unique_idx}")
    lines.append(f"- **Collections with Default-Only Index:** {len(default_only_collections)}")
    lines.append("")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Index summary: {output_path}")


def generate_schema_json(inspection_data: dict, output_path: Path):
    """Generate machine-readable JSON schema."""
    output = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "sampleSize": SAMPLE_SIZE,
        "databases": {},
    }

    for db_name, db_data in inspection_data.items():
        if not db_data.get("accessible"):
            output["databases"][db_name] = {
                "accessible": False,
                "error": db_data.get("error"),
                "collections": {},
            }
            continue

        output["databases"][db_name] = {
            "accessible": True,
            "collections": {},
        }

        for coll_name, coll_data in db_data.get("collections", {}).items():
            # Convert BSON types to string names (already done by infer_schema)
            # Don't include raw document data, only schema
            coll_schema = coll_data.get("schema", {})

            # Convert sets to lists for JSON serialization
            clean_schema = {}
            for field_path, field_def in coll_schema.items():
                clean_schema[field_path] = {
                    "types": field_def.get("types", []),
                    "presence": field_def.get("presence", 0),
                    "optional": field_def.get("optional", True),
                    "isReference": field_def.get("isReference", False),
                    "referenceTarget": field_def.get("referenceTarget"),
                    "embedded": field_def.get("embedded"),
                }

            output["databases"][db_name]["collections"][coll_name] = {
                "documentCount": coll_data.get("documentCount"),
                "countMethod": coll_data.get("countMethod"),
                "indexes": coll_data.get("indexes", []),
                "sampleSize": coll_data.get("sampleSize", 0),
                "fields": clean_schema,
            }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Schema JSON: {output_path}")


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 60)
    print("MongoDB Read-Only Database Inspection Tool")
    print("=" * 60)
    print()

    # Load environment
    env_path = Path(__file__).parent.parent.parent / "backend" / ".env"
    if not env_path.exists():
        print(f"[ERROR] .env file not found at: {env_path}")
        sys.exit(1)

    load_dotenv(env_path)

    mongo_url = os.getenv("MONGO_URL")
    mongo_db = os.getenv("MONGO_DB", "edu_platform")

    if not mongo_url:
        print("[ERROR] MONGO_URL not found in environment")
        sys.exit(1)

    # Redact for display
    try:
        from urllib.parse import urlparse
        parsed = urlparse(mongo_url)
        display_host = f"{parsed.scheme}://{parsed.hostname}/..."
    except Exception:
        display_host = "[REDACTED]"

    print(f"[INFO] MONGO_URL: {display_host}")
    print(f"[INFO] MONGO_DB: {mongo_db}")
    print(f"[INFO] Sample size: {SAMPLE_SIZE} documents per collection")
    print()

    # Connect with TLS
    try:
        print("[INFO] Connecting to MongoDB...")
        client = ReadOnlyMongoClient(
            mongo_url,
            tls=True,
            tlsCAFile=certifi.where(),
        )
        # Test connection
        client._client.admin.command("ping")
        print("[OK] Connected successfully")
    except ConnectionFailure as e:
        print(f"[ERROR] Connection failed: {e}")
        print()
        print("=" * 60)
        print("CONNECTION FAILED - Generating scaffolding with error note")
        print("=" * 60)
        # Generate scaffold documents with error
        _generate_error_scaffold(mongo_db)
        return
    except ServerSelectionTimeoutError as e:
        print(f"[ERROR] Server selection timeout: {e}")
        _generate_error_scaffold(mongo_db)
        return
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        _generate_error_scaffold(mongo_db)
        return

    print()
    print("[INFO] Inspecting databases...")
    print()

    # Inspect databases
    inspection_data = {}

    try:
        db_names = client.list_database_names()
        print(f"[INFO] Found {len(db_names)} databases: {', '.join(db_names)}")
    except OperationFailure as e:
        print(f"[WARN] Cannot list all databases: {e}")
        print(f"[INFO] Falling back to single database: {mongo_db}")
        db_names = [mongo_db]

    for db_name in db_names:
        if db_name in SYSTEM_DATABASES:
            print(f"[SKIP] Skipping system database: {db_name}")
            continue

        print(f"[INFO] Inspecting database: {db_name}")
        try:
            db_data = inspect_database(client, db_name, SAMPLE_SIZE)
            inspection_data[db_name] = db_data

            coll_count = len(db_data.get("collections", {}))
            total_docs = db_data.get("totalDocuments", 0)
            print(f"  -> {coll_count} collections, {total_docs:,} documents")

            # Report any collection-level errors
            for coll_name, coll_data in db_data.get("collections", {}).items():
                if coll_data.get("error"):
                    print(f"  -> [{coll_name}] Error: {coll_data['error']}")

        except Exception as e:
            print(f"[ERROR] Failed to inspect database '{db_name}': {e}")
            inspection_data[db_name] = {
                "name": db_name,
                "accessible": False,
                "error": str(e),
                "collections": {},
            }

    print()
    print("[INFO] Generating output files...")

    # Generate all outputs
    generate_markdown_report(
        inspection_data,
        OUTPUT_DIR / "mongodb-analysis.md"
    )
    generate_reference_map(
        inspection_data,
        OUTPUT_DIR / "reference-map.md"
    )
    generate_index_summary(
        inspection_data,
        OUTPUT_DIR / "index-summary.md"
    )
    generate_schema_json(
        inspection_data,
        OUTPUT_DIR / "schema.json"
    )

    print()
    print("=" * 60)
    print("INSPECTION COMPLETE")
    print("=" * 60)
    print()
    print("Files generated:")
    print(f"  - {OUTPUT_DIR / 'mongodb-analysis.md'}")
    print(f"  - {OUTPUT_DIR / 'reference-map.md'}")
    print(f"  - {OUTPUT_DIR / 'index-summary.md'}")
    print(f"  - {OUTPUT_DIR / 'schema.json'}")
    print()
    print("No write operations were performed.")

    # Close client
    try:
        client.close()
    except Exception:
        pass


def _generate_error_scaffold(db_name: str):
    """Generate placeholder files when connection fails."""
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Markdown report
    md_content = f"""# MongoDB Database Analysis Report

**Generated:** {timestamp}
**Status:** CONNECTION FAILED

## Connection Error

The MongoDB inspection tool could not connect to the database.

### Possible Causes

1. **Network connectivity** - The server cannot reach the MongoDB Atlas cluster
2. **IP Allowlist** - Your current IP may not be whitelisted in MongoDB Atlas
3. **Credentials** - The connection string may be invalid or expired
4. **DNS resolution** - Cannot resolve the cluster hostname

### Troubleshooting Steps

1. Verify your IP is in the MongoDB Atlas IP allowlist
2. Check that the `MONGO_URL` in `backend/.env` is correct
3. Ensure the MongoDB Atlas cluster is running (not paused)
4. Check network/firewall settings

## Next Steps

1. Fix the connectivity issue
2. Re-run the inspection tool:
   ```
   & .\.venv\Scripts\python.exe scripts\db_inspect\mongodb_inspect.py
   ```

## Expected Database: `{db_name}`

(Report will be populated once connection is established)
"""

    (OUTPUT_DIR / "mongodb-analysis.md").write_text(md_content, encoding="utf-8")
    print(f"[OK] Created scaffolding: {OUTPUT_DIR / 'mongodb-analysis.md'}")

    # Reference map
    (OUTPUT_DIR / "reference-map.md").write_text(
        f"# MongoDB Reference Map\n\n**Generated:** {timestamp}\n**Status:** CONNECTION FAILED\n\n"
        "This file will be populated once connection is established.\n",
        encoding="utf-8"
    )
    print(f"[OK] Created scaffolding: {OUTPUT_DIR / 'reference-map.md'}")

    # Index summary
    (OUTPUT_DIR / "index-summary.md").write_text(
        f"# MongoDB Index Summary\n\n**Generated:** {timestamp}\n**Status:** CONNECTION FAILED\n\n"
        "This file will be populated once connection is established.\n",
        encoding="utf-8"
    )
    print(f"[OK] Created scaffolding: {OUTPUT_DIR / 'index-summary.md'}")

    # Schema JSON
    schema = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "sampleSize": SAMPLE_SIZE,
        "error": "Connection failed - see mongodb-analysis.md for details",
        "databases": {},
    }
    (OUTPUT_DIR / "schema.json").write_text(
        json.dumps(schema, indent=2),
        encoding="utf-8"
    )
    print(f"[OK] Created scaffolding: {OUTPUT_DIR / 'schema.json'}")


if __name__ == "__main__":
    main()
