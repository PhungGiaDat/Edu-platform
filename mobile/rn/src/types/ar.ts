export interface UnityARExperiencePayload {
  qrId: string;
  word: string;
  translationVi: string;
  audioUrl: string;
  modelUrl: string;
  animationType: 'rotate' | 'bounce' | 'idle';
  glbSize: number;
  position: string;
  rotation: string;
  scale: string;
}

export interface ARStabilityConfig {
  plane_detection: boolean;
  image_tracking: boolean;
  object_anchoring: boolean;
  light_estimation: boolean;
}
