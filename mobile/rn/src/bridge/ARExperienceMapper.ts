import type { ARExperienceResponse } from '../types/api';
import type { UnityARExperiencePayload } from '../types/ar';

/**
 * Maps backend ARExperienceResponseSchema to UnityARExperiencePayload
 * for Unity native module bridge communication.
 *
 * Backend returns nested structure (ARExperienceResponseSchema):
 * {
 *   flashcard: { qr_id, word, audio_url, translation: { vi, en, ... } },
 *   target: { ar_tag, model_3d_url, animation_type, glb_size, position, rotation, scale },
 *   related_combos: [...]
 * }
 *
 * Unity expects camelCase flat payload.
 */
export const mapToUnityPayload = (
  apiResponse: ARExperienceResponse
): UnityARExperiencePayload => {
  const flashcard = apiResponse.flashcard;
  const target = apiResponse.target;

  const translationVi =
    flashcard.translation?.['vi'] ?? '';

  return {
    qrId: flashcard.qr_id,
    word: flashcard.word,
    translationVi,
    audioUrl: flashcard.audio_url ?? '',
    modelUrl: target.model_3d_url,
    animationType: (target.animation_type as UnityARExperiencePayload['animationType']) ?? 'idle',
    glbSize: target.glb_size,
    position: target.position ?? '0 0 0',
    rotation: target.rotation ?? '0 0 0',
    scale: target.scale ?? '1 1 1',
  };
};
