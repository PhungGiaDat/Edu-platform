import type { ARExperienceResponse } from '../types/api';
import type { UnityARExperiencePayload } from '../types/ar';

/**
 * Maps backend ARExperienceResponse to UnityARExperiencePayload
 * for Unity native module bridge communication
 */
export const mapToUnityPayload = (
  apiResponse: ARExperienceResponse
): UnityARExperiencePayload => ({
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
});
