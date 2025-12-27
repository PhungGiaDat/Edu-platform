# Database Configuration Guide

## Overview

Edu-platform backend hỗ trợ **2 hệ database song song**:

| Database | Use Case | ORM |
|----------|----------|-----|
| **MongoDB** | Flashcards, AR assets, Game data, Quiz questions | Motor (async) |
| **PostgreSQL (Supabase)** | Users, Authentication, Learning progress, Analytics | SQLAlchemy |

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Tạo file `.env` trong folder `backend/`:

```env
# MongoDB (Required)
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
MONGO_DB=eduplatform

# PostgreSQL/Supabase (Optional - for user management)
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### 3. Create Tables (First Time)

```python
# Run once to create PostgreSQL tables
from database import pg_connector

async def setup():
    if pg_connector:
        await pg_connector.create_tables()
```

## Usage in Routers

### MongoDB (Flashcards, AR, Games)

```python
from fastapi import APIRouter, Depends
from database import get_database

router = APIRouter()

@router.get("/flashcards")
async def get_flashcards(db = Depends(get_database)):
    # db is MongoDB database instance
    collection = db["flashcards"]
    flashcards = await collection.find({}).to_list(100)
    return flashcards
```

### PostgreSQL (Users, Progress)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_pg_session
from models.user import User

router = APIRouter()

@router.get("/users")
async def get_users(db: AsyncSession = Depends(get_pg_session)):
    # db is SQLAlchemy AsyncSession
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users

@router.post("/users")
async def create_user(user_data: dict, db: AsyncSession = Depends(get_pg_session)):
    user = User(**user_data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

## Architecture

```
database/
├── __init__.py          # Exports all database utilities
├── connection.py        # MongoDB + PostgreSQL connection manager
├── postgres.py          # SQLAlchemy async setup for Supabase
├── mongodb.py           # Motor async MongoDB connector
└── mongo_config.py      # Legacy config (deprecated)

models/
├── user.py              # SQLAlchemy models (PostgreSQL)
├── flashcard.py         # Pydantic models (MongoDB)
└── ...
```

## Which Database for What?

| Feature | Database | Reason |
|---------|----------|--------|
| Flashcards | MongoDB | Flexible schema, nested data |
| AR Objects | MongoDB | Binary data references, complex queries |
| Quiz Questions | MongoDB | Dynamic question formats |
| Game Data | MongoDB | Nested structures |
| **Users** | PostgreSQL | ACID compliance, relationships |
| **Auth/Sessions** | PostgreSQL | Security, transactions |
| **Learning Progress** | PostgreSQL | Analytics, joins with users |
| **Leaderboards** | PostgreSQL | Efficient sorting, aggregations |

## Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Database** → **Tables**
4. Tables will be auto-created from SQLAlchemy models

## Troubleshooting

### Connection Errors

```python
# Test MongoDB
from database import db_manager
await db_manager.ping()  # Returns True if connected

# Test PostgreSQL
from database import pg_connector
await pg_connector.test_connection()  # Returns True if connected
```

### "DATABASE_URL not set"

PostgreSQL is optional. If not configured, the app will run with MongoDB only.

```python
# Check if PostgreSQL is available
from database import pg_connector
if pg_connector:
    # Use PostgreSQL features
    pass
else:
    # Fallback to MongoDB only
    pass
```
