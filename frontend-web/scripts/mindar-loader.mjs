/**
 * mindar-loader.mjs
 *
 * Node ESM loader hook that rewrites bare-specifier imports used by
 * `mind-ar`'s compiler into the locally-available equivalents that work
 * on Windows without Visual Studio:
 *
 *   - `canvas`            -> `@napi-rs/canvas`
 *   - `@tensorflow/tfjs`  -> `tfjs-node-entry.mjs` (CJS-to-ESM bridge)
 *
 * The hook also strips any mind-ar ESM file from its `MathBackendCPU`
 * pipeline by registering the cpu backend up front.
 */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const localRequire = createRequire(import.meta.url);
const napiCanvasUrl = pathToFileURL(localRequire.resolve('@napi-rs/canvas')).href;

const tfjsShim = new URL('./tfjs-node-entry.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'canvas') {
        return { url: napiCanvasUrl, shortCircuit: true };
    }
    if (specifier === '@tensorflow/tfjs') {
        return { url: tfjsShim, shortCircuit: true };
    }
    return nextResolve(specifier, context);
}
