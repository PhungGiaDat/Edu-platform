---
description: Analyze and fix the issue [FAST]
allowed-tools: Agent, Read, Write, Edit, Bash, Glob, Grep
---

Analyze and fix this issue:
$ARGUMENTS

## Approach

Go fast. Read the relevant code, identify the root cause, apply the minimal fix, verify it works.

- No need to wait for a debug report — analyze inline
- Fix Critical issues first, then others
- Make the smallest change that solves the problem
- Run tests after applying the fix

## File Output

Save the fix report as a markdown file:
- **Location:** `./docs/report/` folder
- **Filename format:** `FIX_YYYYmmdd_HHMMSS.md` (e.g., `FIX_20260225_143022.md`)
- Create the `./docs/report` directory if it doesn't exist

## Fix Process

1. Read affected files
2. Locate the problematic code
3. Apply the minimal fix
4. Run tests to verify
5. Check for regressions

## Output Format

```markdown
# 🔧 Fix Report

## Issue
[Brief description]

## Root Cause
[What was wrong and why]

## Fix Applied
- **File:** `src/file.ts`
- **Lines:** 42-50
```diff
- // Before
+ // After
```

## Verification
- [x] Fix applied
- [x] Tests passing
- [x] No regressions

## Files Modified
| File | Changes |
|------|---------|
| `src/file.ts` | +3, -1 |
```
