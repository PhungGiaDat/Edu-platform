# `docs/unity_ar/progress/` — Implementation Evidence Log

Progress files are **evidence that work happened** — concrete outputs the next agent can verify.

## What lives here

- `YYYY-MM-DD-<topic>.md` — one file per session / milestone
- Each file is **append-only within a session** — newer sessions create newer files
- Files are short (~50-200 lines). Heavy content goes in `spec/`, this is the diary.

## File naming

- Date prefix is the **session date** (UTC+7 Vietnam)
- Topic is short: `cat-meat-combo`, `qr-resolution`, `xr-sim-test`
- NEVER rename an existing progress file — its name is its identity

## When to write

Every **completed** implementation task MUST produce a progress entry. Trivial fixes (typos, one-line changes) can skip.

## Minimum content per entry

```markdown
## Session
YYYY-MM-DD HH:MM, agent: <claude-code | cursor | human>, branch: <git branch>

## Goal
One sentence the user asked.

## Changed
- `path/to/file.cs` — what changed
- `GameObject/Component` — what changed

## Verified
- compilation: pass | fail | not-run
- console: clean | errors-warnings
- tests: <names + pass/fail>
- XR Simulation: <result>

## Not Verified
Explicit list. Default to listing anything mobile/physical.

## Specs touched
Links to `docs/unity_ar/spec/<file>.md` sections affected.

## Blockers raised
Links to `docs/unity_ar/blockers/<file>.md` if any.
```

## Anti-patterns

- **Don't** paste full diffs. Reference commit hashes or file paths.
- **Don't** write a progress entry without a verification block.
- **Don't** describe what you "plan to do" — progress is past tense only.

## Reading order for the next agent

1. Newest file first.
2. If you need to understand a specific component, find the progress file that first created it, then read forward.
3. If progress contradicts spec, **spec wins** — open a blocker.