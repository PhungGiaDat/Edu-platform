# UI/UX Design Spec — Operations Monitoring Dashboard ("/admin/monitoring")

*Phase 2 deliverable · 2026-09-12 · Skill: ui-ux-pro-max (guidance applied; local install ships SKILL.md only — design decisions are repo-evidence-driven per skill workflow Step 1)*
*Companion: `docs/plan/20260912_ops_dashboard.md` (spec) · `docs/research/20260912_ops_dashboard.md` (evidence)*

---

## 1. Design principle: "Friendly Ops" — same family, sharper data

The dashboard lives **inside the existing admin area**, whose established language is (verified in `frontend/src/pages/admin/`):

| Token | Existing value | Source |
|---|---|---|
| Primary | `#6EB9FF` (sky blue) | Analytics.tsx:75,125 |
| Secondary/accent | `#B4E197` (mint green) | Analytics.tsx:125,143 |
| Card | `bg-white rounded-xl shadow-sm` | Analytics.tsx:67 |
| Tabs | pill group `bg-white rounded-xl p-1 shadow-sm`, active = `bg-[#6EB9FF] text-white shadow-md` | Analytics.tsx:67-76 |
| Bar charts | gradient divs `from-[#6EB9FF] to-[#B4E197]` | Analytics.tsx:125,143,174 |
| Loading | ring spinner `border-4 border-[#6EB9FF] border-t-transparent animate-spin` | Analytics.tsx:44 |
| Font | Inter/system stack already used app-wide — reuse, no new webfont | App shell |

