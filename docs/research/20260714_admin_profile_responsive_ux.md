# Research: Admin, Dynamic Profile and Responsive Child UX

Date: 2026-07-14

## Confirmed findings

- `/admin` exists. The guard allows teacher/admin roles or `is_superuser`, then redirects all other authenticated users to `/profile`.
- The deployed auth contract was behind the local work: the browser user object was derived from incomplete token data and production `UserResponse` did not expose `is_superuser`.
- The admin seed script only set superuser status at first insertion, so an older document could remain under-privileged.
- Production Profile values were hardcoded. The unpushed local attempt called nonexistent report/badge endpoints and used one fail-fast `Promise.all`.
- Sidebar width and Layout offset were independently hardcoded at 256 px; mobile icons had no visible labels.
- Tracker/sticker icons were platform emoji and sticker total was hardcoded.
- Course catalog clipping came from narrow three-column/global clay sizing, one-line title truncation, and missing horizontal containment.
- Literal `?` characters are present throughout the three Momo seed JSON documents; this is stored corruption, not a loading state.
- Lexi jumped to a 128 px square launcher at `md`; the sprite atlas uses rectangular 192x208 cells.

## Implementation consequences

- Normalize auth from `/auth/me` after login and restore, and keep the backend response schema in sync.
- Aggregate Profile server-side behind `/profile/me`; isolate optional failures and use stored editorial content rather than JSX constants.
- Couple Sidebar width and main offset through Layout state.
- Use local SVG components and scoped stat sizing.
- Validate all localized seed strings and provide a backup/dry-run-first production migration.
- Preserve sprite aspect ratio and separate the visual size from the minimum pointer target.

## Security and data notes

- Profile aggregation must ignore arbitrary client user IDs to avoid IDOR.
- Never automate, print, or commit the disclosed password. Move seed credentials to environment variables and rotate the production password after repair.
- Never run a production database migration as part of tests or deployment preparation.
