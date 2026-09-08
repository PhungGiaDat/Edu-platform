# Admin Clay Editorial Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign toàn bộ 7 trang admin theo spec Clay Editorial (docs/superpowers/specs/2026-09-08-admin-clay-editorial-design.md) — chỉ chạm design tokens + 2 component nền tảng, 7 trang ăn theo không đổi logic.

**Architecture:** `admin.css` là single source of truth cho mọi admin style (import 1 lần trong AdminLayout). Đổi tokens + component classes trong css → mọi trang tự ăn theo. AdminLayout/AdminCard chỉ chỉnh markup class nếu cần. Không API, không i18n, không route.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind utility (inline trong tsx) + CSS variables, Playwright (verify), Google Fonts Nunito/DM Sans (đã load sẵn).

## Global Constraints

- Palette duy nhất: nền `#F7F5F0→#F2EFE7`, surface `#FFF`, text `#22303A`, accent teal `#0D9488` (dark `#0B6B60`, soft `rgba(13,148,136,.12)`), amber `#B45309`/`rgba(217,119,6,.12)`, blue `#1D4ED8`/`rgba(37,99,235,.1)`, danger `#DC2626`/`rgba(220,38,38,.09)`
- KHÔNG: shadow đen, glow, gradient text, `#000` thuần, emoji làm icon production, hover scale gây layout shift
- Shadow card: `0 5px 0 rgba(34,48,58,.05), 0 10px 22px rgba(34,48,58,.05), inset 0 2px 0 #fff`
- Radius: 18px card · 13px button/nav · 12px chip
- Font: Nunito (display + số) / DM Sans (body) — không thêm font mới, không sửa index.html
- Divider bảng: dashed `1.5px rgba(34,48,58,.08)`; header cột uppercase 10.5px tracking `.07em`
- A11y: focus-visible 2px teal offset 2px; reduced-motion tắt shimmer/press; touch ≥44px; contrast AA (text 12.6:1, muted ≥4.6:1, trắng-trên-teal 4.7:1)
- Class names hiện có GIỮ NGUYÊN (admin-card, admin-stat-*, admin-nav-button, admin-page-header, admin-empty-state, admin-skeleton, admin-quick-*, admin-progress-ring, admin-student-row, admin-mobile-*, admin-bottom-nav...) — chỉ đổi giá trị CSS bên trong; thêm class mới khi cần (admin-chip, admin-sparkline...)
- Verify mỗi task: `cd frontend && npx tsc --noEmit` (tasks chạm .tsx) — CSS-only task không cần tsc nhưng cần reload trang kiểm tra

---

### Task 1: Viết lại admin.css — tokens + shell/sidebar/nav/user card

**Files:**
- Modify: `frontend/src/styles/admin.css` (toàn bộ, ~465 dòng)

**Interfaces:**
- Consumes: không (source of truth)
- Produces: CSS variables `--admin-bg, --admin-surface, --admin-surface-strong, --admin-border, --admin-text, --admin-text-muted, --admin-accent, --admin-accent-dark, --admin-accent-soft`; class names như hiện tại cho mọi task sau

- [ ] **Step 1: Replace toàn bộ file admin.css với nội dung mới**

