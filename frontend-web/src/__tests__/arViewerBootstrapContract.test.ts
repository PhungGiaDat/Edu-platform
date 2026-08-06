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
    expect(viewerHtml).toContain("'/static/vendor/aframe-1.4.2.min.js'");
    expect(viewerHtml).toContain("'/static/vendor/mindar-image-aframe-1.2.5.prod.js'");
    // CDN URLs must not be present in the vendor-first bootstrap
    expect(viewerHtml).not.toContain('aframe.io/releases');
    expect(viewerHtml).not.toContain('cdn.jsdelivr.net/npm/mind-ar');
  });
});
