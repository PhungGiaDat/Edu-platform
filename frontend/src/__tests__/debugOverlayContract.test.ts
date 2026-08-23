import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
const mobileDebugScript = fs.readFileSync(
  path.resolve(process.cwd(), 'public/static/ar-assets/js/mobile-debug.js'),
  'utf8',
);

describe('mobile AR debug overlay contract', () => {
  it('keeps debug=true on the lightweight overlay and isolates Eruda from body', () => {
    expect(indexHtml).toContain("params.get('eruda') === 'true'");
    expect(indexHtml).not.toContain("container: document.body");
    expect(indexHtml).toContain('container: erudaRoot');
    expect(indexHtml).toContain("erudaRoot.setAttribute('data-eruda-root', 'true')");
  });

  it('renders the mobile debug controls above the AR stacking context', () => {
    expect(mobileDebugScript).toContain('z-index: 1000000');
    expect(mobileDebugScript).toContain('z-index: 1000001');
  });
});
