# Admin Redesign — Clay Editorial (Minimalist cho giảng viên)

**Date:** 2026-09-08 · **Status:** approved (user chốt variant B qua visual companion)
**Scope:** redesign toàn bộ 7 trang admin qua design tokens, không đổi logic/API/i18n

## Bối cảnh

Admin hiện dùng neumorphic (shadow đôi tối/sáng, xanh dương #3578d4). User yêu cầu
minimalist phù hợp giảng viên; qua 2 vòng mockup chọn **Clay Editorial**: giữ soft-3D
clay depth của hệ sinh thái EduAR nhưng palette teal + giấy ngà trưởng thành — tách
tông với app học sinh (claymorphic sunshine/sky) nhưng vẫn "một gia đình sản phẩm".

## Design Tokens

| Token | Giá trị | Ghi chú |
|-------|---------|---------|
| Background | gradient `#F7F5F0 → #F2EFE7` | giấy ngà ấm |
| Surface | `#FFFFFF` | card nền trắng phẳng |
| Border | `#FFFFFF` trên card (2px), hairline `rgba(34,48,58,.08)` dashed bên trong bảng | cấu trúc bằng viền, không shadow đen |
| Text | `#22303A` | 12.6:1 trên trắng |
| Text muted | `rgba(34,48,58,.55)` trở lên (tối thiểu 4.6:1 trên trắng) | |
| Accent | teal `#0D9488`, dark `#0B6B60`, soft bg `rgba(13,148,136,.12)` | duy nhất 1 accent |
| Warn/amber | `#B45309` soft `rgba(217,119,6,.12)` | chip trạng thái soạn thảo |
| Info blue | `#1D4ED8` soft `rgba(37,99,235,.1)` | chip đếm |
| Danger | `#DC2626` soft `rgba(220,38,38,.09)` | destructive + streak |
| Success | `#0D9488` (trùng accent — giảm số màu) | |
| Radius | 18px card · 13px button/nav-input · 12px chip | mềm mà không bLoat |
| Shadow card | `0 5px 0 rgba(34,48,58,.05), 0 10px 22px rgba(34,48,58,.05), inset 0 2px 0 #fff` | clay lift, tint theo nền — KHÔNG đen |
| Shadow button | `0 5px 0 #0B6B60, inset 0 2px 0 rgba(255,255,255,.35)`; active lún `translateY(3px)` + shadow `0 2px 0` | tactile |
| Typography | Nunito (700–900) display/số · DM Sans (400/500/700) body | đã có sẵn trong index.html — zero thêm network |
| Số liệu | Nunito 900, 25px, tracking -0.02em | "đọc như dữ liệu" |

## Signature

**"Sổ điểm clay"** — bảng/list trình bày như sổ điểm: divider **dashed 1.5px** giữa
hàng (không đường kẻ đặc cứng), header cột uppercase 10.5px tracking 0.07em, số canh
phải Nunito 900. Kết hợp depth clay nhẹ — familiar với giảng viên, nhất quán với brand.

## Bố cục chung (mọi trang)

1. Page header: chào/tiêu đề + phụ chú (ngày, lớp) — action chính duy nhất bên phải (teal button)
2. Nội dung: card trắng viền 2px trắng + clay lift; sidebar trắng mờ `rgba(255,255,255,.65)`
3. Sidebar: brand mark teal, nav item icon-chip nền teal-soft, active = nền trắng + shadow
   clay, user card ở đáy (avatar amber, tên, settings)
4. Mỗi trang 1 action teal; mọi action phụ ghost/outline

### Dashboard
- 4 StatCard: label uppercase · số 25px Nunito 900 · delta ▲ teal / chip trạng thái /
  sparkline SVG stroke teal (XP)
- Grid 1.7fr/1fr: Hoạt động gần đây (bảng dashed, chip màu theo subject) + Mục tiêu tuần
  (progress ring conic-gradient teal, số phân số 92/128)

## Thành phần chi tiết

- **Nav chip icon**: 24px rounded-8 nền soft màu, icon 12px — KHÔNG emoji trong code,
  dùng bộ icons hiện có (`@/shared/components/icons`)
- **Chip**: 99px pill, soft bg + màu đậm, 10.5px/800
- **Progress ring**: conic-gradient(accent p%, neutral 0), lỗ trắng 38px, số % bên trong
- **Sparkline**: SVG polyline stroke accent 2.5px round-cap

## Trạng thái

- **Loading**: skeleton khớp bố cục (stat + panel), shimmer trên trắng — không spinner tròn
- **Empty**: 1 dòng + action hướng dẫn ("Chưa có hoạt động nào hôm nay · Mời học sinh bằng mã lớp")
- **Error**: inline trong panel + nút Thử lại ghost; AdminErrorBoundary giữ nguyên
- **Tactile**: nút chính lún khi `:active`; hover chỉ đổi màu/background/shadow (không scale)

## Accessibility

- Contrast AA đạt: text 12.6:1 · muted ≥4.6:1 · trắng trên teal 4.7:1
- `:focus-visible` outline 2px teal offset 2px toàn bộ control
- `prefers-reduced-motion`: tắt shimmer/press, state đổi tức thì
- Icon kèm label hoặc aria-label; bảng `<th scope>`; nav `aria-current`; touch target ≥44px

## Phạm vi file

| File | Hành động |
|------|-----------|
| `frontend/src/styles/admin.css` | viết lại toàn bộ (~465 dòng) theo tokens trên |
| `frontend/src/features/admin/components/AdminLayout.tsx` | cập nhật class/markup brand + user card |
| `frontend/src/features/admin/components/AdminCard.tsx` | StatCard/SectionCard khớp tokens |
| `frontend/index.html` | không đổi (fonts đã đủ) |
| 7 trang admin | KHÔNG sửa logic — ăn theo tokens |

Ngoài phạm vi: mobile app, learner pages, backend, i18n keys, routes.

## Anti-check (taste-skill)

- Không emoji làm icon production · không glow · không gradient text · không #000 thuần
- Shadow tint theo nền · hover không layout shift · 1 accent duy nhất

## Testing

1. `tsc --noEmit` sạch
2. Contrast check script trên tokens (assert ≥4.5:1 text pairs)
3. Playwright screenshot 7 trang × 2 viewport (1280/768) trước-sau → `docs/report/ui-audit/admin-*.png`
4. Smoke: điều hướng 7 trang + flow CourseManager → CourseEditor; xác nhận không lỗi console
