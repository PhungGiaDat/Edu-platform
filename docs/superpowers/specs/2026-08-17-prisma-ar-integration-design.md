# Spec: Connect Supabase PostgreSQL AR Tables via Prisma Introspection

**Date:** 2026-08-17
**Author:** Claude (Anthropic)
**Status:** Draft
**Branch:** `10-days-quick-run`

---

## 1. Overview

Migrate `ar_combinations` và `ar_objects` (hai PostgreSQL tables đã tồn tại trong Supabase) từ raw `asyncpg` SQL sang **Prisma Client**. Backend đã có schema trong Supabase, chỉ cần kết nối code với Prisma.

**Scope:**
- Chỉ AR domain: `ar_combinations`, `ar_objects`, `ar_tracking_targets`, `ar_combination_required_tags`
- Giữ nguyên SQLAlchemy + `orm_models/` cho `courses`, `lessons`, `quiz` (không đụng chạm)
- Giữ nguyên `asyncpg` pool (`postgres_connection.py`) — Prisma dùng connection string riêng
- Giữ nguyên Beanie/MongoDB cho các collections khác

---

## 2. Architecture

```
Supabase PostgreSQL
  ├── public.ar_combinations        ──► Prisma Client (NEW)
  ├── public.ar_combination_required_tags ──► Prisma Client (NEW)
  ├── public.ar_objects              ──► Prisma Client (NEW)
  ├── public.ar_tracking_targets     ──► Prisma Client (NEW)
  └── public.* (flashcards, pets...) ──► asyncpg (existing, untouched)

Backend Python
  ├── database/postgres_connection.py ──► asyncpg pool (existing, untouched)
  ├── database/orm_session.py         ──► SQLAlchemy session (existing, untouched)
  ├── database/orm_models/            ──► SQLAlchemy models (existing, untouched)
  ├── src/prisma/                     ──► Prisma schema + generated client (NEW)
  └── repositories/
        ├── ar_combination_repository.py ──► refactor: asyncpg → Prisma
        └── ar_object_repository.py    ──► refactor: asyncpg → Prisma
```

---

## 3. File Changes

### 3.1. New Files

#### `backend/src/prisma/schema.prisma`
Prisma schema introspected từ Supabase. Chỉ chứa 4 AR-related models:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/prisma/generated"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ar_combinations {
  combo_id          String   @id
  description       String
  required_tags     ar_combination_required_tags[]
  target_order     Json?
  model_3d_url     String
  texture_url       String?
  image_2d_url     String
  combo_mind_url   String?
  bonus_xp         Int      @default(100)
  center_transform Json?
  semantic_result  String?
  animation        String?
  sound            String?
  phrase           String?
  priority         Int      @default(0)
  active           Boolean  @default(true)
  flashcard_set    String?
  cross_category_allowed Boolean @default(false)
  created_at       DateTime?
  updated_at       DateTime?

  @@map("ar_combinations")
}

model ar_combination_required_tags {
  combo_id   String          @id @default(cuid())
  ar_tag     String
  tag_order  Int
  combo      ar_combinations @relation(fields: [combo_id], references: [combo_id], onDelete: Cascade)

  @@map("ar_combination_required_tags")
}

model ar_objects {
  ar_tag         String   @id
  model_3d_url  String?
  texture_url   String?
  image_2d_url  String?
  position      String?
  rotation      String?
  scale         String?
  animation_type String?
  glb_size      Int?
  marker_type   String?

  @@map("ar_objects")
}

model ar_tracking_targets {
  qr_id                  String  @id
  ar_tag                 String
  reference_image_url    String?
  physical_width_m       Float?

  @@map("ar_tracking_targets")
}
```

#### `backend/src/prisma/__init__.py`
Singleton PrismaClient wrapper:

```python
from prisma import Prisma

_client: Prisma | None = None

def get_prisma() -> Prisma:
    global _client
    if _client is None:
        _client = Prisma()
        # Uses DATABASE_URL env var automatically
    return _client
```

#### `backend/src/prisma/generated/` (auto-generated)
Output của `prisma generate` — không sửa tay.

---

### 3.2. Refactored Files

#### `backend/repositories/ar_combination_repository.py`
Thay `postgres_pool()` bằng Prisma client. Giữ nguyên interface (method signatures + return types):

```python
from src.prisma import get_prisma

