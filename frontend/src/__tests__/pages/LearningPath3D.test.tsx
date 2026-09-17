/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { LessonNode, LearningPathMeResponse } from '@/types/learning-path';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/usePets', () => ({
  usePets: () => ({ activePet: null }),
}));

const getLearningPathMe = vi.fn();
vi.mock('@/services/apiClient', () => ({
  apiClient: { getLearningPathMe: (...args: unknown[]) => getLearningPathMe(...args) },
}));

vi.mock('@/features/learning-path/components/LearningPathScene', () => ({
  LearningPathScene: ({
    nodes,
    onNodeSelect,
    categoryKey,
  }: {
    nodes: LessonNode[];
    onNodeSelect: (n: LessonNode) => void;
    categoryKey?: string | null;
  }) => (
    <div data-testid="scene" data-category={categoryKey ?? ''}>
      {nodes.map((n) => (
        <button key={n.lesson_id} onClick={() => onNodeSelect(n)}>
          node:{n.lesson_id}:{n.state}
        </button>
      ))}
    </div>
  ),
}));

import { LearningPath3D } from '@/pages/LearningPath3D';
import { useLearningPath3DStore } from '@/hooks/useLearningPath3D';

function node(overrides: Partial<LessonNode>): LessonNode {
  const lessonId = overrides.lesson_id ?? 'l1';
  return {
    lesson_id: lessonId,
    order: 1,
    title: 'Lesson 1',
    state: 'available',
    xp_reward: 80,
    position: 0,
    launch_path: `/courses/nature/lessons/${lessonId}`,
    ...overrides,
  };
}

function response(overrides: Partial<LearningPathMeResponse> = {}): LearningPathMeResponse {
  const nodes = [
    node({ lesson_id: 'l1', order: 1, state: 'completed', position: 0 }),
    node({ lesson_id: 'l2', order: 2, state: 'current', position: 0.5 }),
    node({ lesson_id: 'l3', order: 3, state: 'locked', position: 1 }),
  ];
  return {
    joined_courses: [
      {
        course_id: 'nature',
        title: 'Nature',
        category_key: 'nature',
        category_label: 'Nature',
        category_icon: 'Nature',
        progress: 0.33,
        completed_lessons: 1,
        total_lessons: 3,
        is_current: true,
      },
    ],
    selected_course: {
      course_id: 'nature',
      title: 'Nature',
      category_key: 'nature',
      category_label: 'Nature',
      category_icon: 'Nature',
      progress: 0.33,
      completed_lessons: 1,
      total_lessons: 3,
      is_current: true,
    },
    path: {
      current_lesson_id: 'l2',
      completed_count: 1,
      total_count: 3,
      progress: 0.33,
      nodes,
    },
    ...overrides,
  };
}

function renderPage(initialEntry = '/learning-path-3d') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/learning-path-3d" element={<LearningPath3D />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getLearningPathMe.mockReset();
  mockNavigate.mockReset();
  useLearningPath3DStore.getState().reset();
});

