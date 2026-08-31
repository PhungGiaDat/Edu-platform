# Adaptive Mission Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing mobile-web course catalog guide learners to one adaptive next mission and present each course's lessons and activities as a coherent, progress-aware journey.

**Architecture:** Add a pure frontend adapter over `Course[]`, `UserProgress[]`, learning-path preferences, and server lesson sessions. Keep `/courses` as the catalog entry point, render `/courses/:courseId` as a presentation-only mission path, and let `LessonPlayer` follow the backend session step order while reusing its current vocabulary, game, story, pronunciation, quiz, media, and reward components.

**Tech Stack:** React 18, TypeScript 5.8, React Router 6, Tailwind CSS 4, existing claymorphic CSS tokens, Vitest + Testing Library, Playwright, FastAPI contracts, PostgreSQL-backed service boundary.

## Global Constraints

- The primary implementation surface is `frontend/**` responsive mobile web; do not start new RN/Unity feature work.
- The generic `/courses` route remains the catalog entry point; `/learning-path-3d` remains a separate optional experience.
- Learning-path preferences rank catalog actions; they do not create a second course-content hierarchy.
- Presentation-only four-lesson chunks must not be persisted or treated as backend curriculum units.
- Prefer canonical `learning_blocks.activities[]` for activity metadata when present; preserve legacy lesson fields as a compatibility fallback.
- Existing FastAPI/session/reward contracts remain authoritative; do not add a recommendation service, database table, or client-side XP logic.
- XP and reward values displayed after completion must come from the backend response; replay must not duplicate authoritative rewards.
- The visual locked state is not an authorization boundary; direct lesson URLs still use backend/session validation.
- Interactive nodes, buttons, and sheet controls must be at least 44×44px; no hover-only interaction; respect `prefers-reduced-motion`.
- Validate at 375px, 390px, 428px, 768px, and desktop widths; release acceptance requires mobile-browser runtime verification.
- Preserve the existing Animals Adventure flow and its E2E tests.
- Follow `inspect actual code → implement → compile → focused tests → runtime/device verification`.

---

## File map

### Create

- `frontend/src/features/courses/missionPath.ts` — pure lesson sorting, activity summaries, next-mission selection, presentation-unit grouping, and node-state derivation.
- `frontend/src/__tests__/features/courses/missionPath.test.ts` — selector and adapter tests.
- `frontend/src/features/courses/components/NextMissionCard.tsx` — catalog next-action card.
- `frontend/src/features/courses/components/MissionLessonSheet.tsx` — accessible lesson node dialog/bottom sheet.
- `frontend/src/features/courses/lessonSteps.ts` — server-session-to-renderer step adapter.
- `frontend/src/__tests__/features/courses/lessonSteps.test.ts` — canonical/legacy step-order tests.
- `frontend/src/features/courses/completionPresentation.ts` — authoritative completion-to-reward presentation mapper.
- `frontend/src/__tests__/features/courses/completionPresentation.test.ts` — reward-gating tests.
- `frontend/src/__tests__/pages/CourseDetail.test.tsx` — generic course-path behavior tests.
- `frontend/src/__tests__/features/courses/CourseMap.test.tsx` — node-state and sheet interaction tests.
- `frontend/src/__tests__/pages/LearningPathSetup.test.tsx` — saved-path navigation test.
- `frontend/tests/e2e/adaptive-course-path.spec.ts` — catalog → path → lesson mobile browser flow.

### Modify

- `frontend/src/features/courses/types.ts` — add read-only canonical activity/session fields and typed lesson completion response.
- `frontend/src/features/courses/services/CourseService.ts` — type `startCourse` and `completeLesson` responses without changing URLs or payload semantics.
- `frontend/src/pages/CourseList.tsx` — compose and render the adaptive next mission while keeping existing catalog/path filters.
- `frontend/src/styles/course-catalog.css` — style the next mission card and mobile/reduced-motion states.
- `frontend/src/pages/LearningPathSetup.tsx` — add a clear post-save route back to the catalog.
- `frontend/src/features/courses/components/CourseMap.tsx` — remove hardcoded navigation and make it a generic path presenter.
- `frontend/src/features/courses/components/CourseLearningBlocks.tsx` — add an optional next-mission action to the reward popup.
- `frontend/src/pages/CourseDetail.tsx` — use mission-path adapters and CourseMap instead of a flat lesson list.
- `frontend/src/pages/LessonPlayer.tsx` — use server session order, map canonical/legacy steps safely, and gate reward display on completion response.

### Backend verification only

- `backend/tests/test_course_start.py`
- `backend/tests/test_lesson_activity_contract.py`
- `backend/tests/test_vocabulary_activity_contract.py`
- `backend/tests/test_quiz_activity_contract.py`
- `backend/tests/test_mini_game_activity_contract.py`
- `backend/tests/test_course_service_gamification.py`
- `backend/tests/test_gamification_idempotency.py`

No backend source file or API route changes are planned.

---

## Task 1: Build the pure mission-path adapter

**Files:**

- Create: `frontend/src/features/courses/missionPath.ts`
- Modify: `frontend/src/features/courses/types.ts:89-292`
- Test: `frontend/src/__tests__/features/courses/missionPath.test.ts`

**Interfaces:**

- Consumes: `Course`, `Lesson`, `UserProgress`, `LessonActivity`, and `matchesTopic()` from `frontend/src/lib/learningPathTopics.ts`.
- Produces: `selectNextMission(input)`, `summarizeLesson(lesson)`, `buildMissionPath(course, progress)`, and the `NextMission`, `MissionPath`, `MissionUnit`, and `MissionLesson` view-model types used by Tasks 2 and 3.

- [ ] **Step 1: Add failing selector tests**

Create fixtures with the minimum fields needed by the existing `Lesson` and `Course` interfaces, cast the fixture objects to those interfaces, and cover the contract below:

```ts
import { describe, expect, it } from 'vitest';
import type { Course, Lesson, UserProgress } from '@/features/courses/types';
import {
  buildMissionPath,
  selectNextMission,
  summarizeLesson,
} from '@/features/courses/missionPath';

const lesson = (lesson_id: string, order: number, title = lesson_id) => ({
  lesson_id,
  title,
  title_vi: title,
  order,
  duration_minutes: 5,
  video_duration: 0,
  images: [],
  scene_images: [],
  vocabulary: [],
  quiz: [],
  generatedMedia: [],
}) as Lesson;

const course = (course_id: string, category_key: string, lessons: Lesson[]) => ({
  course_id,
  title: course_id,
  subtitle_vi: course_id,
  theme: course_id,
  category_key,
  category_label: category_key,
  category_icon: category_key.slice(0, 2).toUpperCase(),
  age_range: '5-8',
  level: 'beginner',
  description_vi: course_id,
  catalogPreview: [],
  studentTestimonials: [],
  lessons,
  is_published: true,
}) as Course;

const progressFor = (course_id: string, overrides: Partial<UserProgress> = {}) => ({
  user_id: 'learner-1',
  course_id,
  status: 'started',
  current_lesson_id: null,
  completed_lessons: [],
  lesson_progress: [],
  total_xp: 0,
  rewards: [],
  ...overrides,
}) as UserProgress;

describe('missionPath selectors', () => {
  it('continues a valid incomplete current lesson before topic ranking', () => {
    const family = course('family-course', 'home_family', [lesson('family-1', 1), lesson('family-2', 2)]);
    const nature = course('nature-course', 'nature', [lesson('nature-1', 1)]);

    const result = selectNextMission({
      courses: [family, nature],
      progress: [progressFor(family.course_id, { current_lesson_id: 'family-2' })],
      priorityTopics: ['nature'],
    });

    expect(result?.lesson.lesson_id).toBe('family-2');
    expect(result?.status).toBe('continue');
    expect(result?.reason).toBe('continue_where_left_off');
  });

  it('falls forward when the stored current lesson is stale or complete', () => {
    const item = course('family-course', 'home_family', [lesson('family-1', 1), lesson('family-2', 2)]);

    const stale = selectNextMission({
      courses: [item],
      progress: [progressFor(item.course_id, { current_lesson_id: 'deleted-lesson' })],
      priorityTopics: [],
    });
    const completed = selectNextMission({
      courses: [item],
      progress: [progressFor(item.course_id, {
        current_lesson_id: 'family-1',
        completed_lessons: ['family-1'],
      })],
      priorityTopics: [],
    });

    expect(stale?.lesson.lesson_id).toBe('family-1');
    expect(completed?.lesson.lesson_id).toBe('family-2');
  });

  it('uses the first incomplete lesson in the first matching priority topic', () => {
    const nature = course('nature-course', 'nature', [lesson('nature-1', 1), lesson('nature-2', 2)]);
    const family = course('family-course', 'home_family', [lesson('family-1', 1)]);

    const result = selectNextMission({
      courses: [family, nature],
      progress: [progressFor(family.course_id, { completed_lessons: ['family-1'] })],
      priorityTopics: ['nature'],
    });

    expect(result?.course.course_id).toBe('nature-course');
    expect(result?.reason).toBe('priority_topic');
  });

  it('summarizes canonical activities and keeps legacy content as fallback', () => {
    const canonical = {
      ...lesson('canonical-1', 1),
      vocabulary: [{ word_en: 'tree' } as Lesson['vocabulary'][number]],
      learning_blocks: {
        schema_version: 2,
        content_version: 1,
        vocabulary: ['tree'],
        activities: [
          { activity_id: 'warm-1', type: 'warm_up', order: 1, required: true, completion_policy: { mode: 'viewed' } },
          { activity_id: 'quiz-1', type: 'quiz', order: 2, required: true, completion_policy: { mode: 'quiz_complete' }, config: { question_ids: [1, 2] } },
        ],
      },
    } as Lesson;

    const summary = summarizeLesson(canonical);

    expect(summary.primaryActivity?.type).toBe('warm_up');
    expect(summary.activities).toHaveLength(2);
    expect(summary.wordCount).toBe(1);
    expect(summary.questionCount).toBe(2);
  });

  it('creates stable four-lesson presentation chunks and node states', () => {
    const item = course('family-course', 'home_family', Array.from({ length: 5 }, (_, index) => lesson(`family-${index + 1}`, index + 1)));
    const path = buildMissionPath(item, progressFor(item.course_id, { current_lesson_id: 'family-2' }));

    expect(path.units).toHaveLength(2);
    expect(path.units[0].lessons).toHaveLength(4);
    expect(path.units[0].lessons[0].state).toBe('available');
    expect(path.units[0].lessons[1].state).toBe('current');
    expect(path.units[0].lessons[2].state).toBe('locked');
    expect(path.units[1].lessons[0].state).toBe('locked');
  });
});
```

