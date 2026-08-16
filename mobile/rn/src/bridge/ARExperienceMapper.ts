import type { ARExperienceResponse } from '../types/api';
import type {
  UnityARExperiencePayload,
  CardDescriptorRN,
  CardDescriptorSource,
  NativeTrackingDto,
  NativeTrackingAvailability,
} from '../types/ar';

function hasNestedExperience(
  response: ARExperienceResponse,
): response is ARExperienceResponse & Required<Pick<ARExperienceResponse, 'flashcard' | 'target'>> {
  return response.flashcard != null && response.target != null;
}

/**
 * Maps either the canonical flat learner DTO or the nested AR endpoint DTO to
 * the single Unity bridge payload. The native tracking boundary remains flat
 * and intentionally never derives reference images from model URLs.
 */
export const mapToUnityPayload = (
  apiResponse: ARExperienceResponse,
): UnityARExperiencePayload => {
  if (hasNestedExperience(apiResponse)) {
    const { flashcard, target } = apiResponse;
    return {
      qrId: flashcard.qr_id,
      word: flashcard.word,
      translationVi: flashcard.translation?.vi ?? '',
      audioUrl: flashcard.audio_url ?? '',
      modelUrl: target.model_3d_url,
      animationType: (target.animation_type as UnityARExperiencePayload['animationType']) ?? 'idle',
      glbSize: target.glb_size,
      position: target.position ?? '0 0 0',
      rotation: target.rotation ?? '0 0 0',
      scale: target.scale ?? '1 1 1',
    };
  }

  return {
    qrId: apiResponse.qr_id,
    word: apiResponse.word,
    translationVi: apiResponse.translation_vi,
    audioUrl: apiResponse.audio_url,
    modelUrl: apiResponse.model_url,
    animationType: apiResponse.animation_type,
    glbSize: apiResponse.glb_size,
    position: apiResponse.position,
    rotation: apiResponse.rotation,
    scale: apiResponse.scale,
  };
};

/** Validates the strict metadata needed for native image tracking. */
export const validateNativeTrackingMetadata = (
  apiResponse: ARExperienceResponse,
): NativeTrackingAvailability => {
  const hasImage =
    typeof apiResponse.reference_image_url === 'string' &&
    apiResponse.reference_image_url.length > 0;
  const widthValue = apiResponse.physical_width_m;
  const hasValidWidth =
    widthValue == null ||
    (typeof widthValue === 'number' && Number.isFinite(widthValue) && widthValue > 0);

  if (!hasValidWidth) {
    return { kind: 'unavailable', reason: 'invalid_physical_width', qrId: apiResponse.qr_id };
  }
  if (!hasImage) {
    return { kind: 'unavailable', reason: 'missing_reference_image', qrId: apiResponse.qr_id };
  }

  return {
    kind: 'ready',
    tracking: {
      qrId: apiResponse.qr_id,
      referenceImageUrl: apiResponse.reference_image_url as string,
      physicalWidthMeters: widthValue ?? 0,
      modelUrl: apiResponse.model_url,
      word: apiResponse.word,
    },
  };
};

export const toCardDescriptorRN = (
  tracking: NativeTrackingDto,
): CardDescriptorRN => ({
  qrId: tracking.qrId,
  imageUrl: tracking.referenceImageUrl,
  physicalWidthMeters: tracking.physicalWidthMeters,
  modelUrl: tracking.modelUrl,
  word: tracking.word,
});

/** Backward-compatible composition retained for existing M1A/M3A callers. */
export const mapToCardDescriptor = (
  apiResponse: ARExperienceResponse,
): CardDescriptorSource => {
  const availability = validateNativeTrackingMetadata(apiResponse);
  return availability.kind === 'ready'
    ? { kind: 'ok', descriptor: toCardDescriptorRN(availability.tracking) }
    : { kind: 'unavailable', reason: availability.reason, qrId: availability.qrId };
};
