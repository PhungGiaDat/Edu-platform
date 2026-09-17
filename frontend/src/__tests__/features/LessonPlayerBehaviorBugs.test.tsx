import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  LessonVideoSection,
  VocabularySection,
  ListenChooseSection,
  LessonShell,
} from '@/features/courses/components/lesson';
import type { Lesson } from '@/types/course';
import { eventBus } from '@/runtime/EventBus';

const sampleLesson: Lesson = {
  lesson_id: 'meet-the-elephant',
  title: 'Meet the Elephant',
  title_vi: 'Gặp bạn voi',
  description: 'Learn words Elephant, Big, Trunk with Momo.',
  order: 2,
  duration_minutes: 5,
  video: {
    title: 'Meet the Elephant Video',
    url: 'https://www.youtube.com/watch?v=mjFcrv6Lfx8',
    duration_seconds: 120,
  },
  vocabulary: [
    {
      word_en: 'Elephant',
      word_vi: 'Con voi',
      emoji: '🐘',
      image: { bucket: 'learnar-assets', path: 'courses/momo-nature/lessons/meet-the-elephant/vocabulary/elephant.png', type: 'image', status: 'ready' },
      audio: { bucket: 'learnar-assets', path: 'courses/momo-nature/lessons/meet-the-elephant/audio/elephant.wav', type: 'audio', status: 'ready' },
      simple_sentence: 'The elephant is huge.',
    },
  ],
  quiz: [],
  reward: {
    xp: 80,
    badgeTitle: 'Elephant Star',
    message_vi: 'Con đã hoàn thành!',
    sticker: {
      bucket: 'learnar-assets',
      path: 'courses/momo-nature/lessons/meet-the-elephant/sticker.png',
      type: 'image',
      status: 'ready',
    },
  },
  generatedMedia: [],
  images: [],
  scene_images: [],
  video_duration: 120,
};

