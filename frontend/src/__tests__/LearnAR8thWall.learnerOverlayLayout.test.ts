import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('LearnerAROverlay layout contract', () => {
  it('keeps the shell pass-through while reserving interaction for explicit controls and the expanded panel', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/LearnAR8thWall.css'), 'utf8');

    expect(css).toMatch(/\.learner-ar-overlay\s*\{[\s\S]*?z-index:\s*150[\s\S]*?pointer-events:\s*none/);
    expect(css).toMatch(/\.learner-ar-overlay__reopen,[\s\S]*?\.learner-ar-overlay__speaker[\s\S]*?pointer-events:\s*auto/);
    expect(css).toMatch(/\.learner-ar-overlay__panel--expanded\s*\{[\s\S]*?pointer-events:\s*auto/);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
