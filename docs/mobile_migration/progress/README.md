# `docs/mobile_migration/progress/` — Implementation Evidence Log

Progress files are **evidence that work happened** — concrete outputs the next agent can verify.

## What lives here

- `YYYY-MM-DD-<topic>.md` — one file per session / milestone
- Each file is **append-only within a session** — newer sessions create newer files
- Files are short (~50-200 lines). Heavy content goes in `spec/`, this is the diary.

## File naming

- Date prefix is the **session date** (UTC+7 Vietnam)
- Topic is short: `course-list-screen`, `session-warning-reducer`, `parity-reconciliation`
- NEVER rename an existing progress file — its name is its identity

## When to write

Every **completed** implementation task MUST produce a progress entry. Trivial fixes (typos, one-line changes) can skip. This mirrors the `docs/unity_ar/progress/` protocol — the two lanes stay independently verifiable.

## Minimum content per entry

```markdown
## Session
YYYY-MM-DD HH:MM, agent: <claude-code | cursor | human>, branch: <git branch>

## Goal
One sentence the user asked.

## Changed
- `path/to/file.tsx` — what changed

## Verified
- compilation: pass | fail | not-run (`npx tsc --noEmit`)
- tests: <names + pass/fail>
- manual: <what was checked on device/simulator>

## Not Verified
Explicit list. Default to listing anything on physical devices.

## Specs touched
Links to `docs/mobile_migration/spec/<file>.md` sections affected.

## Blockers raised
Links to `docs/mobile_migration/blockers/<file>.md` if any.
```

## Anti-patterns

- No evidence of verification (a "done" without a check).
- Claiming parity with web without citing the `frontend-web/` source file.
- Claiming a backend call works without the endpoint path.
- Writing into `docs/unity_ar/progress/` for general mobile product work (that domain is Unity/native-AR only).
