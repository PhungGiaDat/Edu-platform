/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isGuest: true }),
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

vi.mock('@/components/CourseCard', () => ({
  CourseCard: ({ course }: { course: { title: string } }) => <article>{course.title}</article>,
}));

import { CourseList } from '@/pages/CourseList';

describe('CourseList', () => {
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
    expect(screen.getByRole('heading', { name: 'Your Learning Paths' })).toBeTruthy();
    expect(screen.getByText('Momo Learns English at Home')).toBeTruthy();
  });
});
