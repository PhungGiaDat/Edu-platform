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
) as { headers: HeaderRule[]; rewrites: { source: string; destination: string }[] };

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
    ['/ar-xr.html', false],
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

  it('permits the VPS API in the XR viewer CSP', () => {
    const cspValues = matchingHeaderValues('/ar-xr.html', 'Content-Security-Policy')

    expect(cspValues).toHaveLength(1)
    expect(cspValues[0]).toContain('https://edu-platform-api.duckdns.org')
  })

  it('permits project-owned Supabase audio in the XR viewer media policy', () => {
    const cspValues = matchingHeaderValues('/ar-xr.html', 'Content-Security-Policy')

    expect(cspValues).toHaveLength(1)
    expect(cspValues[0]).toContain("media-src 'self' blob: data: https://*.supabase.co")
  })
});

describe('Normal app lesson CSP frame-src', () => {
  const lessonPath = '/courses/momo-nature-english-5-7/lessons/meet-the-elephant';

  it('permits the trusted YouTube embed origins for the lesson video player', () => {
    const cspValues = matchingHeaderValues(lessonPath, 'Content-Security-Policy');

    expect(cspValues).toHaveLength(1);
    const frameSrc = cspValues[0]
      .split(';')
      .map(directive => directive.trim())
      .find(directive => directive.startsWith('frame-src'));

    expect(frameSrc).toBeDefined();
    expect(frameSrc).toContain('https://www.youtube-nocookie.com');
    expect(frameSrc).toContain('https://www.youtube.com');
  });

  it('preserves the existing self and Stripe frame-src restrictions', () => {
    const cspValues = matchingHeaderValues(lessonPath, 'Content-Security-Policy');
    const frameSrc = cspValues[0]
      .split(';')
      .map(directive => directive.trim())
      .find(directive => directive.startsWith('frame-src'))!;

    expect(frameSrc).toContain("'self'");
    expect(frameSrc).toContain('https://js.stripe.com');
    expect(frameSrc).not.toContain('*'); // no wildcard weakening
  });

  it('permits HTTPS and WebSocket connections to the VPS API', () => {
    const cspValues = matchingHeaderValues(lessonPath, 'Content-Security-Policy');

    expect(cspValues[0]).toContain('https://edu-platform-api.duckdns.org');
    expect(cspValues[0]).toContain('wss://edu-platform-api.duckdns.org');
  });
});

it('routes same-origin API and WebSocket paths to the VPS backend', () => {
  expect(config.rewrites.slice(0, 2)).toEqual([
    { source: '/api/(.*)', destination: 'https://edu-platform-api.duckdns.org/api/$1' },
    { source: '/ws/(.*)', destination: 'https://edu-platform-api.duckdns.org/ws/$1' },
  ]);
});
