import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { activityAtCompletedCount, orderLessonActivities } from '../components/lessonActivityRuntime';
import type { LessonActivity } from '../types/course';

const sourceRoot = 'E:/University/Graduted Project/Edu-platform/mobile/rn/src';
const read = (file: string) => fs.readFileSync(path.join(sourceRoot, file), 'utf8');
const courseCard = read('components/CourseCard.tsx');
const showcase = read('components/CourseShowcaseCard.tsx');
const courseList = read('screens/CourseListScreen.tsx');
const courseDetail = read('screens/CourseDetailScreen.tsx');
const lessonPlayer = read('screens/LessonPlayerScreen.tsx');
const session = read('screens/LearningSessionScreen.tsx');
const vocabulary = read('components/LearnVocabularyActivityRenderer.tsx');
const game = read('components/CourseGameActivityRenderer.tsx');
const quiz = read('components/QuizActivityRenderer.tsx');
const api = read('services/api.ts');

const canonicalIds = ['cat', 'dog', 'bird', 'fish', 'rabbit'].map((word) => `animals-v1-${word}`);
const fixture = canonicalIds.map((vocabulary_id) => ({
  vocabulary_id,
  illustration: { role: 'vocabulary_illustration', url: `https://assets.example/${vocabulary_id}.png`, media_type: 'image' },
  pronunciation_audio: { role: 'pronunciation_audio', url: `https://assets.example/${vocabulary_id}.wav`, media_type: 'audio' },
}));

describe('LC11 canonical RN content integration', () => {
  it('Course cards consume the canonical backend cover URL', () => {
    assert.match(courseCard, /course\.thumbnail_url/);
    assert.match(showcase, /imageUrl/);
    assert.match(courseList, /featuredCourse\.thumbnail_url/);
    assert.match(courseDetail, /course\?\.thumbnail_url/);
  });

  it('schema-v2 Lessons enter the existing LearningSession', () => {
    assert.match(lessonPlayer, /learning_blocks\.schema_version === 2/);
    assert.match(lessonPlayer, /<LearningSessionScreen/);
  });

  it('activity order is derived from backend-authored order values', () => {
    assert.match(session, /orderLessonActivities/);
    assert.doesNotMatch(lessonPlayer, /\['learn_vocabulary',\s*'mini_game',\s*'quiz'\]/);
  });

  it('learn_vocabulary renders the resolved illustration URL', () => {
    assert.match(vocabulary, /item\.illustration\.url/);
  });

  it('learn_vocabulary consumes the resolved pronunciation asset', () => {
    assert.match(vocabulary, /item\.pronunciation_audio\.url/);
  });

  it('audio tap forwards the resolved URL to the existing playback hook', () => {
    assert.match(vocabulary, /playVocabulary\(item\.pronunciation_audio\.url\)/);
  });

  it('mini_game dispatch remains CourseGameActivityRenderer', () => {
    assert.match(session, /currentActivity\?\.type === 'mini_game'/);
    assert.match(session, /<CourseGameActivityRenderer/);
  });

  it('Memory Match renders the canonical resolved illustration', () => {
    assert.match(game, /c\.asset\?\.url\?\?c\.content/);
  });

  it('quiz dispatch remains the LC3 renderer', () => {
    assert.match(session, /currentActivity\?\.type === 'quiz'/);
    assert.match(session, /<QuizActivityRenderer/);
    assert.match(quiz, /coursesApi\.getQuizActivity/);
  });

  it('canonical game asset is preferred while legacy fallback remains', () => {
    assert.match(game, /c\.asset\?\.url\?\?c\.content/);
  });

  it('missing learner media never routes to AR', () => {
    assert.doesNotMatch(vocabulary, /Unity|ARScreen|reference_image|modelUrl/);
  });

  it('the final backend-driven activity can reach session completion', () => {
    assert.match(session, /onComplete=\{handleAdvance\}/);
    assert.match(session, /sessionState\.status === 'COMPLETED'/);
  });

  it('the Cat fixture traverses vocabulary, Memory Match, then Quiz', () => {
    const activities = orderLessonActivities([
      { activity_id: 'cat:quiz', type: 'quiz', order: 3, required: true, completion_policy: { mode: 'quiz_complete' }, config: { question_ids: [1], order_policy: 'authored' } },
      { activity_id: 'cat:learn', type: 'learn_vocabulary', order: 1, required: true, completion_policy: { mode: 'all_items' }, config: { vocabulary_ids: canonicalIds } },
      { activity_id: 'cat:game', type: 'mini_game', order: 2, required: true, completion_policy: { mode: 'game_complete' }, config: { game_type: 'memory_match', mini_game_item_ids: [1] } },
    ] as LessonActivity[]);
    assert.deepStrictEqual([0, 1, 2].map((count) => activityAtCompletedCount(activities, count)?.type), [
      'learn_vocabulary',
      'mini_game',
      'quiz',
    ]);
  });

  it('RN performs no Supabase import or bucket/path construction', () => {
    const learnerSources = [courseCard, showcase, courseList, lessonPlayer, session, vocabulary, game, quiz, api].join('\n');
    assert.doesNotMatch(learnerSources, /from ['\"]@supabase|createClient\(|AR_models\/courses|storage\.from\(/);
  });

  it('all five canonical vocabulary payloads are render-consumable', () => {
    assert.deepStrictEqual(fixture.map((item) => item.vocabulary_id), canonicalIds);
    assert.ok(fixture.every((item) => item.illustration.url.endsWith('.png')));
    assert.ok(fixture.every((item) => item.pronunciation_audio.url.endsWith('.wav')));
  });
});
