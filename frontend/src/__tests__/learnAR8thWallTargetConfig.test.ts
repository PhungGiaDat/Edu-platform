import { describe, expect, it } from 'vitest';
import {
  normalizeScannedQrId,
  normalizeXRTarget,
  resolveTrackingGroup,
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
    const resolveTargets = handlerSource.indexOf('resolveTrackingGroup(normalizedQrId, trackingRules)')

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

  it('forwards the optional generic presentation override to the XR viewer', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );

    expect(source).toContain("get('presentation_mode')");
    expect(source).toContain("params.set('presentation_mode', presentationMode)");
  });

  it('resolves a backend-configured pair without CAT/FISH-specific tracking branches', () => {
    const catFish = {
      combo_id: 'cat-fish',
      priority: 100,
      tags: ['cat001', 'fish001'],
    };
    const dogBone = {
      combo_id: 'dog-bone',
      priority: 80,
      tags: ['dog001', 'bone001'],
    };

    expect(resolveTrackingGroup('dog001', [catFish, dogBone])).toEqual(['dog001', 'bone001']);
    expect(resolveTrackingGroup('bone001', [catFish, dogBone])).toEqual(['dog001', 'bone001']);
    expect(resolveTrackingGroup('unknown001', [catFish, dogBone])).toEqual(['unknown001']);
  });

  it('selects the tracking pair by priority then combo id deterministically', () => {
    expect(resolveTrackingGroup('shared001', [
      { combo_id: 'z-rule', priority: 20, tags: ['shared001', 'z-partner'] },
      { combo_id: 'a-rule', priority: 20, tags: ['shared001', 'a-partner'] },
      { combo_id: 'lower-rule', priority: 10, tags: ['shared001', 'lower-partner'] },
    ])).toEqual(['shared001', 'a-partner']);
  });
});
