import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('frontend source structure', () => {
  it('keeps all React contexts in the single contexts directory', () => {
    expect(existsSync(resolve(sourceRoot, 'context'))).toBe(false);
    expect(existsSync(resolve(sourceRoot, 'contexts'))).toBe(true);
    expect(existsSync(resolve(sourceRoot, 'contexts', 'AuthContext.tsx'))).toBe(true);
    expect(existsSync(resolve(sourceRoot, 'contexts', 'LocaleContext.tsx'))).toBe(true);
    expect(existsSync(resolve(sourceRoot, 'contexts', 'SessionContext.tsx'))).toBe(true);
  });

  it('does not keep the legacy top-level components directory', () => {
    expect(existsSync(resolve(sourceRoot, 'components'))).toBe(false);
  });
});
