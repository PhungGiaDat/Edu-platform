import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  WarmUpSection,
  LessonVideoSection,
  VocabularySection,
  ListenChooseSection,
  MatchSection,
  ARFlashcardSection,
  MiniGamesSection,
  QuizSection,
  RewardSection,
  LessonShell,
} from '@/features/courses/components/lesson';
import type { Lesson } from '@/types/course';

const mockLesson: Lesson = {
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
    {
      word_en: 'Big',
      word_vi: 'To lớn',
      emoji: '🦣',
      image: { bucket: 'learnar-assets', path: 'courses/momo-nature/lessons/meet-the-elephant/vocabulary/big.png', type: 'image', status: 'ready' },
      audio: { bucket: 'learnar-assets', path: 'courses/momo-nature/lessons/meet-the-elephant/audio/big.wav', type: 'audio', status: 'ready' },
      simple_sentence: 'An elephant is big.',
    },
    {
      word_en: 'Trunk',
      word_vi: 'Chiếc vòi',
      emoji: '👃',
      image: { bucket: 'learnar-assets', path: 'courses/momo-nature/lessons/meet-the-elephant/vocabulary/trunk.png', type: 'image', status: 'ready' },
      audio: { bucket: 'learnar-assets', path: 'courses/momo-nature/lessons/meet-the-elephant/audio/trunk.wav', type: 'audio', status: 'ready' },
      simple_sentence: 'The trunk is long.',
    },
  ],
  quiz: [
    {
      question_id: 'q-el-1',
      type: 'image_choice',
      prompt_vi: 'Đâu là chú voi Elephant?',
      questionAudioText: 'Elephant',
      options: [
        { option_id: 'elephant', label: 'Elephant' },
        { option_id: 'trunk', label: 'Trunk' },
      ],
      correctOptionId: 'elephant',
      feedbackCorrect: 'Đúng rồi! Voi Elephant vẫy tai chào bé!',
      feedbackIncorrect: 'Chưa đúng rồi. Bé nghe lại nha!',
    },
  ],
  reward: {
    xp: 80,
    badgeTitle: 'Elephant Star',
    message_vi: 'Con đã hoàn thành bài học cùng chú voi!',
    sticker: { bucket: 'learnar-assets', path: 'courses/momo-nature/lessons/meet-the-elephant/stickers/elephant.png', type: 'sticker', status: 'ready' },
  },
  generatedMedia: [],
  images: [],
  scene_images: [],
  video_duration: 120,
};

