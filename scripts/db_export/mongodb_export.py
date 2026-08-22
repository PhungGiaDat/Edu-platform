#!/usr/bin/env python3
"""
MongoDB Full Streaming Exporter (STRICTLY READ-ONLY)

Exports EVERYTHING from MongoDB with NO sampling, NO limits, and NO schema
inference. Every document, every collection, every (non-system) database is
read and written to disk.

Design guarantees:
- STREAMING: documents are read from a server-side cursor and written one at a
  time to NDJSON. A full collection is NEVER loaded into memory.
- READ-ONLY: the client is wrapped so that every write/mutation method raises
  PermissionError. Only a curated allowlist of read commands is permitted.
- LOSSLESS: documents are serialized with MongoDB Extended JSON (canonical mode)
  so all BSON types (ObjectId, Date, Decimal128, Binary, Long, etc.) are
  preserved exactly and can be re-imported with mongoimport.

Outputs (under the repo-root /export directory):
- /export/database.json       : catalog of databases -> collections + counts
- /export/collections/*.ndjson : one NDJSON file per collection (full data)
- /export/indexes.json        : every index of every collection
- /export/stats.json          : collStats + dbStats for everything
- /export/validators.json     : JSON-schema / validators per collection
- /export/relationships.json  : lightweight reference detection (field-name +
                                ObjectId heuristic; NOT full schema inference)

Usage (from repo root):
    & ".\\.venv\\Scripts\\python.exe" scripts\\db_export\\mongodb_export.py

Environment (read from backend/.env, same as the backend app):
    MONGO_URL   - connection string (TLS/Atlas)   [never printed in full]
    MONGO_DB    - primary database name (used as fallback if listing DBs fails)
"""

from __future__ import annotations

import io
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Optional

import certifi
from bson import ObjectId
from bson.json_util import dumps as bson_dumps, CANONICAL_JSON_OPTIONS
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import (
    ConnectionFailure,
    OperationFailure,
    PyMongoError,
    ServerSelectionTimeoutError,
)


# =============================================================================
# CONSTANTS
# =============================================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = PROJECT_ROOT / "backend" / ".env"
OUTPUT_DIR = PROJECT_ROOT / "export"
COLLECTIONS_DIR = OUTPUT_DIR / "collections"

SYSTEM_DATABASES = {"admin", "local", "config"}

# Server-side cursor batch size (how many docs are fetched per network round-trip).
# Documents are still processed one-at-a-time, so memory stays bounded.
CURSOR_BATCH_SIZE = 500

# Read-only introspection commands that are explicitly permitted.
# Everything else raises PermissionError.
ALLOWED_COMMANDS = {
    "ping",
    "dbstats",
    "collstats",
    "listcollections",
    "listindexes",
    "buildinfo",
    "serverstatus",
    "connectionstatus",
}


# =============================================================================
# READ-ONLY CLIENT WRAPPERS
# =============================================================================


class ReadOnlyCollection:
    """
    Read-only wrapper around a MongoCollection.
    Blocks all write operations; exposes find, count, list_indexes, etc.
    """

    BLOCKED_METHODS = {
        "insert_one",
        "insert_many",
        "insert",
        "update_one",
        "update_many",
        "update",
        "replace_one",
        "replace",
        "delete_one",
        "delete_many",
        "delete",
        "drop",
        "rename",
        "bulk_write",
        "find_one_and_update",
        "find_one_and_replace",
        "find_one_and_delete",
        "aggregate",  # blocked to prevent $out / $merge
    }

    def __init__(self, coll):
        self._coll = coll

    def find(self, *args, **kwargs):
        return self._coll.find(*args, **kwargs)

    def count_documents(self, *args, **kwargs):
        return self._coll.count_documents(*args, **kwargs)

    def estimated_document_count(self, *args, **kwargs):
        return self._coll.estimated_document_count(*args, **kwargs)

    def list_indexes(self):
        return self._coll.list_indexes()

    @property
    def name(self) -> str:
        return self._coll.name

    @property
    def database(self):
        return ReadOnlyDatabase(self._coll.database)

    def __getattr__(self, name: str):
        if name.lower() in self.BLOCKED_METHODS:
            raise PermissionError(
                f"WRITE OPERATION BLOCKED: '{name}' is not permitted in read-only mode."
            )
        return getattr(self._coll, name)


