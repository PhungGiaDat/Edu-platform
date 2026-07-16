---
name: opencode-command-test
description: Migrated OpenCode slash command `test`. Use when the user asks to run or follow the old OpenCode `/test` workflow.
---

# opencode-command-test

This skill was migrated from `.opencode/commands/test.md`.

OpenCode slash-command runtime features such as `$ARGUMENTS`, automatic command routing, and shell interpolation are preserved as prompt guidance only. Adapt them to Codex tools when executing.

## Original Command

Use the `tester` agent to run tests locally and analyze the summary report.

$ARGUMENTS

## What to do

1. Run the existing test suite (unit, integration, E2E as applicable)
2. Collect results — pass/fail counts, coverage, error messages
3. Analyze failures: identify root cause for each failing test
4. Present a clear summary report to the user

## File Output

Save the test report as a markdown file:
- **Location:** `./docs/report/` folder
- **Filename format:** `TEST_REPORT_YYYYmmdd_HHMMSS.md` (e.g., `TEST_REPORT_20260225_143022.md`)
- Create the `./docs/report` directory if it doesn't exist

## Output Format

### If failures found:

```markdown
# 🐛 Test Report — Failures Found

## Summary
**Tests Run:** [count] | **Passed:** [count] | **Failed:** [count] | **Coverage:** [%]

## Failing Tests

### FAIL-001: [Test name]
- **File:** `path/to/test.ts`
- **Error:** [error message]
- **Root Cause:** [brief analysis]
- **Suggested Fix:** [what needs to change]

[... repeat for each failure ...]

## Files to Fix
| File | Failures | Priority |
|------|----------|----------|
| `src/file.ts` | 2 | High |
```
**Next:** Run `/fix-test` to fix and re-run in a loop, or `/fix` for a targeted fix.
```

### If all tests pass:

```markdown
# ✅ Test Report — All Passing

## Summary
**Tests Run:** [count] | **Passed:** [count] (100%) | **Coverage:** [%]

## Coverage Breakdown
- Statements: X% | Branches: X% | Functions: X% | Lines: X%

**Status:** ✅ All tests passing
```
