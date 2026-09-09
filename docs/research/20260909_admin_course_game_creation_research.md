# Research: Admin/Teacher Course & Game Creation "Chưa Họa Động"

**Date:** 2026-09-09
**Mode:** YOLO research (`/cook`) — 3 parallel explore agents (frontend-course / frontend-game / backend-contract)
**Status:** Research complete — implementation NOT started (awaiting direction per brainstorming HARD-GATE)

---

## Executive Summary

Tính năng **tạo khóa học** **CÓ tồn tại và code hoàn chỉnh** (frontend editor 1071 dòng + backend POST/PUT/DELETE đầy đủ, không stub nào), nhưng bị **chuỗi 5 lỗi chặn theo tầng**, khiến nó "chưa họa động" với người dùng thật:

```
[1] Không có account nào có role teacher qua API
      → RequireTeacherRole im lặng redirect về /profile  (KHÔNG VÀO ĐƯỢC admin UI)
[2] Route /admin/courses/:courseId không tồn tại
      → click course card = TRẮNG TRƠN (React Router render nothing)
[3] LexiTransitionOverlay chặn mọi click ~1.6s sau mỗi lần navigate admin
      → form "đơ" ngay sau khi mở
[4] frontend/.env.local trỏ 127.0.0.1:8002, backend mặc định PORT=8000
      → mọi API call fail âm thầm (CourseManager chỉ console.error)
[5] Backend drops video_url/images/is_template + update_course DELETE+INSERT
      → save "thành công" nhưng nội dung biến mất / 500 trên course đã có learner
```

Tính năng **tạo game** thì **KHÔNG TỒN TẠI** ở cả 2 phía — không phải "bị hỏng":
- Không có page/route/nav/i18n/service nào cho game management trong `frontend/src/pages/admin/` + `features/admin/`
- Không có endpoint POST/PUT nào cho game trong toàn bộ backend (chỉ có GET learner-side)
- Game catalog + topics là **hardcode TS** (`GamesPage.tsx:20-24`, `gamesVocabService.ts:13,56-61`)
- Proxy gần nhất (tạo flashcard) bị chặn bởi `AR_OBJECT_NOT_CONFIGURED` → 422

---

## Root-Cause Chain (ranked, cross-validated)

### CRITICAL-1 — Không thể có teacher account qua API (backend)
- `POST /auth/register` → `PostgresUserRepository.create` **hardcode `role='learner', is_superuser=False`**, bỏ qua field `role` gửi lên (`backend/repositories/postgres_user_repository.py:89-97`, `backend/api/auth.py:45-72`)
- **Không có endpoint nào promote role** (grep role-grant: 0 match). Đường duy nhất = CLI script `backend/scripts/create_admin.py:51-65`
- `get_current_teacher` yêu cầu `is_superuser` hoặc `role in (teacher, admin)` (`backend/core/security.py:145-175`)
- Frontend guard `RequireTeacherRole` redirect non-teacher về `/profile` **không thông báo** (`frontend/src/App.tsx:230-243`)
- ⇒ **Mọi account mới đăng ký đều không thể thấy/tạo course**. Triệu chứng trông y như "nút không ăn".

### CRITICAL-2 — Route `/admin/courses/:courseId` không tồn tại (frontend)
- `CourseManager.tsx:117` navigate đến `/admin/courses/${courseId}` khi click card
- `App.tsx:340-357` chỉ đăng ký `/admin/courses`, `/admin/courses/new`, `/admin/courses/:courseId/edit` — **không có route chi tiết, không có catch-all `*`**
- React Router v6 render `null` → **màn hình trắng**. Nút Edit (→ route đã đăng ký) vẫn hoạt động nên bug bị che khi test một phần.

### CRITICAL-3 — "Tạo game" không tồn tại như một contract (both sides)
- **Frontend:** 0 match grep `GameEditor|CreateGame|createGame|AdminGame` toàn `frontend/src`; `pages/admin/` có 9 file, không file nào về game; nav `AdminLayout.tsx:18-24` không có game; `adminApi.ts` không có games API; i18n admin không có key game
- **Backend:** `api/game.py` chỉ có 1 route GET `/game/{qr_id}` (derives từ flashcard); `api/games_vocab.py` chỉ GET `/games/vocab`; `GameService` không có create/update
- Game content hiện tại tới learner qua: (a) vocab endpoint + hardcode topic enum, (b) AR challenge từ flashcard, (c) 2 game hoàn toàn hardcode (`ColorLearnGame.tsx:25-32`, `ColorAnimalGame.tsx:46-335`)
- **Không có API trả danh sách topics/games** → tạo game mới bằng admin data là bất khả thi mà không sửa frontend enum trước

