/**
 * buildMindCatalog.mjs
 *
 * Builds a versioned MindAR lesson catalog (.mind + .manifest.json) using
 * `mind-ar`'s `OfflineCompiler` directly in Node. The compiler's ESM
 * imports are aliased to the CJS-friendly `@tensorflow/tfjs` and
 * `@napi-rs/canvas` builds so the script runs on Windows machines without
 * Visual Studio.
 *
 * Usage:
 *   node scripts/buildMindCatalog.mjs public/assets/target/catalogs/animals-v2.sources.json
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { register } from 'node:module';
import { unpack as msgpackrUnpack } from 'msgpackr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Register the loader hook before any mind-ar imports so it can rewrite
// `import { engine } from '@tensorflow/tfjs'` and `from 'canvas'` into
// the native-compatible equivalents.
register('./mindar-loader.mjs', import.meta.url);

function validateSource(source) {
    if (source.schemaVersion !== 1) {
        throw new Error(`Unsupported schemaVersion: ${source.schemaVersion}`);
    }
    if (!source.catalogId || typeof source.catalogId !== 'string') {
        throw new Error('catalogId must be a non-empty string');
    }
    if (!source.mindUrl || !source.mindUrl.endsWith('.mind')) {
        throw new Error('mindUrl must end with .mind');
    }
    if (!Array.isArray(source.targets) || source.targets.length < 1) {
        throw new Error('A catalog must contain at least one target');
    }
    const indices = source.targets.map((t) => t.mindTargetIndex);
    const expected = indices.map((_, i) => i);
    if (JSON.stringify(indices) !== JSON.stringify(expected)) {
        throw new Error('mindTargetIndex values must be contiguous from zero');
    }
    const tags = new Set(source.targets.map((t) => t.arTag));
    if (tags.size !== source.targets.length) {
        throw new Error('arTag values must be unique');
    }
    const publicRoot = path.resolve(projectRoot, 'public');
    for (const target of source.targets) {
        if (!target.markerImage) {
            throw new Error(`Target ${target.arTag} is missing markerImage`);
        }
        const markerAbs = path.resolve(publicRoot, target.markerImage.replace(/^\//, ''));
        if (!existsSync(markerAbs)) {
            throw new Error(`Marker image not found: ${markerAbs}`);
        }
    }
}

async function build(sourcePath) {
    const absoluteSource = path.resolve(sourcePath);
    if (!existsSync(absoluteSource)) {
        throw new Error(`Source manifest not found: ${absoluteSource}`);
    }
    const source = JSON.parse(readFileSync(absoluteSource, 'utf8'));
    validateSource(source);

    const publicRoot = path.resolve(projectRoot, 'public');
    const mindOut = path.resolve(publicRoot, source.mindUrl.replace(/^\//, ''));
    const manifestOut = mindOut.replace(/\.mind$/, '.manifest.json');
    mkdirSync(path.dirname(mindOut), { recursive: true });

    const napiCanvas = await import('@napi-rs/canvas');
    const { OfflineCompiler } = await import('mind-ar/src/image-target/offline-compiler.js');
    const compiler = new OfflineCompiler();

    const htmlImages = [];
    for (const target of source.targets) {
        const markerAbs = path.resolve(publicRoot, target.markerImage.replace(/^\//, ''));
        const image = await napiCanvas.loadImage(markerAbs);
        htmlImages.push(image);
    }

    await compiler.compileImageTargets(htmlImages, () => undefined);
    const buffer = await compiler.exportData();
    const bytes = Buffer.from(buffer);

    const decoded = msgpackrUnpack(bytes);
    if (decoded.v !== 2 || decoded.dataList.length !== source.targets.length) {
        throw new Error('compiled MindAR output does not match source manifest');
    }

    const mindTemp = `${mindOut}.tmp`;
    writeFileSync(mindTemp, bytes);
    renameSync(mindTemp, mindOut);

    const manifest = {
        schemaVersion: source.schemaVersion,
        catalogId: source.catalogId,
        mindUrl: source.mindUrl,
        targetCount: source.targets.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        targets: source.targets.map(({ arTag, mindTargetIndex }) => ({ arTag, mindTargetIndex })),
    };
    const manifestTemp = `${manifestOut}.tmp`;
    writeFileSync(manifestTemp, `${JSON.stringify(manifest, null, 2)}\n`);
    renameSync(manifestTemp, manifestOut);

    console.log(
        `[buildMindCatalog] wrote ${mindOut} (${bytes.byteLength} bytes, sha256=${manifest.sha256})`,
    );
    console.log(`[buildMindCatalog] wrote ${manifestOut}`);
}

const sourceArg = process.argv[2];
if (!sourceArg) {
    console.error('Usage: node scripts/buildMindCatalog.mjs <source-manifest>');
    process.exit(1);
}

build(sourceArg).catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
});