- [ ] **Step 2: Run the focused test and verify the expected initial failure**

Run:

```powershell
npm --prefix frontend exec vitest run src/__tests__/features/courses/missionPath.test.ts
```

Expected: FAIL because `frontend/src/features/courses/missionPath.ts` does not exist yet.

- [ ] **Step 3: Extend the read-only frontend contract types**

Add these types to `frontend/src/features/courses/types.ts` without changing the existing legacy fields:

```ts
export type LessonActivityType =
  | 'warm_up'
  | 'learn_vocabulary'
  | 'listen_choose'
  | 'match'
  | 'drag_drop'
  | 'memory_match'
  | 'coloring'
  | 'mini_game'
  | 'quiz'
  | 'read_aloud'
  | 'pronunciation';

export type LessonCompletionPolicyMode =
  | 'viewed'
  | 'all_items'
  | 'interaction_complete'
  | 'game_complete'
  | 'quiz_complete';

export interface LessonActivity {
  activity_id: string;
  type: LessonActivityType;
  order: number;
  required: boolean;
  completion_policy?: { mode: LessonCompletionPolicyMode };
  title?: string | null;
  instructions?: string | null;
  config?: Record<string, unknown>;
}

export interface LessonLearningBlocks {
  schema_version: 1 | 2;
  content_version: number;
  vocabulary: Array<string | Record<string, unknown>>;
  activities: LessonActivity[];
  activity?: Record<string, unknown> | null;
  game?: Record<string, unknown> | null;
  pronunciation?: Record<string, unknown> | null;
  quiz?: Array<Record<string, unknown>> | null;
  readAloudStory?: Record<string, unknown> | null;
}

export interface LessonCompletionGamification {
  xp_earned: number;
  words_learned: number;
  time_mins: number;
  new_sticker?: unknown;
}

export interface LessonCompletionResult extends UserProgress {
  gamification?: LessonCompletionGamification;
}
```

Add `learning_blocks?: LessonLearningBlocks | null` to `Lesson`, `activity_type?: LessonActivityType | null`, `activity_order?: number | null`, and `required?: boolean` to `LessonSessionStepState`, plus `content_version?: number` to `LessonSession`.

- [ ] **Step 4: Implement the pure adapter**

Create `frontend/src/features/courses/missionPath.ts` with these exact public types and functions:

```ts
import { matchesTopic } from '@/lib/learningPathTopics';
import type {
  Course,
  Lesson,
  LessonActivity,
  LessonActivityType,
  UserProgress,
} from '@/features/courses/types';

export type MissionLessonState = 'completed' | 'current' | 'available' | 'locked';
export type NextMissionStatus = 'start' | 'continue' | 'review';
export type NextMissionReason =
  | 'continue_where_left_off'
  | 'priority_topic'
  | 'started_course'
  | 'first_lesson';

export type LegacyActivityType = 'video' | 'story' | 'vocabulary' | 'game' | 'read_aloud' | 'pronunciation' | 'quiz';

export interface LessonActivitySummary {
  id?: string;
  type: LessonActivityType | LegacyActivityType;
  title: string;
  itemCount: number;
}

export interface LessonContentSummary {
  activities: LessonActivitySummary[];
  primaryActivity: LessonActivitySummary | null;
  wordCount: number;
  questionCount: number;
  hasMedia: boolean;
}

export interface MissionLesson {
  lesson: Lesson;
  state: MissionLessonState;
  summary: LessonContentSummary;
  position: number;
}

export interface MissionUnit {
  unit_id: string;
  unit_index: number;
  lessons: MissionLesson[];
}

export interface MissionPath {
  units: MissionUnit[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  focusLesson: MissionLesson | null;
}

export interface NextMission {
  course: Course;
  lesson: Lesson;
  progress: UserProgress | null;
  status: NextMissionStatus;
  reason: NextMissionReason;
  summary: LessonContentSummary;
}

export interface SelectNextMissionInput {
  courses: Course[];
  progress: UserProgress[];
  priorityTopics: string[];
}

export const sortLessons = (lessons: Lesson[]) =>
  [...lessons].sort((left, right) => left.order - right.order || left.lesson_id.localeCompare(right.lesson_id));

const configCount = (activity: LessonActivity) => {
  const config = activity.config || {};
  for (const key of ['vocabulary_ids', 'question_ids', 'mini_game_item_ids']) {
    const value = config[key];
    if (Array.isArray(value)) return value.length;
  }
  return 0;
};

export const summarizeLesson = (lesson: Lesson): LessonContentSummary => {
  const canonical = lesson.learning_blocks?.activities || [];
  const activities: LessonActivitySummary[] = canonical.length > 0
    ? [...canonical]
      .sort((left, right) => left.order - right.order || left.activity_id.localeCompare(right.activity_id))
      .map((activity) => ({
        id: activity.activity_id,
        type: activity.type,
        title: activity.title || activity.type.replaceAll('_', ' '),
        itemCount: configCount(activity),
      }))
    : [
      lesson.videoLesson && { type: 'video' as const, title: 'Video', itemCount: lesson.videoLesson.scenes.length },
      lesson.game && { type: 'game' as const, title: 'Game', itemCount: lesson.game.items.length },
      lesson.vocabulary.length > 0 && { type: 'vocabulary' as const, title: 'Vocabulary', itemCount: lesson.vocabulary.length },
      lesson.readAloudStory && { type: 'read_aloud' as const, title: 'Read aloud', itemCount: lesson.readAloudStory.pages.length },
      lesson.pronunciation && { type: 'pronunciation' as const, title: 'Pronunciation', itemCount: lesson.pronunciation.target_words.length },
      lesson.quiz.length > 0 && { type: 'quiz' as const, title: 'Quiz', itemCount: lesson.quiz.length },
    ].filter(Boolean) as LessonActivitySummary[];
  const canonicalWordCount = lesson.learning_blocks?.vocabulary?.length || 0;
  const canonicalQuestionCount = canonical
    .filter((activity) => activity.type === 'quiz')
    .reduce((total, activity) => total + configCount(activity), 0);

  return {
    activities,
    primaryActivity: activities[0] || null,
    wordCount: lesson.vocabulary.length || canonicalWordCount,
    questionCount: lesson.quiz.length || canonicalQuestionCount,
    hasMedia: Boolean(lesson.video_url || lesson.intro_video_url || lesson.videoLesson || lesson.lesson_media || lesson.images.length),
  };
};

const publishedWithLessons = (courses: Course[]) =>
  courses.filter((course) => course.is_published && sortLessons(course.lessons).length > 0);

const incompleteLesson = (course: Course, courseProgress: UserProgress | null) => {
  const completed = new Set(courseProgress?.completed_lessons || []);
  return sortLessons(course.lessons).find((lesson) => !completed.has(lesson.lesson_id)) || null;
};

const makeNextMission = (
  course: Course,
  lesson: Lesson,
  progress: UserProgress | null,
  status: NextMissionStatus,
  reason: NextMissionReason,
): NextMission => ({ course, lesson, progress, status, reason, summary: summarizeLesson(lesson) });

export const selectNextMission = ({ courses, progress, priorityTopics }: SelectNextMissionInput): NextMission | null => {
  const available = publishedWithLessons(courses);
  const progressByCourse = new Map(progress.map((item) => [item.course_id, item]));

  for (const course of available) {
    const courseProgress = progressByCourse.get(course.course_id) || null;
    if (!courseProgress || courseProgress.status !== 'started') continue;
    const lessons = sortLessons(course.lessons);
    const completed = new Set(courseProgress.completed_lessons || []);
    const current = lessons.find((lesson) => lesson.lesson_id === courseProgress.current_lesson_id && !completed.has(lesson.lesson_id));
    const fallback = incompleteLesson(course, courseProgress);
    if (current) return makeNextMission(course, current, courseProgress, 'continue', 'continue_where_left_off');
    if (fallback) return makeNextMission(course, fallback, courseProgress, 'continue', 'continue_where_left_off');
  }

  for (const topicId of priorityTopics) {
    for (const course of available) {
      if (!matchesTopic(course, topicId)) continue;
      const courseProgress = progressByCourse.get(course.course_id) || null;
      const lesson = incompleteLesson(course, courseProgress);
      if (lesson) return makeNextMission(course, lesson, courseProgress, courseProgress ? 'continue' : 'start', 'priority_topic');
    }
  }

  for (const course of available) {
    const courseProgress = progressByCourse.get(course.course_id) || null;
    const lesson = incompleteLesson(course, courseProgress);
    if (lesson && courseProgress) return makeNextMission(course, lesson, courseProgress, 'continue', 'started_course');
  }

  const firstCourse = available[0];
  if (!firstCourse) return null;
  const firstLesson = sortLessons(firstCourse.lessons)[0];
  return firstLesson ? makeNextMission(firstCourse, firstLesson, progressByCourse.get(firstCourse.course_id) || null, 'start', 'first_lesson') : null;
};

export const buildMissionPath = (course: Course, courseProgress: UserProgress | null): MissionPath => {
  const lessons = sortLessons(course.lessons);
  const completed = new Set((courseProgress?.completed_lessons || []).filter((lessonId) => lessons.some((lesson) => lesson.lesson_id === lessonId)));
  const firstIncomplete = lessons.find((lesson) => !completed.has(lesson.lesson_id)) || null;
  const current = lessons.find((lesson) => lesson.lesson_id === courseProgress?.current_lesson_id && !completed.has(lesson.lesson_id)) || null;
  const focus = current || firstIncomplete;
  const focusIndex = focus ? lessons.findIndex((lesson) => lesson.lesson_id === focus.lesson_id) : -1;
  const pathLessons = lessons.map((lesson, index): MissionLesson => ({
    lesson,
    summary: summarizeLesson(lesson),
    position: index,
    state: completed.has(lesson.lesson_id)
      ? 'completed'
      : lesson.lesson_id === focus?.lesson_id
        ? current ? 'current' : 'available'
        : focusIndex >= 0 && index < focusIndex
          ? 'available'
          : 'locked',
  }));
  const units: MissionUnit[] = [];
  for (let index = 0; index < pathLessons.length; index += 4) {
    const unitIndex = Math.floor(index / 4);
    units.push({ unit_id: `${course.course_id}:unit-${unitIndex + 1}`, unit_index: unitIndex, lessons: pathLessons.slice(index, index + 4) });
  }
  return {
    units,
    completedCount: completed.size,
    totalCount: lessons.length,
    progressPercent: lessons.length ? Math.round((completed.size / lessons.length) * 100) : 0,
    focusLesson: pathLessons.find((item) => item.lesson.lesson_id === focus?.lesson_id) || null,
  };
};
```