**Direction:** keep the light, rounded, friendly identity (it's a kids-ed platform, admin included) but increase *data density* and add a **semantic status palette** the marketing pages don't need:

```
success  #16A34A   (green-600 — AA on white, icon ✓)
warning  #D97706   (amber-600 — icon !)
danger   #DC2626   (red-600   — icon ✕)
neutral  #64748B   (slate-500 — unknown/never-run, icon –)
info     #6EB9FF   (brand — highlights, active states)
surface  #F8FAFC   page bg · card #FFFFFF · border #E2E8F0
```

Rules locked for the whole feature:
1. **Never color alone** — every status pill = icon + text + color (WCAG 1.4.1; thesis screenshots must survive grayscale printing).
2. **Numbers:** `font-bold text-3xl tabular-nums` KPI; delta badges (▲/▼ vs yesterday) in semantic colors.
3. **Charts:** zero-dependency CSS/SVG only (approved Q2). One accent gradient max; grid lines `#E2E8F0`.
4. **Freshness honesty:** every card shows "as of HH:MM:SS"; stale (>2 poll failures) dims the card + shows ⚠ "dữ liệu cũ".
5. **Live mode toggle** in header (auto-refresh 10s, pauses when tab hidden via TanStack Query) — default ON, but screenshots can freeze it.
6. Vietnamese labels with English technical terms kept (RAG, latency, p95) — audience = thesis committee + school admin.

---

## 2. Page shell

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚙ Giám sát vận hành        as of 21:42:05 · [Live ⏵/⏸] [⟳ Cập nhật] │
│  EduPlatform Admin                                    flag: ON       │
├──────────────────────────────────────────────────────────────────────┤
│ ( Health hệ thống ) ( RAG / LLM ) ( Học viên ) ( API )                │  ← same pill-tab component as Analytics.tsx
├──────────────────────────────────────────────────────────────────────┤
│                        tab content (max-w-7xl)                       │
└──────────────────────────────────────────────────────────────────────┘
```
- Reuses `AdminErrorBoundary` wrapper + lazy route (pattern `App.tsx:47-56`).
- Header right shows `MONITORING_ENABLED` state — if flags off, empty-states explain "bật MONITORING_ENABLED" instead of showing zeros (never silent-zero data).

---

## 3. Tab 1 — Health hệ thống

Goal: 5-second "is everything OK?" read, then drill-in.

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ ● Hệ thống  │ ▲ Uptime    │ ▣ CPU proc  │ ▣ RAM proc  │
│   OK/WARN/  │  3d 4h      │   12.4%     │   214 MB    │
│   ERROR     │  since ...  │  (badge src)│  (badge src)│   ← badge: "host" | "cgroup"
└─────────────┴─────────────┴─────────────┴─────────────┘
┌───────────────────── Components ──────────────────────┐ ┌──────── LLM Providers (probe_all) ───────┐
│ PostgreSQL      ● up · SELECT 1 · 4 ms                │ │ Kilo · nex-n2.5-pro  ● 1.2s              │
│ Qdrant          ● up · collection 2 341 pts           │ │ BAI · glm-5.3-flash  ● 0.8s              │
│ MongoDB (legacy)○ not configured                      │ │ nvidia/ultra-550b    ● 1.9s              │
│ Redis           ○ disabled                            │ │ (per-provider latency_ms bars)           │
│ Node/Host       ▓▓▓▓▓▓░░ 62% mem · cgroup             │ └──────────────────────────────────────────┘
└───────────────────────────────────────────────────────┘
[⟳ Probe lại] (debounce 15s, spinner + disabled during flight)
```

Components list = rows (not cards) — dense, scannable. Status column uses pill: `● icon + "up"/"down"/"not configured"`. Pool stats sub-line (`asyncpg size/free`) proves Postgres tab isn't fake.

## 4. Tab 2 — RAG / LLM observability  ← crown jewel (thesis)

```
┌ KPI row (24h) ───────────────────────────────────────────────────────┐
│ Yêu cầu: 128 │ e2e p50: 18s │ p95: 41s │ Từ chối: 4.7% │ Tokens: 412k │
├──────── Validator verdicts (stacked bar %) ─┬──── Latency stages (avg/stacked CSS bar per day, 7d) ────┤
│ ▓▓▓▓▓▓▓▓ rule-pass 78%  ▓▓ escalate 14%     │  day → [planner][retrieval][generator][validator] bars    │
│ ▓▓ llm-rewrite 6%  ▓ error 2%               │  legend: 4 fixed stage colors (blue→mint ramp, mono-safe)  │
├─────────────────────────────────────────────┴──────────────────────────────────────────────────────────┤
│ Traces        [filter: ⌕ chỉ lỗi] [chỉ từ chối] [lang: vi/en] [⟳]                                      │
│ ┌──────────┬────┬────────────────────────────┬───────┬────────┬─────────────┬─────────┐                │
│ │ 20:31:12 │ vi │ "tại sao bầu trời màu xanh" │ 21.4s │ nex-…  │ rule-pass   │ ⚠ 0 src │ ← row click ▼ │
│ │  │ expanded detail panel:                                    │                │
│ │  │  waterfall: planner ▏2% · retrieval ▍6% · generator ▓▓▓▓▓ 88% · validator ▏1%  │                │
│ │  │  tokens {prompt 1.2k, completion 340, by_model chips} · sources ids · trace_segments list       │                │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Waterfall = horizontal flex bars, width ∝ stage share of e2e, absolute ms label at end. Mono-safe: labels carry stage names (color is decoration, not information).
- Refused answers get a violet `🚫 từ chối` chip; errors get red row-edge highlight — instantly screenshot-worthy "system refuses correctly" evidence.
- Pagination 25/row with total count; empty state: "Chưa có trace — gửi câu hỏi chat hoặc bật MONITORING_ENABLED".

## 5. Tab 3 — Học viên (derived)

```
┌ DAU (7d sparkline SVG) │ WAU │ PHIÊN TB 12m │ TỪ/NGÀY │ GAME/NGÀY ┐
├────────────── Funnel (period picker: 7|30|90d) ───────────────────┤
│ Đăng nhập   ████████████████████ 214  100%                        │
│ Vào bài học ████████████▌         141  66%    ← CSS bars, count+% │
│ Hoàn thành  ████████▎             102  48%      labels never rely │
│ Luyện tập   ██████                78   36%      on color alone    │
├────────── Engagement theo ngày (dual sparkline: sessions | XP events) ──────────┤
```
All queries server-side; UI note badge "suy ra từ dữ liệu sản phẩm — không thêm instrumentation".

## 6. Tab 4 — API

```
┌ KPI (1h): 1.2k req │ err 0.4% │ p95 340ms │ flush: 21:42:03 ✓ ┐
├─ Requests/phút (area svg, 2xx base + 5xx red overlay) ────────┬─ Error rate % (line) ─┤
├─ p95 theo phút (step line, buckets from histogram) ───────────┴───────────────────────┤
┌─ Top routes by volume (table w/ mini bar) ──────┐ ┌─ Top by p95 (table) ──────────────┐
│ GET /api/v1/lessons   ▓▓▓▓▓▓ 412   ● 0.2% err   │ │ POST /api/v1/chat   ▓▓▓▓ 21.4s    │
└─────────────────────────────────────────────────┘ └───────────────────────────────────┘
```
Window picker 1h|6h|24h|7d switches bucketing (minute→hour) client-side label only; server already aggregates.

---

## 7. States, motion, a11y

| State | Treatment |
|---|---|
| Loading (first paint) | skeleton blocks (pulse) matching final layout — no layout jump for screenshots |
| Background refetch | data stays visible; header timestamp animates (200ms fade) — no flicker |
| Error | card-level inline banner + retry; page never blanks |
| Empty | illustrated-free text empty-state with the exact flag/action to fix (see §2 rule) |
| Stale | dim + ⚠ badge (§1 rule 4) |

- Transitions: 200ms ease-out on tab switch + bar widths (`transition-all` already in Analytics.tsx style).
- Respect `prefers-reduced-motion`: disable Live pulse animation, keep polling.
- Focus order tablist = roving tabindex (`role="tablist"`, arrow keys) — existing pill tabs lack this; new component implements it correctly (a11y bullet for thesis).
- Tables: `<th scope>`, zebra rows `#F8FAFC`, sortable headers where cheap (latency, time).
- Contrast: all semantic colors above ≥4.5:1 on white (verified hex choices); brand `#6EB9FF` only on large text / non-text elements (its white-text combo is decorative-only… active tab keeps `bg-[#6EB9FF] text-white` since it duplicates state with aria-selected).

## 8. Responsive

- ≥1280px: 4-col KPI strip, side-by-side charts.
- md: 2-col KPI, charts stack.
- <768 (mobile screenshot check): tabs → vertical section stack, tables horizontal-scroll with sticky first col. Admin is desktop-first; mobile = "readable in emergency", satisfies DEVICE-browser gate without heroics.

## 9. Component inventory → files

| Component | File (new) | Deps |
|---|---|---|
| `MonitoringPage` (shell+tabs) | `src/pages/admin/monitoring/MonitoringPage.tsx` | router, TabHealth… |
| `TabHealth / TabRag / TabLearner / TabApi` | `src/pages/admin/monitoring/*.tsx` | TanStack Query |
| `StatusPill`, `KpiCard` | `src/pages/admin/monitoring/components/StatusPill.tsx`, `KpiCard.tsx` | – |
| `Sparkline` (svg polyline+area path) | `components/Sparkline.tsx` | – |
| `StackedBar`, `FunnelBars`, `WaterfallBar` | `components/Bars.tsx` (one file, tiny) | – |
| `MinuteAreaChart` (dual series) | `components/MinuteChart.tsx` | – |
| `TraceTable` + `TraceDetail` | `components/TraceTable.tsx` | – |
| API client | `src/services/monitoringApi.ts` | existing axios client |

Bundle cost: 0 new dependencies (all hand-rolled SVG/CSS ≈ ~9KB JSX total).

## 10. Thesis screenshot pack (produced in P4)

1. Tab1 all-green + one simulated provider down (WARN state visible)
2. Tab2 stats + expanded trace waterfall (refusal chip in view)
3. Tab3 funnel with real seeded data
4. Tab4 with live traffic during demo (requests/min spike as we click around the app)
5. Mobile-emulation Tab2 (proof of responsive claim)

*Approval gate: user signs off §1-§4 look & Tab-2 layout specifically (most complex), then Development P1 begins — but only AFTER Batch 2 stash-pop restores Tier1/2 files.*
