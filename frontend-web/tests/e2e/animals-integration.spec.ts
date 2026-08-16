import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const API_BASE = (process.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/$/, '');
const COURSE_ID = 'animals-adventure-en-5-7';
const COURSE_ENDPOINT = `${API_BASE}/api/v1/courses/${COURSE_ID}`;
const COURSE_COVER_URL = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/courses/animals-adventure/course-cover.svg';

async function openGuestPage(page: Page, path: string) {
  await page.addInitScript(() => {
    localStorage.setItem('guestMode', 'true');
  });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function getCourse(request: APIRequestContext) {
  const response = await request.get(COURSE_ENDPOINT);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const lessons = payload.lessons || payload.data?.lessons || payload.course?.lessons || [];
  return { payload, lessons };
}

test.describe('Animals backend integration', () => {
  test.beforeEach(async ({ request }, testInfo) => {
    try {
      const response = await request.get(COURSE_ENDPOINT, { timeout: 5_000 });
      if (!response.ok()) {
        testInfo.annotations.push({ type: 'api-unavailable', description: `${response.status()} ${COURSE_ENDPOINT}` });
        test.skip(true, `Animals API is unavailable at ${COURSE_ENDPOINT}`);
      }
    } catch (error) {
      testInfo.annotations.push({ type: 'api-unavailable', description: String(error) });
      test.skip(true, `Animals API is unreachable at ${COURSE_ENDPOINT}`);
    }
  });

  test('Animals Adventure API returns five lessons', async ({ request }) => {
    const { payload, lessons } = await getCourse(request);

    expect(payload).toBeDefined();
    expect(lessons).toHaveLength(5);
  });

  test('overview renders the same lesson count as the API', async ({ page, request }) => {
    const { lessons } = await getCourse(request);
    await openGuestPage(page, '/courses/animals');

    await expect(page.locator('.animals-course__lesson-card')).toHaveCount(lessons.length);
    expect(lessons).toHaveLength(5);
  });
});

test.describe('Animals Supabase assets', () => {
  test('course cover SVG is publicly available', async ({ request }) => {
    const response = await request.get(COURSE_COVER_URL);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type'] || '').toMatch(/image\/svg|application\/octet-stream/i);
  });
});