```css
/* EduAR Admin — Clay Editorial (spec 2026-09-08)
   Single source of truth cho admin surfaces. Palette teal + giấy ngà.
   KHÔNG shadow đen / glow / gradient text. Depth = clay lift tint nền. */
.admin-shell {
  --admin-bg: #f7f5f0;                 /* giấy ngà (fallback nếu không chạy gradient) */
  --admin-bg-grad: linear-gradient(150deg, #f7f5f0 0%, #f2efe7 100%);
  --admin-surface: #ffffff;
  --admin-surface-strong: #ffffff;
  --admin-border: rgba(34, 48, 58, 0.08);
  --admin-text: #22303a;
  --admin-text-muted: rgba(34, 48, 58, 0.55);
  --admin-accent: #0d9488;
  --admin-accent-dark: #0b6b60;
  --admin-accent-soft: rgba(13, 148, 136, 0.12);
  --admin-amber: #b45309;
  --admin-amber-soft: rgba(217, 119, 6, 0.12);
  --admin-info: #1d4ed8;
  --admin-info-soft: rgba(37, 99, 235, 0.1);
  --admin-danger: #dc2626;
  --admin-danger-soft: rgba(220, 38, 38, 0.09);
  --admin-card-shadow: 0 5px 0 rgba(34, 48, 58, 0.05), 0 10px 22px rgba(34, 48, 58, 0.05), inset 0 2px 0 #fff;
  --admin-card-border: 2px solid #fff;
  --admin-radius-card: 18px;
  --admin-radius-btn: 13px;
  --admin-radius-chip: 12px;
  --admin-btn-shadow: 0 5px 0 var(--admin-accent-dark), inset 0 2px 0 rgba(255, 255, 255, 0.35);
  --admin-btn-shadow-active: 0 2px 0 var(--admin-accent-dark);
  --admin-font-display: 'Nunito', system-ui, sans-serif;
  --admin-font-body: 'DM Sans', system-ui, sans-serif;
  min-height: 100dvh;
  background: var(--admin-bg-grad);
  color: var(--admin-text);
  font-family: var(--admin-font-body);
}

/* ── Sidebar ─────────────────────────────────────────── */
.admin-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: var(--z-nav);
  display: none;
  width: 264px;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.65);
  border-right: 2px solid #fff;
}

.admin-brand {
  display: flex;
  min-height: 84px;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 12px;
  color: var(--admin-text);
}

.admin-brand-mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(145deg, #14b8a6, var(--admin-accent));
  box-shadow: 0 4px 0 var(--admin-accent-dark), inset 0 2px 0 rgba(255, 255, 255, 0.4);
  color: #fff;
}

.admin-nav { flex: 1; padding: 6px 14px 16px; }

.admin-nav-list { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }

.admin-nav-button {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: none;
  border-radius: var(--admin-radius-btn);
  background: transparent;
  color: var(--admin-text);
  opacity: 0.62;
  font-family: var(--admin-font-display);
  font-size: 0.92rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: opacity 160ms ease, background-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
}

.admin-nav-button:hover { opacity: 0.85; background: rgba(255, 255, 255, 0.55); }

.admin-nav-button[aria-current='page'] {
  opacity: 1;
  background: var(--admin-surface);
  color: var(--admin-accent);
  box-shadow: 0 4px 0 rgba(34, 48, 58, 0.08), inset 0 1px 0 #fff;
}

.admin-nav-button:focus-visible,
.admin-menu-button:focus-visible,
.admin-text-button:focus-visible,
.admin-card--interactive:focus-visible,
.admin-quick-action:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--admin-accent);
  outline-offset: 2px;
}

.admin-nav-button:active,
.admin-quick-action:active,
.admin-text-button:active,
.admin-menu-button:active { transform: translateY(1px); }

.admin-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 14px 16px;
  padding: 12px;
  border: none;
  border-radius: 14px;
  background: var(--admin-surface);
  box-shadow: 0 3px 0 rgba(34, 48, 58, 0.07);
}

.admin-avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(145deg, #fde68a, #fcd34d);
  color: #92400e;
  font-family: var(--admin-font-display);
  font-size: 0.85rem;
  font-weight: 900;
}

/* ── Main / content ──────────────────────────────────── */
.admin-main { min-height: 100dvh; padding-bottom: 84px; }

.admin-content { width: 100%; max-width: 1440px; margin: 0 auto; padding: 20px 16px 32px; }

.admin-mobile-header {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 2px solid #fff;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
}

.admin-menu-button,
.admin-text-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--admin-radius-btn);
  background: var(--admin-surface);
  color: var(--admin-accent);
  font-family: var(--admin-font-display);
  font-weight: 800;
  box-shadow: 0 3px 0 rgba(34, 48, 58, 0.08), inset 0 1px 0 #fff;
  cursor: pointer;
}

.admin-menu-button { width: 44px; padding: 0; font-size: 22px; }

.admin-text-button { min-height: 42px; padding: 8px 16px; white-space: nowrap; }

.admin-mobile-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(34, 48, 58, 0.32);
}

.admin-mobile-drawer {
  position: absolute;
  inset: 0 auto 0 0;
  display: flex;
  width: min(86vw, 304px);
  flex-direction: column;
  background: var(--admin-bg);
  box-shadow: 20px 0 44px rgba(34, 48, 58, 0.2);
}

.admin-bottom-nav {
  position: fixed;
  inset: auto 0 0;
  z-index: var(--z-nav);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 8px 10px max(8px, env(safe-area-inset-bottom));
  border-top: 2px solid #fff;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
}

.admin-bottom-nav .admin-nav-button {
  min-height: 56px;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 6px 4px;
  font-size: 10px;
  text-align: center;
}

.admin-bottom-nav .admin-nav { grid-column: 1 / -1; padding: 0; }

.admin-bottom-nav .admin-nav-list { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }

/* ── Cards ───────────────────────────────────────────── */
.admin-card {
  border: var(--admin-card-border);
  border-radius: var(--admin-radius-card);
  background: var(--admin-surface);
  box-shadow: var(--admin-card-shadow);
}

.admin-card--interactive { cursor: pointer; transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease; }

.admin-card--interactive:hover {
  background: var(--admin-surface-strong);
  box-shadow: 0 7px 0 rgba(34, 48, 58, 0.06), 0 14px 26px rgba(34, 48, 58, 0.07), inset 0 2px 0 #fff;
  transform: translateY(-2px);
}

/* ── Page header / section ───────────────────────────── */
.admin-page-header { margin-bottom: 22px; }

.admin-page-title {
  margin: 0;
  color: var(--admin-text);
  font-family: var(--admin-font-display);
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
  font-weight: 900;
}

.admin-page-copy { max-width: 62ch; margin: 6px 0 0; color: var(--admin-text-muted); font-size: 0.95rem; }

.admin-section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }

.admin-section-title { margin: 0; color: var(--admin-text); font-family: var(--admin-font-display); font-size: 1.18rem; font-weight: 900; line-height: 1.25; letter-spacing: -0.01em; }

.admin-section-copy { margin: 4px 0 0; color: var(--admin-text-muted); font-size: 0.9rem; }

/* ── Stat card ("sổ điểm") ───────────────────────────── */
.admin-stat-card { min-height: 128px; }

.admin-stat-label {
  margin: 0 0 8px;
  color: var(--admin-text-muted);
  font-family: var(--admin-font-body);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.admin-stat-value {
  margin: 0;
  color: var(--admin-text);
  font-family: var(--admin-font-display);
  font-size: 1.6rem;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.admin-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  border: none;
  box-shadow: none;
}

/* ── Lists / bảng "sổ điểm" ──────────────────────────── */
.admin-student-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; }

.admin-student-row + .admin-student-row { border-top: 1.5px dashed var(--admin-border); }

.admin-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-family: var(--admin-font-display);
  font-size: 0.82rem;
  font-weight: 900;
}

.admin-progress-ring { filter: none; }

/* ── States ──────────────────────────────────────────── */
.admin-empty-state {
  display: grid;
  min-height: 150px;
  place-items: center;
  padding: 24px;
  border: 1.5px dashed rgba(34, 48, 58, 0.18);
  border-radius: var(--admin-radius-card);
  background: transparent;
  color: var(--admin-text-muted);
  text-align: center;
}

.admin-error-state { display: grid; min-height: 360px; place-items: center; padding: 28px; text-align: center; }

.admin-quick-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }

.admin-quick-action {
  display: flex;
  min-height: 72px;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: var(--admin-card-border);
  border-radius: var(--admin-radius-card);
  background: var(--admin-surface);
  color: var(--admin-text);
  font-family: var(--admin-font-display);
  font-weight: 800;
  text-align: left;
  box-shadow: var(--admin-card-shadow);
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.admin-quick-action:hover { box-shadow: 0 7px 0 rgba(34, 48, 58, 0.06), 0 14px 26px rgba(34, 48, 58, 0.07), inset 0 2px 0 #fff; transform: translateY(-2px); }

.admin-quick-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  border: none;
  box-shadow: none;
}

.admin-skeleton { overflow: hidden; background: rgba(34, 48, 58, 0.08); color: transparent; animation: admin-skeleton-pulse 1.4s ease-in-out infinite; }

@keyframes admin-skeleton-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

/* ── Responsive ──────────────────────────────────────── */
@media (min-width: 640px) {
  .admin-content { padding: 26px 24px 40px; }
  .admin-quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .admin-sidebar { display: flex; }
  .admin-main { margin-left: 264px; padding-bottom: 0; }
  .admin-content { padding: 34px 36px 52px; }
  .admin-mobile-header, .admin-bottom-nav { display: none; }
  .admin-quick-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (prefers-reduced-motion: reduce) {
  .admin-skeleton { animation: none; }
  .admin-card--interactive, .admin-quick-action, .admin-nav-button, .admin-text-button, .admin-menu-button { transition: none; }
}
```

