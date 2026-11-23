import { describe, expect, it } from 'vitest';
import {
  buildSessionTargetCatalogue,
  normalizeScannedQrId,
  normalizeXRTarget,
  resolveARPresentationMode,
  resolveSessionTargetCatalogue,
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
    const resolveTargets = handlerSource.indexOf('buildSessionTargetCatalogue(normalizedQrId')

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
        scale: '0.36 0.36 0.36',
      },
    });

    const xrTargets = JSON.parse(serializeXRTargets([fish]));

    expect(xrTargets).toEqual([
      expect.objectContaining({
        qr_id: 'fish001',
        model_3d_url: 'https://assets.example/fish_mobile_v1.glb',
        scale: '0.36 0.36 0.36',
      }),
    ]);
  });

  it('prefers nested target transforms over flat catalogue transforms', () => {
    const target = normalizeXRTarget('targetA', {
      position: '1 2 3',
      rotation: '4 5 6',
      scale: '0.20 0.20 0.20',
      target: {
        position: '7 8 9',
        rotation: '10 11 12',
        scale: '0.30 0.30 0.30',
      },
    });

    expect(target).toMatchObject({
      position: '7 8 9',
      rotation: '10 11 12',
      scale: '0.30 0.30 0.30',
    });
  });

  it('uses flat catalogue transforms when nested target transforms are absent', () => {
    const target = normalizeXRTarget('targetB', {
      position: '1 2 3',
      rotation: '4 5 6',
      scale: '0.20 0.20 0.20',
    });

    expect(target).toMatchObject({
      position: '1 2 3',
      rotation: '4 5 6',
      scale: '0.20 0.20 0.20',
    });
  });

  it('uses transform defaults only when neither nested nor flat metadata exists', () => {
    const target = normalizeXRTarget('legacyA', {});

    expect(target).toMatchObject({
      position: '0 0 0',
      rotation: '0 0 0',
      scale: '1 1 1',
    });
  });

  it('serializes normalized flat transforms without changing their configured values', () => {
    const target = normalizeXRTarget('targetC', {
      position: '0.01 0.02 0.03',
      rotation: '0 90 0',
      scale: '0.40 0.40 0.40',
    });

    expect(JSON.parse(serializeXRTargets([target]))).toEqual([
      expect.objectContaining({
        qr_id: 'targetC',
        position: '0.01 0.02 0.03',
        rotation: '0 90 0',
        scale: '0.40 0.40 0.40',
      }),
    ]);
  });

  it('keeps the viewer on the shared legacy presentation result for configured transforms', () => {
    const viewerSource = readFileSync(
      resolve(process.cwd(), 'public/ar-xr.html'),
      'utf8',
    );
    const lifecycleSource = readFileSync(
      resolve(process.cwd(), 'public/static/ar-assets/js/ar-interaction-lifecycle.js'),
      'utf8',
    );

    expect(lifecycleSource).toContain('const legacyScale = parseUniformScale(config?.scale, 1)');
    expect(lifecycleSource).toContain("mode: 'legacy'");
    expect(lifecycleSource).toContain('finalScale: legacyScale');
    expect(viewerSource).toContain('instance.offsetGroup.scale.setScalar(presentation.finalScale);');
  });

  it('forwards opt-in presentation metadata and physical width without changing legacy target transforms', () => {
    const pet = normalizeXRTarget('petA', {
      physical_width_m: 0.12,
      target: {
        model_3d_url: 'https://assets.example/pet.glb',
        position: '0 0 0',
        rotation: '0 0 0',
        scale: '1 1 1',
        presentation_mode: 'SCREEN',
        presentation_profile: 'pet',
        presentation_scale_multiplier: 1.25,
        presentation_position_offset: '0.01 0 0',
        presentation_forward_axis: '+Z',
      },
    });

    const xrTargets = JSON.parse(serializeXRTargets([pet]));

    expect(xrTargets).toEqual([
      expect.objectContaining({
        qr_id: 'petA',
        physical_width_m: 0.12,
        presentation_profile: 'pet',
        presentation_mode: 'SCREEN',
        presentation_scale_multiplier: 1.25,
        presentation_position_offset: '0.01 0 0',
        presentation_forward_axis: '+Z',
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

  it('defaults the physical-card viewer to TABLETOP while preserving explicit presentation overrides', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );
    const viewerStart = source.indexOf('const viewerSrc =');
    const viewerEnd = source.indexOf('// Track when viewerSrc is set', viewerStart);
    const viewerSource = source.slice(viewerStart, viewerEnd);

    expect(viewerSource).toContain('resolveARPresentationMode(window.location.search)');
    expect(viewerSource).toContain("params.set('presentation_mode', presentationMode)");
    for (const [search, expected] of [
      ['', 'TABLETOP'],
      ['?presentation_mode=SCREEN', 'SCREEN'],
      ['?presentation_mode=AUTO', 'AUTO'],
      ['?presentation_mode=TABLETOP', 'TABLETOP'],
    ]) {
      expect(resolveARPresentationMode(search)).toBe(expected);
    }
  });

  it('registers every usable deck target independently from the scanned entry and combo membership', () => {
    const targets = resolveSessionTargetCatalogue('targetA', [
      {
        qr_id: 'targetB',
        word: 'partner',
        xr_target_json_url: 'https://assets.example/xr/targetB.json',
        model_3d_url: 'https://assets.example/models/targetB.glb',
      },
      {
        qr_id: 'targetC',
        word: 'unrelated',
        xr_target_json_url: 'https://assets.example/xr/targetC.json',
        model_3d_url: 'https://assets.example/models/targetC.glb',
      },
      {
        qr_id: 'targetA',
        word: 'entry',
        xr_target_json_url: 'https://assets.example/xr/targetA.json',
        model_3d_url: 'https://assets.example/models/targetA.glb',
      },
      {
        qr_id: 'missingJson',
        word: 'not-trackable',
        model_3d_url: 'https://assets.example/models/missingJson.glb',
      },
    ]);

    expect(targets.map(target => target.qr_id)).toEqual([
      'targetA',
      'targetB',
      'targetC',
    ]);
    expect(targets.find(target => target.qr_id === 'targetC')).toMatchObject({
      model_3d_url: 'https://assets.example/models/targetC.glb',
    });
  });

  it('reports invalid and duplicate catalogue rows without changing usable neutral targets', () => {
    const catalogue = buildSessionTargetCatalogue('targetA', [
      {
        qr_id: 'targetB',
        xr_target_json_url: 'https://assets.example/xr/targetB.json',
      },
      {
        qr_id: 'targetA',
        xr_target_json_url: 'https://assets.example/xr/targetA.json',
      },
      {
        qr_id: 'missingJson',
      },
      {
        qr_id: 'targetB',
        xr_target_json_url: 'https://assets.example/xr/duplicate-targetB.json',
      },
      {
        qr_id: '   ',
        xr_target_json_url: 'https://assets.example/xr/blank.json',
      },
    ]);

    expect(catalogue.targets.map(target => target.qr_id)).toEqual([
      'targetA',
      'targetB',
    ]);
    expect(catalogue.candidates).toEqual([
      'targetB',
      'targetA',
      'missingJson',
      'targetB',
    ]);
    expect(catalogue.rejectedTargets).toEqual([
      { targetName: 'missingJson', reason: 'missing_xr_target_json_url' },
      { targetName: 'targetB', reason: 'duplicate_qr_id' },
      { targetName: null, reason: 'missing_qr_id' },
    ]);
  });

  it('uses deck metadata for the session catalogue rather than selecting one combo pair', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );
    const handlerStart = source.indexOf('const handleQRDetected = useCallback');
    const handlerEnd = source.indexOf('\n  // ========================================================================\n  // LISTEN:', handlerStart);
    const handlerSource = source.slice(handlerStart, handlerEnd);

    expect(source).toContain("/api/v1/flashcard/xr-targets/deck/");
    expect(handlerSource).toContain('fetchSessionTargetCatalogue()');
    expect(handlerSource).toContain('buildSessionTargetCatalogue(normalizedQrId');
    expect(handlerSource).toContain("trace('SESSION_TARGET_CATALOGUE'");
    expect(handlerSource).not.toContain('resolveTrackingGroup');
    expect(handlerSource).not.toContain('fetchTrackingRules');
    expect(handlerSource).not.toContain('data-secondary-preload');
  });

  it('reports the session catalogue source, candidates, usable targets, and rejected targets', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );
    const handlerStart = source.indexOf('const handleQRDetected = useCallback');
    const handlerEnd = source.indexOf('\n  // ========================================================================\n  // LISTEN:', handlerStart);
    const handlerSource = source.slice(handlerStart, handlerEnd);

    expect(handlerSource).toContain("trace('SESSION_TARGET_CATALOGUE', JSON.stringify({");
    expect(handlerSource).toContain('entryTarget: normalizedQrId');
    expect(handlerSource).toContain('source: sessionTargetCatalogueSourceRef.current');
    expect(handlerSource).toContain('candidates: sessionCatalogueCandidates');
    expect(handlerSource).toContain('usableTargets: targets.map(target => target.qr_id)');
    expect(handlerSource).toContain('rejectedTargets: sessionCatalogueRejectedTargets');
  });
});