### HIGH-4 — LexiTransitionOverlay nuốt click ~1.6s (frontend)
- Overlay global `position:fixed; inset:0; z-index:9999` trên mọi route change, trừ AR/auth (`LexiTransitionOverlay.tsx:67, 95-97, 106-116`; mount tại `App.tsx:369-371`)
- 1.2s visible + 0.4s fade, trong đó mọi pointer event bị chặn. Trên mobile = "page không phản hồi".

### HIGH-5 — Port/CORS sai cấu hình dev (config)
- `frontend/.env.local:1` = `http://127.0.0.1:8002`; backend default `PORT=8000` (`backend/settings.py:110`) — `.env.local` override `.env` (Render URL) theo Vite precedence
- `backend/.env:32` `DEV_ORIGINS=http://127.0.0.1:8081` đè defaults → mở app tại `127.0.0.1:5173` bị CORS block (Bearer + credentials); `localhost:5173` thì OK

### HIGH-6 — Backend âm thầm mất dữ liệu + 500 khi update (backend)
- `create_course`/`update_course` INSERT chỉ `(lesson_id, course_id, title, title_vi, description, lesson_order, duration_minutes, content)` — **`video_url`, `images`, `is_template` bị drop** dù schema API nhận (`admin_repository.py:336-352, 392-404`; `admin_models.py:197-217`); PG lưu video ở `video JSONB`/`media JSONB` nhưng repo không ghi (`20260812_01_mobile_core.sql:83-84`)
- `update_course` DELETE toàn bộ lessons rồi INSERT lại → FK `ON DELETE RESTRICT` từ `user_course_lesson_progress`/`lesson_sessions` (**500** nếu course đã có learner tương tác) (`admin_repository.py:388-404`; migration `:161-172`)
- Course từ path khác có `teacher_id=NULL` → **không admin nào thấy được** (mọi query scope `teacher_id=$1`, `admin_repository.py:270,295`; `course_repository.upsert_course:104` insert không teacher_id)

### HIGH-7 — Tạo flashcard (proxy gần nhất của "tạo game asset") bị chặn (backend)
- `create_flashcard` gọi `_require_valid_ar_object(ar_tag)` → **422 `AR_OBJECT_NOT_CONFIGURED`** nếu chưa có row trong `public.ar_objects` (`admin_repository.py:561-563`; `admin.py:340-348`)
- Frontend **luôn** auto-generate `ar_tag` mới (`FlashcardEditor.tsx:121-126`) và **không có UI/API nào để tạo ar_objects trước** → flow chết từ đầu

### MEDIUM-8 — Contract mismatch phụ
- `POST /admin/learning-goals`: frontend gửi `user_id` trong body (`adminApi.ts:330-334`), backend khai báo là **query param** (`admin.py:551-554`) → 422
- `apiClient.ts` chứa phantom endpoints không tồn tại ở backend: `/admin/seed/*`, `/admin/users*`, `/admin/stats`, `/admin/analytics`, `/games/score` (404 nếu có code gọi)
- `POST /courses/generate`, lesson-complete, quiz-submit: **không có auth dependency** (lỗ hổng phụ)
- `FlashcardPage.tsx:130-133` navigate `/game?type=...` nhưng không có route `/game` → dead link

### MEDIUM-9 — UX tàng hình lỗi
- `CourseManager` load/delete error chỉ `console.error`, UI vẫn hiện empty-state "Chưa có khóa học" (`CourseManager.tsx:39-43, 66-72`)
- Auth 401 giữa chừng khi edit → wipe storage + redirect login, mất draft (`apiClient.ts:127-135`)

---

## Evidence Table (chọn lọc)