- [ ] **Step 5: Run the selector tests and inspect type errors**

Run:

```powershell
npm --prefix frontend exec vitest run src/__tests__/features/courses/missionPath.test.ts
npm --prefix frontend run build
```

Expected: all selector tests PASS and the frontend build completes without TypeScript errors. If the existing `Course` type is imported through `@/types/course`, keep the compatibility export and import the canonical definitions from `@/features/courses/types` inside the new module.

- [ ] **Step 6: Commit the isolated adapter change**

```powershell
git add -- frontend/src/features/courses/types.ts frontend/src/features/courses/missionPath.ts frontend/src/__tests__/features/courses/missionPath.test.ts
git commit -m "feat(courses): add mission path selectors"
```

## Task 2: Add the adaptive mission card and connect Learning Path setup

**Files:**

- Create: `frontend/src/features/courses/components/NextMissionCard.tsx`
- Modify: `frontend/src/pages/CourseList.tsx:41-80,464-483,566-780`
- Modify: `frontend/src/styles/course-catalog.css:312-430,922-1003`
- Modify: `frontend/src/pages/LearningPathSetup.tsx:1-20,383-428`
- Test: `frontend/src/__tests__/pages/CourseList.test.tsx`
- Test: `frontend/src/__tests__/pages/LearningPathSetup.test.tsx`

**Interfaces:**

- Consumes: `NextMission` from Task 1, the existing `courseTitle()`, `lessonTitle()`, `courseService`, and `learningPathService`.
- Produces: one `data-testid="next-mission-card"` section on unfiltered `/courses`, and a post-save button that navigates to `/courses`.

- [ ] **Step 1: Add failing catalog and setup tests**

Extend the existing `CourseList.test.tsx` mock with a live course fixture and add this behavior test:

Import the mocked service in the test module so the method calls below are typed and address the same mock instance:

```tsx
import { courseService } from '@/services/CourseService';
import type { Course } from '@/types/course';
```

Define the live fixture in the same test file (the existing mocked `CourseCard` only needs the course title, while the selector needs ordered lesson data):

```tsx
const liveCourse = {
  course_id: 'course-family',
  title: 'Momo Family',
  subtitle_vi: 'Gia dinh',
  theme: 'Home and Family',
  category_key: 'home_family',
  category_label: 'Home and Family',
  category_icon: 'HF',
  age_range: '5-8',
  level: 'beginner',
  description_vi: 'Family words',
  catalogPreview: [],
  studentTestimonials: [],
  lessons: [
    { lesson_id: 'lesson-1', title: 'Hello family', title_vi: 'Xin chao gia dinh', order: 1, duration_minutes: 5, video_duration: 0, images: [], scene_images: [], vocabulary: [], quiz: [], generatedMedia: [] },
    { lesson_id: 'lesson-2', title: 'Meet the words', title_vi: 'Gap tu moi', order: 2, duration_minutes: 5, video_duration: 0, images: [], scene_images: [], vocabulary: [], quiz: [], generatedMedia: [] },
  ],
  is_published: true,
} as Course;
```

```tsx
it('shows the stored current lesson as the primary next mission', async () => {
  vi.mocked(courseService.listCourses).mockResolvedValue([liveCourse]);
  vi.mocked(courseService.getProgress).mockResolvedValue([{
    user_id: 'guest-learner',
    course_id: liveCourse.course_id,
    status: 'started',
    current_lesson_id: 'lesson-2',
    completed_lessons: ['lesson-1'],
    lesson_progress: [],
    total_xp: 20,
    rewards: [],
  }]);

  render(
    <MemoryRouter initialEntries={['/courses']}>
      <CourseList />
    </MemoryRouter>,
  );

  await waitFor(() => expect(screen.getByTestId('next-mission-card')).toBeVisible());
  expect(screen.getByTestId('next-mission-card')).toHaveTextContent('Meet the words');
  expect(screen.getByRole('button', { name: /continue mission/i })).toHaveAttribute(
    'data-lesson-id',
    'lesson-2',
  );
});
```

Add `LearningPathSetup.test.tsx` with mocked `useAuth`, `useLocale`, `learningPathService`, and a `MemoryRouter`; after the save response resolves, assert that the complete state contains a button named `Start learning` and clicking it changes the router location to `/courses`.

- [ ] **Step 2: Run the new tests and verify the expected failure**

```powershell
npm --prefix frontend exec vitest run src/__tests__/pages/CourseList.test.tsx src/__tests__/pages/LearningPathSetup.test.tsx
```

Expected: FAIL because the Next Mission card and post-save catalog CTA do not exist.

- [ ] **Step 3: Implement the presentational NextMissionCard**

Create `NextMissionCard.tsx` with a dumb, localized interface:

