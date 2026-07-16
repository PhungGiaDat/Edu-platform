---
name: debugging
description: Comprehensive debugging methodologies, techniques, and best practices
---
# Debugging

Systematic approaches to identifying, diagnosing, and resolving software issues.

## Overview

This skill provides a comprehensive framework for debugging software issues, from simple bugs to complex system failures.

## Debug Methodology

### The Scientific Method for Debugging

1. **Observe** - Gather information about the bug
2. **Hypothesize** - Form a theory about the cause
3. **Predict** - Determine what would confirm the hypothesis
4. **Test** - Run experiments to validate
5. **Conclude** - Document findings and fix

### Debug Process Flow

```
┌─────────────────┐
│  Bug Reported   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Reproduce     │ ← Can't reproduce? Need more info
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Isolate      │ ← Narrow down the scope
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Diagnose     │ ← Find root cause
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Document     │ ← Report findings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Fix         │ ← Hand off to @fix
└─────────────────┘
```

## Debug Techniques by Type

### 1. Print Debugging
```javascript
// Strategic logging
console.log('=== Debug Point A ===');
console.log('Input:', input);
console.log('State:', state);
console.log('Result:', result);
```

**When to use:** Quick investigations, local development

### 2. Binary Search Debugging
```javascript
// Comment out half the code
function problematicFunction() {
  // First half - keep active
  doStep1();
  doStep2();
  
  // Second half - comment out
  // doStep3();
  // doStep4();
  // doStep5();
}
```

**When to use:** Large functions, unclear where bug is

### 3. Rubber Duck Debugging
Explain your code line by line to an inanimate object.

**When to use:** Logic errors, overlooking obvious issues

### 4. Debugger Breakpoints
```javascript
// Browser DevTools or Node debugger
debugger; // Pauses execution

// Conditional breakpoints in IDE
if (userId === 'problematic-id') {
  debugger;
}
```

**When to use:** Need to inspect runtime state

### 5. Logging Analysis
```bash
# Search logs for errors
grep -r "ERROR" logs/
grep -r "Exception" logs/

# Follow logs in real-time
tail -f logs/app.log | grep --color "ERROR\|WARN"

# Find patterns around errors
grep -B5 -A5 "TypeError" logs/app.log
```

**When to use:** Production issues, historical analysis

### 6. Network Debugging
```javascript
// Log API calls
fetch(url, options)
  .then(response => {
    console.log('Response:', response.status, response.headers);
    return response.json();
  })
  .then(data => console.log('Data:', data))
  .catch(error => console.error('Error:', error));
```

**When to use:** API issues, integration problems

### 7. State Inspection
```javascript
// React state debugging
useEffect(() => {
  console.log('State changed:', { 
    user, 
    loading, 
    error 
  });
}, [user, loading, error]);

// Redux state debugging
const unsubscribe = store.subscribe(() => {
  console.log('State:', store.getState());
});
```

**When to use:** State management issues, reactivity problems

### 8. Performance Profiling
```javascript
// Manual timing
console.time('operation');
doSomething();
console.timeEnd('operation');

// Performance API
performance.mark('start');
doSomething();
performance.mark('end');
performance.measure('operation', 'start', 'end');
```

**When to use:** Performance issues, slow operations

## Common Bug Categories

### Null/Undefined Errors
```javascript
// Symptom: "Cannot read property X of undefined"
// Debug: Check object existence
console.log('Object:', obj);
console.log('Type:', typeof obj);
console.log('Keys:', Object.keys(obj || {}));

// Common causes:
// - API returned null
// - Async timing issue
// - Typo in property name
// - Data not initialized
```

### Type Errors
```javascript
// Symptom: Unexpected behavior, silent failures
// Debug: Check types explicitly
console.log('Type of x:', typeof x);
console.log('Is array:', Array.isArray(x));
console.log('Constructor:', x?.constructor?.name);

// Common causes:
// - String vs Number comparison
// - Object vs Array confusion
// - Date string vs Date object
```

### Async/Race Conditions
```javascript
// Symptom: Intermittent failures, timing issues
// Debug: Log timing and order
console.log('1. Start:', Date.now());
await async1();
console.log('2. After async1:', Date.now());
await async2();
console.log('3. After async2:', Date.now());

// Common causes:
// - Missing await
// - Parallel instead of sequential
// - State changed during async operation
```