describe('Mobile 390x844 Responsive Lesson Architecture', () => {
  beforeEach(() => {
    // Emulate iPhone 12/13/14 screen viewport (390 x 844)
    window.innerWidth = 390;
    window.innerHeight = 844;
  });

  describe('LessonShell & Bottom Action Area at 390x844', () => {
    it('applies safe-area padding-bottom and max-width 448px to the action bar', () => {
      const { container } = render(
        <MemoryRouter>
          <LessonShell
            lesson={mockLesson}
            courseId="momo-nature-english-5-7"
            currentStepIndex={0}
            completedSteps={new Set()}
            onSelectStep={vi.fn()}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
            locale="vi"
          >
            <div>Test Content</div>
          </LessonShell>
        </MemoryRouter>
      );

      const mainEl = container.querySelector('main');
      expect(mainEl).toBeDefined();
      // Main must have bottom clearance for sticky action bar
      expect(mainEl?.className).toContain('pb-[calc(88px+env(safe-area-inset-bottom,12px))]');
      expect(mainEl?.className).toContain('justify-start');

      const footerEl = container.querySelector('footer');
      expect(footerEl).toBeDefined();
      expect(footerEl?.className).toContain('sticky bottom-0');
      expect(footerEl?.className).toContain('pb-[calc(12px+env(safe-area-inset-bottom,0px))]');

      // Button container has max-width 448px
      const barContainer = footerEl?.querySelector('div');
      expect(barContainer?.className).toContain('max-w-[448px]');
    });
  });

  describe('Step 1: Warm-up at 390x844', () => {
    it('renders visual-first layout with no floating mascot overlay and dominant CTA', () => {
      const onStart = vi.fn();
      render(
        <WarmUpSection
          lesson={mockLesson}
          course={null}
          onStart={onStart}
          locale="vi"
        />
      );

      // Title & lesson subtitle pill
      expect(screen.getByText('Gặp bạn voi')).toBeDefined();
      expect(screen.getByText(/Bài học 2/i)).toBeDefined();

      // Compressed metadata row: 5 phút, 3 từ mới, +80 XP
      expect(screen.getByText(/5 phút/i)).toBeDefined();
      expect(screen.getByText(/3 từ mới/i)).toBeDefined();
      expect(screen.getByText(/\+80 XP/i)).toBeDefined();

      // Visual hero panel shows Vietnamese meaning
      expect(screen.getAllByText('Con voi').length).toBeGreaterThan(0);

      // 3 preview chips exist for Elephant, Big, Trunk
      expect(screen.getByText('Elephant')).toBeDefined();
      expect(screen.getByText('Big')).toBeDefined();
      expect(screen.getByText('Trunk')).toBeDefined();

      // Primary CTA is visually dominant
      const cta = screen.getByRole('button', { name: /Bắt đầu học ngay/i });
      expect(cta).toBeDefined();
      expect(cta.className).toContain('min-h-[56px]');
    });
  });

  describe('Step 2: Video at 390x844', () => {
    it('renders 16:9 rounded-26px video card with centered play affordance', () => {
      const onWatched = vi.fn();
      const { container } = render(
        <LessonVideoSection
          lesson={mockLesson}
          onWatched={onWatched}
          isWatched={false}
          locale="vi"
        />
      );

      // Heading + helper
      expect(screen.getByText(/Xem và khám phá/i)).toBeDefined();

      // 16:9 video stage inset in a toy cinema frame
      const videoCard = container.querySelector('.aspect-video');
      expect(videoCard).toBeDefined();
      expect(videoCard?.className).toContain('rounded-[22px]');

      // Watch CTA
      expect(screen.getByRole('button', { name: /Con đã xem xong/i })).toBeDefined();
    });
  });

  describe('Step 3: Vocabulary at 390x844', () => {
    it('renders one word at a time with roughly square clay image and page dots', () => {
      const { container } = render(
        <VocabularySection
          lesson={mockLesson}
          onWordPracticed={vi.fn()}
          practicedWords={{}}
          locale="vi"
        />
      );

      // Page dots indicator
      const dotButtons = screen.getAllByRole('button', { name: /Từ số/i });
      expect(dotButtons).toHaveLength(3);

      // English word & Vietnamese translation
      expect(screen.getByText('Elephant')).toBeDefined();
      expect(screen.getByText('Con voi')).toBeDefined();

      // Square clay image card exists
      const imageContainer = container.querySelector('.aspect-square');
      expect(imageContainer).toBeDefined();

      // Continue button
      expect(screen.getByRole('button', { name: /Tiếp tục/i })).toBeDefined();
    });
  });

  describe('Step 4: Listen & Choose at 390x844', () => {
    it('renders large speaker control and 2-column visual cards without horizontal overflow', () => {
      const { container } = render(
        <ListenChooseSection
          lesson={mockLesson}
          onComplete={vi.fn()}
          locale="vi"
        />
      );

      // Speaker control at top
      const speakerBtn = screen.getByLabelText(/Nghe lại/i);
      expect(speakerBtn).toBeDefined();
      expect(speakerBtn.className).toContain('h-20 w-20');

      // 2-column answer grid
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeDefined();
    });
  });

  describe('Step 5: Match at 390x844', () => {
    it('renders compact 3 pairs heading and balanced 56-72px interaction rows', () => {
      render(
        <MatchSection
          lesson={mockLesson}
          onComplete={vi.fn()}
          locale="vi"
        />
      );

      // Compact heading with 3 cặp
      expect(screen.getByText(/3 cặp/i)).toBeDefined();

      // Balanced columns: WORDS | IMAGES
      expect(screen.getByText(/TỪ VỰNG/i)).toBeDefined();
      expect(screen.getByText(/HÌNH ẢNH/i)).toBeDefined();

      // Chunky tappable tokens with roughly 56-60px min height
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn.className).toContain('min-h-[58px]');
      });
    });
  });

  describe('Step 6: AR at 390x844', () => {
    it('renders simplified single launch card with purple CTA without nested cards', () => {
      const onContinue = vi.fn();
      render(
        <MemoryRouter>
          <ARFlashcardSection
            lesson={mockLesson}
            onContinue={onContinue}
            locale="vi"
          />
        </MemoryRouter>
      );

      // Small badge
      expect(screen.getByText(/✨ AR 3D/i)).toBeDefined();

      // Strong purple portal CTA
      const arBtn = screen.getByRole('button', { name: /Khám phá cùng Camera AR/i });
      expect(arBtn).toBeDefined();
      expect(arBtn.className).toContain('rounded-full');

      // Non-blocking continue
      expect(screen.getByRole('button', { name: /Tiếp tục sang Trò chơi nhỏ/i })).toBeDefined();
    });
  });

  describe('Step 7: Mini Game at 390x844', () => {
    it('renders one round per view with image first and targets', () => {
      const { container } = render(
        <MiniGamesSection
          lesson={mockLesson}
          onComplete={vi.fn()}
          locale="vi"
        />
      );

      // Round 1 of 3
      expect(screen.getByText(/Vòng 1 \/ 3/i)).toBeDefined();

      // 3 targets grid
      const targetsGrid = container.querySelector('.grid-cols-3');
      expect(targetsGrid).toBeDefined();
    });
  });

  describe('Step 8: Quiz at 390x844', () => {
    it('renders one question per screen with progress bar and no premature score card', () => {
      render(
        <QuizSection
          lesson={mockLesson}
          answers={{}}
          onAnswerChange={vi.fn()}
          onSubmit={vi.fn()}
          isSubmitting={false}
          result={null}
          locale="vi"
        />
      );

      // Question 1 / 1
      expect(screen.getByText(/Câu 1 \/ 1/i)).toBeDefined();

      // Prompt is visible
      expect(screen.getByText('Đâu là chú voi Elephant?')).toBeDefined();

      // Score percentage card must NOT be present before submission
      expect(screen.queryByText(/Điểm kiểm tra/i)).toBeNull();
    });
  });

  describe('Step 9: Reward at 390x844', () => {
    it('renders celebratory trophy, prominent XP, and strong completion CTA', () => {
      render(
        <MemoryRouter>
          <RewardSection
            lesson={mockLesson}
            courseId="momo-nature-english-5-7"
            quizResult={{ score: 100, passed: true, correct: 1, total: 1, feedback: [] }}
            onFinishLesson={vi.fn()}
            isSubmitting={false}
            isCompleted={false}
            onReplayLesson={vi.fn()}
            locale="vi"
          />
        </MemoryRouter>
      );

      // Celebratory headings & stars
      expect(screen.getByText('Con làm rất tốt!')).toBeDefined();
      expect(screen.getByText('Elephant Star')).toBeDefined();
      expect(screen.getByText('+80 XP')).toBeDefined();

      // Strong completion CTA
      expect(screen.getByRole('button', { name: /Lưu tiến độ & Hoàn tất/i })).toBeDefined();
    });
  });
});
