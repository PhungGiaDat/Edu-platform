# Design: Admin Course & Game Creation — Full Activation

**Date:** 2026-09-09
**Decision:** Option B (course + game đầy đủ) · Game scope = **A** (config từ engine có sẵn, không authoring engine mới)
**Research basis:** `docs/research/20260909_admin_course_game_creation_research.md`

---

## 1. Kiến trúc tổng thể

```
ADMIN (teacher)                          LEARNER (web)
┌─────────────────────────┐              ┌──────────────────────────┐
│ /admin/courses (fix)    │              │ GamesPage (dynamic)      │
│ /admin/games      (NEW) │              │  └─ GET /games/catalog   │
│  GameEditor       (NEW) │              │ /games/{slug}?topic=X    │
└───────────┬─────────────┘              └────────────┬─────────────┘
            │ adminApi / adminGamesApi                │ gamesVocabService
            ▼                                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ FastAPI /api/v1                                                  │
│  /admin/courses        (fix persist + update)                    │
│  /admin/games          (NEW: CRUD + topics + vocab + upload)     │
│  /games/catalog        (NEW: learner catalog)                    │
│  /games/vocab          (extend: admin vocab trước, fallback cũ)  │
└───────────┬──────────────────────────────────────────────────────┘
            ▼
   PostgreSQL: courses/lessons (sửa persist) + game_topics, games,
   game_vocab_items (MỚI) · Supabase Storage (media) · XP qua
   /gamification/xp-event (KHÔNG đổi — backend authoritative)
```

**Boundary giữ nguyên** (AGENTS.md): client → FastAPI → service/repo → PostgreSQL. Không client nào đụng DB. Không thêm Redis/Kafka/microservice.

---

## 2. Phase 1 — Course Unblock (P0, 9 mục)

| # | Fix | Thiết kế |
|---|-----|----------|
| 1 | **Route chi tiết course** | Thêm `<Route path="/admin/courses/:courseId" element={<Navigate to={`edit`} replace/>}>` — card click → edit page (tránh xây trang detail mới; YAGNI) |
| 2 | **Overlay chặn click** | `LexiTransitionOverlay` suppress cho mọi path `/admin/*` (cùng pattern AR/auth hiện có, `LexiTransitionOverlay.tsx:95-97`) |
| 3 | **Teacher role provisioning** | (a) `POST /api/v1/admin/users/{user_id}/role` — **chỉ is_superuser** gọi được; (b) `RequireTeacherRole` hiện thông báo "Tài khoản chưa có quyền giáo viên" thay vì redirect im lặng; (c) docs hoá `create_admin.py` |
| 4 | **Env alignment** | `frontend/.env.local`: `VITE_API_BASE=http://127.0.0.1:8000`; `backend/.env`: `DEV_ORIGINS` += `http://localhost:5173, http://127.0.0.1:5173` |
| 5 | **Persist media lessons** | Repo ghi `video` JSONB (`{"url": ...}`) + `media` JSONB (`{"images": [...]}`) khi create/update; `lessonToSession` đọc lại đúng shape. **Bước inspect-first:** xác nhận shape mà learner-side reader mong đợi trước khi code |
| 6 | **update_course FK 500** | Bỏ DELETE-all + INSERT; thay bằng per-lesson `INSERT ... ON CONFLICT (lesson_id) DO UPDATE` + chỉ xoá lesson bị remove khỏi payload → progress rows giữ nguyên |
| 7 | **is_template** | Alembic migration thêm `courses.is_template BOOLEAN DEFAULT FALSE`; thêm vào `COURSE_COLUMNS` + reads |
| 8 | **learning-goals 422** | Backend chuyển `user_id` từ query param vào `LearningGoalCreate` body (khớp frontend hiện tại) |
| 9 | **Lỗi tàng hình** | CourseManager: error banner + nút Retry thay console.error; ưu tiên sauP1 nếu thiếu thời gian |

**Ngoài scope P0 (ghi nhận, không làm):** unpublish control, draft preservation khi 401, courses/generate auth.

