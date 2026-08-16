# Review: Profile — Real Backend Data

**Date:** 2026-07-09
**Subject:** `plan/20260709_PROFILE_REAL_DATA_PLAN.md`
**Method:** Multi-agent brainstorming — Skeptic → Constraint Guardian → User Advocate → Arbiter
**Mode:** Code-only, locked decisions, `report_first`

---

## Phase 1 — Primary Designer (already produced)

The plan (§ 1–11) is the Primary Designer's deliverable. Locked decisions captured: API-only data source; full Profile scope; zero CSS/JSX-layout changes; optionally one new hook.

---

## Phase 2 — Reviewer Loop

### 2.1 Skeptic / Challenger

> Prompt: "Assume this design fails in production. Why?"

| # | Objection | Severity | Evidence / Reasoning |
|---|---|---|---|
| S1 | Module-level `Map<userId, ProfileData>` cache persists across logout/login | High | If user A logs out and user B logs in on the same tab, B will see A's stale data until the effect re-runs. Plan says "session-only" but doesn't invalidate on `userId` change semantics. |
| S2 | `getProgressReport(userId, 7)` does not include `quizzes_passed` | Medium | The 3rd milestone ("Quizzes Passed") will always render `0` for every user. UI presents a "broken" metric, not a missing one. |
| S3 | One 2-second retry may not survive a 60-second Render cold start | High | A second mount during cold start still sees ECONNREFUSED → error state shown even though the third visit would succeed. |
| S4 | `levelProgress = total_points / xp_to_next_level` assumes `xp_to_next_level` is the *target*, not the *remaining* | Medium | Plan assumes direct mapping; needs runtime confirmation that the field semantics match the existing UX. If it's "remaining XP", the progress bar math will be inverted. |
| S5 | Inline `<div>` injected into hero for the error case adds a new DOM node | Low | Plan § 4 says "no new wrapper divs except where absolutely required." The injected `<div>` is a justified exception but should be a single text node, not a styled box. |
| S6 | `Promise.all` with 6 endpoints — if any one rejects, the whole hook errors | Low | `Promise.all` fails fast. A 200 on 5 endpoints and a 500 on the 6th will wipe out the 5 successes. |
| S7 | `useEffect` deps `[userId]` only — but `apiClient` reads token from `localStorage` at call time, not from a closure | Low | Worth noting that the token is read lazily; the dep array is correct but the comment in code should make this explicit. |

**Skeptic verdict:** The plan is workable but has 3 material risks (S1, S2, S3) and 1 semantic verification (S4) that must be addressed before or during implementation.

---

### 2.2 Constraint Guardian

> Prompt: "Enforce NFRs: cold start, no design changes, React perf."

