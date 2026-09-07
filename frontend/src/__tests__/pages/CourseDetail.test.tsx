/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { courseService } = vi.hoisted(() => ({ courseService: {
  getCourse: vi.fn(),
  getProgress: vi.fn(),
  startCourse: vi.fn(),
} }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'learner-1' } }),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

vi.mock('@/services/CourseService', () => ({ courseService }));

vi.mock('@/features/courses/components/CourseLearningBlocks', () => ({
  AssetTile: () => <div />,
}));

vi.mock('@/features/courses/components/CourseMissionPath', () => ({
  CourseMissionPath: () => <div>Mission path</div>,
}));

vi.mock('@/features/courses/components/CourseExploreRail', () => ({
  CourseExploreRail: ({ cards }: { cards: Array<{ id: string }> }) => <div data-testid="course-explore">{cards.map((card) => card.id).join(',')}</div>,
}));

vi.mock('@/features/courses/components/CourseWarmupChallenge', () => ({
  CourseWarmupChallenge: ({ questions }: { questions: Array<{ question_id: string }> }) => (
    <div data-testid="course-warmup">{questions.map((question) => question.question_id).join(',')}</div>
  ),
}));

vi.mock('@/features/pets/components/CodexPetSprite', () => ({
  CodexPetSprite: ({ label }: { label: string }) => <div aria-label={label} />,
}));

import { CourseDetail } from '@/pages/CourseDetail';
import type { Course } from '@/types/course';

const course = {
  course_id: 'mission-test-course',
  title: 'Mission Course',
  subtitle_vi: '',
  theme: 'Mission',
  category_key: 'mission',
  category_label: 'Mission',
  category_icon: 'MS',
  age_range: '5-8',
  level: 'beginner',
  description_vi: '',
  catalogPreview: [],
  studentTestimonials: [],
  enrollmentCta: { headline: 'Ready?', body: 'Go!', buttonLabel: 'Start mission' },
  lessons: [{ lesson_id: 'lesson-one', title: 'First mission', title_vi: '', order: 1, duration_minutes: 5, video_duration: 0, vocabulary: [], quiz: [], images: [], scene_images: [], generatedMedia: [] }],
  is_published: true,
} satisfies Course;

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe('CourseDetail', () => {
  it('offers authored warm-up questions without changing the existing course launch action', async () => {
    courseService.getCourse.mockResolvedValue({
      ...course,
      lessons: [{
        ...course.lessons[0],
        quiz: [{
          question_id: 'warmup-cat', type: 'image_choice', prompt_vi: 'Con nao la con meo?', questionAudioText: '',
          options: [{ option_id: 'cat', label: 'Con meo' }, { option_id: 'fish', label: 'Con ca' }],
          correctOptionId: 'cat', feedbackCorrect: 'Dung roi', feedbackIncorrect: 'Thu lai',
        }],
      }],
    });
    courseService.getProgress.mockResolvedValue([]);

    render(<MemoryRouter initialEntries={['/courses/mission-test-course']}><Routes><Route path="/courses/:id" element={<CourseDetail />} /></Routes></MemoryRouter>);

    expect((await screen.findByTestId('course-warmup')).textContent).toBe('warmup-cat');
    expect(courseService.startCourse).not.toHaveBeenCalled();
  });

  it('keeps the course launch action when no safe warm-up question exists', async () => {
    courseService.getCourse.mockResolvedValue(course);
    courseService.getProgress.mockResolvedValue([]);

    render(<MemoryRouter initialEntries={['/courses/mission-test-course']}><Routes><Route path="/courses/:id" element={<CourseDetail />} /></Routes></MemoryRouter>);

    await screen.findByRole('button', { name: 'Start mission' });
    expect(screen.queryByTestId('course-warmup')).toBeNull();
  });

  it('introduces Lexi as the course guide in the hero', async () => {
    courseService.getCourse.mockResolvedValue(course);
    courseService.getProgress.mockResolvedValue([]);

    render(<MemoryRouter initialEntries={['/courses/mission-test-course']}><Routes><Route path="/courses/:id" element={<CourseDetail />} /></Routes></MemoryRouter>);

    expect(await screen.findByLabelText('Lexi guides your next lesson')).toBeTruthy();
  });

  it('interleaves authored discovery cards without changing course progress', async () => {
    courseService.getCourse.mockResolvedValue({
      ...course,
      lessons: [{
        ...course.lessons[0],
        game: { game_id: 'find-one', type: 'find_picture', instruction_vi: 'Tim hinh', prompt_audio_text: '', items: [], feedback_positive_vi: '' },
      }],
    });
    courseService.getProgress.mockResolvedValue([]);

    render(<MemoryRouter initialEntries={['/courses/mission-test-course']}><Routes><Route path="/courses/:id" element={<CourseDetail />} /></Routes></MemoryRouter>);

    expect((await screen.findByTestId('course-explore')).textContent).toBe('lesson-one:game');
    expect(courseService.startCourse).not.toHaveBeenCalled();
  });

  it('renders a course trailer only after its storage asset is ready', async () => {
    courseService.getCourse.mockResolvedValue({
      ...course,
      courseTrailer: {
        title: 'Lexi trailer', duration_seconds: 45, captions_vi: 'Cùng bắt đầu nhé!', autoplay: false,
        asset: { bucket: 'learnar-assets', path: 'courses/demo/trailer.mp4', type: 'video', status: 'ready' },
      },
    });
    courseService.getProgress.mockResolvedValue([]);
    render(<MemoryRouter initialEntries={['/courses/mission-test-course']}><Routes><Route path="/courses/:id" element={<CourseDetail />} /></Routes></MemoryRouter>);
    expect((await screen.findByLabelText('Lexi trailer')).getAttribute('controls')).not.toBeNull();
  });

  it('uses the existing start flow before launching the next lesson', async () => {
    courseService.getCourse.mockResolvedValue(course);
    courseService.getProgress.mockResolvedValue([]);
    courseService.startCourse.mockResolvedValue({
      course_id: course.course_id,
      current_lesson_id: 'lesson-one',
      completed_lessons: [],
    });

    render(
      <MemoryRouter initialEntries={['/courses/mission-test-course']}>
        <Routes>
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('button', { name: 'Start mission' });
    fireEvent.click(screen.getByRole('button', { name: 'Start mission' }));

    await waitFor(() => {
      expect(courseService.startCourse).toHaveBeenCalledWith('mission-test-course', 'learner-1');
      expect(screen.getByTestId('location').textContent).toBe('/courses/mission-test-course/lessons/lesson-one');
    });
  });
});