```tsx
import React from 'react';
import type { Locale } from '@/contexts/LocaleContext';
import { lessonTitle, courseTitle } from '@/lib/courseLocale';
import type { NextMission } from '@/features/courses/missionPath';

export type NextMissionCopy = {
  kicker: string;
  continueLabel: string;
  startLabel: string;
  reviewLabel: string;
  courseLabel: string;
  minutesLabel: string;
  wordsLabel: string;
  questionsLabel: string;
  mediaLabel: string;
  rewardLabel: string;
  demoLabel: string;
  emptyTitle: string;
  emptyBody: string;
};

type NextMissionCardProps = {
  mission: NextMission | null;
  locale: Locale;
  copy: NextMissionCopy;
  onStart: () => void;
  isDemo?: boolean;
};

export const NextMissionCard: React.FC<NextMissionCardProps> = ({ mission, locale, copy, onStart, isDemo = false }) => {
  if (!mission) {
    return (
      <section className="course-catalog__next-mission" data-testid="next-mission-card">
        <p className="course-catalog__next-mission-kicker">{copy.kicker}</p>
        <h2>{copy.emptyTitle}</h2>
        <p>{copy.emptyBody}</p>
      </section>
    );
  }

  const actionLabel = mission.status === 'continue'
    ? copy.continueLabel
    : mission.status === 'review'
      ? copy.reviewLabel
      : copy.startLabel;

  return (
    <section className="course-catalog__next-mission" data-testid="next-mission-card">
      <div className="course-catalog__next-mission-copy">
        <p className="course-catalog__next-mission-kicker">{copy.kicker}</p>
        <p className="course-catalog__next-mission-course">
          {courseTitle(mission.course, locale)} · {copy.courseLabel}
          {isDemo && <span className="course-catalog__next-mission-demo">{copy.demoLabel}</span>}
        </p>
        <h2>{lessonTitle(mission.lesson, locale)}</h2>
        <div className="course-catalog__next-mission-meta" aria-label={`${mission.lesson.duration_minutes} ${copy.minutesLabel}`}>
          <span>{mission.lesson.duration_minutes} {copy.minutesLabel}</span>
          <span>{mission.summary.wordCount} {copy.wordsLabel}</span>
          <span>{mission.summary.questionCount} {copy.questionsLabel}</span>
          {mission.summary.hasMedia && <span>{copy.mediaLabel}</span>}
          {mission.lesson.reward && <span>+{mission.lesson.reward.xp} {copy.rewardLabel}</span>}
        </div>
      </div>
      <button
        type="button"
        className="course-catalog__next-mission-action"
        data-course-id={mission.course.course_id}
        data-lesson-id={mission.lesson.lesson_id}
        onClick={onStart}
        aria-label={`${actionLabel}: ${lessonTitle(mission.lesson, locale)}`}
      >
        {actionLabel}
      </button>
    </section>
  );
};
```

- [ ] **Step 4: Compose the selector in CourseList**

Import `selectNextMission` and `NextMissionCard`. Extend both locale copy objects with `nextMission`, `continueMission`, `startMission`, `reviewMission`, `courseLabel`, `minutesLabel`, `wordsLabel`, `questionsLabel`, `mediaLabel`, `rewardLabel`, `demoLabel`, `emptyMissionTitle`, and `emptyMissionBody`.

After `priorityTopics` and `sourceCourses` are available, add:

```tsx
const nextMission = useMemo(
  () => selectNextMission({ courses: sourceCourses, progress, priorityTopics }),
  [priorityTopics, progress, sourceCourses],
);
```

Render the card directly after the hero and before the stats, only for the unfiltered catalog:

```tsx
{!activeFilter && (
  <NextMissionCard
    mission={nextMission}
    locale={locale}
    copy={{
      kicker: ui.nextMission,
      continueLabel: ui.continueMission,
      startLabel: ui.startMission,
      reviewLabel: ui.reviewMission,
      courseLabel: ui.courseLabel,
      minutesLabel: ui.minutesLabel,
      wordsLabel: ui.vocabulary,
      questionsLabel: ui.questionsLabel,
      mediaLabel: ui.mediaLabel,
      rewardLabel: ui.rewardLabel,
      demoLabel: ui.demo,
      emptyTitle: ui.emptyMissionTitle,
      emptyBody: ui.emptyMissionBody,
    }}
    isDemo={!hasLiveCourses}
    onStart={() => {
      if (!nextMission) return;
      navigate(`/courses/${nextMission.course.course_id}/lessons/${nextMission.lesson.lesson_id}`);
    }}
  />
)}
```

Keep the existing CourseCard CTA, filters, and fallback demo catalog. When `sourceCourses` is demo data, the card must show a `Demo`/preview marker and must not present the hardcoded aggregate XP as live learner progress.

- [ ] **Step 5: Add the catalog CSS**

Add a single-column mobile-safe card using existing colors and no new animation dependency:

```css
.course-catalog__next-mission {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  margin-top: 1.5rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  border: 4px solid rgb(255 255 255 / 0.92);
  border-radius: 2rem;
  background: linear-gradient(135deg, #fff1d7, #fff8d8 48%, #eef9e7);
  box-shadow: 0 12px 0 rgb(229 184 0 / 0.16), 0 20px 36px rgb(26 39 68 / 0.1), inset 0 1px rgb(255 255 255 / 0.9);
}

.course-catalog__next-mission-kicker,
.course-catalog__next-mission-course {
  margin: 0;
  color: #765218;
  font-family: 'Baloo 2', 'Quicksand', system-ui, sans-serif;
  font-weight: 800;
}

.course-catalog__next-mission-demo {
  display: inline-flex;
  min-height: 1.75rem;
  margin-left: 0.45rem;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  color: #765218;
  background: rgb(255 255 255 / 0.78);
  font-size: 0.72rem;
  vertical-align: middle;
}

.course-catalog__next-mission h2 {
  margin: 0.25rem 0 0;
  color: #102565;
  font-family: 'Baloo 2', 'Quicksand', system-ui, sans-serif;
  font-size: clamp(1.5rem, 4vw, 2.35rem);
  line-height: 1.05;
}

.course-catalog__next-mission-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
  color: #40567f;
  font-size: 0.82rem;
  font-weight: 800;
}

.course-catalog__next-mission-meta span {
  min-height: 2.25rem;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.82);
}

.course-catalog__next-mission-action {
  min-width: 8rem;
  min-height: 3rem;
  padding: 0.7rem 1rem;
  border: 4px solid #fff;
  border-radius: 1.2rem;
  color: #172554;
  background: #b4e197;
  box-shadow: 0 6px 0 #7dc760;
  font-family: 'Baloo 2', 'Quicksand', system-ui, sans-serif;
  font-weight: 800;
  cursor: pointer;
}

.course-catalog__next-mission-action:focus-visible {
  outline: 4px solid #2563eb;
  outline-offset: 4px;
}

@media (max-width: 430px) {
  .course-catalog__next-mission {
    grid-template-columns: minmax(0, 1fr);
  }

  .course-catalog__next-mission-action {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .course-catalog__next-mission-action {
    transition: none;
  }
}
```

- [ ] **Step 6: Connect LearningPathSetup after save**

Import `useNavigate`, add `const navigate = useNavigate();`, add `openCatalog` copy (`Start learning` / `Bắt đầu học`), and place this primary action beside the existing edit button in the `complete` section:

```tsx
<button
  type="button"
  onClick={() => navigate('/courses')}
  className="mt-6 min-h-14 rounded-[28px] border-4 border-white px-6 text-base font-black text-slate-800"
  style={{ background: colors.mintGreen, boxShadow: shadows.clayGreen }}
>
  {ui.openCatalog}
</button>
```

- [ ] **Step 7: Run focused tests, build, and commit**

```powershell
npm --prefix frontend exec vitest run src/__tests__/pages/CourseList.test.tsx src/__tests__/pages/LearningPathSetup.test.tsx
npm --prefix frontend run build
git add -- frontend/src/features/courses/components/NextMissionCard.tsx frontend/src/pages/CourseList.tsx frontend/src/styles/course-catalog.css frontend/src/pages/LearningPathSetup.tsx frontend/src/__tests__/pages/CourseList.test.tsx frontend/src/__tests__/pages/LearningPathSetup.test.tsx
git commit -m "feat(courses): surface next mission"
```

Expected: focused tests PASS and the build completes.

## Task 3: Replace the flat CourseDetail list with a mission path

**Files:**

- Create: `frontend/src/features/courses/components/MissionLessonSheet.tsx`
- Modify: `frontend/src/features/courses/components/CourseMap.tsx:1-188`
- Modify: `frontend/src/pages/CourseDetail.tsx:1-286`
- Test: `frontend/src/__tests__/pages/CourseDetail.test.tsx`
- Test: `frontend/src/__tests__/features/courses/CourseMap.test.tsx`

**Interfaces:**

- Consumes: `MissionPath`, `MissionUnit`, and `MissionLesson` from Task 1.
- Produces: `CourseMap` with no `useNavigate()` and no hardcoded `/learn-ar`, `/flashcards`, or `/courses` destinations; `CourseDetail` owns the concrete lesson href.