- [ ] **Step 2: Verify trực quan**

Dev server đang chạy (`:5173`). Mở `/admin` viewport 1280 — sidebar trắng mờ viền phải 2px trắng, nav active nền trắng + shadow clay, nền gradient giấy ngà. Không còn neumorphic shadow đôi.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/admin.css
git commit -m "feat(admin): clay editorial tokens — css rewrite (task 1/4)"
```

---

### Task 2: AdminLayout — brand mark teal + icon chip nav

**Files:**
- Modify: `frontend/src/features/admin/components/AdminLayout.tsx`

**Interfaces:**
- Consumes: Task 1 tokens (`--admin-accent-soft`, `--admin-accent`), class names giữ nguyên
- Produces: markup `AdminBrand`, `AdminNavigation` dùng icon chip mới; export không đổi

- [ ] **Step 1: Sửa AdminBrand — brand chữ "Edu**Admin**"**

Thay JSX trong `AdminBrand` (dòng ~46-56):

```tsx
const AdminBrand: React.FC = () => (
  <div className="admin-brand">
    <span className="admin-brand-mark" aria-hidden="true">
      <BookOpenIcon className="h-5 w-5" />
    </span>
    <div>
      <p className="m-0 text-xl font-black leading-none tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
        Edu<span style={{ color: 'var(--admin-accent)' }}>Admin</span>
      </p>
      <p className="mt-1 mb-0 text-xs font-bold text-[var(--admin-text-muted)]">EduAR Platform</p>
    </div>
  </div>
);
```

- [ ] **Step 2: Sửa AdminNavigation — mỗi item bọc icon trong chip 24px**

Trong `AdminNavigation`, thay phần render `{item.icon}` hiện tại. Icon chip markup:

```tsx
<li key={item.path}>
  <button
    type="button"
    className="admin-nav-button"
    aria-current={active ? 'page' : undefined}
    onClick={() => { navigate(item.path); onNavigate?.(); }}
  >
    <span
      className="admin-nav-icon"
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 8, background: 'var(--admin-accent-soft)', color: 'var(--admin-accent)', flexShrink: 0 }}
    >
      <item.icon style={{ width: 14, height: 14 }} />
    </span>
    {t(`admin.nav.${item.label}`)}
  </button>
