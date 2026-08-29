---
description: Compact the current session context into a concise snapshot to free up context space and maintain efficiency
---

Compact the current session by creating a structured context snapshot.

## What to do

1. **Summarize the current session** into a snapshot covering:
   - Original task / goal
   - Current operation mode (YOLO / INTERACTIVE)
   - Completed phases with one-line outcomes (not full details)
   - Key decisions made
   - Files created or modified (paths only, not content)
   - Current phase and status
   - Active issues or blockers
   - Next steps

2. **Save the snapshot:**
   - Location: `./docs/context/` folder
   - Filename: `COMPACT_YYYYmmdd_HHMMSS.md`
   - Create the `./context` directory if it doesn't exist

3. **Confirm to the user** with the snapshot path and what was preserved.

## Snapshot Format

```markdown
# Context Snapshot — YYYYmmdd_HHMMSS

## Task
[Original task description — 1-2 sentences]

## Mode
YOLO | INTERACTIVE

## Phase Progress
| Phase | Status | Key Outcome |
|-------|--------|-------------|
| Phase 1: Planning | ✅ Done | [one-line summary] |
| Phase 2: Design UI/UX | ✅ Done | [one-line summary] |
| Phase 3: Development | 🔄 In Progress | [current status] |
| Phase 4: Code Review | ⏳ Pending | — |
| Phase 5: Testing | ⏳ Pending | — |
| Phase 6: Deployment | ⏳ Pending | — |
| Phase 7: Documentation | ⏳ Pending | — |

## Key Decisions
- [decision 1]
- [decision 2]

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/auth/login.ts` | Created | OAuth login handler |
| `src/middleware/auth.ts` | Modified | Added token validation |

## Current Phase
Phase [N]: [Name] — [In Progress / Just Completed]

## Active Issues / Blockers
- [any open issues, or "None"]

## Next Steps
1. [immediate next action]
2. [following action]

---
*Compacted at [timestamp] — Resume from this snapshot*
```

## Arguments

If `$ARGUMENTS` is provided, treat it as a note or hint to include in the snapshot (e.g., a focus area, a decision the user wants recorded, or a reason for compacting).

## After Saving

Output a brief confirmation:
```
📦 Context compacted → ./docs/context/COMPACT_YYYYmmdd_HHMMSS.md

Preserved:
  ✅ [N] phases completed
  ✅ [N] decisions recorded  
  ✅ [N] files tracked
  ✅ Next: [next step]

Context is now lean. Continuing...
```