- [ ] **Step 1: Add failing path and route tests**

In `CourseDetail.test.tsx`, mock `courseService.getCourse`, `getProgress`, and `startCourse`, render `/courses/course-1`, and assert:

```tsx
await waitFor(() => expect(screen.getByRole('heading', { name: /course one/i })).toBeVisible());
expect(screen.getByText(/current/i)).toBeVisible();
expect(screen.getByRole('button', { name: /continue/i })).toHaveAttribute('data-lesson-id', 'lesson-2');
expect(screen.getByText(/chặng 1|unit 1/i)).toBeVisible();
```

In `CourseMap.test.tsx`, render two units with completed/current/locked lessons and assert that completed/current nodes are enabled, the locked node has `disabled`, and clicking the current node opens a dialog with one start button.

- [ ] **Step 2: Run the tests and verify the expected failure**

```powershell
npm --prefix frontend exec vitest run src/__tests__/pages/CourseDetail.test.tsx src/__tests__/features/courses/CourseMap.test.tsx
```

Expected: FAIL because the generic page still renders links and `CourseMap` owns navigation internally.

- [ ] **Step 3: Implement the accessible lesson sheet**

Create `MissionLessonSheet.tsx` with this interface and behavior:

```tsx
import React, { useEffect, useRef } from 'react';
import { lessonDescription, lessonTitle } from '@/lib/courseLocale';
import type { Locale } from '@/contexts/LocaleContext';
import type { MissionLesson } from '@/features/courses/missionPath';

type MissionLessonSheetProps = {
  lesson: MissionLesson | null;
  locale: Locale;
  labels: {
    completed: string;
    current: string;
    available: string;
    close: string;
    continue: string;
    start: string;
    review: string;
    locked: string;
    minutes: string;
    activity: string;
    words: string;
    questions: string;
    media: string;
    reward: string;
  };
  onClose: () => void;
  onStart: (lessonId: string) => void;
};

export const MissionLessonSheet: React.FC<MissionLessonSheetProps> = ({ lesson, locale, labels, onClose, onStart }) => {
  const actionRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!lesson) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    actionRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [lesson, onClose]);

  if (!lesson) return null;
  const isLocked = lesson.state === 'locked';
  const actionLabel = isLocked
    ? labels.locked
    : lesson.state === 'completed'
      ? labels.review
      : lesson.state === 'current'
        ? labels.continue
        : labels.start;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-3 sm:items-center" role="presentation" onMouseDown={onClose}>
      <div
        className="w-full max-w-md rounded-[30px] border-4 border-white bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-lesson-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-sky-600">{labels.activity}</p>
            <h2 id="mission-lesson-title" className="mt-1 text-2xl font-black text-slate-800">{lessonTitle(lesson.lesson, locale)}</h2>
          </div>
          <button type="button" className="min-h-11 min-w-11 rounded-full bg-slate-100 text-xl font-black" onClick={onClose} aria-label={labels.close}>×</button>
        </div>
        <p className="mt-2 text-sm font-black text-slate-500">
          {lesson.state === 'completed' ? labels.completed : lesson.state === 'current' ? labels.current : lesson.state === 'locked' ? labels.locked : labels.available}
        </p>
        <p className="mt-3 font-bold text-slate-600">{lessonDescription(lesson.lesson, locale)}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-black text-slate-600">
          <span className="rounded-full bg-amber-50 px-3 py-2">{lesson.lesson.duration_minutes} {labels.minutes}</span>
          <span className="rounded-full bg-sky-50 px-3 py-2">{lesson.summary.primaryActivity?.title || labels.activity}</span>
          <span className="rounded-full bg-violet-50 px-3 py-2">{lesson.summary.wordCount} {labels.words}</span>
          <span className="rounded-full bg-rose-50 px-3 py-2">{lesson.summary.questionCount} {labels.questions}</span>
          {lesson.summary.hasMedia && <span className="rounded-full bg-emerald-50 px-3 py-2">{labels.media}</span>}
          {lesson.lesson.reward && <span className="rounded-full bg-amber-50 px-3 py-2">+{lesson.lesson.reward.xp} {labels.reward}</span>}
        </div>
        <button
          ref={actionRef}
          type="button"
          disabled={isLocked}
          data-lesson-id={lesson.lesson.lesson_id}
          onClick={() => onStart(lesson.lesson.lesson_id)}
          className="mt-5 min-h-12 w-full rounded-[20px] border-4 border-white bg-[#B4E197] px-4 py-3 font-black text-slate-800 shadow-[0_6px_0_#7DC760] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
```

The selected-node trigger must have an accessible name that contains both its state and lesson title (for example, `Continue: Meet the words`). Store the node button's previously focused element before opening the sheet, focus the primary action after opening, and restore the stored element when the sheet closes or unmounts. Escape and backdrop/close-button actions must use the same `onClose` path.

- [ ] **Step 4: Refactor CourseMap into a presentational component**

Replace its private `Lesson`/`Unit` interfaces with the Task 1 types. Use this prop contract:

```ts
export interface CourseMapProps {
  courseName: string;
  units: MissionUnit[];
  locale: Locale;
  labels: {
    unit: string;
    completed: string;
    current: string;
    available: string;
    locked: string;
    close: string;
    continue: string;
    start: string;
    review: string;
    minutes: string;
    activity: string;
    words: string;
    questions: string;
    media: string;
    reward: string;
  };
  onStartLesson: (lessonId: string) => void;
}
```

Keep the zig-zag node layout, but derive colors and labels from `lesson.state`. Make locked nodes disabled and give every node an accessible status label. Remove `useNavigate`, `handleStartLesson`, the “Pass MongoDB-backed units” empty-state text, and all route selection based on `lesson.type`.

Render `MissionLessonSheet` from local selected-node state. Completed nodes open as Review, current nodes open as Continue, available nodes open as Start, and locked nodes remain visibly locked with no navigable action.

Because the presentation chunks are not backend units, derive their heading from `labels.unit` and `unit.unit_index + 1` (for example, `Unit 1` / `Chặng 1`) and show the completed count for that chunk. Each node must expose duration, primary activity, word/question counts, media presence, and reward XP when supplied by its `MissionLesson` summary/lesson data.

- [ ] **Step 5: Integrate the path into CourseDetail**

Import `buildMissionPath` and `CourseMap`. Compute the path after the course/progress state:

```tsx
const missionPath = useMemo(
  () => (course ? buildMissionPath(course, progress) : null),
  [course, progress],
);
```

Change `handleStart` to accept a validated lesson ID and use the existing `startCourse` call before navigating:

```tsx
const handleStart = async (lessonId?: string) => {
  if (!course) return;
  const requestedLessonId = lessonId && course.lessons.some((lesson) => lesson.lesson_id === lessonId)
    ? lessonId
    : undefined;
  const targetLessonId = requestedLessonId || missionPath?.focusLesson?.lesson.lesson_id || course.lessons[0]?.lesson_id;
  if (!targetLessonId) return;
  setIsStarting(true);
  try {
    const nextProgress = await courseService.startCourse(course.course_id, getLearnerId(user?.id));
    setProgress(nextProgress);
    navigate(`/courses/${course.course_id}/lessons/${targetLessonId}`);
  } catch (startError) {
    console.error('[CourseDetail] start error:', startError);
    setError(copy.startError);
  } finally {
    setIsStarting(false);
  }
};
```

Replace the `course.lessons.map()` flat `Link` list with a mission section that renders `CourseMap` using `missionPath.units` and `onStartLesson={(lessonId) => void handleStart(lessonId)}`. Keep the course description, progress summary, and testimonials, but ensure the mission path appears before the testimonial aside on mobile.

Add localized copy for `courseJourney`, `journeyBody`, `startError`, `unit`, `completed`, `current`, `available`, `locked`, `close`, `continue`, `start`, `review`, `minutes`, `activity`, `words`, `questions`, `media`, and `reward`.

- [ ] **Step 6: Run tests, build, and commit**

```powershell
npm --prefix frontend exec vitest run src/__tests__/pages/CourseDetail.test.tsx src/__tests__/features/courses/CourseMap.test.tsx
npm --prefix frontend run build
git add -- frontend/src/features/courses/components/MissionLessonSheet.tsx frontend/src/features/courses/components/CourseMap.tsx frontend/src/pages/CourseDetail.tsx frontend/src/__tests__/pages/CourseDetail.test.tsx frontend/src/__tests__/features/courses/CourseMap.test.tsx
git commit -m "feat(courses): render mission path"
```

Expected: node-state and route tests PASS; the build completes; `CourseMap` contains no unrelated hardcoded destination.

## Task 4: Make lesson steps follow the backend session and canonical activity metadata

