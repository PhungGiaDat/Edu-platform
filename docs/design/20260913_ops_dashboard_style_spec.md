# Style Spec — Operations Monitoring Dashboard (bản brainstorm)

> Sinh từ 2 skill lenses: **ui-ux-pro-max** (SKILL.md principles — DB search không cài local) ×
> **design-taste-frontend-v1** (anti-slop). Căn cứ repo thật: `frontend/src/styles/admin.css`
> (Nunito/DM Sans, #6EB9FF/#B4E197), `@/shared/components/icons/Icons` (SVG hand-rolled),
> `motion@13` đã cài chưa dùng, Tailwind v4, không chart lib.
> Ngày: 2026-09-13 · Trạng thái: **CHỜ DUYỆT HƯỚNG STYLE** — chưa merge vào `docs/ui-design-ops-dashboard.md` cho tới khi user chốt.

---

## 1. Brainstorm — 3 hướng ứng viên

| Tiêu chí (trọng số) | **A. Friendly Technical** ⭐ | B. Cockpit Dense | C. Soft Playful |
|---|---|---|---|
| khớp admin hiện tại (25%) | 5 — kế thừa trực tiếp | 2 — bỏ cards, dark, 1px lines | 4 — quá tròn trịa |
| taste-v1 anti-slop (20%) | 5 | 4 | 2 — Baloo/emoji-risk, dễ "AI kid slop" |
| ui-ux-pro-max a11y/UX (20%) | 5 | 3 — density 8 khó AA | 4 |
| phù hợp hội đồng luận văn (15%) | 5 — "đọc được ngay" | 3 — gây choáng | 3 — thiếu uy tín kỹ thuật |
| chi phí implement P1 (10%) | 5 — 0 dep mới | 2 — viết lại hết | 4 |
| độ trễ tin cậy khi "demo live" (10%) | 4 | 5 | 2 |
| **Tổng weighted** | **4.85** | 3.00 | 3.20 |

**Kết luận brainstorm: Hướng A** = nền admin hiện tại (Nunito display + DM Sans body, xanh mint duo-tone)
**đội thêm kỷ thuật toán học** từ taste-v1: số liệu discipline, semantic states không dùng màu đơn độc,
icon SVG thay emoji, motion có chủ đích nhưng **không bao giờ anim data**, và bỏ "AI purple".

B/C bị loại nhưng **mượn 2 mảnh**: tính "divide-don't-box" của B (áp cho KPI strip) và sự ấm áp của C
(giữ Nunito rounded làm display font — nó đã là font admin).

---

## 2. Design System hướng A (adjudicated)

### 2.1 Typography
| Role | Font | Spec |
|---|---|---|
| Display / KPI số | `Nunito` (đã load) | 700–900, tracking-tight |
| Body / label | `DM Sans` (đã load) | 400–700 |
| Số trong bảng, KPI | DM Sans + **`font-variant-numeric: tabular-nums`** (bắt buộc) | — |
| Code: route, model, trace_segments | `ui-monospace, SFMono-Regular, Menlo` — **KHÔNG** nạp webfont mono mới (见 §4 deviations) | 12px |
| Cấm | Inter (preview v1 dùng — sửa ở v2), serif trên dashboard | hard rule |

### 2.2 Color — semantic set cập nhật
| Token | Hex | Dùng | Ghi chú taste-v1 |
|---|---|---|---|
| primary | `#6EB9FF` | tab active, bars | giữ nguyên brand admin |
| accent | `#B4E197` | gradient partner của primary | duo-tone brand — deviation có chủ đích khỏi "max 1 accent" |
| success | `#16A34A` | ● UP, ✓ rule-pass | AA |
| warning | `#D97706` | ⚠ WARN, slow provider | AA |
| danger | `#DC2626` | ✕ FAIL, 5xx | AA |
| **refusal (MỚI)** | **teal `#0F766E`** (chip `#F0FDFA`/`#99F6E4`) | 🚫→ icon "slash-bubble" từ chối OOD | **thay violet #7C3AED — THE LILA BAN** |
| neutral | `#64748B` | idle, not-configured | |
| ink | `#0F172A` | text chính — không pure black | ✓ |
| Waterfall ramp | `#1E40AF → #3B82F6 → #6EB9FF → #B4E197` | 4 stages | data-encoding, tách khỏi UI accent; luôn kèm label chữ+% |

### 2.3 Icons — ZERO emoji (hard rule mới)
- Nguồn: **thêm vào `@/shared/components/icons/Icons`** (file có sẵn, pattern Heroicons):
  `MonitorIcon` (health), `ChipIcon` (RAG), `ChildIcon` (học viên), `GlobeIcon` (API),
  `BoltIcon` (live), `SlashBubbleIcon` (refusal), `UndoArrowIcon` (fallback ↩).
- viewBox 24×24, `stroke=currentColor`, `strokeWidth=2`, round caps — đồng nhất 1 bộ.
- KPI delta dùng ký tự typographic `▲ ▼ –` (không phải emoji).

### 2.4 Layout (mượn từ B — Cockpit)
- **KPI strip**: 1 card duy nhất, `divide-x` giữa 4–5 số — thay vì 5 card nổi (giảm card-noise, đúng tinh thần "cards only when elevation communicates hierarchy").
- Grid bất đối xứng giữ như spec cũ (`2fr/1fr`, `g2e`), mobile stack 1 cột.
- Trace table: header dùng `border-b`, row `divide-y`; zebra rất nhạt #FBFDFF (edge-highlight đỏ chỉ dành cho row lỗi).
- Container `max-w-[1280px] mx-auto px-6`.

### 2.5 Motion (motion = `motion@13` đã cài · MOTION_INTENSITY 6)
| Element | Hiệu ứng | Spec | Reduce |
|---|---|---|---|
| Card/section mount | stagger fade-up | `opacity 0→1, y 8→0, .45s cubic-bezier(.16,1,.3,1)`, delay `idx*60ms` | kill |
| Live dot | breathing | scale 1↔1.25 + opacity, 1.6s infinite | kill |
| Skeleton | shimmer sweep | gradient sweep 1.4s | static gray |
| Row expand | height auto (CSS grid-rows 0fr→1fr trick) | .25s | instant |
| Button press | `:active scale-[.98]` | transform only | giữ |
| Hover row | `transition-colors 200ms` bg #EFF6FF — **không scale/shift layout** | | giữ |
| **Data numbers** | **KHÔNG BAO GIỜ animate giá trị** (đếm số = anti-pattern honesty) | | |

### 2.6 States — bắt buộc đủ bộ (taste-v1 Rule 5)
1. **Loading**: skeleton shimmer đúng hình dạng card thật (KPI strip skeleton = 5 thanh gray; table = 4 row giả).
2. **Empty**: dashed-border + câu hướng dẫn bật flag/gửi chat — không "0 giả".
3. **Error (inline)**: strip đỏ `border-l-4` ngay dưới tab: *"GET …/rag-traces → 500 · hiển thị dữ liệu cũ nhất lúc 21:42:05 · [Thử lại]"* + tự退 về stale styling sau retry fail 2 lần.
4. **Stale**: opacity .62 + badge "⚠ dữ liệu cũ" (như spec cũ).
5. **Partial**: provider FAIL → row đỏ chữ, không sập cả panel.

### 2.7 Mock data hygiene (Jane Doe ban)
- Số "bẩn": 133 req · p50 **18.4s** · p95 **41.2s** · tokens **407,832** (≈3,066/req) · verdicts 98/21/9/5 = 73.7/15.8/6.8/3.8%.
- Câu hỏi mock giữ tiếng Việt trẻ-em tự nhiên (đã đạt).
- Cấm: 100%, 50%, 99.99%, "John Doe".

---

## 3. Diff v1 preview → v2 preview (mỗi dòng ghi rõ luật gốc)

| # | v1 (cũ) | v2 (mới) | Luật từ |
|---|---|---|---|
| 1 | Inter font stack | Nunito display + DM Sans body (đúng app) | taste-v1 ANTI-SLOP + repo evidence |
| 2 | Emoji tiêu đề tab/KPI (⚙️🤖🧒🌐) | SVG icons cùng bộ Icons.tsx | taste-v1 ANTI-EMOJI · ui-max "no emoji icons" |
| 3 | Chip refusal **tím** #7C3AED | Chip refusal **teal** #0F766E | taste-v1 THE LILA BAN |
| 4 | 5 KPI card rời | 1 **KPI strip** divide-x | taste-v1 anti-card-overuse (mượn B) |
| 5 | Số tròn (78%, 128, 41.0s) | Số bẩn (73.7%, 133, 41.2s) | taste-v1 "no fake numbers" |
| 6 | Trạng thái: có empty + stale | Thêm **skeleton shimmer + error inline strip** | taste-v1 Rule 5 mandatory states |
| 7 | Không có motion | Stagger mount + breathing dot + press scale, tất cả motion-reduce-guarded | taste-v1 MOTION 6 + ui-max reduced-motion |
| 8 | hover đổi nền tức thì | transition-colors 200ms, focus-visible ring, cursor-pointer rõ | ui-max checklist |
| 9 | banner emoji 🔍 | banner text + icon | anti-emoji |

## 4. Deviations được chấp nhận (minh bạch, có lý do)
| Luật taste-v1 | Deviation | Lý do |
|---|---|---|
| JetBrains Mono cho mọi số | Không nạp webfont mono mới; dùng tabular-nums DM Sans | dự án zero-dep-weight, mono system-ui đủ distinct cho route/model |
| Max 1 accent | Giữ duo-tone xanh+mint | brand admin đã là duo-tone — nhất quán hơn là "đẹp theo luật" |
| Không 3-col cards | KPI tile/dashboard grid vẫn dùng | luật nhắm vào marketing feature-row, không phải dashboard tiles |
| Bento perpetual motion | Motion chỉ ở chrome, data tĩnh tuyệt đối | dashboard vận hành phải **trung thực** — số nhúc nhích = nghi ngờ dữ liệu |

## 5. Map vào code P1
- `src/index.css` (Tailwind v4 `@theme`): thêm tokens `--color-refusal`, `--color-stage-{1..4}`; class `.num-tabular`.
- `shared/components/icons/Icons.tsx`: +7 icons §2.3.
- `pages/admin/monitoring/components/KpiStrip.tsx` thay cho grid cards.
- Skeletons trong cùng files chart (`SparklineSkeleton`…).
- Motion: CSS-first (keyframes) cho P1; `motion/react` chỉ nếu cần layout animation ở P4 (package đã có).
- Router/đường dẫn/không đổi API contract — style thuần presentation.

## 6. Câu hỏi duyệt
1. Chốt **hướng A**? (hay muốn xem B/C render thật?)
2. Teal thay tím cho refusal chip — OK?
3. Bỏ emoji tab-bar (v2 preview đã bỏ) — đồng ý vì app admin hiện tại cũng icon-SVG?
4. Skeleton/error states vào thẳng P1 (không đợi P4 polish) — đồng ý?
