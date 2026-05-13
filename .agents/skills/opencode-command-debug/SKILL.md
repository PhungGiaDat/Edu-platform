---
name: opencode-command-debug
description: Migrated OpenCode slash command `debug`. Use when the user asks to run or follow the old OpenCode `/debug` workflow.
---

# opencode-command-debug

This skill was migrated from `.opencode/commands/debug.md`.

OpenCode slash-command runtime features such as `$ARGUMENTS`, automatic command routing, and shell interpolation are preserved as prompt guidance only. Adapt them to Codex tools when executing.

## Original Command

**Reported Issues:**
$ARGUMENTS

Use the `debug` agent to find the root cause of the issue, then analyze and explain the findings to the user.

**IMPORTANT: Do not implement the fix automatically.** Diagnose only — hand off to `@fix` if the user wants to proceed.

## File Output

Save the debug report as a markdown file:
- **Location:** `./docs/report/` folder
- **Filename format:** `DEBUG_YYYYmmdd_HHMMSS.md` (e.g., `DEBUG_20260225_143022.md`)
- Create the `./docs/report` directory if it doesn't exist

## Debug Process

### Phase 1: Understand the Problem
1. What is the expected behavior?
2. What is the actual behavior?
3. When does it occur? (conditions, inputs)
4. Is it reproducible?
5. Any recent changes that could relate?

### Phase 2: Gather Information
- [ ] Read error messages and stack traces
- [ ] Check application logs
- [ ] Review relevant source code
- [ ] Check recent git commits
- [ ] Examine test results
- [ ] Verify environment configuration

### Phase 3: Isolate the Issue
- [ ] Create minimal reproduction
- [ ] Binary search through code
- [ ] Add logging/debugging statements
- [ ] Test hypotheses systematically

### Phase 4: Identify Root Cause
- [ ] Pinpoint exact location
- [ ] Understand why it happens
- [ ] Document the chain of events
- [ ] Verify the diagnosis

## Debug Report Format

```markdown
# 🔍 Debug Report

## Issue Summary
**Description:** [Brief description of the problem]
**Severity:** Critical | High | Medium | Low
**Status:** Diagnosed | Needs More Info | Cannot Reproduce

## Reproduction Steps
1. Step 1
2. Step 2
3. Step 3

## Evidence

### Error Messages / Stack Traces
```
[Paste relevant errors]
```

### Relevant Code Location
- **File:** `path/to/file.ts`
- **Lines:** 42-50
- **Function/Component:** `processPayment()`

## Root Cause Analysis

### The Problem
[Detailed explanation of what's wrong]

### Why It Happens
[Explanation of the underlying cause]

### Chain of Events
1. User triggers action X
2. System calls function Y
3. Function Y expects Z but receives W
4. This causes the error

## Recommended Fix Approach
[High-level suggestions for @fix agent — no code implementation here]

## Additional Context
- Related files: [list]
- Dependencies involved: [list]
- Environment specifics: [if relevant]

## Verification Steps
To verify the fix works once applied:
1. [Test step 1]
2. [Test step 2]
```

---
**Next step for user:** Run `/fix` with this report to implement the fix, or `/fix-test` to fix and re-run tests in a loop.
