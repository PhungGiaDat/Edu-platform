# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: animals-cat.spec.ts >> Animals Adventure Course >> Cat lesson shows vocabulary section
- Location: tests\e2e\animals-cat.spec.ts:74:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Dog').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Dog').first()

```

```yaml
- complementary "Learning sidebar":
  - text: 29:53
  - button "Collapse navigation" [expanded]
  - heading "EduAR" [level=1]
  - paragraph: Play. Explore. Learn English.
  - heading "Quick Links" [level=2]
  - link "Learn":
    - /url: /courses
  - link "AR Practice":
    - /url: /learn-ar
  - heading "Course Catalog" [level=2]
  - button "View all"
  - button "No published courses yet"
  - heading "Progress Tracker" [level=2]
  - text: 0 XP 0 Done
  - link "0/— Stickers":
    - /url: /stickers
  - text: 0/0 lessons
  - progressbar "Course completion"
  - button "Start Free Trial"
  - button "Browse Courses"
- main:
  - button:
    - img
  - text: Learn the Cat 0% 0% Complete 1 Warm Up 2 Words 3 Listen 4 Match 5 Games 6 Quiz 7 Reward
  - navigation:
    - button "🌟 Warm Up"
    - button "📚 Words"
    - button "👂 Listen"
    - button "🔗 Match"
    - button "🎮 Games"
    - button "❓ Quiz"
    - button "🏆 Reward"
  - main:
    - img "Learn the Cat"
    - heading "Welcome!" [level=2]
    - paragraph: Let's learn about animals!
    - text: 🐱 🐶 🐦 🐟 🐰
    - button "Continue":
      - text: Continue
      - img
  - button "Previous" [disabled]:
    - img
    - text: Previous
  - button "Continue":
    - text: Continue
    - img
- button "Talk to Lexi":
  - text: Need help? Ask Lexi!
  - img "Lexi"
```

# Test source

```ts
  1   | /**
  2   |  * Animals Course E2E Tests
  3   |  * 
  4   |  * Tests for the Animals Adventure course functionality including:
  5   |  * - Course listing visibility
  6   |  * - Course detail page with lessons
  7   |  * - Lesson navigation
  8   |  * - Lesson content display
  9   |  * - Mobile responsive viewport
  10  |  */
  11  | 
  12  | import { test, expect } from '@playwright/test';
  13  | 
  14  | const COURSE_ID = 'animals-adventure';
  15  | const ANIMALS = ['Cat', 'Dog', 'Bird', 'Fish', 'Rabbit'] as const;
  16  | 
  17  | test.describe('Animals Adventure Course', () => {
  18  |   
  19  |   test.beforeEach(async ({ page, context }) => {
  20  |     // Seed guestMode on the origin BEFORE the app boots so AuthContext
  21  |     // picks it up during its initial loadAuthFromStorage() call. Using
  22  |     // addInitScript alone is racy here because RequireLearnerAccess renders
  23  |     // its <Navigate to="/login"/> on the first render if the auth effect
  24  |     // hasn't yet observed the value.
  25  |     await context.addInitScript(() => {
  26  |       try {
  27  |         localStorage.setItem('guestMode', 'true');
  28  |       } catch {
  29  |         // localStorage unavailable — fail fast in the test, not silently
  30  |       }
  31  |     });
  32  |     // Pre-warm the app so AuthContext runs its initial load and `isGuest`
  33  |     // becomes true before the actual test navigates to a protected route.
  34  |     await page.goto('/login');
  35  |     await page.waitForFunction(
  36  |       () => localStorage.getItem('guestMode') === 'true',
  37  |       undefined,
  38  |       { timeout: 5000 }
  39  |     );
  40  |   });
  41  | 
  42  |   test('Animals Adventure detail page is accessible at /courses/animals-adventure', async ({ page }) => {
  43  |     await page.goto('/courses/animals-adventure');
  44  |     await page.waitForLoadState('networkidle');
  45  |     
  46  |     // Check for Animals Adventure course title/heading
  47  |     await expect(page.getByText(/Animals Adventure/i).first()).toBeVisible();
  48  |   });
  49  | 
  50  |   test('Animals Adventure detail shows 5 lessons', async ({ page }) => {
  51  |     await page.goto('/courses/animals-adventure');
  52  |     await page.waitForLoadState('networkidle');
  53  |     
  54  |     // Verify all 5 animal lessons are visible
  55  |     for (const animal of ANIMALS) {
  56  |       await expect(page.getByText(animal, { exact: false }).first()).toBeVisible();
  57  |     }
  58  |     
  59  |     // Verify we have 5 lessons (check for the lessons header)
  60  |     await expect(page.getByText(/5 Lessons/i)).toBeVisible();
  61  |   });
  62  | 
  63  |   test('Clicking Cat lesson navigates to lesson page', async ({ page }) => {
  64  |     await page.goto('/courses/animals-adventure');
  65  |     await page.waitForLoadState('networkidle');
  66  |     
  67  |     // Click on the Cat lesson card
  68  |     await page.getByText('Cat', { exact: false }).first().click();
  69  |     
  70  |     // Verify navigation to the lesson page
  71  |     await expect(page).toHaveURL(/\/courses\/animals-adventure\/lessons\/learn-the-cat/);
  72  |   });
  73  | 
  74  |   test('Cat lesson shows vocabulary section', async ({ page }) => {
  75  |     await page.goto('/courses/animals-adventure/lessons/learn-the-cat');
  76  |     await page.waitForLoadState('networkidle');
  77  |     
  78  |     // Verify Cat lesson content is visible
  79  |     await expect(page.getByText('Cat', { exact: false }).first()).toBeVisible();
  80  |     
  81  |     // Verify vocabulary section with animal words
  82  |     for (const animal of ANIMALS) {
> 83  |       await expect(page.getByText(animal, { exact: false }).first()).toBeVisible();
      |                                                                      ^ Error: expect(locator).toBeVisible() failed
  84  |     }
  85  |   });
  86  | 
  87  |   test('Course page renders on mobile viewport', async ({ page }) => {
  88  |     // Set mobile viewport
  89  |     await page.setViewportSize({ width: 375, height: 812 });
  90  | 
  91  |     await page.goto('/courses/animals-adventure');
  92  |     await page.waitForLoadState('networkidle');
  93  | 
  94  |     // Verify viewport is set correctly
  95  |     expect(page.viewportSize()).toEqual({ width: 375, height: 812 });
  96  | 
  97  |     // Verify content is still visible on mobile
  98  |     await expect(page.getByText(/Animals/i).first()).toBeVisible();
  99  |   });
  100 | 
  101 | });
  102 | 
```