**Files:**

- Create: `frontend/src/features/courses/lessonSteps.ts`
- Modify: `frontend/src/features/courses/services/CourseService.ts:21-75`
- Test: `frontend/src/__tests__/features/courses/lessonSteps.test.ts`

**Interfaces:**

- Consumes: `Lesson`, `LessonSession`, `LessonSessionStepState`, and canonical `learning_blocks.activities`.
- Produces: `LessonStepView[]`, `buildLessonStepViews(lesson, session, labels)`, `stepIndexForSession(session, views)`, and `canCompleteLesson(session)` for `LessonPlayer`.

- [ ] **Step 1: Add failing session-order tests**

```ts
import { describe, expect, it } from 'vitest';
import type { Lesson, LessonSession } from '@/features/courses/types';
import { buildLessonStepViews, canCompleteLesson, stepIndexForSession } from '@/features/courses/lessonSteps';

const labels = {
  intro: 'Intro', watch: 'Watch', story: 'Story', game: 'Game', words: 'Words', read: 'Read', say: 'Say', quiz: 'Quiz', finish: 'Finish', unsupported: 'Activity',
};

const baseLesson = {
  lesson_id: 'lesson-1', title: 'Hello', title_vi: 'Xin chao', order: 1, duration_minutes: 5, video_duration: 0,
  images: [], scene_images: [], vocabulary: [], quiz: [], generatedMedia: [],
} as Lesson;

const session = (steps: LessonSession['steps'], current_step_id: string, current_step_index: number) => ({
  session_id: 'session-1', user_id: 'learner-1', course_id: 'course-1', lesson_id: 'lesson-1', status: 'started',
  current_step_id, current_step_index, progress_percent: 0, steps,
}) as LessonSession;

describe('lesson step adapter', () => {
  it('uses canonical server order instead of rebuilding a legacy order in the client', () => {
    const lesson = {
      ...baseLesson,
      vocabulary: [{ word_en: 'word-1' } as Lesson['vocabulary'][number]],
      quiz: [{} as Lesson['quiz'][number]],
      learning_blocks: {
        schema_version: 2,
        content_version: 1,
        vocabulary: ['word-1'],
        activities: [
          { activity_id: 'quiz-activity', type: 'quiz', order: 2, required: true, completion_policy: { mode: 'quiz_complete' } },
          { activity_id: 'words-activity', type: 'learn_vocabulary', order: 1, required: true, completion_policy: { mode: 'all_items' } },
        ],
      },
    } as Lesson;
    const activeSession = session([
      { step_id: 'words-activity', title: 'Words', activity_type: 'learn_vocabulary', activity_order: 1, required: true, status: 'completed', attempts: 1, best_score: 100, passed: true, last_response: {} },
      { step_id: 'quiz-activity', title: 'Quiz', activity_type: 'quiz', activity_order: 2, required: true, status: 'in_progress', attempts: 0, best_score: 0, passed: false, last_response: {} },
    ], 'quiz-activity', 1);

    const views = buildLessonStepViews(lesson, activeSession, labels);
    expect(views.map((view) => view.id)).toEqual(['words-activity', 'quiz-activity', 'finish']);
    expect(views[0].renderer).toBe('words');
    expect(stepIndexForSession(activeSession, views)).toBe(1);
  });

  it('keeps legacy step IDs and appends a non-session finish action when needed', () => {
    const activeSession = session([
      { step_id: 'words', title: 'Words', status: 'completed', attempts: 1, best_score: 100, passed: true, last_response: {} },
      { step_id: 'quiz', title: 'Quiz', status: 'in_progress', attempts: 0, best_score: 0, passed: false, last_response: {} },
    ], 'quiz', 1);

    const views = buildLessonStepViews({ ...baseLesson, quiz: [{ question_id: 'q-1' }] } as Lesson, activeSession, labels);
    expect(views.map((view) => view.id)).toEqual(['words', 'quiz', 'finish']);
    expect(views[2].synthetic).toBe(true);
  });

  it('allows completion only when every required server step is completed', () => {
    const incomplete = session([
      { step_id: 'quiz', title: 'Quiz', required: true, status: 'needs_retry', attempts: 1, best_score: 40, passed: false, last_response: {} },
    ], 'quiz', 0);
    const complete = session([
      { step_id: 'quiz', title: 'Quiz', required: true, status: 'completed', attempts: 1, best_score: 100, passed: true, last_response: {} },
    ], 'quiz', 0);

    expect(canCompleteLesson(incomplete)).toBe(false);
    expect(canCompleteLesson(complete)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

```powershell
npm --prefix frontend exec vitest run src/__tests__/features/courses/lessonSteps.test.ts
```

Expected: FAIL because the adapter module does not exist and session types do not yet include canonical step metadata.

- [ ] **Step 3: Implement the step adapter**

Use this public shape:

```ts
import type {
  Lesson,
  LessonActivityType,
  LessonSession,
} from '@/features/courses/types';

export type LessonRendererKey = 'intro' | 'watch' | 'story' | 'game' | 'words' | 'read' | 'say' | 'quiz' | 'finish' | 'unsupported';

export type LessonStepLabels = Record<LessonRendererKey, string>;

export interface LessonStepView {
  id: string;
  label: string;
  title: string;
  renderer: LessonRendererKey;
  activityType?: LessonActivityType | null;
  synthetic?: boolean;
}

const legacyRenderer: Record<string, LessonRendererKey> = {
  intro: 'intro', watch: 'watch', story: 'story', game: 'game', words: 'words', read: 'read', say: 'say', quiz: 'quiz', finish: 'finish',
};

const canonicalRenderer: Record<LessonActivityType, LessonRendererKey> = {
  warm_up: 'intro',
  learn_vocabulary: 'words',
  listen_choose: 'game',
  match: 'game',
  drag_drop: 'game',
  memory_match: 'game',
  coloring: 'unsupported',
  mini_game: 'game',
  quiz: 'quiz',
  read_aloud: 'read',
  pronunciation: 'say',
};

const hasLegacyRendererData = (lesson: Lesson, renderer: LessonRendererKey) => {
  if (renderer === 'intro') return Boolean(lesson.video_url || lesson.intro_video_url || lesson.images.length || lesson.lesson_media);
  if (renderer === 'watch' || renderer === 'story') return Boolean(lesson.videoLesson || lesson.video_url);
  if (renderer === 'game') return Boolean(lesson.game);
  if (renderer === 'words') return lesson.vocabulary.length > 0;
  if (renderer === 'read') return Boolean(lesson.readAloudStory);
  if (renderer === 'say') return Boolean(lesson.pronunciation);
  if (renderer === 'quiz') return lesson.quiz.length > 0;
  return renderer === 'finish';
};

export const buildLessonStepViews = (lesson: Lesson, session: LessonSession | null, labels: LessonStepLabels): LessonStepView[] => {
  const activityById = new Map((lesson.learning_blocks?.activities || []).map((activity) => [activity.activity_id, activity]));
  const serverSteps = session?.steps || [];
  const views = serverSteps.map((step): LessonStepView => {
    const activity = activityById.get(step.step_id);
    const activityType = activity?.type || step.activity_type || null;
    const renderer = activityType ? canonicalRenderer[activityType] : legacyRenderer[step.step_id] || 'unsupported';
    const usableRenderer = activityType && !hasLegacyRendererData(lesson, renderer) && renderer !== 'finish' ? 'unsupported' : renderer;
    return {
      id: step.step_id,
      label: labels[usableRenderer],
      title: activity?.title || step.title || labels[usableRenderer],
      renderer: usableRenderer,
      activityType,
    };
  });
  if (views.length > 0 && !views.some((view) => view.id === 'finish')) {
    views.push({ id: 'finish', label: labels.finish, title: labels.finish, renderer: 'finish', synthetic: true });
  }
  return views;
};

export const stepIndexForSession = (session: LessonSession | null, views: LessonStepView[]) => {
  if (!views.length) return 0;
  const index = views.findIndex((view) => view.id === session?.current_step_id);
  return index >= 0 ? index : Math.min(session?.current_step_index || 0, views.length - 1);
};

