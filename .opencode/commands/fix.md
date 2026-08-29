---
description: "Analyze and fix the issue"
---

Analyze and fix this issue:
$ARGUMENTS

Use the SDLC `fix` agent to apply the minimal safe fix.

**MODE:** Apply the current mode (YOLO/INTERACTIVE).

## Approach

- Prefer the smallest change that resolves the issue.
- Fix Critical issues first, then Important/High, then Medium/Low.
- Run relevant tests after applying the fix.
- Save a fix report when appropriate.

**Output:** `./report/FIX_YYYYmmdd_HHMMSS.md`
