---
name: bug-fixing
description: Best practices and patterns for implementing safe, effective bug fixes
---
# Bug Fixing

Comprehensive guide to implementing clean, safe, and well-tested bug fixes.

## Overview

This skill provides patterns, best practices, and templates for fixing bugs effectively while minimizing risk.

## Input Sources

The @fix agent receives issues/bugs from two sources:

### From @reviewer (Code Review)
Look for `# 📋 Issue List for @fix` with:
- ISSUE-001, ISSUE-002, etc.
- Severity: 🔴 Critical | 🟡 Important | 🟢 Suggestion
- Category: Security | Performance | Code Quality | Maintainability | Testing

### From @tester (Test Failures)
Look for `# 🐛 Bug List for @fix` with:
- BUG-001, BUG-002, etc.
- Severity: 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low
- Type: Logic Error | Type Error | Null Reference | Race Condition | Performance | Integration

## Fix Philosophy

### Core Principles

1. **Fix the Root Cause** - Address the source, not symptoms
2. **Minimal Change** - Smallest fix that solves the problem
3. **No Regressions** - Don't break existing functionality
4. **Test Coverage** - Add regression tests
5. **Document** - Explain what and why

### The Fix Checklist

```
┌─────────────────────────────────────┐
│  PARSE INPUT                        │
│  □ Read Issue/Bug List              │
│  □ Extract all issues/bugs          │
│  □ Sort by severity                 │
│  □ Group by file                    │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  IMPLEMENT (Critical first)         │
│  □ Make focused changes             │
│  □ Add error handling               │
│  □ Follow code conventions          │
│  □ Run tests after each fix         │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  VERIFY                             │
│  □ Run all tests                    │
│  □ Check for regressions            │
│  □ Confirm all issues resolved      │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  REPORT                             │
│  □ Document all fixes               │
│  □ Output Fix Report                │
│  □ Hand off to @tester              │
└─────────────────────────────────────┘
```

## Output Format: Fix Report

After fixing all issues/bugs, output:

```markdown
# 🔧 Fix Report

## Input Summary
**Source:** @reviewer | @tester
**Total Issues/Bugs:** [count]
**Fixed:** [count] | **Skipped:** [count]

## Fixes Implemented

### ISSUE-001/BUG-001: [Title] ✅
- **File:** `src/file.ts`
- **Lines:** 42-50
- **Fix Applied:**
```diff
- // Before
+ // After
```
- **Status:** ✅ Fixed

[... continue for all fixes ...]

## Summary

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| ISSUE-001 | [title] | 🔴 Critical | ✅ Fixed |

## Files Modified
| File | Changes | Lines |
|------|---------|-------|
| `src/file.ts` | 2 fixes | +5, -2 |

## Verification
- [x] All fixes implemented
- [x] All tests passing
- [x] No regressions

---
**Next:** `@tester please verify the fixes`
```

## Fix Patterns by Bug Type

### 1. Null/Undefined Fixes

#### Pattern: Null Coalescing
```typescript
// Before (crashes on null)
const name = user.profile.name;

// After (handles null)
const name = user?.profile?.name ?? 'Unknown';
```

#### Pattern: Early Guard Return
```typescript
// Before (continues with bad data)
function processUser(user) {
  const name = user.name.toUpperCase();
  return name;
}

// After (validates early)
function processUser(user) {
  if (!user?.name) {
    return { error: 'Invalid user' };
  }
  return user.name.toUpperCase();
}
```

#### Pattern: Null Object
```typescript
// Before (scattered null checks)
function getDiscount(user) {
  if (user && user.membership) {
    return user.membership.discount;
  }
  return 0;
}

// After (null object pattern)
const NULL_MEMBERSHIP = { discount: 0 };
function getDiscount(user) {
  return (user?.membership ?? NULL_MEMBERSHIP).discount;
}
```

### 2. Type Error Fixes

#### Pattern: Type Guards
```typescript
// Before (assumes type)
function process(input) {
  return input.toFixed(2);  // Crashes if string
}

// After (type guard)
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function process(input: unknown) {
  if (!isNumber(input)) {
    throw new TypeError('Expected number');
  }
  return input.toFixed(2);
}
```

#### Pattern: Type Coercion
```typescript
// Before (type mismatch)
function add(a, b) {
  return a + b;  // "1" + 2 = "12"
}

// After (explicit coercion)
function add(a: unknown, b: unknown): number {
  return Number(a) + Number(b);
}
```

