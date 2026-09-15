import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveDebugCameraHandoffDelay } from '../pages/LearnAR8thWall';

const scannerSource = readFileSync(
  resolve(process.cwd(), 'src/features/ar/components/QRScanner.tsx'),
  'utf8',
);
const parentSource = readFileSync(
  resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
  'utf8',
);
const viewerSource = readFileSync(
  resolve(process.cwd(), 'public/ar-xr.html'),
  'utf8',
);

describe('AR camera handoff diagnostics', () => {
  it('keeps the camera-handoff delay disabled unless debug mode explicitly requests an allowed value', () => {
    expect(resolveDebugCameraHandoffDelay('?camera_handoff_delay_ms=300')).toBe(0);
    expect(resolveDebugCameraHandoffDelay('?debug=false&camera_handoff_delay_ms=300')).toBe(0);
    expect(resolveDebugCameraHandoffDelay('?debug=true')).toBe(0);
    expect(resolveDebugCameraHandoffDelay('?debug=true&camera_handoff_delay_ms=0')).toBe(0);
    expect(resolveDebugCameraHandoffDelay('?debug=true&camera_handoff_delay_ms=150')).toBe(150);
    expect(resolveDebugCameraHandoffDelay('?debug=true&camera_handoff_delay_ms=300')).toBe(300);
    expect(resolveDebugCameraHandoffDelay('?debug=true&camera_handoff_delay_ms=500')).toBe(500);
    expect(resolveDebugCameraHandoffDelay('?debug=true&camera_handoff_delay_ms=301')).toBe(0);
  });

  it('records QR track stop, video release, and parent handoff in the actual shutdown order', () => {
    const detectionStart = scannerSource.indexOf('if (code && !isDetectedRef.current)');
    const stopBegin = scannerSource.indexOf("QR_CAMERA_STOP_BEGIN", detectionStart);
    const stopCall = scannerSource.indexOf("QR_CAMERA_STOP_CALLED", detectionStart);
    const videoReleased = scannerSource.indexOf("QR_VIDEO_RELEASED", detectionStart);
    const handoff = scannerSource.indexOf("QR_HANDOFF_TO_PARENT", detectionStart);
    const detected = scannerSource.indexOf('callbacksRef.current.onDetected(code.data)', detectionStart);

    expect(detectionStart).toBeGreaterThanOrEqual(0);
    expect(stopBegin).toBeGreaterThan(detectionStart);
    expect(stopCall).toBeGreaterThan(stopBegin);
    expect(videoReleased).toBeGreaterThan(stopCall);
    expect(handoff).toBeGreaterThan(videoReleased);
    expect(detected).toBeGreaterThan(handoff);
    expect(scannerSource).toContain('QR_SCANNER_UNMOUNT_CLEANUP');
    expect(scannerSource).toContain('streamRef.current = null;');
    expect(scannerSource).toContain('srcObject = null;');
  });

  it('keeps metadata independent while debug-only handoff gate controls XR boot timing', () => {
    const triggerStart = parentSource.indexOf('// XR_BOOTING TRIGGER');
    const triggerEnd = parentSource.indexOf('// ========================================================================\n  // fetchXRTarget', triggerStart);
    const trigger = parentSource.slice(triggerStart, triggerEnd);
    const metadataFetch = parentSource.indexOf('fetchSessionTargetCatalogue()', parentSource.indexOf('const handleQRDetected'));
    const delayGate = parentSource.indexOf('cameraHandoffGateReady', parentSource.indexOf('const handleQRDetected'));

    expect(parentSource).toContain('PARENT_CAMERA_RELEASE_ASSUMED');
    expect(parentSource).toContain('XR_BOOT_TRIGGER');
    expect(parentSource).toContain('IFRAME_MOUNT');
    expect(trigger).toContain('cameraHandoffGateReady');
    expect(metadataFetch).toBeGreaterThan(delayGate);
  });

  it('observes the XR8 camera request and any startup dispose message without changing dispose handling', () => {
    expect(viewerSource).toContain('XR_CAMERA_REQUEST_START');
    expect(viewerSource).toContain('XR_DISPOSE_RECEIVED');
    expect(viewerSource).toContain('elapsedSinceViewerBootMs');
    expect(viewerSource).toContain("messageData?.type === 'dispose'");
  });

  it('uses a shared epoch timestamp for parent-to-iframe duration calculations', () => {
    expect(scannerSource).toContain('performance.timeOrigin + performance.now()');
    expect(parentSource).toContain('function highResolutionTimestamp()');
    expect(viewerSource).toContain('performance.timeOrigin + performance.now()');
  });
});
