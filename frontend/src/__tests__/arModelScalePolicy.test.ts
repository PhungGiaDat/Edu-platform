import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

interface ScalePolicy {
  DEFAULT_TARGET_SPAN: number;
  computeUniformScale: (
    displayedMaxDimension: number,
    currentScale: number,
    options?: { targetSpan?: number; minScale?: number; maxScale?: number },
  ) => number | null;
}

function loadScalePolicy(): ScalePolicy {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'public/static/ar-assets/js/ar-model-scale.js'),
    'utf8',
  );
  const context = vm.createContext({});
  new vm.Script(source, { filename: 'ar-model-scale.js' }).runInContext(context);
  return (context as unknown as { ARModelScale: ScalePolicy }).ARModelScale;
}

describe('AR dynamic model scale policy', () => {
  const policy = loadScalePolicy();

  it('normalizes relative to the current entity scale', () => {
    // A model with intrinsic max dimension 2 is currently displayed at 0.5
    // because its entity scale is 0.25. It should end at scale 0.4 so the
    // displayed max dimension becomes 0.8, not jump to 1.6.
    expect(policy.computeUniformScale(0.5, 0.25)).toBeCloseTo(0.4, 8);
  });

  it('scales large and small source models to the same target span', () => {
    expect(policy.computeUniformScale(25, 0.25)).toBeCloseTo(0.008, 8);
    expect(policy.computeUniformScale(0.02, 0.25)).toBeCloseTo(10, 8);
  });

  it('supports a larger target span for combo models', () => {
    expect(policy.computeUniformScale(0.5, 0.25, { targetSpan: 1 })).toBeCloseTo(0.5, 8);
  });

  it('clamps unsafe results and rejects empty bounds', () => {
    expect(policy.computeUniformScale(1e9, 0.25)).toBe(0.001);
    expect(policy.computeUniformScale(1e-7, 0.25)).toBeNull();
    expect(policy.computeUniformScale(Number.NaN, 0.25)).toBeNull();
  });
});

describe('AR viewer dynamic-scale wiring', () => {
  const viewerSource = fs.readFileSync(
    path.resolve(process.cwd(), 'public/static/ar-assets/js/ar-viewer.js'),
    'utf8',
  );
  const viewerHtml = fs.readFileSync(
    path.resolve(process.cwd(), 'public/ar-viewer.html'),
    'utf8',
  );

  it('wires persistent, legacy, dynamic, and combo model paths', () => {
    expect(viewerSource).toContain("source: 'persistent-slot'");
    expect(viewerSource).toContain("source: 'legacy-target'");
    expect(viewerSource).toContain("source: 'dynamic-target'");
    expect(viewerSource).toContain("source: 'combo-model'");
    expect(viewerHtml).toContain("source: 'bootstrap-combo'");
    expect(viewerHtml).toContain('__AR_APPLY_DYNAMIC_MODEL_SCALE__');
  });

  it('preserves normalized scale for touch pulse, pinch, and reset', () => {
    expect(viewerSource).toContain('const baseScale = readUniformEntityScale(modelEl)');
    expect(viewerSource).toContain('const normalizedScale = getTargetModelScale(touchState.targetIndex)');
    expect(viewerSource).toContain('scale: { x: normalizedScale, y: normalizedScale, z: normalizedScale }');
    expect(viewerSource).toContain("modelEl.id === 'combo-model'");
    expect(viewerSource).toContain('to: ${scaleValue}');
  });
});
