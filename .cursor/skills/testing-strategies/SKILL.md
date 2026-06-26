---
name: testing-strategies
description: Comprehensive testing strategies, patterns, and best practices
---
# Testing Strategies

Complete guide to software testing strategies, patterns, and implementation approaches.

## Overview

This skill covers testing methodologies, patterns, and best practices for ensuring software quality.

## Testing Pyramid

### Unit Tests (70%)
- **Scope:** Individual functions/methods
- **Speed:** Fast (< 100ms)
- **Dependencies:** Mocked/stubbed
- **Purpose:** Verify logic correctness

### Integration Tests (20%)
- **Scope:** Component interactions
- **Speed:** Medium (100ms - 1s)
- **Dependencies:** Real (database, APIs)
- **Purpose:** Verify integration points

### E2E Tests (10%)
- **Scope:** Complete user flows
- **Speed:** Slow (1s - minutes)
- **Dependencies:** Full system
- **Purpose:** Verify user scenarios

## Test Types

### Unit Testing

**Template:**
```typescript
describe('FunctionName', () => {
  describe('methodName', () => {
    // Happy path
    it('should return expected result for valid input', () => {
      // Arrange
      const input = createValidInput();
      const expected = createExpectedOutput();
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toEqual(expected);
    });

    // Edge cases
    it('should handle empty input', () => {
      const result = functionName([]);
      expect(result).toBeEmpty();
    });

    it('should handle null input', () => {
      expect(() => functionName(null)).toThrow();
    });

    it('should handle boundary values', () => {
      const result = functionName(Number.MAX_VALUE);
      expect(result).toBeDefined();
    });

    // Error cases
    it('should throw error for invalid input', () => {
      const invalid = createInvalidInput();
      expect(() => functionName(invalid)).toThrow(ValidationError);
    });
  });
});
```

**Best Practices:**
- Test behavior, not implementation
- One assertion per test (mostly)
- Use descriptive test names
- Keep tests independent
- Mock external dependencies

### Integration Testing

**Template:**
```typescript
describe('API Integration: /api/users', () => {
  beforeAll(async () => {
    await setupDatabase();
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
    await cleanupDatabase();
  });

  beforeEach(async () => {
    await clearUsers();
  });

  describe('POST /api/users', () => {
    it('should create user and return 201', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: userData.name,
        email: userData.email
      });

      // Verify database
      const saved = await UserRepository.findByEmail(userData.email);
      expect(saved).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'John', email: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('should return 409 for duplicate email', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Jane', email: 'existing@example.com' })
        .expect(409);
    });
  });
});
```

**Best Practices:**
- Use real dependencies when possible
- Clean up after tests
- Use transactions for database tests
- Test error scenarios
- Verify side effects

### E2E Testing

**Template (Playwright):**
```typescript
describe('User Registration Flow', () => {
  test('should register new user successfully', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Fill registration form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    
    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Verify user is logged in
    await expect(page.locator('.user-menu')).toContainText('newuser@example.com');

    // Verify welcome message
    await expect(page.locator('.welcome-message')).toBeVisible();
  });

  test('should show error for existing email', async ({ page }) => {
    // Pre-create user
    await createTestUser({ email: 'existing@example.com' });

    await page.goto('/register');
    
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="confirmPassword"]', 'Password123!');
    
    await page.click('button[type="submit"]');

    // Check error message
    await expect(page.locator('.error-message')).toContainText('already exists');
    
    // Verify still on registration page
    await expect(page).toHaveURL('/register');
  });
});
```

**Best Practices:**
- Test critical user journeys
- Use page object model
- Handle async operations properly
- Test accessibility
- Screenshot on failure

## Test Patterns

### AAA Pattern
```typescript
it('should calculate total with tax', () => {
  // Arrange
  const items = [{ price: 100 }, { price: 50 }];
  const taxRate = 0.1;
  const calculator = new PriceCalculator();

  // Act
  const total = calculator.calculateTotal(items, taxRate);

  // Assert
  expect(total).toBe(165); // (100 + 50) * 1.1
});
```

### Given-When-Then (BDD)
```typescript
it('should allow user to reset password', () => {
  // Given
  const user = createTestUser();
  const newPassword = 'NewSecure123!';

  // When
  const result = await authService.resetPassword(user.email, newPassword);

  // Then
  expect(result.success).toBe(true);
  expect(await authService.authenticate(user.email, newPassword)).toBe(true);
});
```

### Test Data Builders
```typescript
class UserBuilder {
  private user: User = {
    id: 'default-id',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user'
  };

  withName(name: string): UserBuilder {
    this.user.name = name;
    return this;
  }

  withEmail(email: string): UserBuilder {
    this.user.email = email;
    return this;
  }

  asAdmin(): UserBuilder {
    this.user.role = 'admin';
    return this;
  }

  build(): User {
    return { ...this.user };
  }
}

// Usage
const admin = new UserBuilder()
  .asAdmin()
  .withEmail('admin@example.com')
  .build();
```

### Mock Objects
```typescript
// Create mock
const mockRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  delete: jest.fn()
};

// Setup behavior
mockRepository.findById.mockResolvedValue({ id: '1', name: 'Test' });

// Use in test
const service = new UserService(mockRepository);
const result = await service.getUser('1');

// Verify calls
expect(mockRepository.findById).toHaveBeenCalledWith('1');
expect(mockRepository.findById).toHaveBeenCalledTimes(1);
```

