# MongoDB Read-Only Inspection Tool

A strictly read-only tool for inspecting MongoDB database schemas, indexes, and relationships.

## Safety Guarantees

This tool is **incapable of mutating data**. The `ReadOnlyMongoClient` wrapper blocks all write operations:

- Blocked methods: `insert_one`, `insert_many`, `update_one`, `update_many`, `delete_one`, `delete_many`, `replace_one`, `drop`, `bulk_write`, `aggregate` (with `$out`/`$merge`), `command`, etc.
- Read preference is set to `secondaryPreferred` for additional safety
- Only the following operations are used:
  - `list_database_names()`
  - `list_collection_names()`
  - `count_documents({})` / `estimated_document_count()`
  - `list_indexes()`
  - `find({}).limit(300)`

## Requirements

- Python 3.10+
- `pymongo`
- `certifi`
- `python-dotenv`

All dependencies are available in the project virtualenv at `.venv`.

## Usage

```powershell
# From the project root:
& ".\.venv\Scripts\python.exe" scripts\db_inspect\mongodb_inspect.py
```

The tool reads `MONGO_URL` and `MONGO_DB` from `backend/.env`.

## Output Files

The tool generates four files in `docs/database/`:

| File | Description |
|------|-------------|
| `mongodb-analysis.md` | Human-readable report with schema tables per collection |
| `reference-map.md` | Inferred relationships and Mermaid ER diagram |
| `index-summary.md` | All indexes across all collections |
| `schema.json` | Machine-readable schema in JSON format |

## Schema Inference

The tool infers schema from a sample of up to 300 documents per collection. For each field, it reports:

- **Types**: BSON types detected (objectId, string, int, date, bool, array, object, null, etc.)
- **Presence**: Percentage of documents containing this field
- **Optional**: Whether the field may be absent
- **Reference**: Heuristic detection of foreign key patterns (ObjectId fields, `_id`/`_ids` suffixes)
- **Embedded**: Detection of embedded documents and arrays of objects

## Connection Issues

If the connection fails, the tool generates scaffolding files with instructions for troubleshooting common issues:

1. IP not whitelisted in MongoDB Atlas
2. Invalid or expired connection string
3. Cluster paused or unavailable
4. Network connectivity problems

## Redaction

The tool **never** prints or stores:
- Connection string credentials
- Actual document data (only schema metadata)
- Passwords or secrets from `.env`