export const canCompleteLesson = (session: LessonSession | null) => {
  if (!session || session.steps.length === 0) return false;
  return session.steps
    .filter((step) => step.step_id !== 'finish' && step.required !== false)
    .every((step) => step.status === 'completed');
};
```

Update `CourseService.completeLesson` to return `Promise<LessonCompletionResult>` and import that type. Do not change the endpoint, request body, or authentication behavior.

Also type `startCourse` as `Promise<UserProgress>` and re-export `LessonCompletionResult` from the compatibility service module so `CourseDetail` and `LessonPlayer` share the same response contract.

- [ ] **Step 4: Run tests and build**

```powershell
npm --prefix frontend exec vitest run src/__tests__/features/courses/lessonSteps.test.ts
npm --prefix frontend run build
```

Expected: all step adapter tests PASS and the build completes.

- [ ] **Step 5: Commit the session adapter change**

```powershell
git add -- frontend/src/features/courses/types.ts frontend/src/features/courses/services/CourseService.ts frontend/src/features/courses/lessonSteps.ts frontend/src/__tests__/features/courses/lessonSteps.test.ts
git commit -m "feat(courses): align lesson steps with session"
```

## Task 5: Wire LessonPlayer to the session adapter and authoritative reward response

**Files:**

- Create: `frontend/src/features/courses/completionPresentation.ts`
- Modify: `frontend/src/pages/LessonPlayer.tsx:20-755,1160-1333`
- Modify: `frontend/src/features/courses/components/CourseLearningBlocks.tsx:18-83,498-528`
- Test: `frontend/src/__tests__/features/courses/completionPresentation.test.ts`

**Interfaces:**

- Consumes: `LessonStepView`, `canCompleteLesson`, and typed `LessonCompletionResult` from Task 4.
- Produces: one active server-approved step at a time; reward popup appears only after successful lesson completion with backend `gamification.xp_earned`.

- [ ] **Step 1: Add failing reward-gating tests**

```ts
import { describe, expect, it } from 'vitest';
import type { Lesson, LessonCompletionResult } from '@/features/courses/types';
import { rewardFromCompletion } from '@/features/courses/completionPresentation';

const lesson = {
  lesson_id: 'lesson-1',
  title: 'Hello',
  title_vi: 'Xin chao',
  order: 1,
  duration_minutes: 5,
  video_duration: 0,
  images: [],
  scene_images: [],
  vocabulary: [],
  quiz: [],
  generatedMedia: [],
  reward: {
    xp: 25,
    sticker: { bucket: 'learnar-assets', path: 'stickers/star.svg', type: 'sticker', status: 'ready' },
    badgeTitle: 'Star learner',
    message_vi: 'Lam tot!',
  },
} as Lesson;

const completion = (xp_earned: number) => ({
  user_id: 'learner-1',
  course_id: 'course-1',
  status: 'started',
  current_lesson_id: 'lesson-2',
  completed_lessons: ['lesson-1'],
  lesson_progress: [],
  total_xp: xp_earned,
  rewards: [],
  gamification: { xp_earned, words_learned: 0, time_mins: 3 },
}) as LessonCompletionResult;