### 3. Async/Race Condition Fixes

#### Pattern: Proper Awaiting
```typescript
// Before (missing await)
async function fetchUser(id) {
  const user = getUser(id);  // Missing await
  return user.name;  // user is Promise, not User
}

// After (proper await)
async function fetchUser(id) {
  const user = await getUser(id);
  return user?.name;
}
```

#### Pattern: Sequential Operations
```typescript
// Before (race condition)
async function updateData() {
  save(data);      // No await
  notify();        // Might run before save completes
}

// After (sequential)
async function updateData() {
  await save(data);
  await notify();
}
```

#### Pattern: Cleanup on Unmount
```typescript
// Before (state update after unmount)
useEffect(() => {
  fetchData().then(setData);
}, []);

// After (cleanup)
useEffect(() => {
  let cancelled = false;
  fetchData().then(data => {
    if (!cancelled) setData(data);
  });
  return () => { cancelled = true; };
}, []);
```

### 4. Logic Error Fixes

#### Pattern: Off-by-One Correction
```typescript
// Before (index out of bounds)
for (let i = 0; i <= items.length; i++) {
  process(items[i]);  // Error on last iteration
}

// After (correct bounds)
for (let i = 0; i < items.length; i++) {
  process(items[i]);
}

// Or use for-of
for (const item of items) {
  process(item);
}
```

#### Pattern: Correct Comparison
```typescript
// Before (type coercion issue)
if (value == "10") { }  // 10 == "10" is true

// After (strict comparison)
if (value === 10) { }   // Explicit type check
```

#### Pattern: Correct Operator
```typescript
// Before (wrong logical operator)
if (user.isAdmin || user.hasPermission) { }  // Should be AND

// After (correct logic)
if (user.isAdmin && user.hasPermission) { }
```

### 5. Performance Fixes

#### Pattern: N+1 Query Fix
```typescript
// Before (N+1 queries)
const users = await getUsers();
for (const user of users) {
  user.posts = await getPosts(user.id);  // Query per user
}

// After (batch query)
const users = await getUsers();
const posts = await getPosts(users.map(u => u.id));
const postsByUser = groupBy(posts, 'userId');
users.forEach(user => {
  user.posts = postsByUser[user.id] || [];
});
```

#### Pattern: Memoization
```typescript
// Before (recalculates every time)
function getExpensiveValue(data) {
  return heavyCalculation(data);
}

// After (caches result)
const memo = new Map();
function getExpensiveValue(data) {
  const key = JSON.stringify(data);
  if (!memo.has(key)) {
    memo.set(key, heavyCalculation(data));
  }
  return memo.get(key);
}
```

### 6. State Management Fixes

#### Pattern: Immutable Updates
```typescript
// Before (mutates state)
function addItem(state, item) {
  state.items.push(item);
  return state;
}

// After (immutable)
function addItem(state, item) {
  return {
    ...state,
    items: [...state.items, item]
  };
}
```

#### Pattern: Correct Dependencies
```typescript
// Before (stale closure)
useEffect(() => {
  setInterval(() => {
    console.log(count);  // Always logs initial count
  }, 1000);
}, []);

// After (correct dependency)
useEffect(() => {
  const id = setInterval(() => {
    console.log(count);
  }, 1000);
  return () => clearInterval(id);
}, [count]);
```

## Test Patterns

### Regression Test Template
```typescript
describe('Bug Fix: [Bug Description]', () => {
  // The exact scenario that triggered the bug
  it('should handle [bug scenario]', () => {
    // Arrange - Set up bug conditions
    const input = createBugTriggerInput();
    
    // Act - Run the previously failing code
    const result = processInput(input);
    
    // Assert - Verify fix works
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  // Verify no regression
  it('should maintain existing behavior for normal input', () => {
    const input = createNormalInput();
    const result = processInput(input);
    expect(result).toMatchExpectedOutput();
  });
});
```

### Edge Case Test Template
```typescript
describe('Edge Cases: [Function Name]', () => {
  it('should handle null input', () => {
    expect(() => process(null)).not.toThrow();
  });

  it('should handle empty input', () => {
    expect(() => process('')).not.toThrow();
    expect(() => process([])).not.toThrow();
  });

  it('should handle extreme values', () => {
    expect(() => process(Number.MAX_VALUE)).not.toThrow();
    expect(() => process(Number.MIN_VALUE)).not.toThrow();
  });

  it('should handle invalid types', () => {
    expect(() => process(undefined)).not.toThrow();
    expect(() => process({})).not.toThrow();
  });
});
```

