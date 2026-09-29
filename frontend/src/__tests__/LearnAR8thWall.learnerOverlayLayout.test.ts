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

  it('mounts the learner overlay collapsed in LearnAR8thWall', () => {
    const page = readFileSync(resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'), 'utf8');
    const start = page.indexOf('<LearnerAROverlay');
    const usage = page.slice(start, page.indexOf('/>', start));

    expect(start).toBeGreaterThanOrEqual(0);
    expect(usage).toContain('initialMode="collapsed"');
  });

  it('makes the floating control a 48px circle in the safe-area corner and adds no full-screen blocker', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/LearnAR8thWall.css'), 'utf8');
    const reopen = css.match(/\.learner-ar-overlay__reopen\s*\{([^}]*)\}/g)?.join('\n') ?? '';

    expect(reopen).toMatch(/width:\s*48px/);
    expect(reopen).toMatch(/height:\s*48px/);
    expect(reopen).toMatch(/border-radius:\s*50%/);
    expect(reopen).toMatch(/right:\s*max\(16px,\s*calc\(env\(safe-area-inset-right\)/);
    expect(reopen).toMatch(/bottom:\s*max\(16px,\s*calc\(env\(safe-area-inset-bottom\)/);
    // Only explicit controls and the expanded panel take input; the shell and compact panel stay pass-through.
    expect(css).toMatch(/\.learner-ar-overlay__panel--compact\s*\{[^}]*pointer-events:\s*none/);
    expect(css.match(/pointer-events:\s*auto/g)).toHaveLength(2);
  });
});
