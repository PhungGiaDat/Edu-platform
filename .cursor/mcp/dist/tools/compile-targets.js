// src/tools/compile-targets.ts
//
// MCP tool: compile images to a .mind file.
//
// The official MindAR compiler runs in the browser. For a full CI
// implementation, puppeteer is required to drive the official web
// compiler. We attempt that path if puppeteer is available; otherwise
// we return an actionable error pointing to the alternatives.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { checkImage, EXT_OK } from '../image-utils.js';
const InputSchema = z.object({
    sourceDir: z.string().min(1).describe('Absolute path to directory containing source images'),
    outFile: z.string().min(1).describe('Absolute path for the output .mind file (extension optional)'),
    emitManifest: z.boolean().default(true).describe('Emit a JSON manifest mapping target names to indices'),
    filterType: z.number().int().min(0).max(1).default(0)
        .describe('MindAR filter profile: 0=default (higher quality), 1=fast'),
}).strict();
export function registerCompileTargets(server) {
    server.registerTool('mindar_compile_targets', {
        title: 'Compile MindAR Targets',
        description: `Compile a directory of images into a single .mind file for MindAR.

Validates each source image first; aborts on any FAIL. Then runs the
official MindAR compiler (browser-based) via puppeteer if installed.

Args:
  - sourceDir (string): directory with source JPG/PNG/WebP images
  - outFile (string): output path for the .mind file
  - emitManifest (bool): also write manifest.json (default: true)
  - filterType (0|1): MindAR filter profile (default: 0 = higher quality)

Returns: validation summary, manifest contents, output file size.
If puppeteer is not available, returns an actionable error pointing to
the official compiler URL for manual compilation.

Common Errors:
  - "No images found in sourceDir": directory has no JPG/PNG/WebP
  - "Validation failed": at least one image has a FAIL — fix and retry
  - "puppeteer not installed": install puppeteer to enable headless
    compilation, or compile manually at the official compiler URL`,
        inputSchema: InputSchema,
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async (params) => {
        let entries;
        try {
            entries = await fs.readdir(params.sourceDir);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: 'text', text: `Error: cannot read source directory: ${msg}` }] };
        }
        const images = entries
            .filter(e => EXT_OK.has(path.extname(e).toLowerCase()))
            .sort(); // deterministic order = deterministic targetIndex
        if (!images.length) {
            return { content: [{ type: 'text', text: 'Error: no images found in sourceDir. Use JPG, PNG, or WebP.' }] };
        }
        // Validate first; abort on FAIL
        const validations = await Promise.all(images.map(img => checkImage(path.join(params.sourceDir, img))));
        const fails = validations.filter(v => v.issues.some(i => i.level === 'FAIL'));
        if (fails.length) {
            const lines = [
                `Validation failed for ${fails.length}/${validations.length} image(s). Fix and retry:`,
                '',
            ];
            for (const f of fails) {
                lines.push(`- ${f.file}:`);
                for (const i of f.issues.filter(x => x.level === 'FAIL')) {
                    lines.push(`    [${i.level}] ${i.code}: ${i.msg}`);
                }
            }
            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }
        // Try to use puppeteer if installed
        let puppeteer;
        try {
            // @ts-ignore — puppeteer is an optional peer dependency
            puppeteer = await import('puppeteer');
        }
        catch {
            return {
                content: [{
                        type: 'text',
                        text: [
                            `Validation passed (${validations.length} images).`,
                            '',
                            'puppeteer is not installed; cannot run the headless compiler.',
                            '',
                            'To enable automated compilation:',
                            '  npm install puppeteer',
                            '',
                            'Until then, compile manually at:',
                            '  https://hiukim.github.io/mind-ar-js-doc/tools/compile',
                            '',
                            'Or use the CLI (if available in your workspace):',
                            '  npx mindar-compiler --input <sourceDir> --output <outFile>',
                            '',
                            'Planned compile order (targetIndex 0..N):',
                            ...images.map((img, i) => `  ${i}: ${img}`),
                        ].join('\n'),
                    }],
            };
        }
        // puppeteer path: navigate to official compiler, upload files, capture download
        const browser = await puppeteer.default.launch({ headless: 'new' });
        const page = await browser.newPage();
        const outPath = params.outFile.endsWith('.mind') ? params.outFile : `${params.outFile}.mind`;
        const outDir = path.dirname(outPath);
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
        await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile');
        await page.waitForSelector('input[type=file]');
        const inputEl = await page.$('input[type=file]');
        await inputEl.uploadFile(...images.map(img => path.join(params.sourceDir, img)));
        await page.click('#compile-button');
        // Wait for download to settle
        await new Promise(r => setTimeout(r, 8000));
        await browser.close();
        const manifest = {
            version: 1,
            compiledAt: new Date().toISOString(),
            compilerVersion: 'web',
            filterType: params.filterType,
            targets: validations.map((v, i) => ({
                index: i,
                name: path.basename(images[i], path.extname(images[i])),
                source: images[i],
                width: v.dim?.w ?? 0,
                height: v.dim?.h ?? 0,
                fileSize: v.size,
            })),
        };
        if (params.emitManifest) {
            const manifestPath = outPath.replace(/\.mind$/, '') + '.manifest.json';
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        }
        const outSize = await fs.stat(outPath).catch(() => ({ size: 0 }));
        return {
            content: [{
                    type: 'text',
                    text: [
                        `Compiled ${images.length} target(s) → ${outPath}`,
                        `Output size: ${(outSize.size / 1024).toFixed(1)} KB`,
                        params.emitManifest ? `Manifest written alongside .mind file` : '',
                    ].filter(Boolean).join('\n'),
                }],
            structuredContent: { outFile: outPath, manifest, outSize: outSize.size },
        };
    });
}
//# sourceMappingURL=compile-targets.js.map