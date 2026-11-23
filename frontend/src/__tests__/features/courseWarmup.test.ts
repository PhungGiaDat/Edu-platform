import { describe, expect, it } from 'vitest';

import { selectCourseWarmupQuestions } from '@/features/courses/courseWarmup';
import type { Lesson, QuizQuestion } from '@/types/course';

const question = (id: string, type: QuizQuestion['type'] = 'image_choice'): QuizQuestion => ({
  question_id: id,
  type,
  prompt_vi: `Cau hoi ${id}`,
  questionAudioText: '',
  options: [
    { option_id: `${id}-right`, label: 'Dung' },
    { option_id: `${id}-wrong`, label: 'Sai' },
  ],
  correctOptionId: `${id}-right`,
  feedbackCorrect: 'Dung roi',
  feedbackIncorrect: 'Thu lai nhe',
});

const lesson = (id: string, order: number, quiz: QuizQuestion[]): Lesson => ({
  lesson_id: id,
  title: id,
  title_vi: id,
  order,
  duration_minutes: 5,
  video_duration: 0,
  vocabulary: [],
  quiz,
  images: [],
  scene_images: [],
  generatedMedia: [],
});

describe('selectCourseWarmupQuestions', () => {
  it('starts at the current lesson, remains ordered, and caps the warm-up at three questions', () => {
    const result = selectCourseWarmupQuestions([
      lesson('one', 1, [question('one-a')]),
      lesson('two', 2, [question('two-a'), question('two-b')]),
      lesson('three', 3, [question('three-a')]),
    ], 'two');

    expect(result.map((item) => item.question_id)).toEqual(['two-a', 'two-b', 'three-a']);
  });

  it('excludes malformed, unsupported, and duplicate authored questions', () => {
    const invalid = {
      ...question('invalid'),
      options: [{ option_id: 'only', label: 'Only one' }],
      correctOptionId: 'missing',
    };
    const result = selectCourseWarmupQuestions([
      lesson('one', 1, [question('duplicate'), invalid, question('sound', 'sound_choice')]),
      lesson('two', 2, [question('duplicate'), question('safe', 'word_choice')]),
    ]);

    expect(result.map((item) => item.question_id)).toEqual(['duplicate', 'safe']);
  });

  it('returns no question when every authored record is unsafe', () => {
    const result = selectCourseWarmupQuestions([
      lesson('one', 1, [{ ...question('blank'), prompt_vi: '   ' }]),
    ]);

    expect(result).toEqual([]);
  });
});
