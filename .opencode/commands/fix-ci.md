---
description: Analyze GitHub Actions logs and create a fix plan — asks for confirmation before implementing
---

## GitHub Actions URL / Run ID
$ARGUMENTS

Use `@planner` and `@researcher` to read the GitHub Actions logs, analyze and identify the root causes of the failures, then provide a detailed plan for fixing them.

**IMPORTANT:** Ask the user for confirmation before implementing any fix.

## Process

### Step 1 — Fetch and read logs
- Fetch the GitHub Actions logs from the URL or run ID provided
- If no URL given, check the most recent failed run on the current branch

### Step 2 — Analyze failures
Invoke `@planner` and `@researcher` in parallel:
- **@researcher** — identify what failed, error messages, root causes
- **@planner** — design the fix approach, list files to change, estimate effort

### Step 3 — Present fix plan to user
Show:
- Summary of what failed and why
- Proposed fix steps (numbered, specific)
- Files to be modified
- Any risks or side effects

### Step 4 — Wait for confirmation
```
⏸️ Ready to implement the fix above. Shall I proceed? (yes / no / adjust)
```

### Step 5 — Implement only after approval
If confirmed, invoke `@fix` to apply the changes, then run `/test` to verify.

## File Output

Save analysis to `./docs/report/CI_FIX_YYYYmmdd_HHMMSS.md`
