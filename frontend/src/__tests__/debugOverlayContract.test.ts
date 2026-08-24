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
  it('keeps debug=true on the lightweight overlay and isolates Eruda from body', () => {
    expect(indexHtml).toContain("params.get('eruda') === 'true'");
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
  });

  it('renders the mobile debug controls above the AR stacking context', () => {
    expect(mobileDebugScript).toContain('z-index: 1000000');
    expect(mobileDebugScript).toContain('z-index: 1000001');
  });
});