describe('rewardFromCompletion', () => {
  it('uses backend xp for a first completion', () => {
    expect(rewardFromCompletion(lesson, completion(15))?.xp).toBe(15);
  });

  it('does not show a reward for replay or missing reward data', () => {
    expect(rewardFromCompletion(lesson, completion(0))).toBeNull();
    expect(rewardFromCompletion({ ...lesson, reward: null } as Lesson, completion(15))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

```powershell
npm --prefix frontend exec vitest run src/__tests__/features/courses/completionPresentation.test.ts
```

Expected: FAIL because the mapper does not exist.

- [ ] **Step 3: Implement completionPresentation**

```ts
import type { Lesson, LessonCompletionResult, Reward } from '@/features/courses/types';

export const rewardFromCompletion = (
  lesson: Lesson,
  completion: LessonCompletionResult,
): Reward | null => {
  const xp = completion.gamification?.xp_earned || 0;
  if (!lesson.reward || xp <= 0) return null;
  return { ...lesson.reward, xp };
};
```

- [ ] **Step 4: Replace client-rebuilt step order in LessonPlayer**

Import `buildLessonStepViews`, `canCompleteLesson`, `stepIndexForSession`, and `LessonRendererKey`. Replace the `stepOrder` `useMemo` with:

```tsx
const stepLabels = useMemo(() => ({
  intro: copy.intro,
  watch: copy.watch,
  story: copy.story,
  game: copy.game,
  words: copy.words,
  read: copy.read,
  say: copy.say,
  quiz: copy.quiz,
  finish: copy.finish,
  unsupported: copy.unsupportedActivity,
}), [copy]);

const stepViews = useMemo(
  () => lesson ? buildLessonStepViews(lesson, session, stepLabels) : [],
  [lesson, session, stepLabels],
);

const currentStep = stepViews[Math.min(activeStep, Math.max(stepViews.length - 1, 0))];
const currentStepId = currentStep?.id;
const currentSessionStep = currentStepId ? sessionSteps.get(currentStepId) : undefined;
const progress = session?.progress_percent ?? Math.round(((activeStep + 1) / Math.max(stepViews.length, 1)) * 100);
```

Define `const activeServerStepId = () => stepViews[Math.min(activeStep, Math.max(stepViews.length - 1, 0))]?.id;` immediately after these derived values and before the activity handlers. Every handler that persists progress must use `activeServerStepId() || legacyStepId` so a canonical activity ID is preserved even when the renderer is legacy-compatible. Before any render branch reads `currentStep.id` or `currentStep.renderer`, return an alert such as `copy.unsupportedActivity` when `currentStep` is absent.

When loading the session, set the index by ID:

```tsx
setLesson(lessonData);
setSession(sessionData);
setActiveStep(stepIndexForSession(sessionData, buildLessonStepViews(lessonData, sessionData, stepLabels)));
```

After every `submitLessonStep` response, use `stepIndexForSession(nextSession, stepViews)` rather than assuming the client-created array has the same index.

Update every handler that currently calls `saveStepProgress('watch' | 'game' | 'words' | 'read' | 'say' | 'quiz')` to pass `currentStepId || legacyId`. This preserves the backend activity ID when the session uses canonical activities. Change `stepContentMap` to use `view.renderer`, not `view.id`.

Add an `UnsupportedActivityCard` branch for `renderer === 'unsupported'` with a retry/back-to-course action and no completion callback. Do not mark unsupported required content passed.

Canonical activities are metadata-first in this slice: use their ordered IDs, types, and titles for the session view and lesson summaries, and reuse an existing legacy renderer only when its lesson content is present. If a canonical activity has no supported hydrated content in the current payload, render the explicit unsupported state, keep that step incomplete, and do not add a new hydration endpoint or silently skip it. Full canonical activity hydration UI remains outside this no-API-change slice.

Keep the existing correct/incorrect feedback and retry controls for legacy renderers, and add an `aria-live="polite"` status near the lesson progress indicator so a completed step announces its updated progress without making the whole activity region live.

- [ ] **Step 5: Gate completion and reward on the backend response**

Add localized copy `unsupportedActivity`, `completionRequired`, and `nextMission`. Change `handleQuizSubmit` so a passing quiz updates quiz feedback but does not open the reward popup. Change `handleFinishLesson` to:

```tsx
const handleFinishLesson = async () => {
  if (!courseId || !lessonId || !lesson || !canCompleteLesson(session)) {
    setNotice(copy.completionRequired);
    return;
  }
  setIsSubmitting(true);
  try {
    const completion = await courseService.completeLesson(courseId, lessonId, learnerId, {
      score: result?.score || 100,
      timeSpent: sessionStartTime > 0 ? Math.ceil((Date.now() - sessionStartTime) / 60000) : 0,
      wordsLearned: lesson.vocabulary
        .filter((item) => wordPractice[normalizeKey(item.word_en)]?.passed)
        .map((item) => item.word_en),
      pronunciationScores: Object.fromEntries(
        Object.entries(sayPractice)
          .filter(([, practice]) => practice?.passed)
          .map(([word, practice]) => [word, practice.score]),
      ),
      gamesPlayed: session?.steps.some((step) => step.step_id === 'game' && step.passed) ? 1 : 0,
    });

    setNextMissionLessonId(
      completion.current_lesson_id && completion.current_lesson_id !== lessonId
        ? completion.current_lesson_id
        : null,
    );
    setSession((current) => current ? { ...current, status: 'completed', progress_percent: 100 } : current);
    const finishStep = session?.steps.find((step) => step.step_id === 'finish');
    if (finishStep && finishStep.status !== 'completed') {
      await saveStepProgress('finish', {
        passed: true,
        score: result?.score || 100,
        attemptType: 'lesson_complete',
        responseData: { completed_via: 'lesson_complete', step_complete: true },
      });
    }
    const authoritativeReward = rewardFromCompletion(lesson, completion);
    if (authoritativeReward) setReward(authoritativeReward);
    setNotice(copy.stepSaved);
  } catch (finishError) {
    console.error('[LessonPlayer] finish error:', finishError);
    setError(copy.completionError);
  } finally {
    setIsSubmitting(false);
  }
};
```

Add `const [nextMissionLessonId, setNextMissionLessonId] = useState<string | null>(null);`. After `completeLesson` resolves, set it only when `completion.current_lesson_id` exists and differs from the completed `lessonId`; otherwise clear it. Do not derive this value from the local lesson array or infer a next ID on the client.

If `finish` is synthetic, do not submit a fake finish step; the completion endpoint is the only completion mutation. Change the finish button condition from `!result?.passed` to `!canCompleteLesson(session)` so lessons without a quiz can complete after all required activities pass.

- [ ] **Step 6: Add optional Next Mission action to RewardPopup**

Extend the prop type without breaking its current caller:

```tsx
export const RewardPopup: React.FC<{
  reward: Reward;
  onClose: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}> = ({ reward, onClose, onContinue, continueLabel }) => {
```

Render `onContinue` as a second full-width button after the existing close button. In `LessonPlayer`, pass a callback that navigates to the backend-returned `current_lesson_id` when it differs from the completed lesson; otherwise navigate to `/courses/${courseId}`. The reward popup must remain closable when no next lesson exists.

Pass the optional continuation action from `LessonPlayer`:

```tsx
<RewardPopup
  reward={reward}
  onClose={() => setReward(null)}
  onContinue={() => {
    setReward(null);
    navigate(nextMissionLessonId ? `/courses/${courseId}/lessons/${nextMissionLessonId}` : `/courses/${courseId}`);
  }}
  continueLabel={copy.nextMission}
/>
```

The callback must use the validated state set from the completion response. Always show this secondary action after a successful completion: it opens the returned next lesson when one exists and otherwise returns to the course path, while the close action remains available.

- [ ] **Step 7: Run focused tests, build, and commit**

```powershell
npm --prefix frontend exec vitest run src/__tests__/features/courses/completionPresentation.test.ts src/__tests__/features/courses/lessonSteps.test.ts
npm --prefix frontend run build
git add -- frontend/src/features/courses/completionPresentation.ts frontend/src/pages/LessonPlayer.tsx frontend/src/features/courses/components/CourseLearningBlocks.tsx frontend/src/__tests__/features/courses/completionPresentation.test.ts
git commit -m "feat(lessons): drive activity progress from session"
```

Expected: focused tests PASS, the build completes, and no reward is displayed for a completion response with `xp_earned: 0`.

## Task 6: Add generic mobile browser coverage and run regression gates

**Files:**

- Create: `frontend/tests/e2e/adaptive-course-path.spec.ts`
- Modify: `frontend/src/__tests__/pages/CourseList.test.tsx` only if the final selector/card labels require fixture updates.

**Interfaces:**

- Consumes: the public routes `/courses`, `/courses/:courseId`, and `/courses/:courseId/lessons/:lessonId`; existing API contracts mocked at the network boundary.
- Produces: deterministic mobile-browser evidence for new learner, returning learner, path node, session resume, completion, and overflow behavior.

- [ ] **Step 1: Add a deterministic Playwright fixture**

Use `page.addInitScript` for guest mode and route only the generic course endpoints. Keep the existing Animals tests untouched. The critical setup should follow this shape:

```ts
import { test, expect } from '@playwright/test';

const course = {
  course_id: 'course-family',
  title: 'Momo Family',
  subtitle_vi: 'Gia dinh',
  theme: 'Home and Family',
  category_key: 'home_family',
  category_label: 'Home and Family',
  category_icon: 'HF',
  age_range: '5-8',
  level: 'beginner',
  description_vi: 'Family words',
  catalogPreview: [],
  studentTestimonials: [],
  lessons: [
    { lesson_id: 'lesson-1', title: 'Hello family', title_vi: 'Xin chao gia dinh', order: 1, duration_minutes: 5, video_duration: 0, images: [], scene_images: [], vocabulary: [], quiz: [], generatedMedia: [] },
    { lesson_id: 'lesson-2', title: 'Meet the words', title_vi: 'Gap tu moi', order: 2, duration_minutes: 5, video_duration: 0, images: [], scene_images: [], vocabulary: [], quiz: [], generatedMedia: [] },
    { lesson_id: 'lesson-3', title: 'Say it aloud', title_vi: 'Noi that ro', order: 3, duration_minutes: 5, video_duration: 0, images: [], scene_images: [], vocabulary: [], quiz: [], generatedMedia: [] },
    { lesson_id: 'lesson-4', title: 'Play the quiz', title_vi: 'Choi quiz', order: 4, duration_minutes: 5, video_duration: 0, images: [], scene_images: [], vocabulary: [], quiz: [], generatedMedia: [] },
  ],
  is_published: true,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('guestMode', 'true'));
  await page.route('**/api/v1/courses', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([course]) }));
  await page.route('**/api/v1/users/guest-learner/progress', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ user_id: 'guest-learner', course_id: 'course-family', status: 'started', current_lesson_id: 'lesson-2', completed_lessons: ['lesson-1'], lesson_progress: [], total_xp: 10, rewards: [] }]) }));
  await page.route('**/api/v1/courses/course-family', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(course) }));
});

test('continues the current mission and renders the mobile course path', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/courses');
  await expect(page.getByTestId('next-mission-card')).toContainText('Meet the words');
  await page.getByRole('button', { name: /continue mission/i }).click();
  await expect(page).toHaveURL(/\/courses\/course-family\/lessons\/lesson-2/);
});

test('does not overflow horizontally on the catalog or course path', async ({ page }) => {
  await page.setViewportSize({ width: 428, height: 926 });
  await page.goto('/courses');
  await page.goto('/courses/course-family');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
```

Add route fixtures for lesson and session responses before adding the completion assertion. The session fixture must contain `current_step_id`, `current_step_index`, `steps`, and an optional `finish` step so the test covers the actual resume contract.

- [ ] **Step 2: Run the new E2E spec at mobile and desktop projects**

```powershell
npm --prefix frontend exec playwright test tests/e2e/adaptive-course-path.spec.ts --project="Mobile Safari"
npm --prefix frontend exec playwright test tests/e2e/adaptive-course-path.spec.ts --project=chromium
```

Expected: both projects PASS, the mission CTA reaches the concrete lesson URL, and the document width does not exceed the viewport.

- [ ] **Step 3: Run frontend regression gates**

```powershell
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test
```

Expected: lint, typecheck/build, and the full Vitest suite PASS. Existing course catalog and Animals tests must remain green.

- [ ] **Step 4: Run focused backend contract/gamification regressions**

```powershell
python -m pytest -q backend/tests/test_course_start.py backend/tests/test_lesson_activity_contract.py backend/tests/test_vocabulary_activity_contract.py backend/tests/test_quiz_activity_contract.py backend/tests/test_mini_game_activity_contract.py backend/tests/test_course_service_gamification.py backend/tests/test_gamification_idempotency.py
```

Expected: all selected backend tests PASS without source changes. If the local Python environment uses a project-specific runner, use that runner for the same explicit test paths.

- [ ] **Step 5: Perform runtime verification in the running web app**

Start the frontend with the existing proxy configuration:

```powershell
npm --prefix frontend run dev -- --host 0.0.0.0
```

Exercise this sequence in a browser at 375px and 428px:

1. Open `/courses` and confirm the Next Mission card is above the course cards.
2. Select a priority topic in `/learning-path`, save, tap `Start learning`, and confirm `/courses` ranks a matching course.
3. Tap Continue and confirm the concrete course/lesson URL.
4. Complete a lesson through the existing session flow and confirm reward XP equals backend `gamification.xp_earned`.
5. Return to the course path and confirm the next node is current/available and progress changed.
6. Tap a completed lesson and confirm Review does not create a second reward.
7. Enable reduced motion and confirm the path remains readable and functional.

Capture the URL, viewport, API responses, and a screenshot for the final handoff. A desktop-only screenshot is not sufficient for release acceptance.

- [ ] **Step 6: Commit the verification artifact and final implementation state**

```powershell
git add -- frontend/tests/e2e/adaptive-course-path.spec.ts
git commit -m "test(courses): cover adaptive path on mobile"
```

Only add files belonging to this feature. Preserve unrelated pre-existing untracked files in the workspace.

## Final self-review checklist

- [ ] Every spec section maps to a task: catalog Next Mission, learning-path handoff, course mission path, activity summaries, session-driven lesson steps, feedback/retry, backend-authoritative reward, accessibility, tests, and mobile runtime verification.
- [ ] Placeholder scan completes with no forbidden marker matches in the plan.
- [ ] Types match across `missionPath.ts`, `lessonSteps.ts`, `CourseMap`, `CourseDetail`, and `LessonPlayer`.
- [ ] No task changes a FastAPI route or persistence model.
- [ ] No client code calls legacy `add-xp` or fabricates authoritative progress.
- [ ] Locked nodes are presentation-only and direct lesson URLs remain backend validated.
- [ ] Existing Animals Adventure behavior and tests are preserved.
- [ ] The final handoff reports CODE_VERIFIED, RUNTIME_VERIFIED, and DEVICE_BROWSER_VERIFIED separately.
