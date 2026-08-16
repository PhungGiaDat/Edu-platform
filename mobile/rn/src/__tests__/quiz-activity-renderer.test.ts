/**
 * Contract coverage for the LC3 RN quiz renderer.
 *
 * The project has no React component-test framework; these tests follow the
 * existing Node source-contract convention while keeping the UI testable by
 * asserting the production request/dispatch boundaries.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  createQuizAnswerPayload,
  isRenderableQuizQuestion,
} from '../components/quizActivityRuntime';
import type { QuizActivityQuestion } from '../types/course';

const sourceRoot = 'E:/University/Graduted Project/Edu-platform/mobile/rn/src';
const rendererSource = fs.readFileSync(path.join(sourceRoot, 'components/QuizActivityRenderer.tsx'), 'utf8');
const sessionSource = fs.readFileSync(path.join(sourceRoot, 'screens/LearningSessionScreen.tsx'), 'utf8');
const courseDetailSource = fs.readFileSync(path.join(sourceRoot, 'screens/CourseDetailScreen.tsx'), 'utf8');
const lessonPlayerSource = fs.readFileSync(path.join(sourceRoot, 'screens/LessonPlayerScreen.tsx'), 'utf8');

const question: QuizActivityQuestion = {
  question_id: 71,
  question_type: 'multiple_choice',
  prompt: 'Backend-provided prompt',
  flashcard_qr_id: 'fixture-qr',
  options: [
    { option_id: '71:1', label: 'First option', order: 1 },
    { option_id: '71:2', label: 'Second option', order: 2 },
  ],
};

describe('LC3 QuizActivityRenderer', () => {
  it('submits only backend question and option identity', () => {
    assert.deepStrictEqual(createQuizAnswerPayload(question, '71:2'), {
      question_id: 71,
      option_id: '71:2',
    });
  });

  it('accepts only the two backend-supported learner-safe question shapes', () => {
    assert.strictEqual(isRenderableQuizQuestion(question), true);
    assert.strictEqual(
      isRenderableQuizQuestion({ ...question, question_type: 'true_false' }),
      true,
    );
    assert.strictEqual(isRenderableQuizQuestion({ ...question, prompt: '' }), false);
    assert.strictEqual(isRenderableQuizQuestion({ ...question, options: [] }), false);
  });

  it('hydrates through the LC3 API and preserves backend question order', () => {
    assert.match(rendererSource, /coursesApi\.getQuizActivity\(courseId, lessonId, activity\.activity_id\)/);
    assert.match(rendererSource, /setHydration\(nextHydration\)/);
    assert.doesNotMatch(rendererSource, /\.sort\(|\.shuffle\(|Math\.random\(/);
  });

  it('never receives or derives answer authority during hydration', () => {
    assert.doesNotMatch(rendererSource, /correctOptionId|answerKey|isCorrect/);
    assert.match(rendererSource, /coursesApi\.submitQuizActivityAnswer/);
    assert.match(rendererSource, /answerResult\.correct/);
  });

  it('renders both current backend question types as backend-labelled options', () => {
    assert.match(rendererSource, /question_type === 'true_false'/);
    assert.match(rendererSource, /currentQuestion\.options\.map/);
    assert.match(rendererSource, /\{option\.label\}/);
  });

  it('blocks duplicate sends, keeps a failed selection for retry, and only completes from backend state', () => {
    assert.match(rendererSource, /if \(!currentQuestion \|\| !selectedOptionId \|\| submitting \|\| answerResult\) return/);
    assert.match(rendererSource, /Keep the selected identity in local presentation state so a transport/);
    assert.match(rendererSource, /if \(answerResult\.completed\) \{[\s\S]*onComplete\(\)/);
  });

  it('handles empty and malformed hydration without treating the quiz as complete', () => {
    assert.match(rendererSource, /nextHydration\.questions\.length === 0/);
    assert.match(rendererSource, /!nextHydration\.questions\.every\(isRenderableQuizQuestion\)/);
    assert.doesNotMatch(rendererSource, /questions\.length === 0[\s\S]{0,160}onComplete\(/);
  });

  it('dispatches a quiz activity inside LearningSession while preserving legacy children', () => {
    assert.match(sessionSource, /currentActivity\?\.type === 'quiz' && courseId && lessonId/);
    assert.match(sessionSource, /<QuizActivityRenderer/);
    assert.match(sessionSource, /onComplete=\{handleAdvance\}/);
    assert.match(sessionSource, /\) : \(\s*children\s*\)/);
  });

  it('keeps the data-driven route in the existing lesson flow without a Quiz screen', () => {
    assert.match(courseDetailSource, /lessonId: lesson\.lesson_id,[\s\S]*lesson,/);
    assert.match(lessonPlayerSource, /learning_blocks\.schema_version === 2/);
    assert.match(lessonPlayerSource, /activities=\{activities\}/);
    assert.match(lessonPlayerSource, /totalSteps=\{activities\.length\}/);
    assert.doesNotMatch(lessonPlayerSource, /QuizSessionScreen/);
  });
});
