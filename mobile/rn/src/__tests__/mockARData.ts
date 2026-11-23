/**
 * @file Mock AR data for testing multi-card tracking.
 *
 * This file provides sample data with complete native AR fields
 * (reference_image_url, physical_width_m) for testing the bridge flow.
 *
 * Used for:
 *   - Unit tests requiring full native metadata
 *   - E2E testing of startImageTrackingMulti flow
 *   - Development/verification when backend fields are not yet populated
 *
 * ⚠️ MOCK DATA ONLY — not for production use.
 * When BACKEND-T001 lands, remove this file and use real API responses.
 */

// Sample reference images (public domain / placeholder URLs)
// In production, these would come from backend's S3/CDN
const SAMPLE_REF_IMAGES = {
  cat: 'https://raw.githubusercontent.com/EduPlatform-AR/ref-images/main/cat-flashcard.jpg',
  dog: 'https://raw.githubusercontent.com/EduPlatform-AR/ref-images/main/dog-flashcard.jpg',
  chicken: 'https://raw.githubusercontent.com/EduPlatform-AR/ref-images/main/chicken-flashcard.jpg',
  egg: 'https://raw.githubusercontent.com/EduPlatform-AR/ref-images/main/egg-flashcard.jpg',
};

/**
 * Sample cards with complete native AR metadata.
 * These match the shape returned by backend after BACKEND-T001 migration.
 */
export const MOCK_AR_CARDS = [
  {
    qr_id: 'flashcard_cat',
    word: 'cat',
    translation_vi: 'con mèo',
    audio_url: 'https://cdn.example.com/audio/cat.mp3',
    model_url: 'https://cdn.example.com/models/cat.glb',
    animation_type: 'idle' as const,
    glb_size: 1.2,
    position: '0 0 0',
    rotation: '0 0 0',
    scale: '1 1 1',
    reference_image_url: SAMPLE_REF_IMAGES.cat,
    physical_width_m: 0.085,
    related_combos: [],
  },
  {
    qr_id: 'flashcard_dog',
    word: 'dog',
    translation_vi: 'con chó',
    audio_url: 'https://cdn.example.com/audio/dog.mp3',
    model_url: 'https://cdn.example.com/models/dog.glb',
    animation_type: 'bounce' as const,
    glb_size: 1.5,
    position: '0 0 0',
    rotation: '0 0 0',
    scale: '1 1 1',
    reference_image_url: SAMPLE_REF_IMAGES.dog,
    physical_width_m: 0.085,
    related_combos: [],
  },
  {
    qr_id: 'flashcard_chicken',
    word: 'chicken',
    translation_vi: 'con gà',
    audio_url: 'https://cdn.example.com/audio/chicken.mp3',
    model_url: 'https://cdn.example.com/models/chicken.glb',
    animation_type: 'rotate' as const,
    glb_size: 1.3,
    position: '0 0 0',
    rotation: '0 0 0',
    scale: '1 1 1',
    reference_image_url: SAMPLE_REF_IMAGES.chicken,
    physical_width_m: 0.08,
    related_combos: [],
  },
  {
    qr_id: 'flashcard_egg',
    word: 'egg',
    translation_vi: 'quả trứng',
    audio_url: 'https://cdn.example.com/audio/egg.mp3',
    model_url: 'https://cdn.example.com/models/egg.glb',
    animation_type: 'idle' as const,
    glb_size: 0.8,
    position: '0 0 0',
    rotation: '0 0 0',
    scale: '1 1 1',
    reference_image_url: SAMPLE_REF_IMAGES.egg,
    physical_width_m: 0.075,
    related_combos: [],
  },
] as const;

/**
 * Single card for simple testing.
 */
export const MOCK_SINGLE_CARD = MOCK_AR_CARDS[0];

/**
 * Combo pair for testing combo detection.
 */
export const MOCK_COMBO_CARDS = [
  MOCK_AR_CARDS[2], // chicken
  MOCK_AR_CARDS[3], // egg
] as const;

/**
 * Convert mock cards to CardDescriptorRN[] for startImageTrackingMulti.
 */
export const toCardDescriptors = <T extends { qr_id: string; reference_image_url: string | null; physical_width_m: number | null }>(
  cards: readonly T[]
): Array<{ qrId: string; imageUrl: string; physicalWidthMeters: number }> => {
  return cards
    .filter((card): card is T & { reference_image_url: string; physical_width_m: number } =>
      typeof card.reference_image_url === 'string' &&
      typeof card.physical_width_m === 'number' &&
      card.physical_width_m > 0
    )
    .map((card) => ({
      qrId: card.qr_id,
      imageUrl: card.reference_image_url,
      physicalWidthMeters: card.physical_width_m,
    }));
};
