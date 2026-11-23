import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const courseTypes = resolve(process.cwd(), 'src/types/course.ts');
const gameRenderer = resolve(process.cwd(), 'src/components/CourseGameActivityRenderer.tsx');

test('LC5 learner roles are closed and exclude native-AR asset roles', async () => {
  const source = await readFile(courseTypes, 'utf8');
  assert.match(source, /LearnerAssetRole = 'course_cover' \| 'warm_up_visual' \| 'vocabulary_illustration' \| 'pronunciation_audio' \| 'coloring_outline'/);
  assert.doesNotMatch(source, /LearnerAssetRole[^;]*reference_image/);
  assert.doesNotMatch(source, /LearnerAssetRole[^;]*model_3d/);
});

test('LC4 renderer consumes an optional resolved learner asset while retaining legacy content', async () => {
  const source = await readFile(gameRenderer, 'utf8');
  assert.match(source, /c\.asset\?\.url\?\?c\.content/);
});