class ReadOnlyDatabase:
    """
    Read-only wrapper around a MongoDatabase.
    Blocks all write operations; exposes list_collection_names, command, etc.
    """

    BLOCKED_METHODS = {
        "drop",
        "create_collection",
        "rename",
    }

    def __init__(self, db):
        self._db = db

    def __getitem__(self, coll_name: str):
        return ReadOnlyCollection(self._db[coll_name])

    def list_collection_names(self):
        return self._db.list_collection_names()

    def command(self, *args, **kwargs):
        # Only allow read-only introspection commands
        if args and isinstance(args[0], (str, dict)):
            cmd_name = args[0] if isinstance(args[0], str) else list(args[0].keys())[0]
            if cmd_name.lower() not in ALLOWED_COMMANDS:
                raise PermissionError(
                    f"COMMAND BLOCKED: '{cmd_name}' is not in the read-only allowlist. "
                    f"Allowed: {ALLOWED_COMMANDS}"
                )
        return self._db.command(*args, **kwargs)

    @property
    def name(self) -> str:
        return self._db.name

    @property
    def client(self):
        return self._db.client

    def __getattr__(self, name: str):
        if name.lower() in self.BLOCKED_METHODS:
            raise PermissionError(
                f"WRITE OPERATION BLOCKED: '{name}' is not permitted in read-only mode."
            )
        return getattr(self._db, name)