</li>
```

(Lưu ý: giữ nguyên phần còn lại của button — aria, onClick. Chỉ thay cách render icon + text.)

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 4: Verify trực quan**

`/admin`: brand "Edu" đen + "Admin" teal; mỗi nav item có chip vuông teal-soft 24px; mobile drawer cũng chip (cùng component).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/admin/components/AdminLayout.tsx
git commit -m "feat(admin): clay brand mark + nav icon chips (task 2/4)"
```

---

### Task 3: AdminCard — StatCard icon 30px + layout head/footer

**Files:**
- Modify: `frontend/src/features/admin/components/AdminCard.tsx`

**Interfaces:**
- Consumes: Task 1 tokens (`--admin-stat-*` classes)
- Produces: `StatCard` props GIỮ NGUYÊN interface (title, value, icon?, trend?, color?) — mọi trang gọi không đổi. Thêm optional `foot?: React.ReactNode` cho chip/đếm/sparkline (trang dùng sau, backward-compatible)

- [ ] **Step 1: Sửa StatCard — head (label+icon) → value → foot**

Thay component `StatCard` (dòng ~42-74):

```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  foot?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'pink';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  foot,
}) => (
  <AdminCard className="admin-stat-card">
    <div className="flex items-start justify-between gap-3">
      <p className="admin-stat-label" style={{ marginBottom: 0 }}>{title}</p>
      {icon && (
        <span className="admin-stat-icon" aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 10 }}>
          {icon}
        </span>
      )}
    </div>
    <p className="admin-stat-value" style={{ marginTop: 6 }}>{value}</p>
    {trend && (
      <p className="mt-1.5 mb-0 text-[11px] font-extrabold" style={{ color: trend.isPositive ? 'var(--admin-accent)' : 'var(--admin-danger)', fontFamily: "'Nunito', sans-serif" }}>
        <span aria-hidden="true">{trend.isPositive ? '▲' : '▼'}</span> {Math.abs(trend.value)}%
      </p>
    )}
    {foot && <div className="mt-2">{foot}</div>}
  </AdminCard>
);
```