---

## 3. Phase 2 — Game Management (P1)

### 3.1 Data model (mới, 1 alembic migration)

```sql
game_topics (
  id UUID PK, slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, name_vi TEXT NOT NULL,
  description TEXT, cover_image_url TEXT,
  is_published BOOLEAN DEFAULT FALSE, sort_order INT DEFAULT 0,
  created_at/updated_at TIMESTAMPTZ
)

games (
  id UUID PK, slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL, title_vi TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN
    ('drag_match','catch_word','word_scramble','memory_match')),
  topic_id UUID FK→game_topics, config JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE, teacher_id UUID FK→users,
  created_at/updated_at TIMESTAMPTZ
)

game_vocab_items (
  id UUID PK, topic_id UUID FK→game_topics,
  word TEXT NOT NULL, translation_vi TEXT NOT NULL,
  image_url TEXT, audio_url TEXT, sort_order INT DEFAULT 0
)
```

**Quyết định scope:** `coloring` KHÔNG admin-configurable ở v1 (nội dung là SVG path tay-vẽ — cần asset pipeline riêng; documented limitation). 4 engine còn lại đủ vì đều ăn vocab + tuning.

**Seed:** migrate 4 topic hardcode hiện có (`animals, home, nature, school_food`) + vocab seed liên quan vào bảng mới để không regression.

### 3.2 Backend contract (mới, teacher-gated `get_current_teacher`)

```
ADMIN:
GET    /admin/games                          list (all teachers thấy được — tránh bug invisibility MEDIUM-8)
POST   /admin/games                          {title,title_vi,slug?,game_type,topic_id,config,is_published}
PUT    /admin/games/{id}                     partial update
DELETE /admin/games/{id}                     soft/archive
GET    /admin/games/topics                   list topics
POST   /admin/games/topics                   create topic
PUT    /admin/games/topics/{id}              update topic
GET    /admin/games/topics/{id}/vocab        list vocab của topic
POST   /admin/games/topics/{id}/vocab        add vocab item
PUT    /admin/games/vocab/{itemId}           update vocab item
DELETE /admin/games/vocab/{itemId}           delete vocab item
POST   /admin/games/upload-media             ảnh/audio → Supabase Storage (pattern flashcards upload-image)

LEARNER:
GET    /games/catalog                        {topics:[...], games:[...]} — chỉ is_published
GET    /games/vocab?topic=&limit=            (EXTEND) ưu tiên game_vocab_items của topic;
                                             fallback logic notebook/seed cũ nếu topic không có items
```

- Slug: tự derive từ title nếu không gửi; conflict → 409 với message thân thiện.
- Config JSONB validate theo game_type (pydantic discriminated schema):
  - `drag_match`: `pair_count` (1-8), `timer_seconds`
  - `catch_word`: `fall_speed`, `spawn_interval`
  - `word_scramble`: `word_count`, `hint_letters`
  - `memory_match`: `pair_count`, `flip_duration_ms`
- **UX teacher-friendly (revised 2026-09-09 theo feedback):** FE KHÔNG expose số kỹ thuật trực tiếp — thay bằng preset **Độ khó Dễ/Vừa/Khó** (frontend-only transform khi save, mặc định = Vừa):
  - `catch_word`: Dễ `0.8/1200ms` · Vừa `1.2/800ms` · Khó `1.6/500ms`
  - `drag_match`: Dễ `4 cặp/120s` · Vừa `6/90s` · Khó `8/60s`
  - `memory_match`: Dễ `4/1500ms` · Vừa `6/1000ms` · Khó `8/600ms`
  - `word_scramble`: Dễ `5 từ/3 hint` · Vừa `8/2` · Khó `10/1`
  - Panel "Nâng cao" (collapsible) cho phép chỉnh raw values và ghi đè preset.
- Upload media UX: dropzone kéo-thả + preview + progress + nút thay/xoá (SVG icons Lucide, không input file trần), nén client-side trước khi upload Supabase Storage. GameEditor có khung **Xem trước** mô phỏng màn chơi từ dữ liệu chủ đề.
- XP: **không đổi** — vẫn `/gamification/xp-event` idempotent, backend authoritative.

