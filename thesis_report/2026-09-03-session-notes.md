# Session Notes — 2026-09-03

Tổng hợp toàn bộ công việc đã thực hiện trong session này (dành cho báo cáo tốt nghiệp).

---

## 1. Sửa lỗi "Lưu vào Sổ tay" (Tra từ → Notebook)

### Nguyên nhân gốc (2 lớp)
1. **Render `BAI_API_KEY` sai** → LLM cascade chết → `POST /dictionary/lookup` trả 503
   ("Dịch vụ tra từ đang bận") → DefinitionCard không render → không đến được nút lưu.
2. **Bug cascade code**: khi `TOKENROUTER_API_KEY` không set, `_cascade_entries()` vẫn
   construct `ChatOpenAI(api_key="")` → raise `OpenAIError: Missing credentials` ngay lúc
   build → cascade chết **trước khi** thử B.AI (kể cả khi B.AI healthy).

### Đã sửa (commit `83c8d28`)
- `backend/services/llm_clients.py`: thêm `_has_configured_key()` (SecretStr("") vẫn
  truthy — phải check nội dung); cascade + health ping bỏ qua provider thiếu/blank key.
- `backend/services/llm_health.py`: cùng guard cho `configured_providers()`.
- `frontend/src/pages/NotebookPage.tsx`: `fetchTopics` dùng `apiClient` thay relative
  `fetch()` (topics 404 trên deploy có origin khác API).
- Regression tests: key missing / blank key / không provider nào.

### Verify
- Runtime E2E mô phỏng env Render (TokenRouter=None): register → login → lookup 200 →
  save 201 → list — toàn bộ pass.
- 41/41 backend + 10/10 frontend tests.
- Người dùng tự cập nhật key B.AI trên Render (`***lguz` → healthy).

---

## 2. UI Claymorphism 2 trang từ vựng (commit `fc314f6`)

- **DefinitionCard**: khối "Nghĩa tiếng Việt" mint (hero), khối "Giải thích dễ hiểu"
  lavender, chip từ loại pastel theo POS, save-bounce animation
  (`prefers-reduced-motion` aware).
- **NotebookPage**: header gradient rounded, thẻ từ màu pastel ổn định theo hash từ
  (trẻ nhận ra "từ của mình"), chip độ khó có nhãn (Dễ/Vừa/Khó), empty-state thân thiện.
- **ClayFloat3D** (mới): R3F floating clay shapes — lazy chunk (three-vendor),
  ErrorBoundary fallback khi WebGL unavailable, DPR cap 1.5, low-power, reduced-motion
  safe, pointer-transparent + aria-hidden.

---

## 3. `explanation_vi` — giải thích tiếng Việt persisted (Option B)

- Migration `20260902_01_notebook_explanation_vi.sql`: `ADD COLUMN IF NOT EXISTS
  explanation_vi TEXT` — **đã áp vào Supabase thật**.
- 7 layers đồng bộ: repo INSERT/SELECT, service (safety-check), Pydantic
  Create/Update/Response, API `_format_entry`, types TS, `handleSave` gửi field,
  NotebookEntryDetail hiển thị.
- LLM prompt sinh "1-2 câu tiếng Việt dễ hiểu cho trẻ 5-8 tuổi".
- E2E: save sunflower → 201 → GET lại nguyên vẹn từ DB.

---

## 4. Kid SM-2 no-fail + Hộp Leitner + XP (migration `20260903_01`)

### Nghiên cứu (researcher agent)
So sánh 10 phương án: SM-2 nguyên bản, FSRS, Leitner, Mastery Ladder, Spiral
Curriculum, Success-Rate, HLR (Duolingo), Hybrid. **Chọn Hybrid: SM-2 điều chỉnh
+ hiển thị hộp** — engine thích ứng + metaphor trẻ hiểu.

### Phát hiện bug SM-2 cũ
- Interval nổ vô hạn: 1→6→17→48→140→**420 ngày** (từ biến mất hơn 1 năm).
- Fail = hard reset về ngày 1 + trừ EF nặng → gây nản trẻ.
- **IDOR**: `update_sm2_review` không check user_id → user A sửa được entry user B.
- `review_history` chết (không bao giờ INSERT) → không có data tune sau này.
- UX chỉ gửi quality 1/5 → SM-2 6-mức thành dead code.

### Thiết kế no-fail (đã duyệt)
```
"Đã biết" (quality ≥ 3) → Hộp +1 (max 5), EF +0.05 (cap 2.2)
  Ladder: Hộp1=1 ngày → Hộp2=3 → Hộp3=7 → Hộp4=14 → Hộp5=30 (nở hoa 🌸)
"Học lại" (quality < 3) → Hộp GIỮ NGUYÊN, EF giữ nguyên, hẹn NGÀY MAI
→ Không có nhánh phạt nào — hộp chỉ đi lên.
```

