---
description: Stage, commit and push all code in the current branch
agent: git-manager
---

Stage, commit and push all code in the current branch.

$ARGUMENTS

## What to do

1. Run `git status` to see all changes
2. Stage all modified and new files: `git add -A`
3. Generate a meaningful commit message based on the changes (conventional commits format)
4. Commit the staged changes
5. Push to the remote branch: `git push`

## Commit Message Format

Use conventional commits:
```
<type>(<scope>): <short summary>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`

Examples:
- `feat(auth): add Google OAuth login`
- `fix(payment): correct tax calculation`
- `docs: update README with setup instructions`

## Notes

- If `$ARGUMENTS` is provided, use it as a hint for the commit message
- If the branch has no upstream, push with `git push --set-upstream origin <branch>`
- Report the commit hash and push result when done