### 3.3 Frontend (mới)

- **Service:** `adminGamesApi` (trong `adminApi.ts` hoặc file riêng `gamesAdminApi.ts`)
- **Pages:** `pages/admin/GameManager.tsx` (list + delete), `pages/admin/GameEditor.tsx` (meta + topic select + vocab manager + form tuning theo game_type + publish toggle) — **copy pattern Course/Flashcard editor**
- **Routes:** `/admin/games`, `/admin/games/new`, `/admin/games/:gameId/edit` + nav item "Trò chơi" trong `AdminLayout` + i18n `en/vi`
- **GamesPage dynamic:** fetch `GET /games/catalog` → render topics/games thật; **fallback về hardcoded catalog hiện tại nếu API fail** (graceful degradation); daily-ceiling copy derive từ catalog thay vì chuỗi cứng "3 game × 4 chủ đề"

---

## 4. Data flow chính

**Tạo game:** Teacher → `/admin/games/new` → nhập meta + chọn topic + thêm từ (upload ảnh/audio) + tuning → Save → `POST /admin/games` (validate topic, slug, config) → back `/admin/games`.

**Learner chơi game mới:** GamesPage → `GET /games/catalog` → chọn game + topic → `/games/{slug}?topic=X` → `fetchGameVocab(topic)` → `GET /games/vocab` trả vocab admin → chơi → XP event (idempotent, như cũ).

**Tạo course (sau fix):** Teacher → form → submit → POST persist đầy đủ (kể cả video/images/is_template) → mở lại editor thấy đủ nội dung; learner thấy media.

---

## 5. Error handling

| Lớp | Xử lý |
|-----|-------|
| Admin pages (cả course & game) | Error banner + Retry (thay console.error) — 1 pattern dùng chung |
| Slug conflict | 409 → message "Tên đã tồn tại, chọn tên khác" |
| Config sai schema | 422 pydantic → surfaced qua detail như hiện tại |
| Catalog API fail | GamesPage fallback hardcoded (learner không bao giờ thấy trang trắng) |
| 401 giữa edit | giữ nguyên hành vi redirect (out of scope); note trong spec |

---

## 6. Testing & Verification

**Backend pytest:**
- Games CRUD: teacher OK / learner 403 / unauth 401; slug 409; config validation theo type
- Topics + vocab CRUD; `/games/vocab` ưu tiên admin items + fallback regression
- Course regression: update course có learner progress **không còn 500**; media round-trip (create → read → video/images/is_template đủ)
- Migration up/down sạch

**Frontend vitest:**
- GameEditor validation + submit payload shape
- GameManager render + delete confirm
- GamesPage catalog fetch + fallback path
- CourseEditor mapping video/image (lessonToSession/sessionToLesson round-trip)

**Runtime (Web Release Gate):**
- RUNTIME_VERIFIED mobile-browser: teacher login → tạo course có media → reopen thấy media → learner vào course thấy media
- Tạo game mới (topic + 8 từ) → game xuất hiện ở GamesPage → chơi được → XP cộng đúng 1 lần khi retry (idempotency giữ nguyên)

---

## 7. Thứ tự triển khai (cho writing-plans)

1. **P0-A:** Env + route missing + overlay suppress + role message (frontend nhỏ, unblock ngay)
2. **P0-B:** Backend course fixes (persist media, update upsert, is_template migration, learning-goals body)
3. **P1-A:** Migration game tables + seed 4 topics
4. **P1-B:** Backend admin games endpoints + catalog + vocab extend
5. **P1-C:** Frontend adminGamesApi + GameManager + GameEditor + routes/nav/i18n
6. **P1-D:** GamesPage dynamic + fallback + ceiling derive
7. **P2:** Tests + mobile-browser runtime verify + progress docs

**Ước lượng tương đối:** P0 ~30% · P1 ~60% · P2 ~10% công việc.