describe('TDD: Lesson Player Behavioral Fixes', () => {
  beforeEach(() => {
    window.innerWidth = 390;
    window.innerHeight = 844;
  });

  describe('Video Behavior', () => {
    it('resolves YouTube watch URL into standard embed iframe', () => {
      const onWatched = vi.fn();
      render(
        <LessonVideoSection
          lesson={sampleLesson}
          onWatched={onWatched}
          isWatched={false}
          locale="vi"
        />
      );

      const iframe = screen.getByTitle('Meet the Elephant Video') || screen.getByTitle('Meet the Elephant');
      expect(iframe).toBeDefined();
      expect(iframe.tagName).toBe('IFRAME');
      expect(iframe.getAttribute('src')).toContain('embed/mjFcrv6Lfx8');
    });

    it('resolves supabase:// video URL into usable bucket path instead of raw supabase protocol', () => {
      const supabaseLesson: Lesson = {
        ...sampleLesson,
        video: {
          title: 'Supabase Video',
          url: 'supabase://learnar-assets/courses/momo-nature/video.mp4',
          duration_seconds: 120,
        },
      };

      const { container } = render(
        <LessonVideoSection
          lesson={supabaseLesson}
          onWatched={vi.fn()}
          isWatched={false}
          locale="vi"
        />
      );

      const sourceEl = container.querySelector('source');
      expect(sourceEl).toBeDefined();
      expect(sourceEl?.getAttribute('src')).not.toContain('supabase://');
      expect(sourceEl?.getAttribute('src')).toContain('/learnar-assets/courses/momo-nature/video.mp4');
    });

    it('displays a friendly fallback when video is unavailable and allows lesson progression', () => {
      const noVideoLesson: Lesson = {
        ...sampleLesson,
        video: undefined,
        video_url: undefined,
        lesson_media: undefined,
        videoLesson: undefined,
      };

      const onWatched = vi.fn();
      render(
        <LessonVideoSection
          lesson={noVideoLesson}
          onWatched={onWatched}
          isWatched={false}
          locale="vi"
        />
      );

      // Friendly fallback copy
      expect(screen.getByText(/Video bài học chưa sẵn sàng|Video chưa sẵn sàng/i)).toBeDefined();
      expect(screen.queryByText('📺')).toBeNull(); // No giant dead television placeholder

      // Progression button still works
      const continueBtn = screen.getByRole('button', { name: /tiếp tục/i });
      expect(continueBtn).toBeDefined();
      fireEvent.click(continueBtn);
      expect(onWatched).toHaveBeenCalled();
    });
  });

  describe('Speech Error Sanitization', () => {
    it('never renders raw "service-not-allowed" and presents friendly Vietnamese copy', async () => {
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      // Click "Luyện nói" button to start speech practice
      const speakBtn = screen.getByRole('button', { name: /luyện nói/i });
      fireEvent.click(speakBtn);

      // Simulate Speech error event with raw browser error 'service-not-allowed'
      act(() => {
        eventBus.emit('PRONUNCIATION_ERROR' as any, { error: 'service-not-allowed' });
      });

      // Must NOT contain raw browser technical error string
      expect(screen.queryByText(/service-not-allowed/i)).toBeNull();

      // Must display child-friendly explanation
      const friendlyNotice = await screen.findByText(/Luyện nói chưa khả dụng trên thiết bị này/i);
      expect(friendlyNotice).toBeDefined();
    });
  });

  describe('Mobile Header on <= 600px', () => {
    it('hides horizontal multi-step text navigation on mobile screens', () => {
      const { container } = render(
        <MemoryRouter>
          <LessonShell
            lesson={sampleLesson}
            courseId="momo-nature-english-5-7"
            currentStepIndex={1}
            completedSteps={new Set()}
            onSelectStep={vi.fn()}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
            locale="vi"
          >
            <div>Content</div>
          </LessonShell>
        </MemoryRouter>
      );

      // Stepper container must have hidden sm:block or be hidden on mobile
      const stepperContainer = container.querySelector('.sm\\:block') || container.querySelector('[class*="hidden sm:"]');
      expect(stepperContainer).toBeDefined();
      expect(stepperContainer?.className).toContain('hidden');

      // Compact header info still renders
      expect(screen.getByText(/2 \/ 9/i)).toBeDefined();
    });
  });

  describe('Notice / Progress Banner Auto-Dismiss', () => {
    it('renders progress save notification as a floating temporary toast rather than permanent layout block', () => {
      const { container } = render(
        <MemoryRouter>
          <LessonShell
            lesson={sampleLesson}
            courseId="momo-nature-english-5-7"
            currentStepIndex={1}
            completedSteps={new Set()}
            onSelectStep={vi.fn()}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
            notice="Đã lưu tiến độ!"
            locale="vi"
          >
            <div>Content</div>
          </LessonShell>
        </MemoryRouter>
      );

      const toastEl = container.querySelector('[role="status"]') || screen.getByText('Đã lưu tiến độ!').closest('aside, div');
      // Toast must be floating (fixed or absolute) so it doesn't push in-flow vertical layout
      expect(toastEl?.className).toMatch(/fixed|absolute/);
    });
  });

  describe('Duplicate Controls & CTA Ownership', () => {
    it('Vocabulary provides a single primary audio action without two competing large speaker buttons', () => {
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      // There should not be multiple identical full-sized speaker buttons competing
      const audioButtons = screen.getAllByRole('button', { name: /nghe/i });
      expect(audioButtons.length).toBe(1);
    });

    it('Listen & Choose does not render a duplicate continue button when footer owns progression', () => {
      const onComplete = vi.fn();
      render(
        <ListenChooseSection
          lesson={sampleLesson}
          onComplete={onComplete}
          locale="vi"
        />
      );

      // Select option
      const elephantChoice = screen.getByText('Elephant').closest('button');
      if (elephantChoice) fireEvent.click(elephantChoice);

      // Before completing all questions or with footer ownership, there must NOT be stacked duplicate continue buttons
      const continueButtons = screen.queryAllByRole('button', { name: /^tiếp tục$/i });
      expect(continueButtons.length).toBeLessThanOrEqual(1);
    });
  });
});
