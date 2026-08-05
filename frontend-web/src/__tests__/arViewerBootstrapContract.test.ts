import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const viewerHtml = fs.readFileSync(
  path.resolve(process.cwd(), 'public/ar-viewer.html'),
  'utf8',
);

describe('AR viewer bootstrap fail-fast contract', () => {
  it('bounds the CDN bootstrap and reports its script stages', () => {
    expect(viewerHtml).toContain('BOOTSTRAP_DEADLINE_MS = 8000');
    expect(viewerHtml).toContain("'VIEWER_BOOTSTRAP_START'");
    expect(viewerHtml).toContain("'AR_RUNTIME_SCRIPT_START'");
    expect(viewerHtml).toContain("'AR_RUNTIME_SCRIPT_READY'");
    expect(viewerHtml).toContain("'AR_RUNTIME_SCRIPT_FAILED'");
    expect(viewerHtml).toContain("'AR_RUNTIME_SCRIPT_TIMEOUT'");
    expect(viewerHtml).toContain("loadScript('https://aframe.io/releases/1.4.2/aframe.min.js', 'aframe'");
    expect(viewerHtml).toContain("loadScript('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js', 'mindar'");
  });
});
