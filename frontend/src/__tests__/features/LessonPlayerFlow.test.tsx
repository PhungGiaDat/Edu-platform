import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  JOURNEY_STEPS,
  LessonJourney,
  WarmUpSection,
  LessonVideoSection,
  VocabularySection,
  ListenChooseSection,
  MatchSection,
  ARFlashcardSection,
  MiniGamesSection,
  QuizSection,
  RewardSection,
} from '@/features/courses/components/lesson';
import { COURSE_THEMES } from '@/features/courses/courseThemes';
import type { Lesson } from '@/types/course';

const mockLesson: Lesson = {
  lesson_id: 'hello-family',
  title: 'Hello Family',
  title_vi: 'Xin chào gia đình',
  description: 'Learn words for Mom, Dad, Baby with Momo.',
  order: 1,
  duration_minutes: 5,
  video: {
    title: 'Hello Family Video',
    url: 'https://www.youtube.com/watch?v=mjFcrv6Lfx8',
    duration_seconds: 120,
  },
  vocabulary: [
    {
      word_en: 'Mom',
      word_vi: 'Mẹ',
      emoji: '👩',
      image: { bucket: 'learnar-assets', path: 'courses/momo-home/mom.png', type: 'image', status: 'ready' },
      audio: { bucket: 'learnar-assets', path: 'courses/momo-home/mom.mp3', type: 'audio', status: 'ready' },
      simple_sentence: 'I love my Mom.',
    },
    {
      word_en: 'Dad',
      word_vi: 'Bố',
      emoji: '👨',
      image: { bucket: 'learnar-assets', path: 'courses/momo-home/dad.png', type: 'image', status: 'ready' },
      audio: { bucket: 'learnar-assets', path: 'courses/momo-home/dad.mp3', type: 'audio', status: 'ready' },
      simple_sentence: 'This is my Dad.',
    },
    {
      word_en: 'Baby',
      word_vi: 'Em bé',
      emoji: '👶',
      image: { bucket: 'learnar-assets', path: 'courses/momo-home/baby.png', type: 'image', status: 'ready' },
      audio: { bucket: 'learnar-assets', path: 'courses/momo-home/baby.mp3', type: 'audio', status: 'ready' },
      simple_sentence: 'The baby is smiling.',
    },
  ],
  quiz: [
    {
      question_id: 'q1',
      type: 'image_choice',
      prompt_vi: 'Ai là Mẹ?',
      questionAudioText: 'Who is Mom?',
      options: [
        { option_id: 'opt1', label: 'Mom' },
        { option_id: 'opt2', label: 'Dad' },
      ],
      correctOptionId: 'opt1',
      feedbackCorrect: 'Đúng rồi!',
      feedbackIncorrect: 'Chưa đúng!',
    },
  ],
  reward: {
    xp: 25,
    badgeTitle: 'Family Explorer',
    message_vi: 'Bé đã hoàn thành bài học gia đình!',
    sticker: { bucket: 'learnar-assets', path: 'courses/momo-home/sticker.png', type: 'sticker', status: 'ready' },
  },
  generatedMedia: [],
  images: [],
  scene_images: [],
  video_duration: 120,
};

