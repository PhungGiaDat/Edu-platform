import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AR_DIAGNOSTICS_VERSION,
  resolveDebugCameraHandoffDelay,
} from '../pages/LearnAR8thWall';
import { normalizeQrDetectionPayload } from '../features/ar/components/QRScanner';

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

  it('rejects invalid QR decode payloads and trims valid IDs', () => {
    expect(normalizeQrDetectionPayload(null)).toBeNull();
    expect(normalizeQrDetectionPayload(undefined)).toBeNull();
    expect(normalizeQrDetectionPayload('')).toBeNull();
    expect(normalizeQrDetectionPayload('   ')).toBeNull();
    expect(normalizeQrDetectionPayload(' cat001 ')).toBe('cat001');
  });

  it('keeps invalid QR decodes on the scan loop and preserves valid shutdown order', () => {
    const payloadNormalization = scannerSource.indexOf('const qrId = normalizeQrDetectionPayload(code?.data);');
    const detectionStart = scannerSource.indexOf('if (qrId && !isDetectedRef.current)');
    const latch = scannerSource.indexOf('isDetectedRef.current = true;', detectionStart);
    const cancelFrame = scannerSource.indexOf('cancelAnimationFrame(animFrameRef.current);', detectionStart);
    const stopBegin = scannerSource.indexOf("QR_CAMERA_STOP_BEGIN", detectionStart);
    const stopCall = scannerSource.indexOf("QR_CAMERA_STOP_CALLED", detectionStart);
    const videoReleased = scannerSource.indexOf("QR_VIDEO_RELEASED", detectionStart);
    const handoff = scannerSource.indexOf("QR_HANDOFF_TO_PARENT", detectionStart);
    const detected = scannerSource.indexOf('callbacksRef.current.onDetected(qrId)', detectionStart);
    const nextScanFrame = scannerSource.indexOf('animFrameRef.current = requestAnimationFrame(scan);', detected);

    expect(payloadNormalization).toBeGreaterThanOrEqual(0);
    expect(detectionStart).toBeGreaterThan(payloadNormalization);
    expect(latch).toBeGreaterThan(detectionStart);
    expect(cancelFrame).toBeGreaterThan(latch);
    expect(stopBegin).toBeGreaterThan(cancelFrame);
    expect(stopCall).toBeGreaterThan(stopBegin);
    expect(videoReleased).toBeGreaterThan(stopCall);
    expect(handoff).toBeGreaterThan(videoReleased);
    expect(detected).toBeGreaterThan(handoff);
    expect(nextScanFrame).toBeGreaterThan(detected);
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

  it('instruments the single-target boot boundary without introducing a secondary preload barrier', () => {
    const mainStart = viewerSource.indexOf('async function main()');
    const mainEnd = viewerSource.indexOf("if (document.readyState === 'loading')", mainStart);
    const mainSource = viewerSource.slice(mainStart, mainEnd);
    const initStart = viewerSource.indexOf('async function initXR(targetDataList)');
    const initEnd = viewerSource.indexOf('// Lifecycle', initStart);
    const initSource = viewerSource.slice(initStart, initEnd);

    expect(mainSource).toContain("sendDebugOnly('SECONDARY_PRELOAD_PLAN'");
    expect(mainSource).toContain("sendDebugOnly('SECONDARY_PRELOAD_EMPTY'");
    expect(mainSource).not.toContain('await preloadSecondaryTargets(');
    expect(initSource).toContain("sendDebugOnly('XR_SLAM_LOAD_START'");
    expect(initSource).toContain("sendDebugOnly('XR_SLAM_LOAD_COMPLETE'");
    expect(initSource.indexOf("sendDebugOnly('XR_SLAM_LOAD_START'")).toBeLessThan(
      initSource.indexOf("await XR8.loadChunk('slam')"),
    );
  });

  it('fingerprints the parent and viewer diagnostic generation without changing SLAM or camera lifecycle control flow', () => {
    const viewerBuild = viewerSource.indexOf("sendARDebug('AR_VIEWER_BUILD'");
    const multiConfig = viewerSource.indexOf("sendARDebug('XR_MULTI_CONFIG'");
    const initStart = viewerSource.indexOf('async function initXR(targetDataList)');
    const initEnd = viewerSource.indexOf('// Lifecycle', initStart);
    const initSource = viewerSource.slice(initStart, initEnd);
    const viewerSrcStart = parentSource.indexOf('const viewerSrc =');
    const viewerSrcEnd = parentSource.indexOf('// Track when viewerSrc is set', viewerSrcStart);
    const viewerSrc = parentSource.slice(viewerSrcStart, viewerSrcEnd);
    const cameraHandlerStart = parentSource.indexOf("case 'XR_CAMERA_HAS_VIDEO':");
    const cameraHandlerEnd = parentSource.indexOf("case 'XR_STARTED':", cameraHandlerStart);
    const cameraHandler = parentSource.slice(cameraHandlerStart, cameraHandlerEnd);
    const catalogueTrace = parentSource.indexOf("trace('SESSION_TARGET_CATALOGUE'");
    const catalogueStateUpdate = parentSource.indexOf('setXrTargets(targets)', catalogueTrace);

    expect(AR_DIAGNOSTICS_VERSION).toBe('session-catalogue-slam-diagnostics-v1');
    expect(parentSource).toContain("trace('AR_PARENT_BUILD'");
    expect(viewerSrc).toContain("params.set('ar_diagnostics_version', AR_DIAGNOSTICS_VERSION)");
    expect(viewerSource).toContain("const AR_VIEWER_BUILD_VERSION = 'slam-boundary-diagnostics-v1'");
    expect(viewerBuild).toBeGreaterThanOrEqual(0);
    expect(viewerBuild).toBeLessThan(multiConfig);
    expect(initSource).not.toContain('Promise.race(');
    expect(initSource).not.toContain('setTimeout(');
    expect(initSource).not.toContain('retry');
    expect(initSource).not.toContain('fallback');
    expect(viewerSource).toContain("sendMessage('XR_CAMERA_HAS_VIDEO'");
    expect(cameraHandler).toContain("setPhase('VIEWING')");
    expect(cameraHandler).toContain('dismissTransition()');
    expect(catalogueTrace).toBeGreaterThanOrEqual(0);
    expect(catalogueStateUpdate).toBeGreaterThan(catalogueTrace);
  });

  it('uses a shared epoch timestamp for parent-to-iframe duration calculations', () => {
    expect(scannerSource).toContain('performance.timeOrigin + performance.now()');
    expect(parentSource).toContain('function highResolutionTimestamp()');
    expect(viewerSource).toContain('performance.timeOrigin + performance.now()');
  });
});
