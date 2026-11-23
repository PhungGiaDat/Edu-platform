/**
 * @file home-screen-xp.test.ts — HomeScreen XP / progress hero wiring.
 *
 * C27 supersede — the C26 redesign consolidates XP / streak / level into one
 * premium clay hero card. Tests below verify the new wiring:
 *
 *   1. HomeScreen derives XP / level / streak from useUser() stats
 *   2. HomeScreen renders ClayProgressHero (single progress surface)
 *   3. No raw developer error text leaks into the learner surface
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          --import "data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/home-screen-xp.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const HOME_SCREEN_PATH =
  'E:/University/Graduted Project/Edu-platform/mobile/rn/src/screens/HomeScreen.tsx';

const homeScreenSrc = readFileSync(HOME_SCREEN_PATH, 'utf-8');

describe('HomeScreen — premium claymorphic XP / progress wiring', () => {
  it('derives xpCurrent from stats.total_points with a zero fallback', () => {
    assert.ok(
      homeScreenSrc.includes('stats?.total_points ?? 0'),
      'HomeScreen should derive xpCurrent from stats?.total_points ?? 0',
    );
  });

  it('derives level from stats.level with a level-1 fallback', () => {
    assert.ok(
      homeScreenSrc.includes('stats?.level ?? 1'),
      'HomeScreen should derive level with a 1 fallback',
    );
  });

  it('renders a single ClayProgressHero with level, currentXP, xpToNextLevel and streakDays', () => {
    assert.ok(
      homeScreenSrc.includes('<ClayProgressHero'),
      'HomeScreen should render the premium ClayProgressHero',
    );
    const heroIndex = homeScreenSrc.indexOf('<ClayProgressHero');
    const heroBlock = homeScreenSrc.slice(heroIndex, heroIndex + 600);

    assert.ok(heroBlock.includes('level={level}'), 'hero receives level');
    assert.ok(
      heroBlock.includes('currentXP={xpCurrent}'),
      'hero receives currentXP',
    );
    assert.ok(
      heroBlock.includes('xpToNextLevel={xpToNext}'),
      'hero receives xpToNextLevel',
    );
    assert.ok(
      heroBlock.includes('streakDays={streakDays}'),
      'hero receives streakDays',
    );
  });

  it('does NOT leak raw Axios error strings into the learner surface', () => {
    assert.ok(
      !homeScreenSrc.includes('AxiosErr'),
      'HomeScreen should not surface raw Axios error text to learners',
    );
    assert.ok(
      !homeScreenSrc.includes('useCourses: fetchCourses failed'),
      'HomeScreen should not surface useCourses: fetchCourses failed text',
    );
  });

  it('derives streakDays from streak.current_streak with a zero fallback', () => {
    assert.ok(
      homeScreenSrc.includes('streak?.current_streak ?? 0'),
      'HomeScreen should derive streakDays from streak?.current_streak ?? 0',
    );
  });

  it('renders Continue Learning primary CTA via ClayContinueCard', () => {
    assert.ok(
      homeScreenSrc.includes('<ClayContinueCard'),
      'HomeScreen should render ClayContinueCard as primary CTA',
    );
  });
});
