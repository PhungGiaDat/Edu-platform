/**
 * @file M3A — Native tracking consumer wiring tests.
 *
 * Scope: verifies the ARScreen M3A wiring WITHOUT touching Unity source
 * or requiring a physical Unity runtime. Pure Node.js source-string
 * tests for the consumer wiring step.
 *
 * M3A acceptance criteria verified here:
 *   1. ARScreen imports the M3A mapper functions.
 *   2. ARScreen uses `validateNativeTrackingMetadata` after the API response.
 *   3. ARScreen uses `toCardDescriptorRN` to produce the bridge DTO.
 *   4. ARScreen handles both `ready` and `unavailable` branches.
 *   5. ARScreen surfaces the BACKEND_METADATA_UNAVAILABLE constant.
 *   6. ARScreen does NOT call Unity runtime when unavailable.
 *   7. ARScreen renders a banner for the unavailable state.
 *   8. ARScreen still preserves the legacy single-card UnityARExperiencePayload path.
 *
 * NOT covered here (M3B / later phases):
 *   - Actual startImageTrackingMulti native execution
 *   - ARTrackedImage detection
 *   - AR_READY runtime E2E
 *   - Physical device verification
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          "--import=data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/arscreen-m3a-wiring.test.ts
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const __dirname = import.meta.dirname;
const SRC = path.resolve(__dirname, '..');

const ARSCREEN_SOURCE = fs.readFileSync(
  path.join(SRC, 'screens', 'ARScreen.tsx'),
  'utf-8',
);

const MAPPER_SOURCE = fs.readFileSync(
  path.join(SRC, 'bridge', 'ARExperienceMapper.ts'),
  'utf-8',
);

const AR_TYPES_SOURCE = fs.readFileSync(
  path.join(SRC, 'types', 'ar.ts'),
  'utf-8',
);

// ---------------------------------------------------------------------------
// 1. ARScreen imports the M3A mapper functions
// ---------------------------------------------------------------------------

test('M3A consumer — ARScreen imports validateNativeTrackingMetadata + toCardDescriptorRN', () => {
  assert.ok(
    ARSCREEN_SOURCE.includes('validateNativeTrackingMetadata'),
    'ARScreen imports validateNativeTrackingMetadata',
  );
  assert.ok(
    ARSCREEN_SOURCE.includes('toCardDescriptorRN'),
    'ARScreen imports toCardDescriptorRN',
  );
  // The mapper module is the source for these functions.
  assert.ok(
    MAPPER_SOURCE.includes('export const validateNativeTrackingMetadata'),
    'Mapper exports validateNativeTrackingMetadata',
  );
  assert.ok(
    MAPPER_SOURCE.includes('export const toCardDescriptorRN'),
    'Mapper exports toCardDescriptorRN',
  );
});

// ---------------------------------------------------------------------------
// 2. ARScreen uses the validation step after the API response
// ---------------------------------------------------------------------------

test('M3A consumer — ARScreen calls validateNativeTrackingMetadata after flashcardApi.getFlashcard', () => {
  // Verify the API call is followed by validation.
  const apiIdx = ARSCREEN_SOURCE.indexOf('flashcardApi.getFlashcard(lessonId)');
  const validateIdx = ARSCREEN_SOURCE.indexOf('validateNativeTrackingMetadata(response.data)');
  assert.ok(apiIdx > 0, 'ARScreen calls flashcardApi.getFlashcard(lessonId)');
  assert.ok(validateIdx > 0, 'ARScreen calls validateNativeTrackingMetadata(response.data)');
  assert.ok(validateIdx > apiIdx, 'validation is called AFTER the API response');
});

// ---------------------------------------------------------------------------
// 3. ARScreen uses the bridge mapping step
// ---------------------------------------------------------------------------

test('M3A consumer — ARScreen calls toCardDescriptorRN when ready', () => {
  const readyBranchIdx = ARSCREEN_SOURCE.indexOf('availability.kind === \'ready\'');
  assert.ok(readyBranchIdx > 0, 'ARScreen has a ready branch');
  const toCardIdx = ARSCREEN_SOURCE.indexOf('toCardDescriptorRN(availability.tracking)');
  assert.ok(toCardIdx > 0, 'ARScreen calls toCardDescriptorRN');
  assert.ok(toCardIdx > readyBranchIdx, 'toCardDescriptorRN is called inside the ready branch');
});

// ---------------------------------------------------------------------------
// 4. ARScreen handles both ready and unavailable branches
// ---------------------------------------------------------------------------

test('M3A consumer — ARScreen handles ready branch (state=ready)', () => {
  assert.ok(
    ARSCREEN_SOURCE.includes('state: \'ready\''),
    'ARScreen transitions to ready state',
  );
  assert.ok(
    ARSCREEN_SOURCE.includes('qrId: descriptor.qrId'),
    'ARScreen stores qrId from the ready descriptor',
  );
});

test('M3A consumer — ARScreen handles unavailable branch (state=unavailable, BACKEND_METADATA_UNAVAILABLE)', () => {
  assert.ok(
    ARSCREEN_SOURCE.includes('state: \'unavailable\''),
    'ARScreen transitions to unavailable state',
  );
  assert.ok(
    ARSCREEN_SOURCE.includes('BACKEND_METADATA_UNAVAILABLE'),
    'ARScreen references BACKEND_METADATA_UNAVAILABLE',
  );
  assert.ok(
    ARSCREEN_SOURCE.includes('code: BACKEND_METADATA_UNAVAILABLE'),
    'ARScreen stores the BACKEND_METADATA_UNAVAILABLE code on unavailable',
  );
});

// ---------------------------------------------------------------------------
// 5. ARScreen does NOT call Unity runtime when unavailable
// ---------------------------------------------------------------------------

test('M3A consumer — ARScreen does NOT call startImageTrackingMulti when unavailable', () => {
  // The M3A boundary stops before Unity runtime. The unavailable branch
  // must NOT attempt to start native image tracking.
  // We scan the actual body of the `else` branch (from `setNativeTracking({`
  // through the closing `}`), excluding the preceding comment that may
  // mention startImageTrackingMulti for documentation purposes.
  const setNativeUnavailableIdx = ARSCREEN_SOURCE.indexOf('setNativeTracking({');
  assert.ok(setNativeUnavailableIdx > 0, 'setNativeTracking call present');
  const endObj = ARSCREEN_SOURCE.indexOf('})', setNativeUnavailableIdx);
  assert.ok(endObj > 0, 'setNativeTracking call has a closing brace');
  const unavailableBody = ARSCREEN_SOURCE.slice(setNativeUnavailableIdx, endObj + 2);

  assert.ok(
    !unavailableBody.includes('startImageTrackingMulti'),
    'unavailable branch body MUST NOT call startImageTrackingMulti',
  );
  assert.ok(
    !unavailableBody.includes('unityBridge.'),
    'unavailable branch body MUST NOT call unityBridge',
  );
});

test('M3A consumer — ARScreen does NOT fabricate CardDescriptorRN when unavailable', () => {
  // When unavailable, only the qrId and code are stored — no fabricated
  // imageUrl or physicalWidthMeters in the unavailable body.
  const setNativeUnavailableIdx = ARSCREEN_SOURCE.indexOf('setNativeTracking({');
  assert.ok(setNativeUnavailableIdx > 0, 'setNativeTracking call present');
  const endObj = ARSCREEN_SOURCE.indexOf('})', setNativeUnavailableIdx);
  const unavailableBody = ARSCREEN_SOURCE.slice(setNativeUnavailableIdx, endObj + 2);
  assert.ok(
    !unavailableBody.includes('imageUrl'),
    'unavailable branch body MUST NOT contain imageUrl',
  );
  assert.ok(
    !unavailableBody.includes('physicalWidthMeters'),
    'unavailable branch body MUST NOT contain physicalWidthMeters',
  );
});

// ---------------------------------------------------------------------------
// 6. ARScreen renders a banner for the unavailable state
// ---------------------------------------------------------------------------

test('M3A consumer — ARScreen surfaces the unavailable state via a banner', () => {
  assert.ok(
    ARSCREEN_SOURCE.includes('isMetadataUnavailable'),
    'ARScreen derives isMetadataUnavailable flag',
  );
  assert.ok(
    ARSCREEN_SOURCE.includes('isMetadataUnavailable &&'),
    'ARScreen renders the banner conditionally',
  );
  assert.ok(
    ARSCREEN_SOURCE.includes('Native tracking metadata unavailable'),
    'Banner text reflects the metadata-unavailable state',
  );
  assert.ok(
    ARSCREEN_SOURCE.includes('nativeTrackingBanner'),
    'Banner style is defined',
  );
});

// ---------------------------------------------------------------------------
// 7. ARScreen preserves the legacy single-card path
// ---------------------------------------------------------------------------

test('M3A consumer — ARScreen still calls mapToUnityPayload (legacy single-card path preserved)', () => {
  assert.ok(
    ARSCREEN_SOURCE.includes('mapToUnityPayload'),
    'ARScreen still uses mapToUnityPayload',
  );
  // The mapper module still exports mapToUnityPayload.
  assert.ok(
    MAPPER_SOURCE.includes('export const mapToUnityPayload'),
    'Mapper still exports mapToUnityPayload',
  );
});

// ---------------------------------------------------------------------------
// 8. Mapper module exposes the explicit two-step boundary
// ---------------------------------------------------------------------------

test('M3A consumer — mapper exposes validateNativeTrackingMetadata AND toCardDescriptorRN as separate functions', () => {
  // The boundary is explicit: validate is its own function, mapping is
  // its own function. The legacy mapToCardDescriptor composes them.
  const exportedFns = MAPPER_SOURCE.match(/export const \w+/g) ?? [];
  const fnNames = exportedFns.map(s => s.replace('export const ', ''));
  assert.ok(fnNames.includes('validateNativeTrackingMetadata'));
  assert.ok(fnNames.includes('toCardDescriptorRN'));
  assert.ok(fnNames.includes('mapToCardDescriptor'));
  assert.ok(fnNames.includes('mapToUnityPayload'));
});

// ---------------------------------------------------------------------------
// 9. NativeTrackingDto is a distinct type in ar.ts
// ---------------------------------------------------------------------------

test('M3A — NativeTrackingDto is a distinct type in types/ar.ts', () => {
  assert.ok(
    AR_TYPES_SOURCE.includes('export interface NativeTrackingDto'),
    'NativeTrackingDto is exported from types/ar.ts',
  );
  assert.ok(
    AR_TYPES_SOURCE.includes('export type NativeTrackingAvailability'),
    'NativeTrackingAvailability is exported from types/ar.ts',
  );
  // NativeTrackingDto uses referenceImageUrl, the bridge uses imageUrl.
  const nativeBlock = AR_TYPES_SOURCE.slice(
    AR_TYPES_SOURCE.indexOf('export interface NativeTrackingDto'),
    AR_TYPES_SOURCE.indexOf('export type NativeTrackingAvailability'),
  );
  assert.ok(nativeBlock.includes('referenceImageUrl'), 'NativeTrackingDto has referenceImageUrl');
  assert.ok(
    !nativeBlock.includes('imageUrl'),
    'NativeTrackingDto does NOT have imageUrl (that is the bridge field name)',
  );
});