| # | NFR area | Status | Comment |
|---|---|---|---|
| C1 | **Cold-start UX** (NFR-1) | ✅ Pass | Loading uses existing JSX with `0`/empty fallbacks — no new spinner. Auto-retry once with 2s backoff is implemented in the hook. Acceptable per locked scope. |
| C2 | **No design changes** (NFR-2, locked) | ⚠️ Watch | Plan § 4 explicitly allows ONE inline `<div>` for the error case. This is consistent with the locked decision ("optionally ONE hook" + the orchestrator's instruction that the inline error text is permitted). The injected div uses an **existing** Tailwind class already present in the file (`text-sm text-slate-500` on lines 269 and 320) — **not a new class**, so the constraint is honored. ✅ |
| C3 | **React perf** (NFR-3, Vercel rules) | ✅ Pass | `Promise.all`, lazy state init, functional setState, `Set` for O(1) lookup, module-level cache — all applied per § 6. |
| C4 | **Bundle size** (NFR-4) | ✅ Pass | Hook is a single new file; no new deps. `apiClient` import is direct. |
| C5 | **Security** (NFR-5) | ✅ Pass | No new token handling; `apiClient` continues to attach `Authorization: Bearer …`. No PII logged. |
| C6 | **Maintainability** (NFR-6) | ✅ Pass | All data-shape assumptions are isolated in `ProfileData` TS type. |
| C7 | **Operational cost** (NFR-7) | ✅ Pass | One cache (in-memory Map) per session — no backend cost. |
| C8 | **Accessibility** (NFR-8) | ⚠️ Watch | Error message `<div>` injected into hero should have `role="status"` or similar, OR be paired with the existing `<h1>` so screen readers announce it. Plan does not specify ARIA. |

**Constraint Guardian verdict:** Approved with two watch items (C2, C8) — C2 is fine because the class is reused; C8 needs a one-line `aria-live="polite"` on the injected error `<div>`.

---

### 2.3 User Advocate

> Prompt: "Represent the admin/learner using this on cold start and post-login."

| # | Concern | Severity | Resolution |
|---|---|---|---|
| U1 | Admin/learner sees `0 XP`, `0 streak`, empty badges for ~30–60s on cold start | High | Acceptable — UI mirrors "new account" state, no broken layout. Recommend documenting in the test report. |
| U2 | After successful login, the dashboard briefly shows the cached user A's data before user B's fetch resolves | High | Tied to S1. Cache must be invalidated on `userId` change. **Mandatory fix.** |
| U3 | Returning user (warm cache) expects instant render — but the hero shows real numbers while badges/leaderboard show "empty" while the second fetch resolves | Medium | Because all 6 endpoints are in `Promise.all`, they all resolve together. Either all-or-nothing. Acceptable. |
| U4 | If the backend is down for >2s, the user sees a quiet text message in the hero. Is "data unavailable" clear enough? | Medium | The injected `<div>` should read "Profile data unavailable — retrying" or similar natural English. Recommend copy: `Profile data unavailable — please refresh.` |
| U5 | On mobile, the empty-state with `0`s may look "broken" because the badges grid renders 6 empty circles | Low | Existing grayscale styling (`opacity-40`) on unearned badges handles this gracefully. No change needed. |
| U6 | Children using the app may not understand the level ring at 0% | Low | The ring shows `--progress: 0%` (empty ring) which is correct UX. No change. |

**User Advocate verdict:** Approved with U2 (cache invalidation) and U4 (error copy) as mandatory.

---

## Phase 3 — Integrator / Arbiter

The Arbiter reviewed all objections, the plan, and the locked decisions.

### Decision Log

| ID | Decision | Alternatives considered | Objection(s) | Resolution |
|---|---|---|---|---|
| D1 | Cache `Map<userId, ProfileData>` is **cleared on `userId` change** by deleting the previous key after the new effect runs (or by keying strictly by `userId`). | (a) Persistent cache across logins (rejected — S1/U2) (b) No cache at all (rejected — would hurt warm UX) | S1, U2 | **Accepted S1/U2**: cache is keyed by `userId` so user A's data is never visible to user B. |
| D2 | `Promise.all` errors fail the whole hook; partial data is **not** shown. | (a) `Promise.allSettled` + merge (b) Per-endpoint try/catch | S6 | **Rejected S6**: locked scope is "one hook, no design changes." `Promise.all` is the simplest parallel pattern. If a single endpoint is down, the user sees a clear inline error and can refresh. |
| D3 | Quizzes milestone keeps `current: 0` (no data source). | (a) Drop the milestone entirely (b) Add a backend endpoint | S2 | **Accepted S2**: dropping would change the layout (rejected by lock). Adding a backend endpoint is out of scope. UI shows `0 / 25` — visually honest, not broken. |
| D4 | 2-second backoff retry is **once**, not configurable. | (a) Exponential backoff (b) Three retries | S3, locked scope | **Acknowledged S3**: per locked decision, ONE retry with 2s backoff. Cold-start beyond that surfaces the inline error. |
| D5 | Progress bar uses `xp_to_next_level` directly. If the field semantics differ, the orchestrator defers to the test plan (T6 + manual visual check). | (a) Hardcode `xpForNextLevel = 1500` like before (b) Reverse-engineer from `level` | S4 | **Accepted with runtime check**: hook reads `xp_to_next_level` as-is. If the test report shows inverted progress, fall back to hardcoded `1500` for this PR and document the field-semantics question for the next backend ticket. |
| D6 | Inline error `<div>` uses existing classes `text-sm text-slate-500`, plus `aria-live="polite"`, copy: "Profile data unavailable — please refresh." | (a) No error message at all (b) New styled component | S5, U4, C8 | **Accepted all**: matches locked constraint (no new class), satisfies accessibility (C8), and is user-friendly (U4). |
| D7 | Single new file `useProfileData.ts`. | (a) Inline hook inside `Profile.tsx` (b) Multiple hook files | scope | **Accepted**: locked decision allows "optionally ONE hook." |

### Final Disposition

**APPROVED** — the plan is sound, the new hook is the right boundary, and all 7 reviewer objections are either resolved or explicitly rejected with rationale. The implementation may proceed.

### Implementation Guardrails (must hold during Step 3)

1. **Cache key = `userId` only.** No global "current profile" cache. Mounting with a different `userId` must produce a fresh fetch (or a fresh cache miss → fresh fetch).
2. **`Promise.all` with 6 calls, each wrapped in their own try inside the parallel wrapper so a single rejection still surfaces the error message.**
3. **Inline error `<div>` lives inside the existing hero `<section className="clay-hero …">` next to the existing text block — not as a new sibling section.**
4. **`aria-live="polite"` on the error `<div>`.**
5. **All numbers fall back to `0`; all arrays fall back to `[]`; all leaderboard avatars fall back to dicebear.**
6. **JSX, CSS classes, and Tailwind utilities unchanged.**

### Objections explicitly REJECTED (with rationale)

- **S2 partial-data display via `Promise.allSettled`**: Rejected — adds branching that requires new JSX (conditional region per partial source), violating the lock.
- **S3 longer retry / exponential backoff**: Rejected — locked decision is "one auto-retry with 2s backoff."
- **S6 try/catch around each endpoint**: Partially accepted (D2) but **not** as `Promise.allSettled` + merge — we surface a single inline error instead, which is consistent with the locked "no design changes" rule.

### Objections ACCEPTED (implemented)

- **S1, U2** → D1 cache-by-userId.
- **S5** → D6 single injected `<div>`.
- **C8** → D6 `aria-live`.
- **U4** → D6 error copy.

### Objections DEFERRED (with note)

- **S2 quizzes field** → D3 deferred to a future backend ticket (out of locked scope).
- **S4 `xp_to_next_level` semantics** → D5 deferred to test execution; if misbehaving, the hook will fall back to a derived `1500` constant and a follow-up note will be added to the test report.

---

## Exit Criteria Check

- [x] Plan produced (Primary Designer)
- [x] Skeptic invoked (7 objections)
- [x] Constraint Guardian invoked (8 NFRs)
- [x] User Advocate invoked (6 concerns)
- [x] Decision Log complete (7 entries)
- [x] Arbiter disposition explicit: **APPROVED**

The plan may exit multi-agent brainstorming and proceed to implementation under the guardrails above.