## Test Coverage

### Coverage Types
- **Statement Coverage:** % of statements executed
- **Branch Coverage:** % of branches executed
- **Function Coverage:** % of functions called
- **Line Coverage:** % of lines executed

### Coverage Goals
```markdown
| Type | Target | Minimum |
|------|--------|---------|
| Overall | 80% | 70% |
| Critical paths | 100% | 90% |
| New code | 90% | 80% |
| Utilities | 95% | 85% |
```

### Coverage Configuration (Jest)
```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/critical/': {
      branches: 100,
      functions: 100,
      lines: 100
    }
  }
};
```

## Test Organization

### File Structure
```
project/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx
│   └── utils/
│       ├── helpers.ts
│       └── helpers.test.ts
├── tests/
│   ├── integration/
│   │   └── api.test.ts
│   └── e2e/
│       └── user-flow.test.ts
└── __mocks__/
    └── api.ts
```

### Naming Conventions
```
ComponentName.test.tsx     # Unit tests
ComponentName.integration.test.tsx  # Integration
ComponentName.e2e.test.ts  # E2E
__mocks__/ComponentName.ts # Mocks
__fixtures__/ComponentName.ts # Test data
```

## Testing Checklist

### Pre-Commit
- [ ] All tests passing
- [ ] New code has tests
- [ ] Coverage meets threshold
- [ ] No skipped tests
- [ ] Lint passing

### Pre-Merge
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests (if applicable)
- [ ] Security tests (if applicable)
- [ ] Cross-browser testing (frontend)

### Pre-Release
- [ ] Full regression suite
- [ ] Load testing
- [ ] Security scan
- [ ] Accessibility audit
- [ ] Manual smoke test

## Test Strategies by Type

### API Testing
- Test all endpoints
- Verify response schemas
- Test authentication
- Test authorization
- Test error responses
- Test edge cases
- Test pagination
- Test filtering/sorting

### Database Testing
- Test CRUD operations
- Test constraints
- Test transactions
- Test migrations
- Test indexes (performance)
- Test data cleanup

### Frontend Testing
- Component rendering
- User interactions
- State management
- API mocking
- Accessibility
- Responsive design
- Error states
- Loading states

### Performance Testing
```typescript
describe('Performance', () => {
  test('should process 10,000 items in under 1 second', () => {
    const items = Array(10000).fill(createTestItem());
    
    const start = performance.now();
    processItems(items);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000);
  });

  test('should not have memory leaks', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    for (let i = 0; i < 1000; i++) {
      processLargeObject();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const growth = finalMemory - initialMemory;
    
    expect(growth).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
```

## Common Testing Pitfalls

1. **Testing implementation, not behavior**
2. **Over-mocking**
3. **Flaky tests**
4. **Coupled tests**
5. **Missing edge cases**
6. **No error testing**
7. **Slow tests**
8. **Low coverage**
9. **Brittle selectors** (E2E)
10. **No cleanup**

## Testing Tools

### Unit Testing
- Jest (JavaScript)
- Vitest (JavaScript)
- PyTest (Python)
- JUnit (Java)
- xUnit (.NET)

### E2E Testing
- Playwright
- Cypress
- Selenium
- Puppeteer

### API Testing
- Postman
- REST Client
- SuperTest
- Karate

### Performance Testing
- Artillery
- k6
- JMeter
- Locust

## Best Practices Summary

1. **Write tests first** (TDD when possible)
2. **Keep tests simple** and focused
3. **Use descriptive names**
4. **Test behavior, not implementation**
5. **Mock external dependencies**
6. **Aim for high coverage**
7. **Run tests frequently**
8. **Fix flaky tests immediately**
9. **Maintain test independence**
10. **Document complex tests**

## Output Format for @fix Agent

When bugs are found during testing, output a **Bug List** for @fix:

```markdown
# 🐛 Bug List for @fix

## Summary
**Tests Created:** [count]
**Tests Run:** [count]
**Tests Passed:** [count]
**Tests Failed:** [count]
**Bugs Found:** [count]

## Bugs

### BUG-001: [Bug Title]
- **Severity:** 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low
- **Type:** Logic Error | Type Error | Null Reference | Race Condition | Performance | Integration
- **File:** `path/to/file.ts`
- **Test Case:** `should [expected behavior]`
- **Description:** [What is failing]
- **Expected:** [What should happen]
- **Actual:** [What actually happens]
- **Reproduction:**
```typescript
it('should handle null input', () => {
  const result = processUser(null);
  expect(result).toBeNull();
});
```
- **Suggested Fix:**
```typescript
// Fix code here
function processUser(user: User | null): Result | null {
  if (!user) return null;
  // ... rest of logic
}
```

[... continue for all bugs ...]

## Bug Priority Order
1. BUG-XXX (Critical - [reason])
2. BUG-XXX (High - [reason])

## Files to Modify
| File | Bugs | Priority |
|------|------|----------|
| `src/file.ts` | 2 | High |

---
**Next:** `@fix please fix all bugs from the test results above`
```

### When All Tests Pass

```markdown
# ✅ Test Report

## Summary
**Tests Created:** [count]
**Tests Run:** [count]
**Tests Passed:** [count] (100%)
**Coverage:** [percentage]%

## Tests Created
| Test File | Tests | Coverage |
|-----------|-------|----------|
| `file.test.ts` | 15 | 92% |

**Status:** ✅ All tests passing, no bugs found
```
