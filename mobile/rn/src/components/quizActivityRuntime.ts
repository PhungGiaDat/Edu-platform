/** Pure LC3 quiz runtime helpers, kept independent of React Native for tests. */
import type {
  QuizActivityAnswerRequest,
  QuizActivityQuestion,
} from '../types/course';

export const createQuizAnswerPayload = (
  question: QuizActivityQuestion,
  optionId: string,
): QuizActivityAnswerRequest => ({
  question_id: question.question_id,
  option_id: optionId,
});

export const isRenderableQuizQuestion = (question: QuizActivityQuestion): boolean =>
  (question.question_type === 'multiple_choice' || question.question_type === 'true_false') &&
  typeof question.prompt === 'string' &&
  question.prompt.trim().length > 0 &&
  Array.isArray(question.options) &&
  question.options.length > 0 &&
  question.options.every(
    (option) =>
      typeof option.option_id === 'string' &&
      option.option_id.length > 0 &&
      typeof option.label === 'string' &&
      option.label.trim().length > 0,
  );