### Off-by-One Errors
```javascript
// Symptom: Array index issues, loop problems
// Debug: Log all indices
for (let i = 0; i <= arr.length; i++) {  // Bug: should be <
  console.log(`Index ${i}:`, arr[i]);
}

// Common causes:
// - < vs <=
// - 0 vs 1 based indexing
// - Slice vs Splice confusion
```

### State Management Issues
```javascript
// Symptom: UI not updating, stale data
// Debug: Log state changes
useEffect(() => {
  console.log('State:', state);
  console.log('Prev state:', prevState);
}, [state]);

// Common causes:
// - Direct state mutation
// - Missing dependencies in useEffect
// - Stale closure
```

## Environment Debugging

### Compare Environments
```bash
# Node version
node --version

# Package versions
npm list package-name

# Environment variables
printenv | grep APP_

# Check config files
diff local.config production.config
```

### Docker Debugging
```bash
# Get into container
docker exec -it container-name sh

# Check logs
docker logs container-name

# Inspect container
docker inspect container-name
```

### Database Debugging
```sql
-- Check data
SELECT * FROM users WHERE id = 'problematic-id';

-- Check recent changes
SELECT * FROM audit_log 
WHERE created_at > '2024-01-01' 
ORDER BY created_at DESC;

-- Check for nulls
SELECT COUNT(*) FROM users WHERE email IS NULL;
```

## Debug Tools Reference

### Browser DevTools
| Tool | Purpose | Access |
|------|---------|--------|
| Console | Logging, REPL | F12 → Console |
| Sources | Breakpoints, stepping | F12 → Sources |
| Network | API calls, timing | F12 → Network |
| Application | Storage, state | F12 → Application |
| Performance | Profiling | F12 → Performance |

### Node.js Debugging
```bash
# Start with inspector
node --inspect app.js

# Break on start
node --inspect-brk app.js

# Chrome DevTools
chrome://inspect
```

### VS Code Debugging
```json
// launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug App",
      "program": "${workspaceFolder}/src/index.js"
    }
  ]
}
```

## Debug Checklist

### Initial Assessment
- [ ] Can I reproduce the bug?
- [ ] What are the exact steps to reproduce?
- [ ] Is it consistent or intermittent?
- [ ] When did it first appear?
- [ ] Does it happen in all environments?

### Investigation
- [ ] What error messages appear?
- [ ] What does the stack trace show?
- [ ] What are the relevant log entries?
- [ ] What code is involved?
- [ ] What data triggers the issue?

### Diagnosis
- [ ] What is the root cause?
- [ ] Why does the issue occur?
- [ ] What would fix it?
- [ ] Are there related issues?

### Documentation
- [ ] Is the bug documented?
- [ ] Are reproduction steps clear?
- [ ] Is the root cause explained?
- [ ] Is a fix recommended?

## Anti-Patterns to Avoid

### 1. Debugging in Production
❌ Adding console.log to production
✅ Use proper logging, staging reproduction

### 2. Shotgun Debugging
❌ Changing random things hoping it works
✅ Methodical, hypothesis-driven debugging

### 3. Ignoring the Stack Trace
❌ Guessing without reading the error
✅ Stack traces tell you exactly where to look

### 4. Debugging Without Reproducing
❌ Trying to fix without understanding
✅ Always reproduce first

### 5. Treating Symptoms
❌ Patching the visible error
✅ Fix the underlying root cause

## Quick Reference

### Error Messages Cheat Sheet

| Error | Likely Cause | First Check |
|-------|--------------|-------------|
| `Cannot read property X of undefined` | Null object access | Object existence |
| `X is not a function` | Type mismatch | Variable type |
| `Maximum call stack exceeded` | Infinite recursion | Recursive calls |
| `Network request failed` | API/connectivity | Network tab |
| `Out of memory` | Memory leak | Large allocations |
| `Timeout` | Slow operation | Performance |

### Quick Debug Commands

```bash
# Find error in logs
grep -r "Error" --include="*.log" .

# Check process
ps aux | grep node

# Check ports
lsof -i :3000

# Check memory
free -h

# Check disk
df -h
```
