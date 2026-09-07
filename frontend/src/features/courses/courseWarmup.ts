import type { Lesson, QuizQuestion } from '@/types/course';

export type CourseWarmupQuestion = Pick<
  QuizQuestion,
  'question_id' | 'type' | 'prompt_vi' | 'options' | 'correctOptionId' | 'feedbackCorrect' | 'feedbackIncorrect'
>;

const SUPPORTED_WARMUP_TYPES = new Set<CourseWarmupQuestion['type']>(['image_choice', 'word_choice']);

const isSafeWarmupQuestion = (question: QuizQuestion): boolean => {
  if (!SUPPORTED_WARMUP_TYPES.has(question.type) || !question.question_id.trim() || !question.prompt_vi.trim()) {
    return false;
  }

  const optionIds = new Set<string>();
  for (const option of question.options) {
    if (!option.option_id.trim() || !option.label.trim() || optionIds.has(option.option_id)) {
      return false;
    }
    optionIds.add(option.option_id);
  }

  return optionIds.size >= 2 && optionIds.has(question.correctOptionId);
};

const orderedLessonsFromCurrent = (lessons: Lesson[], currentLessonId?: string | null): Lesson[] => {
  const ordered = [...lessons].sort((left, right) => left.order - right.order);
  const currentIndex = currentLessonId ? ordered.findIndex((lesson) => lesson.lesson_id === currentLessonId) : -1;

  return currentIndex > 0 ? [...ordered.slice(currentIndex), ...ordered.slice(0, currentIndex)] : ordered;
};

export function selectCourseWarmupQuestions(
  lessons: Lesson[],
  currentLessonId?: string | null,
  limit = 3,
): CourseWarmupQuestion[] {
  const boundedLimit = Math.max(0, Math.min(limit, 3));
  if (boundedLimit === 0) return [];

  const seenQuestionIds = new Set<string>();
  const selected: CourseWarmupQuestion[] = [];

  for (const lesson of orderedLessonsFromCurrent(lessons, currentLessonId)) {
    for (const question of lesson.quiz) {
      if (!isSafeWarmupQuestion(question) || seenQuestionIds.has(question.question_id)) continue;

      seenQuestionIds.add(question.question_id);
      selected.push(question);
      if (selected.length === boundedLimit) return selected;
    }
  }

  return selected;
}