| # | Claim | File:Line |
|---|---|---|
| 1 | Register hardcode learner role | `backend/repositories/postgres_user_repository.py:89-97` |
| 2 | Teacher guard silent redirect | `frontend/src/App.tsx:230-243` |
| 3 | Card click → route không tồn tại | `frontend/src/pages/admin/CourseManager.tsx:117` vs `frontend/src/App.tsx:340-357` |
| 4 | Overlay chặn click | `frontend/src/features/.../LexiTransitionOverlay.tsx:67,106-116` + `App.tsx:369-371` |
| 5 | Port mismatch | `frontend/.env.local:1` vs `backend/settings.py:110` |
| 6 | Repo drops media columns | `backend/repositories/admin_repository.py:336-352,392-404,24-29` |
| 7 | Update → FK RESTRICT 500 | `admin_repository.py:388-404` + `backend/alembic/.../20260812_01_mobile_core.sql:161-172` |
| 8 | teacher_id scoping | `admin_repository.py:270,295` + `course_repository.py:104` |
| 9 | Flashcard AR 422 | `admin_repository.py:561-563`, `admin.py:340-348`, `FlashcardEditor.tsx:121-126` |
| 10 | Không có game admin surface | `AdminLayout.tsx:18-24`, `adminApi.ts:33-372`, `App.tsx:340-357` |
| 11 | Games hardcode | `GamesPage.tsx:20-24`, `gamesVocabService.ts:13,56-61` |
| 12 | learning-goals 422 | `adminApi.ts:330-334` vs `admin.py:551-554` |

---

## Kịch bản tái hiện symptom (nếu muốn verify runtime)

1. Đăng ký account mới → login → click "Tạo khóa học" ở profile/admin link → **bị đẩy về /profile im lặng** (CRITICAL-1)
2. Dùng account teacher (tạo bằng `create_admin.py`) → vào `/admin/courses` → **click card** → màn trắng (CRITICAL-2); hoặc nếu bấm "Tạo khóa học" → form mở → **bấm gì cũng không ăn trong ~1.6s** (HIGH-4)
3. Backend chạy port 8000, frontend 8002 → list rỗng vĩnh viễn, submit báo lỗi kết nối (HIGH-5)
4. Nếu connect đúng port + tạo course có video/image → save OK nhưng **mở lại editor: media biến mất** (HIGH-6); course có learner → update → **500** (HIGH-6)

---

## Phương án xử lý đề xuất (3 options)

### Option A — "Unblock the Critical Path" (RECOMMENDED)
Fix chuỗi chặn để course-creation thực sự dùng được E2E; game creation làm theo pattern Course/Flashcard ở phase sau.
1. Route `/admin/courses/:courseId` (+ có thể là course detail page hoặc redirect về edit) — nhỏ
2. Admin route suppression cho LexiTransitionOverlay — ~5 dòng
3. Teacher-role provisioning: script seed + (tuỳ chọn) promote-by-superuser endpoint — nhỏ
4. Env alignment: `.env.local` → 8000, thêm DEV_ORIGINS 5173 — config
5. Backend: persist `video_url/images/is_template` vào `video/media` JSONB + fix update_course (soft-upsert thay DELETE+INSERT) — vừa
6. Fix learning-goals query/body mismatch — 1 dòng
7. Hiện lỗi UI thay console.error trong CourseManager — nhỏ

*Trade-off:* không có admin game UI ngay, nhưng vertical slice Auth→Course→Lesson đạt RUNTIME_VERIFIED trước (đúng priority AGENTS.md).

### Option B — Full admin surface (course + game cùng lúc)
Option A + xây Game Management hoàn chỉnh: `GameEditor` page + `/admin/games` routes + `adminGamesApi` + backend `POST/PUT /admin/games` + topics/games catalog data-driven (thay hardcode enum) + schema `game_config`.
*Trade-off:* scope lớn (~game contract mới hoàn toàn), rủi ro kéo dài thời gian trước khi có bất kỳ thứ gì demo được.

### Option C — Chỉ backend contract, UI tối thiểu
Fix backend (role, persist, update, mismatch) + một trang admin đơn giản form thuần cho course; game để sau.
*Trade-off:* nhanh nhất backend sạch, nhưng UX admin vẫn thô.

---

## Next Steps (sau khi user chọn option)

1. Brainstorm → design doc cho option được chọn (`docs/superpowers/specs/`)
2. `writing-plans` → implementation plan
3. Thực thi (best-of-n-solving nếu task có nhiều cách giải đáng cân nhắc)
4. Verification: RUNTIME_VERIFIED mobile-browser theo Web Release Gate