class ARCombinationRepository:
    async def _hydrate(self, row) -> Optional[Dict[str, Any]]:
        # same as before

    async def get_by_combo_id(self, combo_id: str) -> Optional[Dict[str, Any]]:
        prisma = get_prisma()
        row = await prisma.ar_combinations.find_unique(
            where={"combo_id": combo_id},
            include={"required_tags": {"order_by": {"tag_order": "asc"}}}
        )
        return self._hydrate(row)

    async def find_by_tag(self, ar_tag: str) -> List[Dict[str, Any]]:
        prisma = get_prisma()
        rows = await prisma.ar_combinations.find_many(
            where={"required_tags": {"some": {"ar_tag": ar_tag}}},
            order_by={"priority": "desc"}
        )
        return [await self._hydrate(row) for row in rows]

    async def find_by_tags(self, ar_tags: List[str]) -> List[Dict[str, Any]]:
        prisma = get_prisma()
        rows = await prisma.ar_combinations.find_many(
            where={
                "required_tags": {
                    "every": {"ar_tag": {"in": ar_tags}}
                }
            }
        )
        filtered = [r for r in rows if len(r.required_tags) == len(ar_tags)]
        filtered.sort(key=lambda x: x.priority, reverse=True)
        return [await self._hydrate(row) for row in filtered]

    async def find_many(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        prisma = get_prisma()
        rows = await prisma.ar_combinations.find_many(
            skip=skip,
            take=limit,
            order_by={"priority": "desc"}
        )
        return [await self._hydrate(row) for row in rows]
```

#### `backend/repositories/ar_object_repository.py`
Thay `postgres_pool()` bằng Prisma:

```python
from src.prisma import get_prisma

class ARObjectRepository:
    async def get_by_tag(self, ar_tag: str) -> Optional[Dict[str, Any]]:
        prisma = get_prisma()
        row = await prisma.ar_objects.find_unique(where={"ar_tag": ar_tag})
        return dict(row) if row else None

    async def get_tracking_target(self, qr_id: str) -> Optional[Dict[str, Any]]:
        prisma = get_prisma()
        row = await prisma.ar_tracking_targets.find_unique(where={"qr_id": qr_id})
        return dict(row) if row else None

    async def get_all_tags(self) -> List[str]:
        prisma = get_prisma()
        rows = await prisma.ar_objects.find_many(order=[{"ar_tag": "asc"}])
        return [row.ar_tag for row in rows]
```

---

### 3.3. Unchanged Files

| File | Lý do |
|------|-------|
| `postgres_connection.py` | asyncpg pool vẫn dùng cho SQLAlchemy + raw SQL repos khác |
| `orm_models/` + `orm_session.py` | SQLAlchemy course/lesson/quiz — không liên quan |
| `flashcard_repository.py` | Raw asyncpg — giữ nguyên |
| `pet_repository.py` | Raw asyncpg — giữ nguyên |
| `main.py` | Không đổi |
| `settings.py` | Chỉ thêm Prisma env var nếu cần |

---

## 4. Prisma Setup Steps

### 4.1. Install Prisma in backend

```bash
cd backend
npm install prisma @prisma/client
# hoặc
pip install prisma  # dùng prisma py
```

**Lưu ý:** Backend là Python (FastAPI), không phải Node.js. Prisma có Python SDK (`prisma` pip package). Tất cả commands (`prisma generate`, `prisma db pull`) chạy bằng Python:

```bash
pip install prisma
prisma generate   # tạo generated client
```

### 4.2. Initialize Prisma

```bash
cd backend/src/prisma
prisma init --datasource-provider postgresql
```

Tạo `schema.prisma` với nội dung như 3.1.

### 4.3. Introspect database

```bash
# Set DATABASE_URL env (lấy từ backend/.env)
export DATABASE_URL="postgresql://postgres.rofprrtoeyirssfndxag:...@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
prisma db pull
```

Sẽ introspect và sinh schema. Clean up chỉ giữ lại 4 models AR.

### 4.4. Generate client

```bash
prisma generate
```

Output vào `backend/src/prisma/generated/`.

---

## 5. Environment Variables

File `backend/.env` đã có:

```
DATABASE_URL=postgresql://postgres.rofprrtoeyirssfndxag:Eduplatform2025%40@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Prisma tự đọc `DATABASE_URL` từ env — không cần thêm gì.

---

## 6. Testing

### 6.1. Backend startup test

```bash
cd backend
uvicorn main:app --reload --port 8000
# Kiểm tra /api/v1/combos/check endpoint
GET /api/v1/combos/check?tags=elephant_marker_01,jungle_marker_01
```

Kỳ vọng:
```json
{
  "found": true,
  "combo": {
    "combo_id": "jungle_scene_v1",
    "combo_mind_url": "https://...combo_targets.mind",
    "target_order": ["jungle_marker_01", "elephant_marker_01"],
    "required_tags": ["elephant_marker_01", "jungle_marker_01"],
    ...
  }
}
```

### 6.2. AR tracking test (LearnARV2)

- Quét thẻ elephant + jungle
- Kiểm tra combo được trigger
- Kiểm tra model đúng vị trí

---

## 7. Error Handling

- PrismaClient exception → wrap trong try/catch, return None (graceful degradation)
- Connection timeout → log error, fallback behavior
- Schema mismatch (missing column) → Prisma raises clear error at startup

---

## 8. Rollback Plan

Nếu Prisma integration lỗi, revert `ar_combination_repository.py` và `ar_object_repository.py` về asyncpg:

```bash
git checkout HEAD~1 -- backend/repositories/ar_combination_repository.py backend/repositories/ar_object_repository.py
```

Không ảnh hưởng database.

---

## 9. Future Work (Out of Scope)

- Migrate `flashcards`, `pets`, `pronunciation_attempts` sang Prisma
- Thay SQLAlchemy bằng Prisma
- Xóa `asyncpg` + `postgres_connection.py`
- Prisma migrations thay cho alembic

---

## 10. Checklist

- [ ] `npm install prisma @prisma/client` (hoặc `pip install prisma`)
- [ ] Tạo `backend/src/prisma/schema.prisma`
- [ ] `prisma db pull` introspect Supabase
- [ ] Clean schema chỉ giữ 4 AR models
- [ ] `prisma generate`
- [ ] Viết `backend/src/prisma/__init__.py`
- [ ] Refactor `ar_combination_repository.py`
- [ ] Refactor `ar_object_repository.py`
- [ ] Test backend startup
- [ ] Test `/api/v1/combos/check`
- [ ] Test AR tracking trên iPhone
