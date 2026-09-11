import { describe, expect, it } from 'vitest';
import {
  normalizeScannedQrId,
  normalizeXRTarget,
  serializeXRTargets,
} from '../pages/LearnAR8thWall';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LearnAR8thWall target visual configuration', () => {
  it('rejects empty scanner payloads before AR preparation can begin', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );
    const handlerStart = source.indexOf('const handleQRDetected = useCallback')
    const handlerEnd = source.indexOf('\n  // ========================================================================\n  // LISTEN:', handlerStart)
    const handlerSource = source.slice(handlerStart, handlerEnd)
    const emptyGuard = handlerSource.indexOf("if (!normalizedQrId) {")
    const preparing = handlerSource.indexOf("setPhase('PREPARING')")
    const resolveTargets = handlerSource.indexOf('resolveTrackingGroup(normalizedQrId)')

    expect(normalizeScannedQrId('')).toBeNull()
    expect(normalizeScannedQrId('   ')).toBeNull()
    expect(normalizeScannedQrId(' cat001 ')).toBe('cat001')
    expect(emptyGuard).toBeGreaterThanOrEqual(0)
    expect(handlerSource).toContain("trace('QR_IGNORED_EMPTY'")
    expect(emptyGuard).toBeLessThan(preparing)
    expect(emptyGuard).toBeLessThan(resolveTargets)
  })

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

  it('passes the parent API base and active deck to the isolated XR viewer', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );

    expect(source).toContain("params.set('api_base', API_BASE);");
    expect(source).toContain("params.set('deck_id', deckIdRef.current);");
    expect(source).toContain('allow="camera; xr-spatial-tracking; gyroscope; accelerometer; autoplay"');
  });
});
