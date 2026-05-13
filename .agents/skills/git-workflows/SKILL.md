---
name: git-workflows
description: Comprehensive guide to Git workflows, branching strategies, and version control best practices
---
# Git Workflows

Complete guide to Git workflows, branching strategies, and version control operations.

## Overview

This skill covers Git best practices, common workflows, and advanced operations.

## Branching Strategies

### GitFlow

Best for: Projects with scheduled releases, multiple versions in production

```
main (production)
├── develop
│   ├── feature/user-auth
│   ├── feature/payment
│   └── feature/analytics
├── release/1.0.0
├── hotfix/critical-bug
└── release/1.0.1
```

**Branch Types:**
- `main` - Production code
- `develop` - Integration branch
- `feature/*` - New features
- `release/*` - Release preparation
- `hotfix/*` - Critical production fixes

**Workflow:**
1. Create feature from develop
2. Develop and test feature
3. Merge feature to develop
4. Create release from develop
5. Test and fix in release
6. Merge release to main AND develop
7. Tag release on main

### GitHub Flow

Best for: Continuous deployment, web applications

```
main
├── feature/new-feature
├── fix/bug-fix
└── hotfix/critical
```

**Workflow:**
1. Create branch from main
2. Make changes
3. Open pull request
4. Review and discuss
5. Merge to main
6. Deploy immediately

### Trunk-Based Development

Best for: Experienced teams, CI/CD mature

```
main
├── short-feature-1
└── short-feature-2
```

**Workflow:**
1. Create short-lived branch (< 1 day)
2. Make small changes
3. Merge to main quickly
4. Use feature flags for incomplete features

## Commit Guidelines

### Conventional Commits

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change without fix/feature
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvement
- `ci`: CI/CD changes
- `build`: Build system changes

**Examples:**

```bash
# Feature
feat(auth): add OAuth2 Google authentication

- Implement Google OAuth provider
- Add JWT token generation
- Create login/logout endpoints

Closes #123

# Bug fix
fix(api): resolve race condition in request handler

The async handler was not properly awaiting database
operations, causing inconsistent state.

Fixes #456

# Breaking change
feat(api)!: change user endpoint response format

BREAKING CHANGE: The user endpoint now returns
a nested object structure instead of flat fields.

# Multiple scopes
feat(auth,api): implement session management
```

### Commit Message Best Practices

1. **Use imperative mood:** "Add feature" not "Added feature"
2. **Capitalize first letter:** "Add feature" not "add feature"
3. **No period at end:** "Add feature" not "Add feature."
4. **Separate subject from body** with blank line
5. **Limit subject to 50 characters**
6. **Wrap body at 72 characters**
7. **Explain what and why, not how**

## Common Workflows

### Feature Development

```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/user-profile

# Work on feature
git add .
git commit -m "feat(profile): add user profile page"

# Keep updated
git fetch origin
git rebase origin/develop

# Push for review
git push -u origin feature/user-profile

# After approval, merge
git checkout develop
git pull origin develop
git merge --no-ff feature/user-profile
git push origin develop

# Clean up
git branch -d feature/user-profile
git push origin --delete feature/user-profile
```

### Hotfix Process

```bash
# Identify production issue

# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/payment-failure

# Fix the issue
git add .
git commit -m "fix(payment): resolve payment processing timeout"

# Test thoroughly
npm test
npm run test:e2e

# Merge to main
git checkout main
git merge --no-ff hotfix/payment-failure
git tag -a v1.0.1 -m "Hotfix: Fix payment processing"

# Also merge to develop
git checkout develop
git merge --no-ff hotfix/payment-failure

# Push everything
git push origin main --tags
git push origin develop

# Clean up
git branch -d hotfix/payment-failure
git push origin --delete hotfix/payment-failure
```

### Release Process

```bash
# Create release branch
git checkout develop
git pull origin develop
git checkout -b release/1.1.0

# Version bump and prepare
npm version minor  # or patch/major
# Update CHANGELOG.md
# Final testing and bug fixes

# Merge to main
git checkout main
git pull origin main
git merge --no-ff release/1.1.0
git tag -a v1.1.0 -m "Release 1.1.0"

# Merge back to develop
git checkout develop
git merge --no-ff release/1.1.0

# Push everything
git push origin main --tags
git push origin develop

# Clean up
git branch -d release/1.1.0
git push origin --delete release/1.1.0

# Deploy
# Trigger deployment pipeline
```

## Git Commands Reference

### Information Commands

```bash
# Status
git status

# Log
git log --oneline -10           # Last 10 commits
git log --graph --all           # Branch visualization
git log --author="John"         # Filter by author
git log --since="2 weeks ago"   # Filter by time

# Diff
git diff                        # Unstaged changes
git diff --staged              # Staged changes
git diff HEAD~1                # Changes from last commit
git diff branch1..branch2      # Compare branches

# Blame
git blame file.ts              # Line-by-line history

# Show
git show commit-hash           # Commit details
git show commit-hash:file.ts   # File at specific commit
```

### Branch Operations

```bash
# List
git branch                     # Local branches
git branch -r                  # Remote branches
git branch -a                  # All branches

# Create
git branch feature-name        # Create branch
git checkout -b feature-name   # Create and switch
git checkout -b feature origin/main  # From remote

# Switch
git checkout branch-name       # Switch branch
git switch branch-name         # Modern alternative
git checkout -                 # Previous branch

# Delete
git branch -d branch-name      # Delete if merged
git branch -D branch-name      # Force delete
git push origin --delete branch-name  # Delete remote

# Rename
git branch -m old-name new-name
```

### Merging and Rebasing