describe('LearningPath3D', () => {
  it('shows a loading state before the fetch resolves', () => {
    getLearningPathMe.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading your path/i)).toBeTruthy();
  });

  it('renders the real path nodes on success, not demo data', async () => {
    getLearningPathMe.mockResolvedValue(response());
    renderPage();

    await waitFor(() => expect(screen.getByTestId('scene')).toBeTruthy());
    expect(screen.getByText('node:l1:completed')).toBeTruthy();
    expect(screen.getByText('node:l2:current')).toBeTruthy();
    expect(screen.getByText('node:l3:locked')).toBeTruthy();
    expect(screen.queryByText(/hello/i)).toBeNull(); // no DEMO_NODES leakage
  });

  it('shows the empty state with a catalog CTA when zero courses are joined', async () => {
    getLearningPathMe.mockResolvedValue({ joined_courses: [], selected_course: null, path: null });
    renderPage();

    await waitFor(() => expect(screen.getByText(/haven't joined any courses/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /explore courses/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses');
  });

  it('shows a retryable error state on API failure, never demo fallback data', async () => {
    getLearningPathMe.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    await waitFor(() => expect(screen.getByText(/unable to load your learning path/i)).toBeTruthy());
    expect(screen.queryByTestId('scene')).toBeNull();

    getLearningPathMe.mockResolvedValueOnce(response());
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByTestId('scene')).toBeTruthy());
    expect(getLearningPathMe).toHaveBeenCalledTimes(2);
  });

  it('does not open the modal for a locked node', async () => {
    getLearningPathMe.mockResolvedValue(response());
    renderPage();
    await waitFor(() => screen.getByTestId('scene'));

    fireEvent.click(screen.getByText('node:l3:locked'));
    expect(screen.queryByText(/complete more lessons/i)).toBeNull();
  });

  it('opens the modal for the current node and navigates to launch_path on Continue', async () => {
    getLearningPathMe.mockResolvedValue(response());
    renderPage();
    await waitFor(() => screen.getByTestId('scene'));

    fireEvent.click(screen.getByText('node:l2:current'));
    const continueButton = await screen.findByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    expect(mockNavigate).toHaveBeenCalledWith('/courses/nature/lessons/l2');
  });

  it('shows Review for a completed node', async () => {
    getLearningPathMe.mockResolvedValue(response());
    renderPage();
    await waitFor(() => screen.getByTestId('scene'));

    fireEvent.click(screen.getByText('node:l1:completed'));
    expect(await screen.findByRole('button', { name: /review/i })).toBeTruthy();
  });

  it('renders a course selector only when multiple courses are joined', async () => {
    const multi = response();
    multi.joined_courses.push({
      course_id: 'school-food',
      title: 'School & Food',
      category_key: 'school_food',
      category_label: 'School & Food',
      category_icon: 'School',
      progress: 0,
      completed_lessons: 0,
      total_lessons: 4,
      is_current: false,
    });
    getLearningPathMe.mockResolvedValue(multi);
    renderPage();

    await waitFor(() => screen.getByTestId('scene'));
    expect(screen.getByRole('tablist', { name: /joined courses/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Nature' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'School & Food' })).toBeTruthy();
  });

  it('does not render a course selector for a single joined course', async () => {
    getLearningPathMe.mockResolvedValue(response());
    renderPage();
    await waitFor(() => screen.getByTestId('scene'));
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('refetches with the course_id query param when switching courses', async () => {
    const multi = response();
    multi.joined_courses.push({
      course_id: 'school-food',
      title: 'School & Food',
      category_key: 'school_food',
      category_label: 'School & Food',
      category_icon: 'School',
      progress: 0,
      completed_lessons: 0,
      total_lessons: 4,
      is_current: false,
    });
    getLearningPathMe.mockResolvedValue(multi);
    renderPage();
    await waitFor(() => screen.getByTestId('scene'));

    getLearningPathMe.mockClear();
    fireEvent.click(screen.getByRole('tab', { name: 'School & Food' }));

    await waitFor(() => expect(getLearningPathMe).toHaveBeenCalledWith('school-food'));
  });

  it('reads course_id from the URL on initial load', async () => {
    getLearningPathMe.mockResolvedValue(response());
    renderPage('/learning-path-3d?course_id=nature');

    await waitFor(() => expect(getLearningPathMe).toHaveBeenCalledWith('nature'));
  });

  it('passes the selected course category_key to the scene as presentation-only data', async () => {
    getLearningPathMe.mockResolvedValue(response());
    renderPage();

    await waitFor(() => expect(screen.getByTestId('scene').dataset.category).toBe('nature'));
  });

  it('closes any open lesson modal from the previous course when switching courses', async () => {
    const multi = response();
    const schoolFoodSummary = {
      course_id: 'school-food',
      title: 'School & Food',
      category_key: 'school_food',
      category_label: 'School & Food',
      category_icon: 'School',
      progress: 0,
      completed_lessons: 0,
      total_lessons: 1,
      is_current: false,
    };
    multi.joined_courses.push(schoolFoodSummary);
    const schoolFood: LearningPathMeResponse = {
      joined_courses: multi.joined_courses,
      selected_course: schoolFoodSummary,
      path: {
        current_lesson_id: 'b1',
        completed_count: 0,
        total_count: 1,
        progress: 0,
        nodes: [node({ lesson_id: 'b1', order: 1, state: 'current', position: 0 })],
      },
    };
    getLearningPathMe.mockResolvedValue(multi);
    renderPage();
    await waitFor(() => screen.getByTestId('scene'));

    fireEvent.click(screen.getByText('node:l2:current'));
    await screen.findByRole('button', { name: /continue/i });

    getLearningPathMe.mockResolvedValue(schoolFood);
    fireEvent.click(screen.getByRole('tab', { name: 'School & Food' }));

    await waitFor(() => expect(screen.getByTestId('scene').dataset.category).toBe('school_food'));
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull();
  });
});
