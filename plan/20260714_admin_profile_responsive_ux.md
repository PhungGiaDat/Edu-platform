# EduAR Admin, Profile, Navigation and Child UX Plan

Date: 2026-07-14  
Mode: Interactive SDLC  
Baseline: `origin/main` (`c3bb2a9`) on `codex/sdlc-profile-navigation-fixes`

## Objectives and acceptance criteria

1. An authenticated teacher, admin, or superuser can open `/admin`; learners still redirect to `/profile`.
2. Navigation is usable for children aged 5–8 at mobile, tablet, and laptop sizes, with no horizontal overflow.
3. Tracker and sticker visuals use deterministic child-friendly SVG icons rather than platform emoji.
4. Every Profile section is API-driven without changing the existing page layout.
5. Course catalog cards remain readable and the three Momo courses contain restored Vietnamese Unicode data.
6. The sticker navigation icon is consistent with the tracker.
7. Lexi remains proportional and appropriately sized at iPhone 14 Pro and laptop breakpoints.

## WBS and SDLC phases

| WBS | Phase | Deliverable / gate |
|---|---|---|
| 1.1–1.3 | Planning | Confirm route/auth/profile/data root causes and production drift. |
| 1.4–1.6 | Planning | Define API contract, responsive breakpoints, risks, traceability, and rollback boundaries. Gate: requirements and architecture approved. |
| 2.1–2.3 | UI/UX | Specify mobile labeled bottom bar and More sheet; desktop 88 px rail / 296 px sidebar behavior. |
| 2.4–2.7 | UI/UX | Specify tracker icons, catalog clamp, Lexi sizing, accessibility and viewport matrix. Gate: design spec complete. |
| 3.1–3.3 | Development | Create clean branch/worktree; preserve dirty user checkout; materialize planning artifacts. |
| 3.4–3.8 | Development | Hydrate auth from `/auth/me`, expose `is_superuser`, repair safe admin seeding, and add role-guard regression tests. |
| 3.9–3.17 | Development | Add authenticated `/profile/me` aggregation, dynamic editorial content, graceful section degradation, frontend mapping, and tests. |
| 3.18–3.25 | Development | Implement responsive Layout/Sidebar state, labeled mobile nav, accessible More sheet, rail toggle and persistence. |
| 3.26–3.32 | Development | Add reusable SVG metrics, dynamic sticker total, compact tracker, catalog overflow fixes and Unicode validation. |
| 3.33–3.37 | Development | Correct Lexi launcher/header sizing and preserve the 192:208 atlas ratio. |
| 3.38–3.42 | Development | Repair all localized fields in the three Momo seed files and add a dry-run-first, targeted, idempotent Mongo backfill. |
| 4.1–4.6 | Review | Review correctness, OWASP access control/IDOR, data migration safety, responsive performance and fix findings. Gate: no unresolved critical/high issues. |
| 5.1–5.12 | Testing | Backend contract/unit tests, frontend build/tests, auth/profile regressions, Unicode validator, responsive and reduced-motion checks. Gate: all scoped checks pass. |
| 6.1–6.11 | Deployment | Backend-first staging/production procedure, schema and smoke checks, frontend deploy, data backup/dry run/apply, rollback report. Gate: explicit user approval before external mutation. |
| 7.1–7.6 | Documentation | API, migration, responsive behavior, admin recovery, release notes and final traceability. Gate: docs complete. |

## Architecture decisions

- `/api/v1/auth/me` is the authoritative browser user source; JWT claims alone are insufficient for authorization UI.
- `/api/v1/profile/me` uses only the authenticated principal and returns `identity`, `summary`, `badges`, `milestones`, `leaderboard`, `daily_challenge`, `content`, and `meta.partial_sections`.
- Optional Profile source failures are isolated; they cannot erase identity, XP, or streak data.
- Navigation: `<768 px` labeled five-item bottom bar and More sheet; `768–1199 px` 88 px rail with 296 px overlay; `>=1200 px` 296 px expanded by default and collapsible to 88 px while pushing content.
- Navigation preference is versioned in local storage; accessibility includes Escape, backdrop close, focus trap/return, safe areas, and visible labels.
- The database repair is restricted to three known course IDs, creates backups, supports dry run by default, uses field-level updates, and is idempotent.

## Critical path

Auth contract -> backend deploy verification -> frontend auth hydration -> admin smoke test.  
Profile aggregator -> frontend mapping -> contract/UI tests.  
Unicode reconstruction approval -> backup/dry run -> apply -> catalog smoke test.

## Risks and mitigations

- Existing admin document may lack privilege: inspect and repair idempotently; rotate disclosed credentials afterward.
- Local main contains unrelated work: implement from clean `origin/main` worktree and stage only scoped files.
- One profile dependency may fail: return partial-section metadata and keep core sections usable.
- Global clay styles may regress other pages: use Sidebar-scoped sizing only.
- Seed edits alone do not fix Mongo: ship a separately approved targeted backfill.
- Incorrect Vietnamese reconstruction: preserve IDs/schema/answer keys and require a content diff review before production apply.

## Verification matrix

- Roles: guest, learner, teacher, admin, superuser; login and reload with stale storage.
- Viewports: 393x852, 768x1024, 1024x768, 1280x800, 1440x900; 125% zoom and 200% text zoom.
- States: zero/large metrics, loading, partial API failure, long Vietnamese titles, reduced motion, keyboard-only navigation.

Production deployment, credential rotation, and Mongo `--apply` remain explicit approval gates.
