import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = 'E:/University/Graduted Project/Edu-platform/mobile/rn/src';
const fixtureSource = fs.readFileSync(path.join(sourceRoot, 'prototypes/catLesson/catLessonFixture.ts'), 'utf8');
const prototypeSource = fs.readFileSync(path.join(sourceRoot, 'prototypes/catLesson/CatLessonPrototype.tsx'), 'utf8');
const appSource = fs.readFileSync(path.join(sourceRoot, 'App.tsx'), 'utf8');

describe('Cat lesson composition prototype', () => {
  it('uses one ordered fixture for the six learning blocks and terminal reward', () => {
    const orderedTypes = [
      'warm_up',
      'learn_vocabulary',
      'listen_choose',
      'match',
      'memory_match',
      'quiz',
      'reward',
    ];
    let cursor = -1;
    for (const type of orderedTypes) {
      const next = fixtureSource.indexOf(`type: '${type}'`, cursor + 1);
      assert.ok(next > cursor, `${type} must appear after the previous block`);
      cursor = next;
    }
  });

  it('keeps Cat as focus while Dog and Bird remain contrast identities', () => {
    assert.match(fixtureSource, /focusAnimalId: 'cat'/);
    assert.match(fixtureSource, /contrastAnimalIds: \['dog', 'bird'\]/);
    assert.match(fixtureSource, /animals-v1-cat/);
    assert.match(fixtureSource, /animals-v1-dog/);
    assert.match(fixtureSource, /animals-v1-bird/);
  });

  it('dispatches every fixture block through one LearningBlockRenderer', () => {
    assert.match(prototypeSource, /function LearningBlockRenderer/);
    for (const type of ['warm_up', 'learn_vocabulary', 'listen_choose', 'match', 'memory_match', 'quiz', 'reward']) {
      assert.match(prototypeSource, new RegExp(`case '${type}'`));
    }
  });

  it('is presentation-only and does not call production APIs or reward mutations', () => {
    assert.doesNotMatch(prototypeSource, /coursesApi|gamificationApi|submitLessonStep|completeLesson/);
    assert.match(prototypeSource, /no reward was saved/);
  });

  it('is gated behind an Expo public flag and development mode', () => {
    assert.match(appSource, /__DEV__ && process\.env\.EXPO_PUBLIC_CAT_LESSON_PROTOTYPE === '1'/);
    assert.match(appSource, /<CatLessonPrototype \/>/);
  });
});