(`color` prop giữ trong interface để không break callers nhưng chưa dùng — ghi chú inline "reserved".)

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Verify trực quan**

`/admin`: stat icon nhỏ 30px vuông tròn hóa teal-soft (không còn box neumorphic 48px); số Nunito 900; trend ▲ teal.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/admin/components/AdminCard.tsx
git commit -m "feat(admin): statcard clay layout + foot slot (task 3/4)"
```

---

### Task 4: Verify toàn trang + screenshots + smoke

**Files:**
- Create: `docs/report/ui-audit/admin-clay-{dashboard,courses,flashcards,students,analytics}-1280.png`, `-768.png`
- Create: `docs/report/FIX_20260908_admin_clay_editorial.md`

**Interfaces:**
- Consumes: Task 1-3
- Produces: bằng chứng verify + báo cáo

- [ ] **Step 1: Screenshot 5 trang × 2 viewport**

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const res = await ctx.request.post('http://localhost:8002/api/v1/auth/login', {
    form: { username: 'admin@eduplatform.com', password: 'AdminPassword123!' },
  });
  const token = (await res.json()).access_token;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('authToken', t);
    localStorage.setItem('authUser', JSON.stringify(u));
    localStorage.setItem('guestMode', 'false');
  }, [token, { id: payload.sub, email: 'admin@eduplatform.com', username: 'admin', role: 'admin', is_superuser: true }]);
  const page = await ctx.newPage();
  await page.route('**/api/**', async (route) => {
    const h = { ...route.request().headers(), authorization: 'Bearer ' + token };
    delete h.origin; delete h.referer;
    route.continue({ headers: h });
  });
  const pages = ['dashboard|/admin','flashcards|/admin/flashcards','courses|/admin/courses','students|/admin/students','analytics|/admin/analytics'];
  for (const vp of [[1280, 800], [768, 900]]) {
    await ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
    const r2 = await ctx2.request.post('http://localhost:8002/api/v1/auth/login', { form: { username: 'admin@eduplatform.com', password: 'AdminPassword123!' } });
    const t2 = (await r2.json()).access_token;
    const p2 = JSON.parse(Buffer.from(t2.split('.')[1], 'base64').toString('utf8'));
    await ctx2.addInitScript(([t, u]) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('authUser', JSON.stringify(u));
      localStorage.setItem('guestMode', 'false');
    }, [t2, { id: p2.sub, email: 'admin@eduplatform.com', username: 'admin', role: 'admin', is_superuser: true }]);
    const pg = await ctx2.newPage();
    await pg.route('**/api/**', async (route) => {
      const h = { ...route.request().headers(), authorization: 'Bearer ' + t2 };
      delete h.origin; delete h.referer;
      route.continue({ headers: h });
    });
    for (const entry of pages) {
      const [name, path] = entry.split('|');
      await pg.goto('http://localhost:5173' + path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await pg.waitForTimeout(2500);
      await pg.screenshot({ path: 'docs/report/ui-audit/admin-clay-' + name + '-' + vp[0] + '.png' });
      console.log('shot', name, vp[0]);
    }
    await ctx2.close();
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: 10 file PNG trong `docs/report/ui-audit/`, console in 10 dòng "shot ...".

- [ ] **Step 2: Xem screenshots — checklist**

Đọc từng ảnh, kiểm: nền gradient giấy ngà (không xám xanh neumorphic), card trắng viền 2px + clay lift (không shadow đôi), stat value Nunito đen đậm, nav active trắng + teal, không còn `#3578d4` xanh dương cũ. Nếu 1 trang hỏng → sửa css rồi chụp lại trang đó.

