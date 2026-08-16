/**
 * @file Tests for mock AR data used in multi-card tracking flow.
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          "--import=data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/mock-ar-data.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mapToCardDescriptor } from '../bridge/ARExperienceMapper';
import { MOCK_AR_CARDS, MOCK_SINGLE_CARD, MOCK_COMBO_CARDS, toCardDescriptors } from './mockARData';

test('MOCK_AR_CARDS have all required native AR fields', () => {
  for (const card of MOCK_AR_CARDS) {
    assert.ok(card.reference_image_url, `${card.qr_id} must have reference_image_url`);
    assert.ok(card.physical_width_m, `${card.qr_id} must have physical_width_m`);
    assert.equal(typeof card.reference_image_url, 'string');
    assert.equal(typeof card.physical_width_m, 'number');
    assert.ok(card.physical_width_m > 0, `${card.qr_id} physical_width_m must be positive`);
  }
});

test('mapToCardDescriptor returns ok for mock cards', () => {
  const result = mapToCardDescriptor(MOCK_SINGLE_CARD);
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;
  assert.equal(result.descriptor.qrId, 'flashcard_cat');
  assert.ok(result.descriptor.imageUrl.startsWith('https://'));
  assert.ok(result.descriptor.physicalWidthMeters > 0);
});

test('toCardDescriptors converts mock cards to bridge format', () => {
  const descriptors = toCardDescriptors(MOCK_AR_CARDS);
  assert.equal(descriptors.length, MOCK_AR_CARDS.length);
  for (const desc of descriptors) {
    assert.ok(desc.qrId.startsWith('flashcard_'));
    assert.ok(desc.imageUrl.startsWith('https://'));
    assert.ok(desc.physicalWidthMeters > 0);
  }
});

test('MOCK_COMBO_CARDS can be used for combo detection', () => {
  const descriptors = toCardDescriptors(MOCK_COMBO_CARDS);
  assert.equal(descriptors.length, 2);
  // chicken + egg = combo
  const qrIds = descriptors.map(d => d.qrId).sort();
  assert.deepEqual(qrIds, ['flashcard_chicken', 'flashcard_egg']);
});

test('mock data is compatible with startImageTrackingMulti payload', () => {
  // Verify the mock data can be used directly as StartImageTrackingMultiPayload
  const payload = {
    cards: toCardDescriptors(MOCK_AR_CARDS),
  };
  assert.equal(payload.cards.length, 4);
  for (const card of payload.cards) {
    assert.ok(card.qrId);
    assert.ok(card.imageUrl);
    assert.ok(card.physicalWidthMeters > 0);
  }
});