### Migration `20260903_01` (đã áp vào Supabase thật)
- `mastery_box SMALLINT DEFAULT 1 CHECK (1-5)` + backfill từ interval cũ + clamp
  (interval >30 → 30, EF >2.2 → 2.2).
- `update_sm2_review(p_card_id, p_user_id VARCHAR, p_quality)`: ownership enforced
  (fix IDOR), ladder theo hộp, relearn → interval 1.
- `review_history.user_id` chuyển UUID→VARCHAR(64) + FK về `public.users` (đúng
  convention project); notebook user FK cũng được khôi phục.
- Ghi review_history mỗi lần review (ledger cho tương lai).
- Lưu ý kỹ thuật: `public.users.id` là **VARCHAR(64)** — mọi FK user_id phải
  VARCHAR, KHÔNG dùng UUID.

### XP idempotent (backend-authoritative)
- `XP_REWARDS`: `notebook_review_completed: 5`, `notebook_box_up: 5`.
- `event_id` client-generated, **pre-check TRƯỚC khi apply SM-2** → replay trả cached
  state, không double-apply progress lẫn XP. Legacy key: `notebook_review:{entry}:{count}`.
- Hộp 5 lần đầu → sticker "Word Master" (rare) qua `has_sticker`/`collect_sticker`.
- `PostgresGamificationService`: thêm `find_event()` + `has_sticker()`.
- Lỗi học được: ban đầu đặt key từ review_count sau khi apply → retry double-apply;
  đã sửa bằng pre-check bằng event_id client.

### E2E đã chạy (trên Supabase thật)
| Test | Kết quả |
|---|---|
| Know review → box 2→3, interval 7, +10 XP | ✅ |
| Ladder tiếp 14 → 30 (cap) | ✅ |
| Replay cùng event_id → không đổi state, XP cached | ✅ |
| Relearn → interval 1 (mai), box giữ nguyên, +5 XP | ✅ |
| Sticker khi đạt hộp 5 | ✅ |
| IDOR: user lạ review entry người khác → 404 | ✅ |

---

## 5. Web Push "Thời điểm vàng" (migration `20260903_02`)

### Hạ tầng có sẵn (phát hiện)
`sw.js` + `sw-notifications.js` + `NotificationSettingsPage` + manifest PWA đã có
nhưng **đường ống rỗng**: VAPID placeholder giả, không backend push, settings chỉ
localStorage.

### Ràng buộc iOS 16.4+ (đã xử lý)
- Push CHỈ trong standalone PWA → gate `isStandalonePwa()` + thẻ hướng dẫn cài
  (Chia sẻ → Thêm vào Màn hình chính — đúng flow người dùng cung cấp).
- Xin quyền phải từ user gesture → nút "🌱 Bật nhắc nhở cho con".
- `pushsubscriptionchange` handler trong SW (Apple xoay subscription).
- Notification actions không render trên iOS → default tap → `/flashcards`.
- `showTrigger` không có trên iOS → lịch do server dispatch (cron).

### Triển khai
- `requirements.txt`: + `pywebpush>=1.14`.
- `scripts/generate_vapid_keys.py` (py_vapid): sinh key — **đã sinh, public key
  `BNxsVShocuMkSEHC8QwN4xa7uw6H3kB7mwxdbMtqQ34qmByzlsuFawOQOaD5XyeiJY4nbQSvy3VmdnLBd9B55Ak`**;
  private PEM gitignored (`**/vapid_private.pem` trong .gitignore).
- settings: `VAPID_PUBLIC_KEY/PRIVATE_KEY/CLAIM_SUB`, `NOTIFICATION_DISPATCH_SECRET`,
  quiet hours 20:30–07:30.
- Migration `20260903_02`: `push_subscriptions` (endpoint UNIQUE, user_id
  VARCHAR(64)), `notification_prefs` (1 giờ/ngày, tz) — **đã áp vào Supabase thật**.
- `repositories/notifications_repository.py`: upsert/delete/mark_pushed/
  `get_dispatch_candidates` (enabled + có due cards + chưa push 20h).
- `api/notifications.py`: `GET /vapid-key`, `POST/DELETE /subscribe`,
  `GET/PUT /prefs`, `POST /internal/dispatch` (secret header + quiet hours).
- `services/web_push_service.py`: pywebpush + 3 template copy giọng pet
  (không guilt), stale subscription (410/404) → tự dọn.
