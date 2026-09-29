/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Course, Lesson, UserProgress } from '@/types/course';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'learner-1' }, isGuest: false }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'en', setLocale: vi.fn() }),
}));

vi.mock('@/services/CourseService', () => ({
  courseService: {
    listCourses: vi.fn().mockResolvedValue([]),
    getProgress: vi.fn().mockResolvedValue([]),
    generateSampleCourse: vi.fn(),
  },
}));

vi.mock('@/services/LearningPathService', () => ({
  learningPathService: { get: vi.fn().mockResolvedValue(null) },
}));

import { CourseList } from '@/pages/CourseList';
import { courseService } from '@/services/CourseService';

const lesson: Lesson = {
  lesson_id: 'meet-family', title: 'Meet my family', title_vi: 'Gia đình của bé', order: 1,
  duration_minutes: 5, video_duration: 0, images: [], scene_images: [], vocabulary: [], quiz: [], generatedMedia: [],
};

const liveCourse: Course = {
  course_id: 'family-live', title: 'Family at Home', subtitle_vi: 'Gia đình của bé', theme: 'family',
  category_key: 'home_family', category_label: 'Home and Family', category_icon: 'home', age_range: '5-7',
  level: 'beginner', description_vi: 'Cùng học về gia đình', catalogPreview: [], studentTestimonials: [],
  lessons: [lesson, { ...lesson, lesson_id: 'rooms', order: 2 }], is_published: true,
};

function LocationProbe() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

function renderCatalog() {
  render(<MemoryRouter initialEntries={['/courses']}>
    <Routes>
      <Route path="/courses" element={<CourseList />} />
      <Route path="/courses/:courseId" element={<p>Choose a lesson</p>} />
      <Route path="/courses/:courseId/lessons/:lessonId" element={<p>Lesson player</p>} />
    </Routes>
    <LocationProbe />
  </MemoryRouter>);
}

describe('CourseList', () => {
  beforeEach(() => {
    vi.mocked(courseService.listCourses).mockResolvedValue([]);
    vi.mocked(courseService.getProgress).mockResolvedValue([]);
  });

  it('keeps the catalog hero, progress overview, and learning paths available in the redesigned layout', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/courses']}>
        <CourseList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Course Catalog' }).length).toBeGreaterThan(0);
    });

    expect(container.querySelector('.course-catalog__hero-stage')).toBeTruthy();
    expect(screen.getByLabelText('Course progress overview')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your Topics' })).toBeTruthy();
    expect(screen.getByText('Momo Learns English at Home')).toBeTruthy();
  });

  it.each([
    { name: 'new course', completedLessons: [], status: 'started', action: 'Start learning' },
    { name: 'incomplete course', completedLessons: ['meet-family'], status: 'started', action: 'Continue learning' },
    { name: 'completed course', completedLessons: ['meet-family', 'rooms'], status: 'completed', action: 'Continue learning' },
  ] as const)('opens the lesson list from the $name catalog CTA', async ({ completedLessons, status, action }) => {
    vi.mocked(courseService.listCourses).mockResolvedValue([liveCourse]);
    const progress: UserProgress = {
      user_id: 'learner-1', course_id: 'family-live', status, current_lesson_id: 'rooms',
      completed_lessons: [...completedLessons], lesson_progress: [], total_xp: 80, rewards: [],
    };
    vi.mocked(courseService.getProgress).mockResolvedValue([progress]);
    renderCatalog();

    fireEvent.click(await screen.findByRole('button', { name: action }));

    expect(screen.getByLabelText('Current route').textContent).toBe('/courses/family-live');
    expect(screen.getByText('Choose a lesson')).toBeDefined();
  });

  it('opens the same lesson list when the learner taps the course card', async () => {
    vi.mocked(courseService.listCourses).mockResolvedValue([liveCourse]);
    renderCatalog();

    fireEvent.click(await screen.findByRole('link'));

    expect(screen.getByLabelText('Current route').textContent).toBe('/courses/family-live');
  });
});