- [ ] **Step 3: Smoke flow + console**

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const res = await ctx.request.post('http://localhost:8002/api/v1/auth/login', { form: { username: 'admin@eduplatform.com', password: 'AdminPassword123!' } });
  const token = (await res.json()).access_token;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('authToken', t);
    localStorage.setItem('authUser', JSON.stringify(u));
    localStorage.setItem('guestMode', 'false');
  }, [token, { id: payload.sub, email: 'admin@eduplatform.com', username: 'admin', role: 'admin', is_superuser: true }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/api/**', async (route) => {
    const h = { ...route.request().headers(), authorization: 'Bearer ' + token };
    delete h.origin; delete h.referer;
    route.continue({ headers: h });
  });
  // điều hướng 5 trang chính
  for (const path of ['/admin', '/admin/courses', '/admin/flashcards', '/admin/students', '/admin/analytics']) {
    await page.goto('http://localhost:5173' + path, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
  }
  // flow: students → student đầu → goals
  await page.goto('http://localhost:5173/admin/students', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const firstStudent = page.locator('a[href*=\"/admin/students/\"]').first();
  if (await firstStudent.count()) {
    await firstStudent.click();
    await page.waitForTimeout(2000);
    console.log('student detail URL:', page.url());
  }
  console.log('console/page errors:', errors.length);
  errors.slice(0, 5).forEach(e => console.log('  -', e.slice(0, 160)));
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: `console/page errors: 0` (lỗi mạng API render-level không tính nếu là pre-existing; so sánh: nếu lỗi cũng có ở trang learner thì pre-existing). Không crash, điều hướng student → goals hoạt động.

- [ ] **Step 4: Viết báo cáo + commit**

`docs/report/FIX_20260908_admin_clay_editorial.md` — nội dung: tham chiếu spec, 3 file đổi, 10 screenshots, kết quả smoke (số lỗi console, flow pass), so sánh trước/sau (ảnh `games-...-before` nếu có / screenshot cũ trong git history), known leftovers (trang con chưa dùng `foot` slot StatCard, chip colors reserved).

```bash
git add docs/report/ui-audit/admin-clay-*.png docs/report/FIX_20260908_admin_clay_editorial.md
git commit -m "test(admin): clay editorial verify — screenshots + smoke (task 4/4)"
```

---

## Self-Review

**Spec coverage:** tokens (T1) · brand/nav/user card (T2) · StatCard + foot slot (T3) · verify 7 trang + smoke + report (T4). Empty/error states + focus-visible + reduced-motion nằm trong T1 css. SectionCard không cần sửa (dùng admin-card + section-header đã restyle ở T1). ✓

**Placeholder scan:** mọi step có code/command đầy đủ, không TBD. ✓

**Type consistency:** `StatCard` interface mở rộng backward-compatible (`foot?` optional, `color` reserved); class names giữ nguyên hết. ✓