```bash
# Merge
git merge branch-name          # Merge branch
git merge --no-ff branch-name  # Create merge commit
git merge --squash branch-name # Squash commits

# Rebase
git rebase main                # Rebase onto main
git rebase -i HEAD~3           # Interactive rebase

# During rebase
git rebase --continue          # Continue after resolving
git rebase --skip              # Skip current commit
git rebase --abort             # Cancel rebase
```

### Stashing

```bash
# Stash changes
git stash                      # Stash current changes
git stash save "message"       # Stash with message
git stash -u                   # Include untracked files

# List stashes
git stash list

# Apply stash
git stash apply               # Apply latest stash
git stash apply stash@{2}     # Apply specific stash
git stash pop                 # Apply and remove

# Remove stash
git stash drop stash@{0}      # Remove specific
git stash clear               # Remove all
```

### History Modification

```bash
# Amend last commit
git commit --amend            # Change message
git commit --amend --no-edit  # Add files

# Reset
git reset HEAD~1              # Undo commit, keep changes
git reset --soft HEAD~1       # Undo commit, stage changes
git reset --hard HEAD~1       # Undo commit, discard changes

# Revert (safer for pushed commits)
git revert commit-hash        # Create new commit that undoes

# Cherry-pick
git cherry-pick commit-hash   # Apply commit to current branch
```

### Remote Operations

```bash
# View remotes
git remote -v

# Add remote
git remote add origin url

# Fetch
git fetch origin              # Fetch all branches
git fetch origin main         # Fetch specific branch

# Pull
git pull origin main          # Fetch and merge
git pull --rebase origin main # Fetch and rebase

# Push
git push origin main          # Push to main
git push -u origin branch     # Push and set upstream
git push -f origin branch     # Force push (dangerous)
git push --force-with-lease   # Safer force push
```

## Conflict Resolution

### Understanding Conflicts

```text
<<<<<<< HEAD
Current branch changes
=======
Incoming branch changes
>>>>>>> branch-name
```

### Resolution Process

```bash
# When conflict occurs
git status  # See conflicted files

# Edit files to resolve
# Remove conflict markers
# Keep desired changes

# Stage resolved files
git add resolved-file.ts

# Continue operation
git commit  # For merge
git rebase --continue  # For rebase
```

### Conflict Resolution Strategies

1. **Accept Incoming:** Use incoming changes
2. **Accept Current:** Keep your changes
3. **Accept Both:** Combine both sets
4. **Manual:** Custom resolution
5. **Use Tool:** VS Code, GitKraken, etc.

## Git Hooks

### Pre-commit

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run linter
npm run lint
if [ $? -ne 0 ]; then
  echo "Linting failed. Commit aborted."
  exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi

exit 0
```

### Pre-push

```bash
#!/bin/bash
# .git/hooks/pre-push

# Check for large files
large_files=$(find . -type f -size +10M -not -path "./node_modules/*" -not -path "./.git/*")
if [ ! -z "$large_files" ]; then
  echo "Large files detected:"
  echo "$large_files"
  echo "Push aborted."
  exit 1
fi

exit 0
```

## Best Practices

### Do's
✅ Commit early and often
✅ Write meaningful commit messages
✅ Use branches for all changes
✅ Pull before starting work
✅ Review changes before committing
✅ Keep branches short-lived
✅ Delete merged branches
✅ Use .gitignore properly
✅ Tag releases
✅ Document branching strategy

### Don'ts
❌ Commit directly to main
❌ Commit sensitive data
❌ Force push to shared branches
❌ Rewrite public history
❌ Commit unrelated changes together
❌ Leave merge conflicts unresolved
❌ Ignore failing tests
❌ Commit generated files
❌ Skip code review
❌ Use unclear branch names

## Common Issues & Solutions

### Undo Last Commit (Not Pushed)
```bash
git reset --soft HEAD~1
```

### Undo Last Commit (Pushed)
```bash
git revert HEAD
```

### Remove File from Last Commit
```bash
git reset HEAD~1 -- path/to/file
git commit --amend --no-edit
```

### Move Commit to Another Branch
```bash
git checkout target-branch
git cherry-pick commit-hash
git checkout source-branch
git reset --hard HEAD~1
```

### Clean Untracked Files
```bash
git clean -n    # Dry run
git clean -f    # Remove files
git clean -fd   # Remove files and directories
git clean -fX   # Remove ignored files only
```

### Recover Deleted Branch
```bash
git reflog
git checkout -b recovered-branch commit-hash
```

### Fix Detached HEAD
```bash
git checkout main
# or create branch from current state
git checkout -b new-branch
```

## Semantic Versioning

### Version Format: MAJOR.MINOR.PATCH

- **MAJOR:** Breaking changes
- **MINOR:** New features, backward compatible
- **PATCH:** Bug fixes, backward compatible

### Version Bump Commands

```bash
# Using npm
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# Manual tagging
git tag -a v1.0.1 -m "Release 1.0.1"
git push origin --tags
```

## Git Aliases

```bash
# Add to ~/.gitconfig
[alias]
  co = checkout
  br = branch
  ci = commit
  st = status
  unstage = reset HEAD --
  last = log -1 HEAD
  visual = log --graph --oneline --all
  amend = commit --amend --no-edit
  undo = reset --soft HEAD~1
```

## Summary

1. **Choose appropriate branching strategy**
2. **Write meaningful commits**
3. **Use branches for all changes**
4. **Review before merging**
5. **Keep history clean**
6. **Tag releases**
7. **Document your workflow**
8. **Use hooks for automation**
9. **Handle conflicts carefully**
10. **Learn advanced operations**
