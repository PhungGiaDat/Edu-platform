/**
 * @file Tiny TS-extension resolver hook for `node --test --experimental-strip-types`.
 *
 * Only purpose: when ESM imports `'./foo'` or `'../bar/baz'`, also try `.ts`,
 * `.tsx`, and `/index.ts`. Without this, Node's ESM resolver fails on the
 * RN codebase because every internal import uses bare module paths (no
 * extension) — fine for the Metro bundler, hostile to raw Node.
 *
 * Scope: ONLY used by the test runner invocation in the run command below.
 * Not loaded by the app. Zero dependencies.
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          --import "data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/ARExperienceMapper.test.ts
 *
 * (The data: URL trick avoids writing a second loader file. If the shell
 * refuses the data URL, run with a separate `--loader` file — see commit
 * history for the explicit-loader version.)
 */

import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as pathResolve, join } from 'node:path';

const TS_EXTENSIONS = ['.ts', '.tsx'];

export async function resolve(specifier, context, nextResolve) {
  // Only patch relative imports (skip bare module specifiers and absolute URLs).
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const parentURL = context.parentURL ?? `file://${process.cwd()}/`;
    const parentPath = dirname(fileURLToPath(parentURL));
    const candidates = [specifier, ...TS_EXTENSIONS.map((ext) => `${specifier}${ext}`)];

    for (const candidate of candidates) {
      const abs = pathResolve(parentPath, candidate);
      if (existsSync(abs) && statSync(abs).isFile()) {
        return nextResolve(pathToFileURL(abs).href, context);
      }
      // Try as directory with index.ts
      if (existsSync(abs) && statSync(abs).isDirectory()) {
        for (const ext of TS_EXTENSIONS) {
          const idx = join(abs, `index${ext}`);
          if (existsSync(idx)) {
            return nextResolve(pathToFileURL(idx).href, context);
          }
        }
      }
    }
  }
  return nextResolve(specifier, context);
}