## Error Handling Patterns

### Graceful Degradation
```typescript
// Before (crashes)
function getData() {
  return JSON.parse(response);
}

// After (handles error)
function getData() {
  try {
    return JSON.parse(response);
  } catch (error) {
    logger.error('Failed to parse response', { response, error });
    return null;  // Safe default
  }
}
```

### Error Propagation
```typescript
// Before (swallows error)
async function fetchUser(id) {
  try {
    return await api.getUser(id);
  } catch {
    return null;  // Error information lost
  }
}

// After (preserves error info)
async function fetchUser(id) {
  const result = await api.getUser(id)
    .then(user => ({ success: true, user }))
    .catch(error => ({ success: false, error }));
  return result;
}
```

## Risk Mitigation

### Safe Deployment
```typescript
// Feature flag for risky fix
if (features.newFixEnabled) {
  return newImplementation();
} else {
  return oldImplementation();
}

// Percentage rollout
if (user.id % 100 < rolloutPercentage) {
  return newImplementation();
}
```

### Rollback Plan
```markdown
## Rollback Plan

**Trigger Conditions:**
- Error rate increases > 5%
- Response time increases > 20%
- User complaints

**Rollback Steps:**
1. Revert commit: `git revert <commit-sha>`
2. Deploy previous version
3. Verify fix is removed
4. Monitor for stability

**Monitoring:**
- Check error logs
- Monitor performance metrics
- Watch user feedback
```

## Common Anti-Patterns

### 1. Swallowing Errors
```typescript
// ❌ Bad
try {
  doSomething();
} catch (e) {
  // Silent failure
}

// ✅ Good
try {
  doSomething();
} catch (e) {
  logger.error('Operation failed', { error: e });
  throw new OperationalError('User-friendly message', { cause: e });
}
```

### 2. Over-Engineering
```typescript
// ❌ Bad: Complete rewrite for simple bug
function fixedFunction() {
  // 100 lines of new code
}

// ✅ Good: Minimal fix
function fixedFunction() {
  if (!input) return defaultValue;  // Just add this line
  // ... existing code ...
}
```

### 3. Treating Symptoms
```typescript
// ❌ Bad: Patches symptom
if (result === undefined) {
  result = defaultResult;
}

// ✅ Good: Fixes root cause
async function getResult() {
  const data = await fetchData();
  return data ?? defaultResult;  // Fix the source
}
```

### 4. Copy-Paste Fixing
```typescript
// ❌ Bad: Same fix copied everywhere
if (!data) return null;
// ... later ...
if (!data) return null;
// ... and again ...
if (!data) return null;

// ✅ Good: Centralized handling
function safeGet(obj, path, defaultValue) {
  return path.split('.').reduce((o, k) => o?.[k], obj) ?? defaultValue;
}
```

## Fix Verification Checklist

### Functional Verification
- [ ] Bug is fixed - can reproduce steps and verify it works
- [ ] No new bugs introduced
- [ ] Edge cases handled
- [ ] Error handling complete

### Test Verification
- [ ] Regression test added
- [ ] Regression test passes
- [ ] All existing tests pass
- [ ] Coverage maintained or improved

### Code Quality
- [ ] Follows coding standards
- [ ] Code is readable
- [ ] Comments added for complex logic
- [ ] No code duplication introduced

### Documentation
- [ ] Fix documented in commit message
- [ ] Changelog updated (if significant)
- [ ] API documentation updated (if applicable)
- [ ] Known issues updated (if partial fix)

## Quick Reference

### Fix Template
```typescript
/**
 * Fix: [Bug description]
 * 
 * Issue: [Root cause explanation]
 * Solution: [What was changed and why]
 * 
 * @see [Link to issue/debug report]
 * @tested-by [Test file or test case]
 */
function fixedFunction(input: InputType): OutputType {
  // Guard clause for the bug case
  if (!isValid(input)) {
    return safeDefault;
  }
  
  // Original logic
  return processInput(input);
}
```

### Commit Message Template
```
fix: [brief description]

- Root cause: [explanation]
- Fix: [what was changed]
- Test: [how it's verified]

Fixes #[issue-number]
```
