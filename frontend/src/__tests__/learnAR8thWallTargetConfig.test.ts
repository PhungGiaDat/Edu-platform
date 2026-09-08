import { describe, expect, it } from 'vitest';
import {
  normalizeXRTarget,
  serializeXRTargets,
} from '../pages/LearnAR8thWall';

describe('LearnAR8thWall target visual configuration', () => {
  it('preserves the canonical fish visual scale in generated xr_targets', () => {
    const fish = normalizeXRTarget('fish001', {
      target: {
        model_3d_url: 'https://assets.example/fish_mobile_v1.glb',
        scale: '0.30 0.30 0.30',
      },
    });

    const xrTargets = JSON.parse(serializeXRTargets([fish]));

    expect(xrTargets).toEqual([
      expect.objectContaining({
        qr_id: 'fish001',
        model_3d_url: 'https://assets.example/fish_mobile_v1.glb',
        scale: '0.30 0.30 0.30',
      }),
    ]);
  });
});
