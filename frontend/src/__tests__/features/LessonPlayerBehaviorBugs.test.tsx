import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const audioMocks = vi.hoisted(() => ({
  playPronunciation: vi.fn(() => Promise.resolve()),
  playSoundEffect: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/services/AudioService', () => ({
  AudioService: audioMocks,
}));

import {
  LessonVideoSection,
  VocabularySection,
  ListenChooseSection,
  MiniGamesSection,
  LessonShell,
} from '@/features/courses/components/lesson';
import { extractYouTubeId } from '@/features/courses/components/lesson/LessonVideoSection';
import type { Lesson } from '@/types/course';
import { eventBus } from '@/runtime/EventBus';
import { getPronunciationService } from '@/services/PronunciationService';

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
    audioMocks.playPronunciation.mockReset();
    audioMocks.playPronunciation.mockResolvedValue(undefined);
    audioMocks.playSoundEffect.mockReset();
    audioMocks.playSoundEffect.mockResolvedValue(undefined);
  });

  describe('Video Behavior', () => {
    it.each([
      'https://www.youtube.com/watch?v=mjFcrv6Lfx8',
      'https://youtu.be/mjFcrv6Lfx8',
      'https://www.youtube.com/embed/mjFcrv6Lfx8',
    ])('shows a poster first, then mounts normalized YouTube URL %s after play', (url) => {
      const { container } = render(
        <LessonVideoSection
          lesson={{ ...sampleLesson, video: { ...sampleLesson.video!, url } }}
          onWatched={vi.fn()}
          isWatched={false}
          locale="vi"
        />
      );

      expect(container.querySelector('iframe')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /xem video/i }));

      const iframe = screen.getByTitle('Meet the Elephant Video');
      expect(iframe.getAttribute('src')).toBe(
        'https://www.youtube-nocookie.com/embed/mjFcrv6Lfx8?rel=0&modestbranding=1&playsinline=1',
      );
      expect(iframe.getAttribute('allow')).toContain('web-share');
    });

    it('rejects a non-YouTube hostname even when its path contains a valid-looking ID', () => {
      expect(extractYouTubeId('https://example.test/youtube.com/watch?v=mjFcrv6Lfx8')).toBeNull();
    });

    it('accepts a watch URL with parameters before v', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?feature=share&v=mjFcrv6Lfx8')).toBe('mjFcrv6Lfx8');
    });

    it('falls back from a failed direct video without leaving the media stage black', () => {
      const onWatched = vi.fn();
      const { container } = render(
        <LessonVideoSection
          lesson={{
            ...sampleLesson,
            video: { ...sampleLesson.video!, url: 'https://cdn.example.test/elephant.mp4' },
          }}
          onWatched={onWatched}
          isWatched={false}
          locale="vi"
        />
      );

      fireEvent.error(container.querySelector('video')!);

      expect(screen.getByText(/Video bài học chưa sẵn sàng/i)).toBeDefined();
      expect(container.querySelector('video')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /tiếp tục/i }));
      expect(onWatched).toHaveBeenCalledTimes(1);
    });

    it('shows fallback instead of treating an unsupported YouTube URL as direct video', () => {
      const { container } = render(
        <LessonVideoSection
          lesson={{
            ...sampleLesson,
            video: { ...sampleLesson.video!, url: 'https://www.youtube.com/watch?feature=share' },
          }}
          onWatched={vi.fn()}
          isWatched={false}
          locale="vi"
        />
      );
      expect(container.querySelector('iframe')).toBeNull();
      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByText(/Video bài học chưa sẵn sàng/i)).toBeDefined();
    });

    it('does not expose a black direct-video stage while media is loading', () => {
      const { container } = render(
        <LessonVideoSection
          lesson={{
            ...sampleLesson,
            video: {
              ...sampleLesson.video!,
              url: 'https://cdn.example.test/elephant.mp4',
              thumbnail_url: 'https://cdn.example.test/elephant.png',
            },
          }}
          onWatched={vi.fn()}
          isWatched={false}
          locale="vi"
        />
      );

      expect(screen.getByText(/Đang tải video/i)).toBeDefined();
      expect(screen.getByRole('img', { name: 'Meet the Elephant' })).toBeDefined();
      expect(container.querySelector('video')?.className).toContain('opacity-0');
    });

    it('shows a poster and explanation rather than a fake play control after media fails', () => {
      const { container } = render(
        <LessonVideoSection
          lesson={{ ...sampleLesson, video: {
            ...sampleLesson.video!, url: 'https://cdn.example.test/elephant.mp4',
            thumbnail_url: 'https://cdn.example.test/elephant.png',
          } }}
          onWatched={vi.fn()} isWatched={false} locale="vi"
        />
      );
      fireEvent.error(container.querySelector('video')!);
      expect(screen.getByText(/Video bài học chưa sẵn sàng/i)).toBeDefined();
      expect(screen.getByRole('img', { name: 'Meet the Elephant' })).toBeDefined();
      expect(container.querySelector('video')).toBeNull();
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

    it('keeps YouTube dormant behind poster and explicit watch action', () => {
      const onWatched = vi.fn();
      const { container } = render(
        <LessonVideoSection
          lesson={sampleLesson}
          onWatched={onWatched}
          isWatched={false}
          locale="vi"
        />
      );

      expect(container.querySelector('iframe')).toBeNull();
      expect(screen.getByRole('img', { name: 'Meet the Elephant' }).getAttribute('src')).toBe(
        'https://i.ytimg.com/vi/mjFcrv6Lfx8/hqdefault.jpg'
      );
      expect(screen.getByRole('button', { name: /xem video/i })).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: /con đã xem xong.*tiếp tục/i }));
      expect(onWatched).toHaveBeenCalledTimes(1);
    });

    it('mounts normalized YouTube iframe only after explicit watch action', () => {
      const { container } = render(
        <LessonVideoSection
          lesson={sampleLesson}
          onWatched={vi.fn()}
          isWatched={false}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /xem video/i }));

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeDefined();
      expect(iframe?.getAttribute('src')).toBe(
        'https://www.youtube-nocookie.com/embed/mjFcrv6Lfx8?rel=0&modestbranding=1&playsinline=1'
      );
      expect(iframe?.getAttribute('title')).toBe('Meet the Elephant Video');
      expect(iframe?.getAttribute('allow')).toContain('web-share');
      expect(iframe?.hasAttribute('allowfullscreen')).toBe(true);
    });

    it('recovers from a blocked YouTube iframe without blocking lesson progression', () => {
      const onWatched = vi.fn();
      const { container } = render(
        <LessonVideoSection
          lesson={sampleLesson}
          onWatched={onWatched}
          isWatched={false}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /xem video/i }));
      fireEvent.error(container.querySelector('iframe')!);

      expect(screen.getByText(/không thể phát video tại đây/i)).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: /thử lại/i }));
      expect(container.querySelector('iframe')).toBeDefined();

      fireEvent.error(container.querySelector('iframe')!);
      fireEvent.click(screen.getByRole('button', { name: /con đã xem xong.*tiếp tục/i }));
      expect(onWatched).toHaveBeenCalledTimes(1);
    });

    it('falls back from YouTube thumbnail to lesson thumbnail then vocabulary visual', () => {
      const lessonWithPosters: Lesson = {
        ...sampleLesson,
        video_thumbnail: 'https://cdn.example.test/lesson-thumbnail.jpg',
      };
      const { container } = render(
        <LessonVideoSection
          lesson={lessonWithPosters}
          onWatched={vi.fn()}
          isWatched={false}
          locale="vi"
        />
      );

      const poster = () => screen.getByRole('img', { name: 'Meet the Elephant' });
      expect(poster().getAttribute('src')).toBe('https://i.ytimg.com/vi/mjFcrv6Lfx8/hqdefault.jpg');
      fireEvent.error(poster());
      expect(poster().getAttribute('src')).toBe('https://cdn.example.test/lesson-thumbnail.jpg');
      fireEvent.error(poster());
      expect(poster().getAttribute('src')).toBe(
        '/learnar-assets/courses/momo-nature/lessons/meet-the-elephant/vocabulary/elephant.png'
      );
      fireEvent.error(poster());
      expect(container.querySelector('[data-testid="lesson-video-stage"]')?.textContent).toContain('🎬');
    });

    it('keeps vocabulary fallback preview inside the cinema stage', () => {
      const { container } = render(
        <LessonVideoSection
          lesson={{ ...sampleLesson, video: undefined }}
          onWatched={vi.fn()}
          isWatched={false}
          locale="vi"
        />
      );

      const stage = container.querySelector('[data-testid="lesson-video-stage"]');
      const vocabularyPreview = stage?.querySelector('[data-testid="video-vocabulary-preview"]');

      expect(stage).toBeDefined();
      expect(vocabularyPreview).toBeDefined();
      expect(vocabularyPreview?.querySelector('img[alt="Elephant"]')).toBeDefined();
    });
  });

  describe('Vocabulary audio behavior', () => {
    it('uses vocabulary audio asset rather than vocabulary image for Nghe mẫu', () => {
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /nghe mẫu/i }));

      expect(audioMocks.playPronunciation).toHaveBeenCalledWith(
        'Elephant',
        'en',
        '/learnar-assets/courses/momo-nature/lessons/meet-the-elephant/audio/elephant.wav',
      );
    });

    it('uses current vocabulary audio for Listen & Choose replay', () => {
      render(<ListenChooseSection lesson={sampleLesson} onComplete={vi.fn()} locale="vi" />);
      fireEvent.click(screen.getByRole('button', { name: /nghe lại/i }));
      expect(audioMocks.playPronunciation).toHaveBeenCalledWith(
        'Elephant', 'en', '/learnar-assets/courses/momo-nature/lessons/meet-the-elephant/audio/elephant.wav',
      );
    });

    it('uses current vocabulary audio for mini-game replay', () => {
      render(<MiniGamesSection lesson={sampleLesson} onComplete={vi.fn()} locale="vi" />);
      fireEvent.click(screen.getByRole('button', { name: /chạm để nghe lại/i }));
      expect(audioMocks.playPronunciation).toHaveBeenCalledWith(
        'Elephant', 'en', '/learnar-assets/courses/momo-nature/lessons/meet-the-elephant/audio/elephant.wav',
      );
    });

    it('shows an active Nghe mẫu label while its playback promise is pending', () => {
      let finishPlayback: (() => void) | undefined;
      audioMocks.playPronunciation.mockImplementationOnce(
        () => new Promise<void>((resolve) => { finishPlayback = resolve; }),
      );
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /nghe mẫu/i }));

      expect((screen.getByRole('button', { name: /đang phát/i }) as HTMLButtonElement).disabled).toBe(true);
      act(() => finishPlayback?.());
    });

    it('shows friendly audio failure copy without raw playback errors', async () => {
      audioMocks.playPronunciation.mockRejectedValueOnce(new Error('NotAllowedError'));
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /nghe mẫu/i }));

      expect(await screen.findByText(/Không thể phát âm thanh mẫu/i)).toBeDefined();
      expect(screen.queryByText(/NotAllowedError/i)).toBeNull();
    });

    it('displays microphone opening state before recognition reports availability', () => {
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /luyện nói/i }));

      expect((screen.getByRole('button', { name: /đang mở micro/i }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByRole('button', { name: /tiếp tục|hoàn thành từ mới/i })).toBeDefined();
    });

    it('moves from opening microphone to active listening when recognition starts', () => {
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /luyện nói/i }));
      act(() => eventBus.emit('PRONUNCIATION_STARTED' as any, {
        expectedWord: 'Elephant',
        source: 'webspeech',
      }));

      expect((screen.getByRole('button', { name: /đang nghe/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('ignores a pronunciation start event for another word', () => {
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /luyện nói/i }));
      act(() => eventBus.emit('PRONUNCIATION_STARTED' as any, {
        expectedWord: 'Big',
        source: 'webspeech',
      }));

      expect(screen.getByRole('button', { name: /đang mở micro/i })).toBeDefined();
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

    it('maps server-unavailable speech errors to friendly copy', async () => {
      render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /luyện nói/i }));
      act(() => {
        eventBus.emit('PRONUNCIATION_ERROR' as any, {
          error: 'speech-recognition-unavailable',
        });
      });

      expect(await screen.findByText(/Luyện nói chưa khả dụng trên thiết bị này/i)).toBeDefined();
      expect(screen.queryByText(/speech-recognition-unavailable/i)).toBeNull();
    });

    it('removes pending pronunciation listeners when unmounted', () => {
      eventBus.clear();
      getPronunciationService().setUseServerFallback(false);
      const { unmount } = render(
        <VocabularySection
          lesson={sampleLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /luyện nói/i }));
      expect(eventBus.getListenerCount('PRONUNCIATION_ERROR')).toBe(1);

      unmount();

      expect(eventBus.getListenerCount('PRONUNCIATION_ERROR')).toBe(0);
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

      // Compact segmented progress path renders instead of a text "N / 9" counter
      const progressDots = container.querySelectorAll('header span.rounded-full');
      expect(progressDots.length).toBeGreaterThan(0);
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

    it('cancels pending auto-advance when the learner continues manually', async () => {
      vi.useFakeTimers();
      const onComplete = vi.fn();
      const [elephant] = sampleLesson.vocabulary;
      render(
        <ListenChooseSection
          lesson={{
            ...sampleLesson,
            vocabulary: [
              elephant,
              { ...elephant, word_en: 'Big', word_vi: 'To lớn' },
              { ...elephant, word_en: 'Trunk', word_vi: 'Vòi' },
            ],
          }}
          onComplete={onComplete}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /^Elephant\b/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Tiếp tục\s*→$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Big\b/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Tiếp tục\s*→$/i }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_500);
      });

      expect(screen.queryByText(/Không có dữ liệu bài tập nghe/i)).toBeNull();
      expect(onComplete).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
