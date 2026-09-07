/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/features/pets/components/CodexPetSprite', () => ({
  CodexPetSprite: ({ label }: { label: string }) => <div aria-label={label} />,
}));

import { CourseMissionPath } from '@/features/courses/components/CourseMissionPath';
import type { Lesson, UserProgress } from '@/types/course';

afterEach(cleanup);

const lessons = [
  { lesson_id: 'lesson-one', title: 'First mission', title_vi: '', order: 1 },
  { lesson_id: 'lesson-two', title: 'Second mission', title_vi: '', order: 2 },
  { lesson_id: 'lesson-three', title: 'Third mission', title_vi: '', order: 3 },
] as Lesson[];

const progress: UserProgress = {
  user_id: 'learner',
  course_id: 'course-1',
  status: 'started',
  current_lesson_id: 'lesson-two',
  completed_lessons: ['lesson-one'],
  lesson_progress: [],
  total_xp: 10,
  rewards: [],
};

describe('CourseMissionPath', () => {
  it('sequences completed, current, and locked lessons while only opening eligible lessons', () => {
    const onLessonOpen = vi.fn();

    render(
      <CourseMissionPath
        lessons={lessons}
        progress={progress}
        locale="en"
        onLessonOpen={onLessonOpen}
      />,
    );

    expect(screen.getByRole('button', { name: /First mission.*completed/i }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: /Second mission.*current/i }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('Third mission — Locked')).toBeTruthy();
    expect(screen.getByLabelText('Lexi guides your next mission')).toBeTruthy();
    expect(screen.getByLabelText('Lexi waits at the current mission')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /First mission.*completed/i }));
    fireEvent.click(screen.getByRole('button', { name: /Second mission.*current/i }));

    expect(onLessonOpen).toHaveBeenNthCalledWith(1, 'lesson-one');
    expect(onLessonOpen).toHaveBeenNthCalledWith(2, 'lesson-two');
    expect(onLessonOpen).toHaveBeenCalledTimes(2);
  });

  it('falls back to the first unfinished lesson when progress points at an invalid lesson', () => {
    const onLessonOpen = vi.fn();

    render(
      <CourseMissionPath
        lessons={lessons}
        progress={{ ...progress, current_lesson_id: 'stale-lesson' }}
        locale="en"
        onLessonOpen={onLessonOpen}
      />,
    );

    expect(screen.getByRole('button', { name: /Second mission.*current/i }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('Third mission — Locked')).toBeTruthy();
  });
});