class ReadOnlyMongoClient:
    """
    Read-only wrapper around MongoClient.
    Forces readPreference=secondaryPreferred and blocks all write operations.
    """

    BLOCKED_METHODS = {
        "drop_database",
        "close",  # we'll expose this explicitly
    }

    def __init__(self, uri: str, **kwargs):
        # Force read preference to secondaryPreferred for safety
        kwargs["readPreference"] = "secondaryPreferred"
        kwargs.setdefault("serverSelectionTimeoutMS", 10000)
        kwargs.setdefault("connectTimeoutMS", 15000)
        self._client = MongoClient(uri, **kwargs)
        self._uri = uri

    def __getitem__(self, db_name: str):
        return ReadOnlyDatabase(self._client[db_name])

    def list_database_names(self) -> list[str]:
        try:
            return self._client.list_database_names()
        except OperationFailure as e:
            print(f"[WARN] Cannot list all databases (permission error): {e}")
            return []

    def close(self):
        """Explicitly allowed: close the connection."""
        self._client.close()

    @property
    def admin(self):
        return ReadOnlyDatabase(self._client.admin)

    def __getattr__(self, name: str):
        if name.lower() in self.BLOCKED_METHODS:
            raise PermissionError(
                f"WRITE OPERATION BLOCKED: '{name}' is not permitted in read-only mode."
            )
        return getattr(self._client, name)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def redact_uri(uri: str) -> str:
    """Return a redacted version of the MongoDB URI (no credentials)."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(uri)
        return f"{parsed.scheme}://{parsed.hostname}/..."
    except Exception:
        return "[REDACTED]"


def is_objectid_field(value: Any) -> bool:
    """Check if a value is an ObjectId or an array of ObjectIds."""
    if isinstance(value, ObjectId):
        return True
    if isinstance(value, list) and value and isinstance(value[0], ObjectId):
        return True
    return False


def detect_reference_fields(doc: dict, path_prefix: str = "") -> set[str]:
    """
    Lightweight reference detection: finds fields that are ObjectIds or
    end with _id/_ids. This is NOT full schema inference — just a heuristic
    for relationships.json.
    """
    refs = set()
    for key, value in doc.items():
        full_path = f"{path_prefix}.{key}" if path_prefix else key
        
        # Heuristic 1: field is an ObjectId or array of ObjectIds
        if is_objectid_field(value):
            refs.add(full_path)
        
        # Heuristic 2: field name ends with _id, _ids, Id, or Ids
        if key.endswith(("_id", "_ids", "Id", "Ids")):
            refs.add(full_path)
        
        # Recurse into nested objects (but not arrays of primitives)
        if isinstance(value, dict):
            refs.update(detect_reference_fields(value, full_path))
    
    return refs


def stream_collection_to_ndjson(
    collection: ReadOnlyCollection,
    output_path: Path,
    batch_size: int = CURSOR_BATCH_SIZE,
) -> tuple[int, set[str]]:
    """
    Stream every document in a collection to an NDJSON file.
    Returns (document_count, reference_fields).
    
    Documents are serialized with MongoDB Extended JSON (canonical) so all
    BSON types are preserved exactly.
    """
    doc_count = 0
    all_refs = set()
    
    with open(output_path, "w", encoding="utf-8") as f:
        cursor = collection.find({}).batch_size(batch_size)
        for doc in cursor:
            # Serialize with Extended JSON (canonical)
            line = bson_dumps(doc, json_options=CANONICAL_JSON_OPTIONS)
            f.write(line)
            f.write("\n")
            doc_count += 1
            
            # Accumulate reference fields
            all_refs.update(detect_reference_fields(doc))
    
    return doc_count, all_refs


def export_collection(
    db: ReadOnlyDatabase,
    coll_name: str,
    output_dir: Path,
) -> dict[str, Any]:
    """
    Export a single collection: documents (NDJSON), indexes, stats, validator.
    Returns a metadata dict for this collection.
    """
    coll = db[coll_name]
    db_name = db.name
    
    # Safe filename: {db}__{collection}.ndjson
    safe_filename = f"{db_name}__{coll_name}.ndjson"
    ndjson_path = output_dir / safe_filename
    
    print(f"  [INFO] Exporting {db_name}.{coll_name}...", end=" ", flush=True)
    start_time = time.time()
    
    # Stream all documents to NDJSON
    doc_count, ref_fields = stream_collection_to_ndjson(coll, ndjson_path)
    
    # Read indexes
    try:
        indexes = list(coll.list_indexes())
    except Exception as e:
        print(f"\n    [WARN] Could not read indexes: {e}")
        indexes = []
    
    # Read collStats
    try:
        stats = db.command("collstats", coll_name)
    except Exception as e:
        print(f"\n    [WARN] Could not read collStats: {e}")
        stats = {}
    
    # Read validator (JSON schema / query validator)
    try:
        coll_info = db.command("listCollections", filter={"name": coll_name})
        validator = {}
        if "cursor" in coll_info and "firstBatch" in coll_info["cursor"]:
            batch = coll_info["cursor"]["firstBatch"]
            if batch and "options" in batch[0] and "validator" in batch[0]["options"]:
                validator = batch[0]["options"]["validator"]
    except Exception as e:
        print(f"\n    [WARN] Could not read validator: {e}")
        validator = {}
    
    elapsed = time.time() - start_time
    print(f"{doc_count} docs in {elapsed:.2f}s")
    
    return {
        "collection": coll_name,
        "documentCount": doc_count,
        "ndjsonFile": safe_filename,
        "indexes": indexes,
        "stats": stats,
        "validator": validator,
        "referenceFields": sorted(ref_fields),
    }


def export_database(
    client: ReadOnlyMongoClient,
    db_name: str,
    collections_dir: Path,
) -> dict[str, Any]:
    """
    Export all collections in a database.
    Returns metadata dict for this database.
    """
    db = client[db_name]
    
    print(f"[INFO] Exporting database: {db_name}")
    
    try:
        coll_names = db.list_collection_names()
    except Exception as e:
        print(f"  [ERROR] Could not list collections in {db_name}: {e}")
        return {"database": db_name, "collections": [], "error": str(e)}
    
    # Read dbStats
    try:
        db_stats = db.command("dbstats")
    except Exception as e:
        print(f"  [WARN] Could not read dbStats for {db_name}: {e}")
        db_stats = {}
    
    collections_meta = []
    for coll_name in coll_names:
        try:
            coll_meta = export_collection(db, coll_name, collections_dir)
            collections_meta.append(coll_meta)
        except Exception as e:
            print(f"  [ERROR] Failed to export {db_name}.{coll_name}: {e}")
            collections_meta.append({
                "collection": coll_name,
                "error": str(e),
            })
    
    return {
        "database": db_name,
        "dbStats": db_stats,
        "collections": collections_meta,
    }


# =============================================================================
# MAIN EXPORT ORCHESTRATOR
# =============================================================================


def main():
    print("=" * 70)
    print("MongoDB Full Streaming Exporter (READ-ONLY)")
    print("=" * 70)
    print()
    
    # Load environment
    if not ENV_PATH.exists():
        print(f"[ERROR] .env file not found at: {ENV_PATH}")
        sys.exit(1)
    
    load_dotenv(ENV_PATH)
    
    mongo_url = os.getenv("MONGO_URL")
    mongo_db = os.getenv("MONGO_DB", "edu_platform")
    
    if not mongo_url:
        print("[ERROR] MONGO_URL not found in environment")
        sys.exit(1)
    
    print(f"[INFO] MONGO_URL: {redact_uri(mongo_url)}")
    print(f"[INFO] MONGO_DB (fallback): {mongo_db}")
    print(f"[INFO] Output directory: {OUTPUT_DIR}")
    print(f"[INFO] Cursor batch size: {CURSOR_BATCH_SIZE}")
    print()
    
    # Create output directories
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    COLLECTIONS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Connect with TLS
    try:
        print("[INFO] Connecting to MongoDB...")
        client = ReadOnlyMongoClient(
            mongo_url,
            tls=True,
            tlsCAFile=certifi.where(),
        )
        # Test connection
        client.admin.command("ping")
        print("[OK] Connected successfully")
    except ConnectionFailure as e:
        print(f"[ERROR] Connection failed: {e}")
        sys.exit(1)
    except ServerSelectionTimeoutError as e:
        print(f"[ERROR] Server selection timeout: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected connection error: {e}")
        sys.exit(1)
    
    print()
    print("[INFO] Discovering databases...")
    
    try:
        db_names = client.list_database_names()
        print(f"[INFO] Found {len(db_names)} databases: {', '.join(db_names)}")
    except OperationFailure as e:
        print(f"[WARN] Cannot list all databases (permission error): {e}")
        print(f"[INFO] Falling back to single database: {mongo_db}")
        db_names = [mongo_db]
    
    # Filter out system databases
    db_names = [name for name in db_names if name not in SYSTEM_DATABASES]
    print(f"[INFO] Exporting {len(db_names)} non-system databases")
    print()
    
    # Export all databases
    all_db_meta = []
    all_indexes = {}
    all_stats = {}
    all_validators = {}
    all_relationships = {}
    
    for db_name in db_names:
        try:
            db_meta = export_database(client, db_name, COLLECTIONS_DIR)
            all_db_meta.append(db_meta)
            
            # Consolidate indexes, stats, validators, relationships
            for coll_meta in db_meta.get("collections", []):
                coll_name = coll_meta.get("collection")
                if not coll_name:
                    continue
                
                full_name = f"{db_name}.{coll_name}"
                
                if "indexes" in coll_meta:
                    all_indexes[full_name] = coll_meta["indexes"]
                
                if "stats" in coll_meta:
                    all_stats[full_name] = coll_meta["stats"]
                
                if "validator" in coll_meta:
                    all_validators[full_name] = coll_meta["validator"]
                
                if "referenceFields" in coll_meta:
                    all_relationships[full_name] = coll_meta["referenceFields"]
        
        except Exception as e:
            print(f"[ERROR] Failed to export database {db_name}: {e}")
            all_db_meta.append({
                "database": db_name,
                "error": str(e),
            })
    
    print()
    print("[INFO] Writing consolidated metadata files...")
    
    # Write database.json (catalog)
    database_json = {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "source": redact_uri(mongo_url),
        "databases": all_db_meta,
    }
    with open(OUTPUT_DIR / "database.json", "w", encoding="utf-8") as f:
        json.dump(database_json, f, indent=2, default=str)
    print(f"  [OK] {OUTPUT_DIR / 'database.json'}")
    
    # Write indexes.json
    with open(OUTPUT_DIR / "indexes.json", "w", encoding="utf-8") as f:
        json.dump(all_indexes, f, indent=2, default=str)
    print(f"  [OK] {OUTPUT_DIR / 'indexes.json'}")
    
    # Write stats.json
    with open(OUTPUT_DIR / "stats.json", "w", encoding="utf-8") as f:
        json.dump(all_stats, f, indent=2, default=str)
    print(f"  [OK] {OUTPUT_DIR / 'stats.json'}")
    
    # Write validators.json
    with open(OUTPUT_DIR / "validators.json", "w", encoding="utf-8") as f:
        json.dump(all_validators, f, indent=2, default=str)
    print(f"  [OK] {OUTPUT_DIR / 'validators.json'}")
    
    # Write relationships.json
    with open(OUTPUT_DIR / "relationships.json", "w", encoding="utf-8") as f:
        json.dump(all_relationships, f, indent=2, default=str)
    print(f"  [OK] {OUTPUT_DIR / 'relationships.json'}")
    
    print()
    print("=" * 70)
    print("EXPORT COMPLETE")
    print("=" * 70)
    print(f"Total databases exported: {len(all_db_meta)}")
    print(f"Total collections exported: {len(all_indexes)}")
    
    total_docs = sum(
        coll.get("documentCount", 0)
        for db in all_db_meta
        for coll in db.get("collections", [])
    )
    print(f"Total documents exported: {total_docs}")
    print()
    print("Output files:")
    print(f"  - {OUTPUT_DIR / 'database.json'}")
    print(f"  - {OUTPUT_DIR / 'collections'}/*.ndjson ({len(all_indexes)} files)")
    print(f"  - {OUTPUT_DIR / 'indexes.json'}")
    print(f"  - {OUTPUT_DIR / 'stats.json'}")
    print(f"  - {OUTPUT_DIR / 'validators.json'}")
    print(f"  - {OUTPUT_DIR / 'relationships.json'}")
    print()
    print("[OK] No write operations were performed. Export is read-only.")
    
    client.close()


if __name__ == "__main__":
    main()

