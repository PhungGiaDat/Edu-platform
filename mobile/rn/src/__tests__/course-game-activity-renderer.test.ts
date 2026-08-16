import { describe, it } from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
const root='E:/University/Graduted Project/Edu-platform/mobile/rn/src';
const game=fs.readFileSync(`${root}/components/CourseGameActivityRenderer.tsx`,'utf8'); const session=fs.readFileSync(`${root}/screens/LearningSessionScreen.tsx`,'utf8');
describe('LC4 CourseGameActivityRenderer',()=>{
 it('hydrates configured backend game data and submits only matched pair identities',()=>{assert.match(game,/coursesApi\.getMiniGameActivity\(courseId,lessonId,activity\.activity_id\)/);assert.match(game,/completeMiniGameActivity\(courseId,lessonId,activity\.activity_id,next\)/);assert.doesNotMatch(game,/completeMiniGameActivity\([^\n]*xp|completeMiniGameActivity\([^\n]*reward|completeMiniGameActivity\([^\n]*sticker/)});
 it('derives cards from hydration and handles matching safely',()=>{assert.match(game,/setCards\(\[\.\.\.d\.cards\]/);assert.match(game,/chosen\[0\]\.pair_id===chosen\[1\]\.pair_id/);assert.match(game,/matched\.includes\(card\.pair_id\)/);assert.match(game,/setTimeout\(\(\)=>setPicked\(\[\]\),500\)/)});
 it('LearningSession keeps quiz and adds mini_game dispatch',()=>{assert.match(session,/QuizActivityRenderer/);assert.match(session,/currentActivity\?\.type === 'mini_game'/);assert.match(session,/CourseGameActivityRenderer/)});
});
