import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerHtml = fs.readFileSync(
  path.resolve(process.cwd(), 'public/ar-viewer.html'),
  'utf8',
);

const viewerJs = fs.readFileSync(
  path.resolve(process.cwd(), 'public/static/ar-assets/js/ar-viewer.js'),
  'utf8',
);

describe('AR viewer bootstrap fail-fast contract', () => {
  it('bounds the CDN bootstrap and reports its script stages', () => {
    expect(viewerHtml).toContain('BOOTSTRAP_DEADLINE_MS = 25000');
    expect(viewerHtml).toContain("'VIEWER_BOOTSTRAP_START'");
    expect(viewerHtml).toContain("'AR_RUNTIME_SCRIPT_START'");
    expect(viewerHtml).toContain("'AR_RUNTIME_SCRIPT_READY'");
    expect(viewerHtml).toContain("'AR_RUNTIME_SCRIPT_FAILED'");
    expect(viewerHtml).toContain("'AR_RUNTIME_SCRIPT_TIMEOUT'");
    expect(viewerHtml).toContain("'/static/vendor/aframe-1.4.2.min.js'");
    expect(viewerHtml).toContain("'/static/vendor/mindar-image-aframe-1.2.5.prod.js'");
    expect(viewerHtml).toContain("'/static/ar-assets/js/ar-model-scale.js'");
    // CDN URLs must not be present in the vendor-first bootstrap
    expect(viewerHtml).not.toContain('aframe.io/releases');
    expect(viewerHtml).not.toContain('cdn.jsdelivr.net/npm/mind-ar');
    expect(viewerJs).toContain('MINDAR_INITIALIZATION_TIMEOUT_MS = 45_000');
  });

  // ── Task 7: SET_ACTIVE_TARGETS + BEGIN_ADD_CARD_SCAN contract ────────────────
  it('handles SET_ACTIVE_TARGETS message', () => {
    expect(viewerJs).toContain("case 'SET_ACTIVE_TARGETS'");
  });

  it('announces target transport readiness before waiting for camera readiness', () => {
    const anchorsReady = viewerJs.indexOf('ensureCatalogAnchors(targetCount)');
    const transportReady = viewerJs.indexOf("sendToParent('VIEWER_TARGETS_READY'");
    const cameraReady = viewerJs.indexOf("sendToParent('AR_READY'");

    expect(anchorsReady).toBeGreaterThan(-1);
    expect(transportReady).toBeGreaterThan(anchorsReady);
    expect(cameraReady).toBeGreaterThan(transportReady);
  });

  it('waits for the rendered model before acknowledging persistent targets', () => {
    const fnStart = viewerJs.indexOf('function loadSlotGlb');
    const afterFn = viewerJs.substring(fnStart);
    const nextFn = afterFn.indexOf('\n    function ', 1);
    const fnBody = nextFn > 0 ? afterFn.substring(0, nextFn) : afterFn;

    expect(fnBody).toContain("modelEl.addEventListener('model-loaded', succeed");
    expect(fnBody).toContain("modelEl.addEventListener('model-error'");
    expect(fnBody.indexOf("assetItem.addEventListener('loaded'")).toBeLessThan(
      fnBody.indexOf("assetItem.setAttribute('src', target.modelUrl)"),
    );
    expect(fnBody).toContain("document.getElementById('slot-asset-' + target.slotIndex)");
  });

  it('handles BEGIN_ADD_CARD_SCAN message', () => {
    expect(viewerJs).toContain("case 'BEGIN_ADD_CARD_SCAN'");
  });

  it('returns the complete retained iframe log buffer with request correlation', () => {
    expect(viewerJs).toContain(
      "requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined",
    );
    expect(viewerJs).toContain("logs: iframeLogBuffer.slice().join('\\n')");
    expect(viewerJs).not.toContain('iframeLogBuffer.slice(-200)');
  });

  it('applyActiveTargets does not call showImageFallbackForTarget on model error', () => {
    // The new applyActiveTargets() must reject via ACTIVE_TARGETS_REJECTED
    // and must NOT fall back to the legacy showImageFallbackForTarget path.
    // Extract only the applyActiveTargets function body.
    const fnStart = viewerJs.indexOf('function applyActiveTargets');
    expect(fnStart).toBeGreaterThan(-1);
    const afterFn = viewerJs.substring(fnStart);
    // The function ends at the next sibling "    function " (4 spaces = module-level IIFE indent).
    const nextSiblingFn = afterFn.indexOf('\n    function ', 1);
    const fnBody = nextSiblingFn > 0 ? afterFn.substring(0, nextSiblingFn) : afterFn;
    // The brief forbids the actual call, not mentions in comments.
    // Check for the full call pattern so the comment "do NOT call …" is excluded.
    expect(fnBody).not.toContain("showImageFallbackForTarget(0, 'model-0-asset-error')");
    expect(fnBody).not.toContain('showImageFallbackForTarget(0, "model-0-asset-error")');
    expect(fnBody).not.toContain('showImageFallbackForTarget(1,');
  });

  it('does not call showImageFallbackForTarget for slot 0 model error', () => {
    // This assertion covers the new applyActiveTargets code path only.
    // The brief requires that model errors in the revisioned slot protocol
    // are reported via ACTIVE_TARGETS_REJECTED rather than image fallbacks.
    const fnStart = viewerJs.indexOf('function applyActiveTargets');
    const afterFn = viewerJs.substring(fnStart);
    const nextFn = afterFn.indexOf('\n    function ', 1);
    const fnBody = nextFn > 0 ? afterFn.substring(0, nextFn) : afterFn;
    expect(fnBody).not.toContain("showImageFallbackForTarget(0, 'model-0-asset-error')");
    expect(fnBody).not.toContain("showImageFallbackForTarget(1, 'model-1-asset-error')");
  });

  // ── Task 11: Persistent path must not invoke multi-mind lifecycle ─────────────
  it('does not call MULTI_MIND_PREPARE_STARTED or MULTI_MIND_MERGED in persistent path', () => {
    // The persistent viewer uses SET_ACTIVE_TARGETS / ACTIVE_TARGETS_APPLIED.
    // It must NOT invoke the old multi-mind merge flow at all.
    expect(viewerJs).not.toContain('MULTI_MIND_PREPARE_STARTED');
    expect(viewerJs).not.toContain('MULTI_MIND_MERGED');
    expect(viewerJs).not.toContain('MIND_BUFFER');
  });
});
