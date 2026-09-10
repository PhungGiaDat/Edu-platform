# Design Options: App-wide Language Setting (VI/EN) — FOR APPROVAL

**Date:** 2026-09-10 · **Status:** AWAITING USER APPROVAL (no implementation)
**Note:** LocaleContext.tsx có thay đổi chưa commit từ lượt bị ngắt (interpolation `{{var}}` + 17 keys profile/games) — mọi approach đều giữ lại được.

---

## 1. Inventory hiện trạng (research)

| Bề mặt | Cơ chế hiện tại | Respond to setting? |
|---|---|---|
| Sidebar (desktop) + LandingPage | `useLocale()` + có sẵn **LanguageToggle** | ✅ |
| 13 pages/components: CourseList, CourseDetail, LessonPlayer, EnhancedLessonPage, AnimalsAdventure, LearningPathSetup, Login, Register, BreakReminder, CourseLearningBlocks... | `useLocale()` (369 keys dict en+vi) | ✅ |
| Admin pages (GameManager, GameEditor, CourseEditor...) | `useTranslation()` + admin.json | ✅ |
| **Profile.tsx** | string cứng (EN/VN lẫn lộn); nút admin (hôm qua) dùng i18n | ⚠️ một phần |
| **GamesPage.tsx** | 6 chuỗi VN cứng | ❌ |
| **pages/games/***.tsx (DragMatch, MemoryPairs) | 2 chuỗi VN cứng mỗi file | ❌ |
| ColorLearnGame, ColorAnimalGame | hầu như không có text UI động | n/a |

**Switch UI hiện có:** LanguageToggle ở Sidebar desktop + Landing. **Không có setting ở Profile** (surface mobile-first chính).

---

## 2. Ba phương án (best-of-n)

### A — LocaleContext-consolidation: dict là nguồn duy nhất cho learner
- Migrate GamesPage + games pages + Profile → `useLocale.t()`; thêm **Language settings card ở Profile**; admin giữ admin.json.
- **Effort:** ~7 files, ~30 strings. **Risk:** THẤP (pattern 16 files đã dùng).
- **Con:** 2 hệ thống song song vĩnh viễn; dict file phình (369 → ~400+ keys).

### B — react-i18next-consolidation: 1 hệ thống duy nhất
- Chuyển 369 keys dict → `locales/{en,vi}/common.json`; 16 files `useLocale` → `useTranslation()`; keys mới vào JSON.
- **Effort:** LỚN — chạm mọi page learner + toàn bộ keys. **Risk:** CAO (regression trước graduation demo).
- **Pro:** 1 hệ thống chuẩn industry, interpolation/namespace/lazy-load có sẵn.

### C — Hybrid bridge ✅ RECOMMENDED
- Giữ nguyên A về scope migrate, NHƯNG: `LocaleContext.t()` **fallback `i18n.t(key)`** khi thiếu key trong dict; **keys mới viết vào JSON** (`learner.*` prefix trong admin.json hoặc common.json mới); keys cũ giữ dict; Language settings UI ở Profile.
- **Effort:** ≈ A + fallback ~10 dòng. **Risk:** THẤP.
- **Pro:** không big-bang; path dần dần về B (mỗi lần đụng page nào chuyển keys page đó sang JSON); 1 provider sync cả 2 hệ thống (`i18n.changeLanguage` đã gọi sẵn trong effect).
- **Con:** tạm thời 2 nơi chứa translation (có kế hoạch thu hẹp dần).

---

## 3. Grill-me — câu hỏi sắc (kèm câu trả lời đề xuất để bạn phản biện)

1. **"Toàn bộ app" = đến đâu cho graduation?** Dịch hết 30+ page trong 1 nhịp là không thực tế.
   → Đề xuất P0: Profile + GamesPage + 4 games pages + Language settings card. P1: các trang còn lại chuyển dần sang JSON mỗi khi đụng đến.
2. **Fallback copy của GamesPage khi catalog API fail** — locale=en thì sao? → dùng t() keys, dict en đã có — mọi copy fallback đều qua t().
3. **Test impact?** `gamesPageCatalog.test.tsx` render GamesPage ngoài LocaleProvider sẽ nổ (useLocale throw) → phải wrap LocaleProvider trong test (pattern đã có sẵn ở CourseDetail/CourseList tests). Chấp nhận?
4. **Keys mới để JSON nào?** → giữ trong `admin.json` với prefix `learner.*` (i18n instance chỉ load 1 file/locale — thêm file mới phải sửa adminI18n.ts; dùng chung file giảm churn). Chấp nhận hy sinh tính "namespace sạch" lấy tốc độ?
5. **`profile.*` keys tôi thêm vào admin.json hôm qua** (cho nút admin) — giờ Profile sẽ dùng LocaleContext `profileAdminArea` → **xoá section profile.* khỏi admin.json** để 1 nguồn duy nhất. OK?
6. **Auto-detect browser** giữ nguyên? → Giữ (đã có cờ auto-detected, user chọn tay thì ngừng auto).
7. **Persistence key** `edu-platform-locale` dùng chung cho cả 2 hệ thống → Giữ (đơn nguồn, không migrate storage).

---

## 4. Đề xuất scope nếu duyệt C

**P0 (làm ngay sau duyệt):**
1. `LocaleContext.t()` fallback → i18n.t()
2. Language settings card ở Profile (Vi/En segmented, clay style, mọi user thấy)
3. Migrate GamesPage + DragMatchGame + MemoryPairsGame + Profile strings → t() (keys mới vào JSON `learner.*`)
4. Xoá `profile.*` khỏi admin.json (gộp vào dict)
5. Wrap LocaleProvider vào gamesPageCatalog test + test language switching

**P1 (dần dần, không trong nhịp này):** các trang learner còn lại → JSON.

**Verify:** `tsc -b` exit 0 · `vite build` · vitest full · manual smoke đổi ngôn ngữ ở Profile → Sidebar/Landing/Games/Profile đổi theo.