- Frontend: `services/notifications.ts` (iOS-aware subscribe flow),
  `NotificationSettingsPage` rewrite (3 trạng thái: chưa cài → hướng dẫn; chưa bật
  → nút bật; đã bật → quản lý giờ), `sw-notifications.js` rewrite (bỏ fake VAPID,
  pushsubscriptionchange, focus-or-navigate).
- **Cron 0 VNĐ**: `.github/workflows/notify-daily.yml` — 10:00 UTC (17:00 VN) gọi
  dispatch qua secret header; non-fatal (miss 1 ngày OK, không retry spam).
- Ethics: max 1 push/ngày, không FOMO, phụ huynh kiểm soát, quiet hours server-side.

### Cần làm khi deploy (Người dùng)
1. Render env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (PEM), `VAPID_CLAIM_SUB`,
   `NOTIFICATION_DISPATCH_SECRET` (random string).
2. GitHub secrets: `NOTIFICATION_DISPATCH_SECRET`, `BACKEND_BASE_URL`.
3. Chạy `python scripts/generate_vapid_keys.py` lại nếu cần key mới (đã gitignore PEM).

---

## 6. Files thay đổi trong session (chưa commit)

### Backend
- `services/llm_clients.py`, `services/llm_health.py` (fix cascade — đã commit)
- `models/dictionary.py`, `services/dictionary_service.py` (explanation_vi — đã commit)
- `models/notebook_entry.py`: mastery_box, event_id, ReviewResultResponse mở rộng
- `models/gamification_model.py`: +2 XP actions
- `repositories/notebook_repository.py`: user_id vào SM-2 call, mastery_box selects
- `repositories/notifications_repository.py` (mới)
- `services/notebook_service.py`: submit_review docstring no-fail
- `services/web_push_service.py` (mới)
- `services/postgres_gamification_service.py`: find_event + has_sticker
- `api/notebook.py`: review endpoint idempotent pre-check + XP + sticker
- `api/notifications.py` (mới), `api/__init__.py`, `main.py`: đăng ký router
- `requirements.txt`: pywebpush
- `settings.py`: VAPID + dispatch secrets
- `migrations/20260902_01_notebook_explanation_vi.sql` (đã áp)
- `migrations/20260903_01_kid_sm2_no_fail_hybrid.sql` (đã áp)
- `migrations/20260903_02_push_subscriptions.sql` (đã áp)
- `scripts/generate_vapid_keys.py` (mới)

### Frontend
- `services/notebookApi.ts`: event_id + ReviewResult mở rộng
- `services/notifications.ts` (mới)
- `pages/FlashcardsPage.tsx`: no-fail requeue, XP toast, BOX_STAGES, positive copy
- `pages/NotificationSettingsPage.tsx`: rewrite 3-trạng-thái
- `pages/NotebookPage.tsx`, `features/dictionary/components/DefinitionCard.tsx`
  (đã commit fc314f6)
- `shared/components/clay/ClayFloat3D.tsx` (mới — đã commit)
- `public/static/js/sw-notifications.js`: rewrite
- `types/notebook.ts`, `types/dictionary.ts`
- `__tests__/pages/FlashcardsPage.test.tsx` (mới), NotebookPage test mock update

### CI
- `.github/workflows/notify-daily.yml` (mới)

---

## 7. Verification tổng

| Suite | Kết quả |
|---|---|
| Backend pytest (notebook_rich_fields, dictionary, llm_clients, gamification_idempotency) | **78/78** |
| Frontend vitest (Flashcards, Notebook, Dictionary) | **12/12** |
| `tsc -b` + vite build | ✅ 28.55s |
| Live E2E kid SM-2 (Supabase thật): ladder, replay, relearn, sticker, IDOR | ✅ tất cả |
| Migrations áp vào Supabase thật | ✅ 20260902_01, 20260903_01, 20260903_02 |

---

## 8. Việc còn mở

1. **Commit + push** các thay đổi mục 4-5 (Render sẽ redeploy).
2. Render env vars (VAPID + dispatch secret) — người dùng tự thêm.
3. GitHub secrets cho workflow notify-daily.
4. Verify push thật trên iPhone (cài PWA → bật → nhận notification) — cần
   thiết bị thật, không emulate được.
5. Enhancement còn backlog: Vườn Từ Vựng 3D, audio-first flashcards (TTS),
   câu chuyện 3 câu cuối buổi, Feed-the-Pet.
6. Lỗi process học được: PowerShell Add-Content làm hỏng encoding UTF-8 file TSX
   (phải restore từ git + viết lại) — KHÔNG dùng PowerShell cho file có dấu tiếng Việt.

---

*Ghi chú tự động bởi SDLC session 2026-09-03. Tất cả số liệu đã verify bằng lệnh thật.*
