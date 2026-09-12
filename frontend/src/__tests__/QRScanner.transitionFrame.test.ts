import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { captureTransitionFrame } from '@/features/ar/components/QRScanner';

describe('captureTransitionFrame', () => {
  it('returns the current canvas frame when serialization succeeds', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/jpeg;base64,last-frame');

    expect(captureTransitionFrame(canvas)).toBe('data:image/jpeg;base64,last-frame');
  });

  it('returns null when the scanner has no canvas', () => {
    expect(captureTransitionFrame(null)).toBeNull();
  });

  it('fails open when canvas serialization throws', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toDataURL').mockImplementation(() => {
      throw new Error('serialization failed');
    });

    expect(captureTransitionFrame(canvas)).toBeNull();
  });
});

it('captures and emits the transition frame before releasing the QR camera or notifying detection', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/ar/components/QRScanner.tsx'),
    'utf8',
  );
  const detectedBranchStart = source.indexOf('if (code && !isDetectedRef.current)');
  const captureIndex = source.indexOf('captureTransitionFrame(canvasRef.current)', detectedBranchStart);
  const releaseIndex = source.indexOf('streamRef.current?.getTracks().forEach(t => t.stop());', detectedBranchStart);
  const detectedIndex = source.indexOf('callbacksRef.current.onDetected(code.data)', detectedBranchStart);

  expect(captureIndex).toBeGreaterThanOrEqual(0);
  expect(releaseIndex).toBeGreaterThan(captureIndex);
  expect(detectedIndex).toBeGreaterThan(releaseIndex);
});

it('keeps exactly one camera acquisition in QRScanner', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/ar/components/QRScanner.tsx'),
    'utf8',
  );

  expect(source.match(/getUserMedia\(/g)).toHaveLength(1);
});
