---
name: opencode-command-fix-test
description: Migrated OpenCode slash command `fix-test`. Use when the user asks to run or follow the old OpenCode `/fix-test` workflow.
---

# opencode-command-fix-test

This skill was migrated from `.opencode/commands/fix-test.md`.

OpenCode slash-command runtime features such as `$ARGUMENTS`, automatic command routing, and shell interpolation are preserved as prompt guidance only. Adapt them to Codex tools when executing.

## Original Command

## Reported Issues
$ARGUMENTS

Use `@debug` and `@tester` to find the root cause of the failures, implement fixes, and repeat until all issues are resolved. Then delegate to `@reviewer` for a final code review.

## Loop Process

### Round N:
1. **@tester** — run the full test suite, collect failures
2. If failures found:
   - **@debug** — analyze root cause of each failing test
   - **@fix** — implement the fixes based on debug findings
3. Repeat from step 1 until all tests pass
4. **@reviewer** — review all code changes made during the fix loop

Stop looping when: all tests pass OR max 5 rounds reached (escalate to user if still failing after 5 rounds).

## File Output

- Test reports → `./docs/report/TEST_REPORT_YYYYmmdd_HHMMSS.md` (one per round)
- Fix reports → `./docs/report/FIX_YYYYmmdd_HHMMSS.md` (one per fix round)
- Review report → `./docs/report/REVIEW_YYYYmmdd_HHMMSS.md`

## Final Summary

After the loop completes, report:
```markdown
## Fix-Test Loop Summary

| Round | Tests Run | Failed | Fixed | Status |
|-------|-----------|--------|-------|--------|
| 1     | [count]   | [n]    | [n]   | ❌     |
| 2     | [count]   | [n]    | [n]   | ✅     |

**Result:** All tests passing after [N] rounds
**Files Modified:** [list]
**Code Review:** ✅ Passed / ⚠️ Issues found (see report)
```
