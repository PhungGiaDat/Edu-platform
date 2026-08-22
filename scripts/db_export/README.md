# MongoDB Full Streaming Exporter

**STRICTLY READ-ONLY** — This tool exports every database, every collection, and every document from MongoDB without any sampling or limits.

## Design Guarantees

1. **STREAMING**: Documents are read from a server-side cursor with bounded batch size and written one-at-a-time to NDJSON. An entire collection is NEVER loaded into memory, regardless of size.

2. **READ-ONLY**: A wrapper chain blocks every mutating driver method (`insert*`, `update*`, `delete*`, `drop*`, `bulk_write`, `find_one_and_*`, `aggregate` with `$out`/`$merge`). Only a curated allowlist of read commands (`ping`, `dbstats`, `collstats`, `listcollections`, `listindexes`) is permitted.

3. **LOSSLESS**: Documents are serialized with MongoDB Extended JSON (canonical mode), preserving all BSON types exactly (ObjectId, Date, Decimal128, Binary, Long, etc.). Output can be re-imported with `mongoimport`.

## What Gets Exported

- **Every non-system database** (`admin`, `local`, `config` are skipped)
- **Every collection in every database**
- **Every document in every collection** (NO sampling, NO limits)
- **All indexes** for every collection
- **Collection stats** (`collStats`) and database stats (`dbStats`)
- **JSON schema validators** (if defined)
- **Lightweight relationship map** (ObjectId fields + `*_id`/`*_ids` heuristics; NOT full schema inference)

## Output Structure

All files are written to `./export/` at the project root:

```
export/
├── database.json           # Catalog: databases → collections + counts + file map
├── collections/
│   ├── edu_platform__users.ndjson
│   ├── edu_platform__courses.ndjson
│   ├── eduplatform__users.ndjson
│   └── ...                 # One NDJSON file per collection
├── indexes.json            # Every index of every collection
├── stats.json              # collStats + dbStats for everything
├── validators.json         # JSON-schema / query validators per collection
└── relationships.json      # Inferred reference fields (ObjectId / *_id heuristics)
```

### File Format Details

- **`database.json`**: Top-level manifest with metadata for each database and collection
- **`collections/*.ndjson`**: Newline-Delimited JSON (one document per line), using MongoDB Extended JSON (canonical). Filenames are `{database}__{collection}.ndjson` to avoid collisions.
- **`indexes.json`**: Map of `{db.collection: [index_specs]}`
- **`stats.json`**: Map of `{db.collection: collStats}` + dbStats
- **`validators.json`**: Map of `{db.collection: validator}`
- **`relationships.json`**: Map of `{db.collection: [field_names]}` where fields are likely references

## Usage

### Prerequisites

- Python 3.11+ with `pymongo`, `certifi`, `python-dotenv` installed (already in the project's `.venv`)
- `MONGO_URL` and `MONGO_DB` defined in `backend/.env`

### Run the Exporter

From the project root:

```powershell
& ".\.venv\Scripts\python.exe" scripts\db_export\mongodb_export.py
```

### Expected Runtime

Depends on total document count and network speed. For reference:
- 781 documents (current live DB): ~2-5 seconds
- 10,000 documents: ~15-30 seconds
- 100,000+ documents: several minutes (but memory stays constant due to streaming)

### What It Does NOT Do

- Does NOT sample (exports everything)
- Does NOT limit (exports every document)
- Does NOT infer full schema (only lightweight reference detection)
- Does NOT modify the database (all writes are blocked)
- Does NOT export system databases (`admin`, `local`, `config`)

## Safety

- The `ReadOnlyMongoClient` → `ReadOnlyDatabase` → `ReadOnlyCollection` wrapper chain blocks all mutation methods.
- `readPreference` is forced to `secondaryPreferred`.
- Only these server commands are allowed: `ping`, `dbstats`, `collstats`, `listcollections`, `listindexes` (all read-only introspection).
- No credentials or connection strings are written to any output file (URIs are redacted).

## Re-importing Data

To re-import a collection:

```bash
mongoimport --uri="<connection_string>" --db=edu_platform --collection=users --file=export/collections/edu_platform__users.ndjson
```

The Extended JSON format is fully compatible with `mongoimport`.

## Troubleshooting

**Connection fails**: Check that `MONGO_URL` in `backend/.env` is correct and your IP is allowed in Atlas (if using Atlas).

**Permission errors**: The MongoDB user must have `read` role on all databases you want to export. If listing databases fails, the tool falls back to exporting only `MONGO_DB`.

**Out of disk space**: Each collection file can be large. Ensure you have enough free disk space (estimate: ~2× the total MongoDB storage size for safety).

## Comparison to Inspection Tool

| Feature | Inspection Tool | Exporter |
|---------|----------------|----------|
| Sampling | 300 docs per collection | ALL documents |
| Schema inference | Full recursive schema | Lightweight reference detection only |
| Output format | Markdown + JSON summary | NDJSON (full data) + JSON metadata |
| Memory usage | Bounded (sample only) | Bounded (streaming cursor) |
| Purpose | Analysis, schema discovery | Full backup, migration, data archival |
