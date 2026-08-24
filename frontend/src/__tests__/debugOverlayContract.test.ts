import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
const mobileDebugScript = fs.readFileSync(
  path.resolve(process.cwd(), 'public/static/ar-assets/js/mobile-debug.js'),
  'utf8',
);
const viewerHtml = fs.readFileSync(path.resolve(process.cwd(), 'public/ar-viewer.html'), 'utf8');
const scannerHtml = fs.readFileSync(path.resolve(process.cwd(), 'public/ar-scanner.html'), 'utf8');
const xrHtml = fs.readFileSync(path.resolve(process.cwd(), 'public/ar-xr.html'), 'utf8');

function erudaBootstrap(html: string): string {
  const start = html.indexOf('<!-- Eruda Debug Console');
  const scriptEnd = html.indexOf('</script>', start);
  return html.slice(start, scriptEnd);
}

describe('mobile AR debug overlay contract', () => {
  it('enables parent Eruda for debug mode while isolating it from body', () => {
    expect(indexHtml).toContain("params.get('debug') === 'true' || params.get('eruda') === 'true'");
    expect(indexHtml).not.toContain("container: document.body");
    expect(indexHtml).toContain('container: erudaRoot');
    expect(indexHtml).toContain("erudaRoot.setAttribute('data-eruda-root', 'true')");
    expect(viewerHtml).toContain("viewerDebugParams.get('eruda') === 'true'");
    expect(scannerHtml).toContain("scannerDebugParams.get('eruda') === 'true'");
    expect(xrHtml).toContain("xrDebugParams.get('eruda') === 'true'");
    expect(erudaBootstrap(viewerHtml)).not.toContain("location.search.includes('debug')");
    expect(erudaBootstrap(scannerHtml)).not.toContain("location.search.includes('debug')");
    expect(erudaBootstrap(xrHtml)).not.toContain("location.search.includes('debug')");
  });

  it('provides a copy control backed by a larger text buffer', () => {
    expect(mobileDebugScript).toContain('window.MobileDebug.copy()');
    expect(mobileDebugScript).toContain('MAX_BUFFERED_LOGS = 1000');
    expect(mobileDebugScript).toContain("navigator.clipboard.writeText(text)");
    expect(mobileDebugScript).toContain('return copied');
    expect(indexHtml).toContain("data-eruda-copy-all");
    expect(indexHtml).toContain('await window.MobileDebug.copy()');
    expect(indexHtml).not.toContain("querySelectorAll(\".eruda-log-item\")");
  });

  it('buffers lifecycle logs before React and replays them after Eruda attaches', () => {
    const mobileDebugIndex = indexHtml.indexOf('/static/ar-assets/js/mobile-debug.js');
    const reactIndex = indexHtml.indexOf('/src/main.tsx');

    expect(mobileDebugIndex).toBeGreaterThan(-1);
    expect(mobileDebugIndex).toBeLessThan(reactIndex);
    expect(indexHtml).toContain('window.MobileDebug.attachEruda()');
    expect(mobileDebugScript).toContain('attachEruda: function ()');
    expect(mobileDebugScript).toContain("'[AR lifecycle] PAGE_BOOT engine=pending'");
  });

  it('routes iframe logs to Eruda while throttling repetitive performance telemetry', () => {
    expect(mobileDebugScript).toContain('PERF_LOG_INTERVAL_MS = 5000');
    expect(mobileDebugScript).toContain('isNoisyPerformanceLog');
    expect(mobileDebugScript).toContain('logIframeMessage(typeStr, data)');
    expect(viewerHtml).toContain('PERF_FORWARD_INTERVAL_MS = 5000');
    expect(viewerHtml).toContain('repetitive PERF/FPS logs suppressed in viewer');
    expect(mobileDebugScript).toContain('ENGINE_START engine=');
    expect(mobileDebugScript).toContain('CAMERA_READY engine=scanner');
    expect(scannerHtml).toContain('SCANNER_CONSOLE_');
    expect(scannerHtml).toContain('before camera bootstrap');
    expect(xrHtml).toContain('XR_CONSOLE_');
    expect(xrHtml).toContain('before engine bootstrap');
  });

  it('renders the mobile debug controls above the AR stacking context', () => {
    expect(mobileDebugScript).toContain('z-index: 1000000');
    expect(mobileDebugScript).toContain('z-index: 1000001');
  });
});
