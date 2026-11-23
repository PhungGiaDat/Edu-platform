/**
 * xr-engine-adapter.ts
 *
 * Engine abstraction layer for AR experiences.
 * Supports MindAR (default) and 8th Wall (xr) engines.
 * Additive-only: does NOT modify existing MindAR code.
 */

export type XREngine = 'mindar' | 'xr';

export interface XRTargetData {
  qr_id: string;
  word?: string;
  xr_target_json_url?: string;
  xr_target_image_url?: string;
  reference_image_url?: string;
  mind_file_url?: string;
  mind_catalog_id?: string;
  mind_target_index?: number;
  model_3d_url?: string;
  texture_url?: string;
  /** @deprecated Use animations[] instead */
  animation_type?: string;
  /** List of available animations in the 3D model */
  animations?: string[];
  /** Default animation to play when target is found */
  default_animation?: string;
  position?: string;
  rotation?: string;
  scale?: string;
}

export interface DeckXRConfig {
  deck_id: string;
  deck_name: string;
  engine: XREngine;
  targets: XRTargetData[];
  model_url?: string;
  mind_url?: string;
}

export interface XREngineAdapter {
  engine: XREngine;
  loadTargets(targets: XRTargetData[]): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  onTargetFound(callback: (qrId: string) => void): void;
  onTargetLost(callback: (qrId: string) => void): void;
  onComboDetected(callback: (targets: string[]) => void): void;
}

/**
 * Get the appropriate XR target URLs based on engine type.
 * For 'xr' engine: returns xr_target_json_url + xr_target_image_url
 * For 'mindar' engine: returns reference_image_url + mind_file_url
 */
export function getTargetUrlsForEngine(
  target: XRTargetData,
  engine: XREngine
): { imageUrl: string; modelUrl?: string } {
  if (engine === 'xr') {
    return {
      imageUrl: target.xr_target_image_url || target.reference_image_url || '',
      modelUrl: target.model_3d_url,
    };
  }
  // MindAR: use reference image + mind file
  return {
    imageUrl: target.reference_image_url || '',
    modelUrl: target.model_3d_url,
  };
}

/**
 * Get the MindAR catalog configuration from targets.
 * Used when engine='mindar' to build the mindUrl.
 */
export function buildMindARConfig(targets: XRTargetData[]): {
  mindUrl: string;
  catalogId: string;
  targetCount: number;
} | null {
  const firstTarget = targets[0];
  if (!firstTarget) return null;

  // Use the first target's mind file
  const mindUrl = firstTarget.mind_file_url || '';
  const catalogId = firstTarget.mind_catalog_id || 'default';

  return {
    mindUrl,
    catalogId,
    targetCount: targets.length,
  };
}

/**
 * Get XR target JSON URLs for 8th Wall.
 * Returns array of { qr_id, json_url, image_url } objects.
 */
export function getXRTargetJSONs(
  targets: XRTargetData[]
): Array<{ qrId: string; jsonUrl: string; imageUrl: string }> {
  return targets
    .filter(t => t.xr_target_json_url)
    .map(t => ({
      qrId: t.qr_id,
      jsonUrl: t.xr_target_json_url!,
      imageUrl: t.xr_target_image_url || t.reference_image_url || '',
    }));
}
