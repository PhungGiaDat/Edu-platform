---
name: code-review
description: Comprehensive code review framework with checklists and best practices
---
# Code Review

Framework for conducting thorough, constructive, and effective code reviews.

## Overview

This skill provides structured approaches to reviewing code for quality, security, performance, and maintainability.

## Review Process

### Pre-Review Checklist
- [ ] PR description is clear
- [ ] Related issue is linked
- [ ] Tests are included
- [ ] Documentation updated
- [ ] Self-review completed

### Review Steps
1. **Understand Context** - Read PR description
2. **High-Level Review** - Overall approach
3. **Detailed Review** - Line-by-line
4. **Test Review** - Test quality
5. **Final Assessment** - Approve/Request changes

## Review Checklist

### Code Quality

#### Readability
- [ ] Clear naming conventions
- [ ] Appropriate comments
- [ ] Consistent formatting
- [ ] Logical organization
- [ ] No unnecessary complexity

#### Structure
- [ ] Single responsibility principle
- [ ] DRY (Don't Repeat Yourself)
- [ ] Proper abstraction levels
- [ ] Reasonable function length
- [ ] Minimal nesting depth

#### Best Practices
- [ ] Follows language idioms
- [ ] Design patterns used correctly
- [ ] SOLID principles
- [ ] Clean code principles
- [ ] No code smells

### Functionality

#### Correctness
- [ ] Requirements met
- [ ] Edge cases handled
- [ ] Error handling complete
- [ ] Input validation present
- [ ] Return values correct

#### Logic
- [ ] No off-by-one errors
- [ ] Null/undefined checks
- [ ] Proper type handling
- [ ] Concurrency safety
- [ ] State management correct

### Security

#### Common Vulnerabilities
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF protection
- [ ] Input sanitization
- [ ] Output encoding

#### Authentication & Authorization
- [ ] Proper auth checks
- [ ] Role-based access
- [ ] Session management
- [ ] Token handling
- [ ] Password security

#### Data Protection
- [ ] Sensitive data encrypted
- [ ] No hardcoded secrets
- [ ] Proper logging (no leaks)
- [ ] GDPR/privacy compliance
- [ ] Secure defaults

### Performance

#### Efficiency
- [ ] No N+1 queries
- [ ] Appropriate data structures
- [ ] Caching where beneficial
- [ ] Lazy loading used
- [ ] Memory leaks avoided

#### Scalability
- [ ] Horizontal scaling possible
- [ ] Database queries optimized
- [ ] Async operations used
- [ ] Resource cleanup
- [ ] No blocking operations

### Testing

#### Test Quality
- [ ] Adequate coverage (>80%)
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] Integration tests included
- [ ] Tests are meaningful

#### Test Structure
- [ ] AAA pattern (Arrange-Act-Assert)
- [ ] Clear test names
- [ ] Independent tests
- [ ] Appropriate mocking
- [ ] No test interdependencies

### Documentation

#### Code Documentation
- [ ] Complex logic explained
- [ ] Public APIs documented
- [ ] Type annotations present
- [ ] Examples included
- [ ] JSDoc/docstrings complete

#### External Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] Migration guides if needed
- [ ] Configuration documented
- [ ] Breaking changes noted

## Severity Levels

### 🔴 Critical (Must Fix)
**Block merge, fix immediately**
- Security vulnerabilities
- Data loss/corruption risks
- Breaking functionality
- Performance regressions
- Memory leaks

### 🟡 Important (Should Fix)
**Fix before merge if possible**
- Code quality issues
- Missing error handling
- Incomplete test coverage
- Documentation gaps
- Technical debt

### 🟢 Suggestion (Nice to Have)
**Consider for future PRs**
- Style improvements
- Minor optimizations
- Alternative approaches
- Learning opportunities
- Best practice suggestions

### ℹ️ Info (Discussion)
**For awareness, no action needed**
- Questions for author
- Clarification requests
- Knowledge sharing
- Pattern discussion
- Future considerations

## Review Templates

### Standard Review Comment

```markdown
## [Issue Type] 🔴/🟡/🟢

**Location:** `file.ts:42-50`

**Issue:**
[Description of the problem]

**Impact:**
[Why this matters]

**Suggestion:**
```typescript
// Suggested improvement
const improved = true;
```

**Alternative:**
[Other approaches if applicable]

**References:**
- [Link to best practice]
```

### Security Review

```markdown
## Security Review 🔴

**Vulnerability:** [Type, e.g., SQL Injection]

**Location:** `api/users.ts:25`

**Risk:**
- **Likelihood:** High/Medium/Low
- **Impact:** High/Medium/Low
- **Overall:** Critical/High/Medium/Low

**Current Code:**
```typescript
// Vulnerable code
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

