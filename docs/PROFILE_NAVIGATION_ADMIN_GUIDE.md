# Admin, Profile and Responsive Navigation Guide

## Auth contract

`GET /api/v1/auth/me` is the authoritative browser identity source. The frontend refreshes it after login and on stored-session restoration. Admin UI eligibility is teacher/admin role or `is_superuser`; backend dependencies remain the security boundary.

## Dynamic Profile API

`GET /api/v1/profile/me` requires a bearer token and does not accept a user ID. Response sections:

- `identity`: account name, avatar and role fields.
- `summary`: level, XP, streak, lessons, learned words and passed quizzes.
- `badges`: catalog definitions with authenticated earned state.
- `milestones`: server-computed current values and targets.
- `leaderboard`: current persisted ranking entries.
- `daily_challenge`: today's completed lessons and persisted content settings.
- `content`: hero, testimonial and CTA copy from `profile_content`.
- `meta.partial_sections`: optional sources that failed during composition.

The existing Profile visual hierarchy is retained. A partial source failure should not blank the entire page.

## Navigation rules

- Below 768 px: labeled Learn, AR, Cards, Profile and More bar for authenticated learners. More opens the accessible activity sheet.
- 768–1199 px: 88 px rail; expansion is a 296 px overlay.
- 1200 px and above: 296 px expanded navigation by default; collapsed width is 88 px and the page offset follows it.
- The versioned preference key is `eduar:sidebar-preference`.

## Course text maintenance

`backend/scripts/repair_momo_course_unicode.py` owns the reviewed mapping used to repair the tracked seed files. Its default is check-only. `backend/course_unicode.py` provides pure validation/migration helpers. The Mongo migration is separately approval-gated and always defaults to a dry run.

When editing localized course copy, run:

```powershell
python scripts/repair_momo_course_unicode.py
python -m pytest tests/test_momo_course_unicode.py -q
```

## Admin account maintenance

Use `backend/scripts/create_admin.py` with deployment environment variables. Existing accounts are repaired idempotently; passwords change only with the explicit reset flag. Never commit or log admin credentials.
