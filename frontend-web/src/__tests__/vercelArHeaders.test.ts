import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface HeaderEntry {
  key: string;
  value: string;
}

interface HeaderRule {
  source: string;
  headers: HeaderEntry[];
}

const config = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as { headers: HeaderRule[] };

function matchingHeaderValues(requestPath: string, key: string): string[] {
  return config.headers
    .filter(rule => new RegExp(`^${rule.source}$`).test(requestPath))
    .flatMap(rule => rule.headers)
    .filter(header => header.key.toLowerCase() === key.toLowerCase())
    .map(header => header.value);
}

describe('Vercel AR iframe headers', () => {
  it.each([
    ['/ar-scanner.html', false],
    ['/ar-viewer.html', true],
  ] as const)('keeps %s out of conflicting global security headers', (requestPath, needsAFrame) => {
    expect(matchingHeaderValues(requestPath, 'X-Frame-Options')).toEqual(['SAMEORIGIN']);

    const cspValues = matchingHeaderValues(requestPath, 'Content-Security-Policy');
    expect(cspValues).toHaveLength(1);
    expect(cspValues[0]).toContain("frame-ancestors 'self'");
    expect(cspValues[0]).toContain('https://cdn.jsdelivr.net');
    if (needsAFrame) {
      expect(cspValues[0]).toContain('https://aframe.io');
    }
  });
});