describe('LessonPlayer Journey Architecture', () => {
  it('defines the canonical 9-step journey in sequence', () => {
    expect(JOURNEY_STEPS).toHaveLength(9);
    expect(JOURNEY_STEPS.map((s) => s.id)).toEqual([
      'warmup',
      'video',
      'vocabulary',
      'listen_choose',
      'match',
      'ar_flashcards',
      'mini_game',
      'quiz',
      'reward',
    ]);
  });

  it('renders LessonJourney stepper with active and completed states', () => {
    const onSelect = vi.fn();
    render(
      <LessonJourney
        currentStepIndex={2}
        completedSteps={new Set(['warmup', 'video'])}
        onSelectStep={onSelect}
        locale="vi"
        theme={COURSE_THEMES.home}
      />
    );

    // Stepper should render 9 list items
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(9);

    // Active step button has aria-current="step"
    const activeBtn = buttons[2];
    expect(activeBtn.getAttribute('aria-current')).toBe('step');

    // Clicking an accessible step calls onSelectStep
    fireEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('renders WarmUpSection with titles, duration, vocabulary chips, and start CTA', () => {
    const onStart = vi.fn();
    render(
      <WarmUpSection
        lesson={mockLesson}
        course={null}
        onStart={onStart}
        locale="vi"
      />
    );

    expect(screen.getByText('Xin chào gia đình')).toBeDefined();
    expect(screen.getByText(/5 phút/)).toBeDefined();
    expect(screen.getByText('Mom')).toBeDefined();
    expect(screen.getByText('Dad')).toBeDefined();
    expect(screen.getByText('Baby')).toBeDefined();

    const startBtn = screen.getByRole('button', { name: /Bắt đầu học ngay/i });
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders LessonVideoSection poster before mounting YouTube iframe and watch confirmation', () => {
    const onWatched = vi.fn();
    render(
      <LessonVideoSection
        lesson={mockLesson}
        onWatched={onWatched}
        isWatched={false}
        locale="vi"
      />
    );

    expect(document.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Xem video/i }));
    expect(document.querySelector('iframe')?.src).toContain('youtube-nocookie.com/embed/mjFcrv6Lfx8');

    const watchBtn = screen.getByRole('button', { name: /Con đã xem xong/i });
    fireEvent.click(watchBtn);
    expect(onWatched).toHaveBeenCalledTimes(1);
  });

  it('renders VocabularySection cards with listen and speak practice triggers', () => {
    const onWordPracticed = vi.fn();
    render(
      <VocabularySection
        lesson={mockLesson}
        onWordPracticed={onWordPracticed}
        practicedWords={{}}
        locale="vi"
      />
    );

    expect(screen.getByText('Mom')).toBeDefined();
    expect(screen.getByText('Dad')).toBeDefined();
    expect(screen.getByText('Baby')).toBeDefined();

    const listenButtons = screen.getAllByRole('button', { name: /Nghe mẫu/i });
    expect(listenButtons).toHaveLength(3);

    const speakButtons = screen.getAllByRole('button', { name: /Luyện nói/i });
    expect(speakButtons).toHaveLength(3);
  });

  it('renders ListenChooseSection with auditory prompt and choices', () => {
    const onComplete = vi.fn();
    render(
      <ListenChooseSection
        lesson={mockLesson}
        onComplete={onComplete}
        locale="vi"
      />
    );

    expect(screen.getByText(/Lắng nghe & Chọn hình đúng/i)).toBeDefined();
    expect(screen.getByLabelText(/Nghe lại/i)).toBeDefined();
    expect(screen.getByText('Mom')).toBeDefined();
  });

  it('renders MatchSection with picture tiles and word pills', () => {
    const onComplete = vi.fn();
    render(
      <MatchSection
        lesson={mockLesson}
        onComplete={onComplete}
        locale="vi"
      />
    );

    expect(screen.getByText(/Nối từ & Ghép hình/i)).toBeDefined();
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(6);
  });

  it('renders ARFlashcardSection with WebAR launch button', () => {
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

    expect(screen.getByText(/Trải nghiệm Thẻ AR 3D sống động/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Khám phá cùng Camera AR/i })).toBeDefined();

    const continueBtn = screen.getByRole('button', { name: /Tiếp tục sang Trò chơi nhỏ/i });
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders MiniGamesSection with memory cards', () => {
    const onComplete = vi.fn();
    render(
      <MiniGamesSection
        lesson={mockLesson}
        onComplete={onComplete}
        locale="vi"
      />
    );

    expect(screen.getByText(/Trò chơi rèn luyện trí nhớ/i)).toBeDefined();
    expect(screen.getByText(/Lật thẻ tìm cặp tương ứng/i)).toBeDefined();
  });

  it('renders QuizSection and records selected answers', () => {
    const onAnswerChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <QuizSection
        lesson={mockLesson}
        answers={{}}
        onAnswerChange={onAnswerChange}
        onSubmit={onSubmit}
        isSubmitting={false}
        result={null}
        locale="vi"
      />
    );

    expect(screen.getByText('Ai là Mẹ?')).toBeDefined();
    const optionBtn = screen.getByRole('button', { name: /Mom/i });
    fireEvent.click(optionBtn);
    expect(onAnswerChange).toHaveBeenCalledWith('q1', 'opt1');
  });

  it('renders RewardSection with badge, XP and completion actions', () => {
    const onFinish = vi.fn();
    const onReplay = vi.fn();
    render(
      <MemoryRouter>
        <RewardSection
          lesson={mockLesson}
          courseId="momo-home-family-english-5-7"
          quizResult={{ score: 100, passed: true, correct: 1, total: 1, feedback: [] }}
          onFinishLesson={onFinish}
          isSubmitting={false}
          isCompleted={false}
          onReplayLesson={onReplay}
          locale="vi"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Chúc mừng bé đã hoàn thành bài học!/i)).toBeDefined();
    expect(screen.getByText('Family Explorer')).toBeDefined();
    expect(screen.getByText('+25 XP')).toBeDefined();

    const finishBtn = screen.getByRole('button', { name: /Lưu tiến độ & Hoàn tất/i });
    fireEvent.click(finishBtn);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('renders Vietnamese prompt_vi in QuizSection', () => {
    render(
      <QuizSection
        lesson={{
          ...mockLesson,
          quiz: [
            {
              question_id: 'q-trunk',
              type: 'word_choice',
              prompt_vi: 'Cái vòi là từ nào?',
              questionAudioText: 'Find trunk.',
              options: [
                { option_id: 'opt1', label: 'Trunk' },
                { option_id: 'opt2', label: 'Ear' },
              ],
              correctOptionId: 'opt1',
              feedbackCorrect: 'Giỏi quá! Con chọn đúng rồi.',
              feedbackIncorrect: 'Bé hãy thử lại nhé.',
            },
          ],
        }}
        answers={{}}
        onAnswerChange={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        result={null}
        locale="vi"
      />
    );

    expect(screen.getByText('Cái vòi là từ nào?')).toBeDefined();
  });

  it('renders word_vi translations in VocabularySection', () => {
    render(
      <VocabularySection
        lesson={mockLesson}
        onWordPracticed={vi.fn()}
        practicedWords={{}}
        locale="vi"
      />
    );

    expect(screen.getByText('Mẹ')).toBeDefined();
  });

  it('shows only one active quiz question at a time and advances on Continue', () => {
    const onAnswerChange = vi.fn();
    const onSubmit = vi.fn();
    const multiQuestionLesson: Lesson = {
      ...mockLesson,
      quiz: [
        {
          question_id: 'q1',
          type: 'word_choice',
          prompt_vi: 'Trunk nghĩa là gì?',
          questionAudioText: 'Trunk.',
          options: [
            { option_id: 'opt1-1', label: 'Vòi voi' },
            { option_id: 'opt1-2', label: 'Cái tai' },
          ],
          correctOptionId: 'opt1-1',
          feedbackCorrect: 'Chính xác!',
          feedbackIncorrect: 'Thử lại nhé!',
        },
        {
          question_id: 'q2',
          type: 'word_choice',
          prompt_vi: 'Big nghĩa là gì?',
          questionAudioText: 'Big.',
          options: [
            { option_id: 'opt2-1', label: 'To lớn' },
            { option_id: 'opt2-2', label: 'Bé nhỏ' },
          ],
          correctOptionId: 'opt2-1',
          feedbackCorrect: 'Tuyệt vời!',
          feedbackIncorrect: 'Thử lại nhé!',
        },
      ],
    };

    render(
      <QuizSection
        lesson={multiQuestionLesson}
        answers={{}}
        onAnswerChange={onAnswerChange}
        onSubmit={onSubmit}
        isSubmitting={false}
        result={null}
        locale="vi"
      />
    );

    // Only Question 1 is visible
    expect(screen.getByText('Trunk nghĩa là gì?')).toBeDefined();
    expect(screen.queryByText('Big nghĩa là gì?')).toBeNull();

    // Select option for Question 1
    const optBtn = screen.getByRole('button', { name: /Vòi voi/i });
    fireEvent.click(optBtn);
    expect(onAnswerChange).toHaveBeenCalledWith('q1', 'opt1-1');

    // Continue button appears and advances to Question 2
    const continueBtn = screen.getByRole('button', { name: /Tiếp tục/i });
    fireEvent.click(continueBtn);

    // Question 2 is now active
    expect(screen.getByText('Big nghĩa là gì?')).toBeDefined();
    expect(screen.queryByText('Trunk nghĩa là gì?')).toBeNull();
  });

  it('never displays sticker.svg or pending filenames on the Reward screen', () => {
    render(
      <MemoryRouter>
        <RewardSection
          lesson={{
            ...mockLesson,
            reward: {
              xp: 80,
              badgeTitle: 'Elephant Star',
              message_vi: 'Con đã hoàn thành bài học!',
              sticker: {
                bucket: 'learnar-assets',
                path: 'courses/momo-nature/lessons/meet-the-elephant/stickers/sticker.svg',
                type: 'sticker',
                status: 'pending',
              },
            },
          }}
          courseId="momo-nature-english-5-7"
          quizResult={{ score: 100, passed: true, correct: 3, total: 3, feedback: [] }}
          onFinishLesson={vi.fn()}
          isSubmitting={false}
          isCompleted={false}
          onReplayLesson={vi.fn()}
          locale="vi"
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Con làm rất tốt!')).toBeDefined();
    expect(screen.getByText('Elephant Star')).toBeDefined();
    expect(screen.getByText('+80 XP')).toBeDefined();

    // Technical filenames and statuses must NEVER render
    expect(screen.queryByText(/sticker\.svg/i)).toBeNull();
    expect(screen.queryByText(/pending/i)).toBeNull();
    expect(screen.queryByText(/đang chờ/i)).toBeNull();
  });
});
