/** Source-contract tests for the CourseDetail start and resume flow. */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const screenSource = readFileSync(
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/screens/CourseDetailScreen.tsx',
  'utf-8',
);
const hookSource = readFileSync(
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/hooks/useCourseDetail.ts',
  'utf-8',
);

describe('CourseDetail enrollment/start flow', () => {
  it('loads the current course progress from the authenticated user', () => {
    assert.ok(screenSource.includes('const { userId, stats, loading: userLoading } = useUser();'));
    assert.ok(screenSource.includes('useCourseDetail(courseId, userId)'));
    assert.ok(hookSource.includes('const response = await coursesApi.getProgress(userId);'));
    assert.ok(hookSource.includes('item.course_id === courseId'));
  });

  it('uses the authenticated user id when starting the course', () => {
    assert.ok(screenSource.includes('await coursesApi.startCourse(course.course_id, userId);'));
    assert.ok(screenSource.includes('if (!course || !userId)'));
  });

  it('derives completed lessons from server progress and preserves the resume target', () => {
    assert.ok(screenSource.includes('new Set(progress?.completed_lessons ?? [])'));
    assert.ok(screenSource.includes('nextProgress.current_lesson_id ?? lessons[0]?.lesson_id'));
    assert.ok(screenSource.includes('lessons.find((l) => l.lesson_id === target) ?? lessons[0]'));
  });

  it('prevents duplicate starts while a start or progress request is pending', () => {
    assert.ok(screenSource.includes('disabled={isStarting || userLoading || progressLoading || Boolean(progressError)}'));
    assert.ok(screenSource.includes('onPress={() => void handleStartCourse()}'));
  });

  it('re-fetches authoritative progress when returning to the detail screen', () => {
    assert.ok(screenSource.includes('useFocusEffect('));
    assert.ok(screenSource.includes('void refreshProgress();'));
  });

  it('does not enable the CTA after a progress-read failure', () => {
    assert.ok(hookSource.includes("setProgressError('Failed to load course progress');"));
    assert.ok(screenSource.includes('Boolean(progressError)'));
  });
});