**Fixed Code:**
```typescript
// Secure code
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

**Testing:**
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Security scan passed
```

### Performance Review

```markdown
## Performance Issue 🟡

**Location:** `services/data.ts:100-150`

**Current Approach:**
[Description of current implementation]

**Problem:**
- Time complexity: O(n²)
- Memory usage: High
- Database queries: N+1

**Benchmark:**
- Current: 5000ms for 10,000 items
- Expected: < 100ms

**Optimization:**
```typescript
// Optimized version
const optimized = items.map(/* O(n) operation */);
```

**Expected Improvement:**
- Time: 50x faster
- Memory: 70% reduction

**Trade-offs:**
- [Any trade-offs]
```

## Feedback Guidelines

### Be Constructive
✅ **Good:** "Consider using a Map here for O(1) lookups instead of array.find()"
❌ **Bad:** "This is slow"

### Explain Why
✅ **Good:** "This could cause issues in production because concurrent requests might..."
❌ **Bad:** "This is wrong"

### Offer Solutions
✅ **Good:** "You could solve this by adding a try-catch block or using the Result pattern"
❌ **Bad:** "Handle errors"

### Be Specific
✅ **Good:** "Line 42: The user input should be sanitized before the SQL query"
❌ **Bad:** "Check inputs"

### Acknowledge Good Code
✅ **Good:** "Great use of the builder pattern here! Clean and testable."
❌ **Bad:** [Only comment on problems]

## Review Patterns

### Nitpick Comment
```markdown
🟢 Nitpick: Minor formatting suggestion

Consider aligning these for readability:
```typescript
const short  = 1;
const medium = 2;
const long   = 3;
```

Not blocking, just a suggestion.
```

### Question Comment
```markdown
ℹ️ Question for my understanding

I see you're using recursion here. Would iteration be simpler? 
Just curious about the reasoning - not suggesting a change.
```

### Learning Comment
```markdown
💡 TIL (Today I Learned)

I didn't know you could use optional chaining like this!
```typescript
user?.profile?.settings?.theme
```
This is cleaner than the nested if statements I usually write.
```

## Code Smells to Watch For

### Complexity Smells
- Long methods (>50 lines)
- Deep nesting (>3 levels)
- Large classes (>500 lines)
- Many parameters (>4)
- Long parameter lists

### Duplication Smells
- Copy-pasted code
- Similar logic in multiple places
- Repeated switch/if statements
- Similar data structures

### Naming Smells
- Single letter variables (except loops)
- Unclear abbreviations
- Inconsistent naming
- Misleading names
- Too long names

### Design Smells
- God classes
- Feature envy
- Inappropriate intimacy
- Primitive obsession
- Switch statements

### Performance Smells
- Repeated database queries
- Unnecessary computations
- Large object allocations
- Missing indexes
- N+1 queries

## Review Metrics

### Individual PR Metrics
- Review time: < 24 hours
- Comments: Quality over quantity
- Iterations: 1-2 rounds ideal
- Coverage change: Track improvements

### Team Metrics
- Review velocity: PRs/week
- Time to merge: Average days
- Comment sentiment: Positive/constructive
- Knowledge sharing: Learning comments

## Anti-Patterns to Avoid

### Reviewer Anti-Patterns
1. **Rubber stamping** - Approving without reading
2. **Nitpicking** - Focusing on trivia
3. **Bikeshedding** - Arguing over unimportant details
4. **Drive-by commenting** - Comments without context
5. **Reviewing own code** - No self-approval

### Author Anti-Patterns
1. **Giant PRs** - >500 lines difficult to review
2. **No description** - Context missing
3. **Defensive responses** - Taking feedback personally
4. **Ignoring feedback** - Not addressing comments
5. **Force pushing** - Losing review context

## Best Practices

1. **Review promptly** - Don't let PRs sit
2. **Be respectful** - Code, not coder
3. **Explain reasoning** - Help the author learn
4. **Suggest alternatives** - Don't just criticize
5. **Distinguish severity** - Not all issues equal
6. **Automate what you can** - Linting, formatting
7. **Keep PRs small** - Easier to review
8. **Use threads** - Organize discussions
9. **Follow up** - Ensure fixes are made
10. **Celebrate good code** - Positive reinforcement

## Output Format for @fix Agent

After completing a review, output an **Issue List** that can be processed by @fix:

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
// Fix code here
```

[... continue for all issues ...]

## Fix Priority Order
1. ISSUE-XXX (Critical - [reason])
2. ISSUE-XXX (Important - [reason])

## Files to Modify
| File | Issues | Priority |
|------|--------|----------|
| `path/to/file.ts` | 2 | High |

---
**Next:** `@fix please fix all issues from the review above`
```
