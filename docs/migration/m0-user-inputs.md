# M0 User Inputs — Captured 2026-07-26

> **Source:** User interview (AskQuestion tool)
> **Branch:** `feature/courses-pets-rn-migration`
> **Purpose:** Unblocks Phase 0 smoke test, backend wiring, and Mac Day planning.

---

## Input Matrix

| # | Input | Value | Settled | Notes |
|---|-------|-------|---------|-------|
| **U-1** | Backend API base URL | `https://edu-platform-api-do20.onrender.com` | ✅ | Render cloud. **ACTION:** Update `mobile/rn/.env` and `scripts/phase0-smoke.ts` config. |
| **U-2** | API auth method | None (no API key built yet) | ⚠️ | Open access. **ACTION:** Smoke test runs without auth header. Plan §1.1 marks some endpoints as optional auth. |
| **U-3** | Backend host | Render cloud | ✅ | Same as U-1. |
| **U-4** | Apple Developer team in Xcode | Yes, activated | ✅ | No action — iOS prebuild path is unblocked. |
| **U-5** | iPhone for testing | Yes | ✅ | No action. |
| **U-6** | iOS version on test device | iOS 26.5 (beta) | ⚠️ | iOS 26 = post-iOS-18 future state. Expo 57 + RN 0.86 should support; ARKit operations may need fallback. **ACTION:** Smoke test runs on Expo Go (no ARKit). For ARKit, defer to Mac Day. |
| **U-7** | Mac Day booked | Aug 9, 2026 (Day 14) | ✅ | For iOS prebuild + ARKit verification. |
| **U-8** | Supabase project URL | Already in `.env` | ✅ | No action — verify `EXPO_PUBLIC_SUPABASE_URL` exists in `mobile/rn/.env` on Mac Day. |
| **U-9** | Supabase Edge Functions | "what is edge functions" | ❓ | User unclear. **DEFERRAL:** Mark as "unknown / not used". Plan §1.1 lists endpoints via FastAPI directly; no Edge Function integration in Phase 0–6. |
| **U-10** | Other credentials (Sentry, analytics) | "if they are free" | ❌ | **Decision:** No paid services. No Sentry/analytics keys added. |

---

## Action Items (Today)

| # | Action | Owner | Status |
|---|--------|-------|--------|
| A-1 | Update `mobile/rn/.env` `EXPO_PUBLIC_API_URL` to Render URL | Subagent (in flight) | TODO |
| A-2 | Verify `EXPO_PUBLIC_SUPABASE_URL` present in `mobile/rn/.env` | Subagent | TODO |
| A-3 | Confirm no API key needed for Phase 0 smoke test (backend open or has dev token) | User | Open |
| A-4 | Mac Day booked: Aug 9 (Day 14) — book physical Mac/coworking slot | User | ✅ |
| A-5 | iOS 26.5 — note on WBS for Mac Day ARKit smoke | User | Open |

---

## WBS Update (Tracker `docs/pm-excel/COURSES_PETS_MIGRATION_TRACKER.xlsx`)

Task 1.3 row:

| Field | Old | New |
|-------|-----|-----|
| Status | Not Started | **Completed** |
| Completed Date | (empty) | 2026-07-26 |
| Notes | (empty) | U-1: https://edu-platform-api-do20.onrender.com; U-2: no API key; U-7: Mac Day Aug 9; U-6: iOS 26.5 (beta) |

---

## Open Questions (post-Phase-0)

- **OQ-M0-1:** Does the Render backend allow unauthenticated read access to `/api/v1/courses` and `/api/v1/pets`? (Required for Phase 0 smoke test to succeed at Task 0.6.)
- **OQ-M0-2:** Is there a dev/test user account the smoke test can use for `authApi.login`? (Required for testing authenticated endpoints `startCourse`, `startLessonSession`, `submitLessonStep`, etc.)
- **OQ-M0-3:** Are Supabase Edge Functions in use? (Phase 0 plan assumes FastAPI-only; Edge Functions would affect `getLessonMedia` URL signing.)
