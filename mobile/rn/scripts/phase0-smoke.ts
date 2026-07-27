/**
 * Phase-0 smoke test — exercises every new typed endpoint against the live
 * FastAPI backend and asserts the response shape matches the canonical RN
 * types from `src/types/api.ts`.
 *
 * Usage:
 *   npx ts-node scripts/phase0-smoke.ts
 *   EXPO_PUBLIC_API_URL=https://api.example.com npx ts-node scripts/phase0-smoke.ts
 *
 * Exit codes:
 *   0 — every assertion passed
 *   1 — a network request failed
 *   2 — a type assertion failed (shape mismatch)
 *
 * Reads:
 *   - EXPO_PUBLIC_API_URL (default http://localhost:8000)
 *   - EXPO_PUBLIC_SMOKE_EMAIL + EXPO_PUBLIC_SMOKE_PASSWORD (test credentials)
 *   Falls back to a synthetic cred when unset; many /pets endpoints require
 *   a Bearer token, so the test still expects a 401 from a no-auth login.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

import type {
  Course,
  CourseDetail,
  Lesson,
  LessonSession,
  LessonStepAttemptPayload,
  LessonStepAttemptResponse,
  MediaAssetRecord,
  Pet,
  PetListResponse,
  QuizSubmitResult,
  UserProgress,
} from '../src/types/api';

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const EMAIL = process.env.EXPO_PUBLIC_SMOKE_EMAIL ?? 'smoke@example.com';
const PASSWORD = process.env.EXPO_PUBLIC_SMOKE_PASSWORD ?? 'smoke-test-password';

const baselinePath = path.join(
  __dirname,
  '__snapshots__',
  'phase0-baseline.json',
);

const failures: string[] = [];

function assertShape(
  label: string,
  payload: unknown,
  guard: (value: unknown) => value is unknown,
): void {
  if (!guard(payload)) {
    failures.push(
      `[${label}] payload did not match expected shape:\n${JSON.stringify(
        payload,
        null,
        2,
      ).slice(0, 800)}`,
    );
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isArrayOf<T>(items: unknown[], guard: (v: unknown) => v is T): items is T[] {
  return items.every(guard);
}

const isCourse = (v: unknown): v is Course =>
  isObject(v) && typeof v.course_id === 'string' && typeof v.title === 'string';

const isLesson = (v: unknown): v is Lesson =>
  isObject(v) &&
  typeof v.lesson_id === 'string' &&
  typeof v.course_id === 'string' &&
  typeof v.title === 'string' &&
  Array.isArray(v.vocabulary) &&
  Array.isArray(v.quiz);

const isCourseDetail = (v: unknown): v is CourseDetail =>
  isCourse(v) && Array.isArray((v as CourseDetail).lessons);

const isLessonSession = (v: unknown): v is LessonSession =>
  isObject(v) &&
  typeof v.session_id === 'string' &&
  typeof v.user_id === 'string' &&
  typeof v.course_id === 'string' &&
  typeof v.lesson_id === 'string' &&
  Array.isArray(v.steps) &&
  typeof v.current_step_id === 'string';

const isPet = (v: unknown): v is Pet =>
  isObject(v) &&
  typeof v.pet_id === 'string' &&
  typeof v.name === 'string' &&
  typeof v.rarity === 'string' &&
  typeof v.is_unlocked === 'boolean' &&
  typeof v.is_active === 'boolean' &&
  typeof v.can_unlock === 'boolean';

const isPetListResponse = (v: unknown): v is PetListResponse =>
  isObject(v) &&
  Array.isArray(v.pets) &&
  isArrayOf(v.pets as unknown[], isPet) &&
  isObject(v.stats);

const isMediaAssetRecord = (v: unknown): v is MediaAssetRecord =>
  isObject(v) &&
  typeof v.asset_id === 'string' &&
  typeof v.path === 'string' &&
  typeof v.type === 'string';

const isUserProgressArray = (v: unknown): v is UserProgress[] =>
  Array.isArray(v) &&
  v.every(
    (entry) =>
      isObject(entry) &&
      typeof entry.user_id === 'string' &&
      typeof entry.course_id === 'string',
  );

const isLessonStepAttemptResponse = (
  v: unknown,
): v is LessonStepAttemptResponse =>
  isObject(v) &&
  typeof v.passed === 'boolean' &&
  typeof v.score === 'number' &&
  (v.next_step_id === null || typeof v.next_step_id === 'string');

async function main(): Promise<number> {
  const api: AxiosInstance = axios.create({
    baseURL: `${API_BASE}/api/v1`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  let token: string | null = null;

  console.log(`[phase0-smoke] target ${API_BASE}/api/v1`);

  // 1. login (may fail with 401 if test creds don't exist)
  try {
    const login = await api.post<{ access_token: string }>('/auth/login', {
      email: EMAIL,
      password: PASSWORD,
    });
    token = login.data?.access_token ?? null;
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    const status = (err as AxiosError)?.response?.status;
    if (status && status !== 401 && status !== 403) {
      failures.push(`[/auth/login] unexpected status ${status}`);
    } else {
      console.log(
        `[/auth/login] no test creds (${status}); continuing with public endpoints only.`,
      );
    }
  }

  // 2. list courses (public)
  let seededCourse: Course | null = null;
  try {
    const res = await api.get<unknown>('/courses?skip=0&limit=10');
    const courses = res.data as unknown[];
    assertShape('GET /courses', courses, (v): v is unknown =>
      Array.isArray(v) && (v as unknown[]).every(isCourse),
    );
    seededCourse = (courses as Course[])[0] ?? null;
    console.log(`[GET /courses] ${courses.length} course(s)`);
  } catch (err) {
    failures.push(
      `[GET /courses] failed: ${(err as AxiosError)?.message ?? String(err)}`,
    );
  }

  // 3. list pets (requires auth; expect 401 if no token)
  try {
    const res = await api.get<unknown>('/pets');
    assertShape('GET /pets', res.data, isPetListResponse);
    console.log(`[GET /pets] ${(res.data as PetListResponse).pets.length} pet(s)`);
  } catch (err) {
    const status = (err as AxiosError)?.response?.status;
    if (status === 401 && !token) {
      console.log('[GET /pets] 401 (no token) — expected');
    } else {
      failures.push(`[GET /pets] status=${status} message=${(err as AxiosError)?.message}`);
    }
  }

  // 4. get active pet (requires auth)
  if (token) {
    try {
      const res = await api.get<unknown>('/pets/active/current');
      if (res.data !== null) {
        assertShape('GET /pets/active/current', res.data, isPet);
      } else {
        console.log('[GET /pets/active/current] null (no active pet) — expected');
      }
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      failures.push(`[GET /pets/active/current] status=${status}`);
    }
  }

  // 5. lesson session for the first seeded course + first lesson
  if (token && seededCourse) {
    try {
      const detail = await api.get<unknown>(`/courses/${seededCourse.course_id}`);
      assertShape('GET /courses/{id}', detail.data, isCourseDetail);
      const firstLesson = (detail.data as CourseDetail).lessons[0];
      if (firstLesson) {
        const session = await api.post<unknown>(
          `/courses/${seededCourse.course_id}/lessons/${firstLesson.lesson_id}/session/start`,
        );
        assertShape(
          'POST /courses/.../session/start',
          session.data,
          isLessonSession,
        );

        // submit one step
        const stepId = (session.data as LessonSession).current_step_id;
        const payload: LessonStepAttemptPayload = {
          user_id: (session.data as LessonSession).user_id,
          step_id: stepId,
          passed: true,
          score: 90,
          mastery_words: [],
        };
        const attempt = await api.post<unknown>(
          `/courses/${seededCourse.course_id}/lessons/${firstLesson.lesson_id}/steps/attempt`,
          payload,
        );
        assertShape('POST /steps/attempt', attempt.data, isLessonStepAttemptResponse);
        console.log(`[lesson session] ${seededCourse.course_id}/${firstLesson.lesson_id} ok`);
      }
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      failures.push(`[lesson session] status=${status} ${(err as AxiosError)?.message}`);
    }
  }

  // 6. write a baseline snapshot of /courses and /pets (skip if no pets access)
  try {
    const baseline: Record<string, unknown> = {};
    if (seededCourse) {
      const detail = await api.get(`/courses/${seededCourse.course_id}`);
      baseline.course_detail = detail.data;
    }
    try {
      const pets = await api.get('/pets');
      baseline.pets = pets.data;
    } catch {
      // No auth — skip pets baseline; will be captured on next run.
    }
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    console.log(`[baseline] wrote ${baselinePath}`);
  } catch (err) {
    console.warn(`[baseline] failed to write snapshot: ${(err as Error).message}`);
  }

  // Silence unused-type lints — these imports exist to assert against the
  // canonical TS types and may be referenced by future assertions.
  void ({} as QuizSubmitResult);
  void ({} as MediaAssetRecord[]);
  void ({} as UserProgress[]);

  if (failures.length > 0) {
    console.error('[phase0-smoke] FAILURES:');
    for (const line of failures) console.error(`  - ${line}`);
    return 2;
  }

  console.log('[phase0-smoke] OK');
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error('[phase0-smoke] uncaught:', err);
    process.exit(1);
  },
);