# Beanie ODM — Backend Database Guide

> **Beanie** is an async ODM for MongoDB built on top of Pydantic.  
> Every Document model is a Pydantic v2 model — the same types you write in API schemas.

---

## Architecture

```
FastAPI startup
    └── connect_to_database()
            └── init_mongodb(mongo_url, MONGO_DB, document_models)
                    └── init_beanie(database, document_models=[...])
                            └── Motor async client registered

ar_combinations collection
    └── ARCombination (Beanie Document) ← schema enforced on INSERT/UPDATE
            └── ArCombinationSchema (Pydantic DTO) ← API response/validation
```

---

## How Beanie is Initialized

`backend/database/connection.py` calls `init_mongodb()` on app startup:

```python
async def connect_to_database():
    document_models = [
        UserDocument, Flashcard, LearningProgressDocument,
        ...
        ARCombination,   # ← registered here
    ]
    await init_mongodb(
        mongo_url=settings.MONGO_URL,
        database_name=settings.MONGO_DB,
        document_models=document_models
    )
```

This happens in `backend/main.py` via the `lifespan` context manager — the database
is initialized on startup and closed on shutdown.

---

## Adding a New Document

### Step 1 — Create the model

Create `backend/models/my_document.py`:

```python
from beanie import Document, Indexed
from pydantic import Field
from typing import Optional

class MyDocument(Document):
    # Beanie requires an id field; None means MongoDB auto-generates
    id: Optional[PydanticObjectId] = Field(default=None, alias="_id")

    # Use Indexed for frequently queried fields
    name: Indexed(str, unique=True)

    # Regular fields
    description: str
    active: bool = True

    class Settings:
        name = "my_documents"          # MongoDB collection name
        indexes = [
            [("name", 1)],             # unique index (already from Indexed above)
            [("active", 1)],           # filter index
        ]
```

### Step 2 — Register it in `connection.py`

```python
from models.my_document import MyDocument

document_models = [
    ...
    MyDocument,
]
```

### Step 3 — Use it in a repository

```python
from models.my_document import MyDocument

class MyDocumentRepository:
    async def find_active(self) -> list[dict]:
        docs = await MyDocument.find(MyDocument.active == True).to_list()
        return [doc.model_dump() for doc in docs]

    async def find_by_name(self, name: str) -> dict | None:
        doc = await MyDocument.find(MyDocument.name == name).first_or_none()
        if doc is None:
            return None
        data = doc.model_dump()
        if doc.id:
            data["_id"] = str(doc.id)
        return data
```

---

## Query Cheat Sheet

Beanie query operators mirror Motor/pymongo but use Python syntax:

| Operation | Motor / pymongo | Beanie |
|---|---|---|
| Equal | `{"combo_id": "x"}` | `ARCombination.combo_id == "x"` |
| Array contains | `{"required_tags": "x"}` | `ARCombination.required_tags == "x"` |
| Array all | `{"required_tags": {"$all": ["a","b"]}}` | `ARCombination.required_tags.all(["a","b"])` |
| Array in | `{"required_tags": {"$in": ["a","b"]}}` | `ARCombination.required_tags.in_(["a","b"])` |
| Multiple filters | `find_one({...})` | `.find(F1 & F2)` or `.find(F1, F2)` |
| First or none | `find_one(...)` | `.first_or_none()` |
| Count | `count_documents(...)` | `.count()` |
| Skip/limit | `.skip(10).limit(20)` | same |
| Sort | `.sort("field")` or `.sort(-"field")` | same |

---

## Schema Validation

### Unknown Fields

Beanie **silently ignores** unknown fields on read (extra="ignore").  
Beanie **rejects** unknown fields on INSERT/UPDATE (strict schema).

This means:
- **Existing documents** with stray fields (e.g. `reward_points`, `combo_name`) still load fine.
- **New inserts** with unknown fields raise `ValidationError` immediately.
- The `ArCombinationSchema` DTO uses `extra="forbid"` for the same enforcement at the API boundary.

### Required Fields

All required fields (no default) raise `ValidationError` if missing on insert.  
Use `Optional[T] = None` or `T = Field(default=...)` for optional fields.

---

## Stray Fields in Existing Data

The 9 `ar_combinations` documents may contain legacy fields:

| Stray field | Source | Action |
|---|---|---|
| `reward_points` | Pre-migration | Strip before insert |
| `combo_name` | Pre-migration | Strip before insert |
| `target_order` | Pre-migration | Kept (nullable, deprecated) |

To clean up legacy data:

```python
# In a one-time migration script
result = await db["ar_combinations"].update_many(
    {"reward_points": {"$exists": True}},
    {"$unset": {"reward_points": "", "combo_name": ""}}
)
print(f"Cleaned {result.modified_count} documents")
```

---

## Adding Schema Fields (Auto-Migration)

Beanie handles **additive** schema changes automatically — new fields with defaults
are accepted on insert and default to `None`/`Field(default=...)` when missing.

For **non-additive** changes (rename, type change, remove field):

1. Write a migration script in `backend/database/migrations/`
2. Test against a staging DB copy
3. Run the migration
4. Update the Beanie model

Example rename migration:

```python
# backend/database/migrations/rename_field.py
async def migrate():
    result = await db["ar_combinations"].update_many(
        {"old_field_name": {"$exists": True}},
        {"$rename": {"old_field_name": "new_field_name"}}
    )
    print(f"Renamed {result.modified_count} documents")
```

---

## Rolling Back

If Beanie integration needs to be reverted:

1. **Revert `models/ar_combination.py`** — restore `ArCombinationSchema(BaseModel)` without `BeanieDocument`
2. **Remove `ARCombination`** from `document_models` in `database/connection.py`
3. **Restore raw Motor queries** in `repositories/ar_combination_repository.py`
4. **Restart the app** — MongoDB data is untouched

Beanie does not modify the MongoDB schema — it only validates what's written through it.

---

## Key Files

| File | Purpose |
|---|---|
| `database/connection.py` | `connect_to_database()` — registers all Beanie Documents |
| `database/mongodb.py` | `init_mongodb()` — Motor client + `init_beanie()` |
| `models/ar_combination.py` | `ARCombination` Beanie Document + `ArCombinationSchema` DTO |
| `repositories/ar_combination_repository.py` | Data access layer using Beanie queries |
| `api/combos.py` | FastAPI endpoints — uses `ArCombinationSchema` for responses |
