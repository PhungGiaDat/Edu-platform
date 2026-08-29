---
description: Review recent changes and wrap up the work
---

Review the current branch and the most recent commits. Provide a detailed summary of all changes, including what was modified, added, or removed. Analyze the overall impact and quality of the changes.

## What to do

1. Run `git log --oneline -20` to see recent commits
2. Run `git diff main...HEAD` (or `master...HEAD`) to see all changes vs base branch
3. Run `git status` to see any uncommitted changes
4. Analyze the diff: what was added, modified, removed
5. Assess quality and impact

## Output Format

```markdown
## 📋 Work Summary — [branch name]

### Recent Commits
| Hash | Message | Files Changed |
|------|---------|---------------|
| abc1234 | feat: add login | 3 |
| def5678 | fix: null check | 1 |

### Changes Overview
**Files Added:** [list]
**Files Modified:** [list]
**Files Deleted:** [list]

### What Changed
[Plain-language description of what was done and why, inferred from code + commit messages]

### Impact Assessment
- **Scope:** [narrow / moderate / broad]
- **Risk:** [low / medium / high] — [reason]
- **Breaking changes:** [yes/no — explain if yes]

### Quality Notes
- [Any obvious issues, missing tests, TODOs left in code, etc.]

### Suggested Next Steps
- [ ] [e.g., add tests for X, update docs, open PR, etc.]
```

If there are uncommitted changes, flag them and ask if the user wants to commit with `/cmp`.
