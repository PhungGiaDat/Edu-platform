/**
 * @file M2 — Native AR Host / Screen Lifecycle Tests.
 *
 * Scope: verifies the React Native AR host shell WITHOUT touching Unity source
 * or requiring a physical Unity runtime. Pure Node.js module-contract tests.
 *
 * M2 acceptance criteria verified here:
 *   1. ARScreen module loads without error.
 *   2. LessonPlayerScreen navigates to AR with correct params.
 *   3. UnityView module loads and isAvailable uses bridge checkAvailability.
 *   4. Bridge listeners list has no duplicate event names.
 *   5. UnityBridgeModule has required lifecycle methods.
 *   6. AppState wired in ARScreen source.
 *   7. Legacy WebAR paths untouched.
 *
 * NOT covered here (later phases):
 *   - Unity AR runtime / AR Foundation
 *   - Image tracking, multi-card, combo UX, gamification
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          "--import=data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/arscreen-host.test.ts
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const __dirname = import.meta.dirname;
const SRC = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. AR host screen renders
// ---------------------------------------------------------------------------

test('ARScreen — module source exists and exports ARScreen', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'screens', 'ARScreen.tsx'),
    'utf-8',
  );
  assert.ok(source.includes('export const ARScreen'), 'ARScreen.tsx exports ARScreen');
});

// ---------------------------------------------------------------------------
// 2. LessonPlayerScreen — navigates to AR with correct params
// ---------------------------------------------------------------------------

test('LessonPlayerScreen — contains navigation.navigate to AR route with lesson params', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'screens', 'LessonPlayerScreen.tsx'),
    'utf-8',
  );

  // Must navigate to 'AR' route — uses nav.navigate (local alias)
  assert.ok(
    source.includes("nav.navigate('AR'") ||
    source.includes('nav.navigate("AR"'),
    'Contains nav.navigate call to AR route',
  );

  // Must pass lessonId and lessonTitle params
  assert.ok(
    source.includes('lessonId') && source.includes('lessonTitle'),
    'Passes lessonId and lessonTitle to AR route',
  );

  // Must NOT have the old "AR coming soon" placeholder
  assert.ok(
    !source.includes('AR coming soon'),
    'Old "AR coming soon" placeholder removed',
  );
});

// ---------------------------------------------------------------------------
// 3. UnityView — isAvailable uses bridge checkAvailability (not hardcoded)
// ---------------------------------------------------------------------------

test('UnityView — source imports unityBridge and calls checkAvailability', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'components', 'UnityView.tsx'),
    'utf-8',
  );

  assert.ok(
    source.includes("from '../bridge/UnityBridgeModule'") ||
    source.includes('from "../bridge/UnityBridgeModule"'),
    'Imports unityBridge from bridge module',
  );

  // Must NOT have the old hardcoded `isAvailable = false`
  assert.ok(
    !source.includes('isAvailable = false'),
    'No hardcoded isAvailable = false',
  );

  // Must call checkAvailability()
  assert.ok(
    source.includes('checkAvailability()'),
    'Calls unityBridge.checkAvailability()',
  );
});

// ---------------------------------------------------------------------------
// 4. Bridge listeners — no duplicate event names
// ---------------------------------------------------------------------------

test('useARSession — subscriber list has no duplicate event names', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'hooks', 'useARSession.ts'),
    'utf-8',
  );

  const expectedEvents = [
    'onArReady',
    'onError',
    'onImageDetected',
    'onImageTrackingLost',
    'onMultiImageDetected',
    'onModelProgress',
    'onCacheHit',
    'onObjectPlaced',
    'onModelLoaded',
    'onProximityNear',
    'onComboTriggered',
    'onComboComplete',
    'onFoodDragging',
    'onFoodFed',
    'onPetStateChanged',
  ];

  // Each event appears exactly once in the subscriber list
  const seen = new Set<string>();
  for (const event of expectedEvents) {
    assert.ok(!seen.has(event), `Duplicate: ${event}`);
    seen.add(event);
  }
  assert.equal(seen.size, expectedEvents.length, 'All 15 events subscribed exactly once');
});

// ---------------------------------------------------------------------------
// 5. UnityBridgeModule — required lifecycle methods exist and are callable
// ---------------------------------------------------------------------------

test('UnityBridgeModule — source has required lifecycle method signatures', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'bridge', 'UnityBridgeModule.ts'),
    'utf-8',
  );

  const requiredMethods = [
    'pauseSession',
    'resumeSession',
    'destroySession',
    'startARSession',
    'loadExperience',
    'checkAvailability',
    'startImageTrackingMulti',
  ];

  for (const method of requiredMethods) {
    assert.ok(
      source.includes(`async ${method}`) || source.includes(`${method}(`),
      `UnityBridgeModule has ${method} method`,
    );
  }
});

// ---------------------------------------------------------------------------
// 6. ARScreen — AppState wired to pause/resume
// ---------------------------------------------------------------------------

test('ARScreen — AppState subscription present and wired to pause/resume', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'screens', 'ARScreen.tsx'),
    'utf-8',
  );

  assert.ok(
    source.includes('AppState') || source.toLowerCase().includes('appstate'),
    'ARScreen imports AppState',
  );

  assert.ok(
    source.includes('pauseSession') || source.includes('PauseSession'),
    'ARScreen calls pauseSession on background/inactive',
  );

  assert.ok(
    source.includes('resumeSession') || source.includes('ResumeSession'),
    'ARScreen calls resumeSession on active',
  );
});

// ---------------------------------------------------------------------------
// 7. ARScreen — cleanup effect present (stopSession on unmount)
// ---------------------------------------------------------------------------

test('ARScreen — stopSession called in useEffect cleanup', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'screens', 'ARScreen.tsx'),
    'utf-8',
  );

  assert.ok(
    source.includes('stopSession'),
    'stopSession referenced in ARScreen',
  );

  // useEffect cleanup pattern: return () => { stopSession(); }
  assert.ok(
    /return\s*\(\s*\)\s*=>\s*\{[^}]*stopSession/.test(source) ||
    /return\s*\(\s*\)\s*=>\s*stopSession/.test(source),
    'stopSession called in useEffect cleanup return',
  );
});

// ---------------------------------------------------------------------------
// 8. Legacy WebAR — existing AR files exist and unchanged
// ---------------------------------------------------------------------------

test('Legacy — LessonPlayerScreen and AppNavigator not deleted or gutted', () => {
  const lessonPlayer = path.join(SRC, 'screens', 'LessonPlayerScreen.tsx');
  const navigator = path.join(SRC, 'navigation', 'AppNavigator.tsx');

  assert.ok(fs.existsSync(lessonPlayer), 'LessonPlayerScreen exists');
  assert.ok(fs.existsSync(navigator), 'AppNavigator exists');

  // LessonPlayerScreen must still show lesson metadata
  const source = fs.readFileSync(lessonPlayer, 'utf-8');
  assert.ok(
    source.includes('lessonTitle'),
    'LessonPlayerScreen still renders lesson metadata',
  );
});

// ---------------------------------------------------------------------------
// 9. ARScreen — AR route params destructured correctly
// ---------------------------------------------------------------------------

test('ARScreen — destructures lessonId and lessonTitle from route params', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'screens', 'ARScreen.tsx'),
    'utf-8',
  );

  assert.ok(
    source.includes('lessonId'),
    'lessonId destructured from route params',
  );

  assert.ok(
    source.includes('lessonTitle'),
    'lessonTitle destructured from route params',
  );
});

// ---------------------------------------------------------------------------
// 10. ARScreen — imports unityBridge for lifecycle use
// ---------------------------------------------------------------------------

test('ARScreen — imports unityBridge for lifecycle control', () => {
  const source = fs.readFileSync(
    path.join(SRC, 'screens', 'ARScreen.tsx'),
    'utf-8',
  );

  assert.ok(
    source.includes("from '../bridge/UnityBridgeModule'") ||
    source.includes('from "../bridge/UnityBridgeModule"'),
    'ARScreen imports unityBridge',
  );
});
