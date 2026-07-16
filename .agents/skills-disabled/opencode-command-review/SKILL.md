---
name: opencode-command-review
description: Migrated OpenCode slash command `review`. Use when the user asks to run or follow the old OpenCode `/review` workflow.
---

# opencode-command-review

This skill was migrated from `.opencode/commands/review.md`.

OpenCode slash-command runtime features such as `$ARGUMENTS`, automatic command routing, and shell interpolation are preserved as prompt guidance only. Adapt them to Codex tools when executing.

## Original Command

Perform a comprehensive code review for: $ARGUMENTS

## Review Checklist

### 1. Code Quality
- [ ] Follows coding standards and conventions
- [ ] Proper naming and readability
- [ ] No code smells or anti-patterns
- [ ] Appropriate abstractions
- [ ] DRY principle followed

### 2. Functionality
- [ ] Meets requirements
- [ ] Handles edge cases
- [ ] Error handling is comprehensive
- [ ] Input validation present

### 3. Performance
- [ ] No obvious bottlenecks
- [ ] Efficient algorithms used
- [ ] Database queries optimized
- [ ] Memory management appropriate

### 4. Security
- [ ] No OWASP Top 10 vulnerabilities
- [ ] Input sanitization
- [ ] Authentication/authorization proper
- [ ] No hardcoded secrets
- [ ] SQL injection prevention
- [ ] XSS prevention

### 5. Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful
- [ ] Edge cases tested
- [ ] Mocks used appropriately

## REQUIRED Output Format

After review, output an **Issue List** for @fix agent:

```markdown
# 📋 Issue List for @fix

## Summary
**Files Reviewed:** [count]
**Total Issues:** [count]
**Critical:** [count] | **Important:** [count] | **Suggestion:** [count]

## Issues

### ISSUE-001: [Issue Title]
- **Severity:** 🔴 Critical | 🟡 Important | 🟢 Suggestion
- **File:** `path/to/file.ts`
- **Lines:** 42-50
- **Category:** Security | Performance | Code Quality | Maintainability | Testing
- **Description:** [What is wrong]
- **Impact:** [Why it matters]
- **Suggested Fix:**
```typescript
// Show the fix code here
```

[... repeat for each issue ...]

## Fix Priority Order
1. ISSUE-XXX (Critical - [reason])
2. ISSUE-XXX (Critical - [reason])
3. ISSUE-XXX (Important - [reason])

## Files to Modify
| File | Issues | Priority |
|------|--------|----------|
| `path/to/file.ts` | 2 | High |

---
**Next:** `@fix please fix all issues from the review above`
```

## Severity Guidelines

| Severity | Criteria | Action |
|----------|----------|--------|
| 🔴 Critical | Security vulns, data loss, crashes | MUST FIX immediately |
| 🟡 Important | Performance, maintainability | SHOULD FIX before merge |
| 🟢 Suggestion | Style, minor improvements | NICE TO HAVE |

Be thorough but constructive. Every issue should be actionable.
