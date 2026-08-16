// src/tools/check-assets.ts
//
// MCP tool: validate MindAR build output assets.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
const InputSchema = z.object({
    buildDir: z.string().min(1).describe('Absolute path to the built project directory (e.g., dist/)'),
    maxGlbMb: z.number().min(1).max(200).default(30)
        .describe('Maximum total .glb size in MB (default 30)'),
    maxMindMb: z.number().min(1).max(50).default(5)
        .describe('Maximum single .mind file size in MB (default 5)'),
}).strict();
async function* walk(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
        const p = path.join(d, e.name);
        if (e.isDirectory())
            yield* walk(p);
        else
            yield p;
    }
}
export function registerCheckAssets(server) {
    server.registerTool('mindar_check_assets', {
        title: 'Check MindAR Build Assets',
        description: `Validate MindAR build output assets: .mind, .glb, images.

Walks the build directory and reports:
  - Per-file sizes and extensions
  - Total .glb size vs budget
  - Per-.mind size vs budget
  - Missing expected files (e.g. no .mind)

Args:
  - buildDir (string): absolute path to built project directory
  - maxGlbMb (number): max total .glb size in MB (default 30)
  - maxMindMb (number): max single .mind file size in MB (default 5)

Returns: per-file inventory + aggregate issue list.`,
        inputSchema: InputSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async (params) => {
        const issues = [];
        const inventory = [];
        let totalGlbBytes = 0;
        let mindCount = 0;
        try {
            for await (const p of walk(params.buildDir)) {
                const ext = path.extname(p).toLowerCase();
                if (!['.mind', '.glb', '.gltf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext))
                    continue;
                const stat = await fs.stat(p);
                inventory.push({ path: p, ext, size: stat.size });
                if (ext === '.glb' || ext === '.gltf')
                    totalGlbBytes += stat.size;
                if (ext === '.mind')
                    mindCount++;
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: 'text', text: `Error: cannot walk ${params.buildDir}: ${msg}` }] };
        }
        if (mindCount === 0) {
            issues.push({ level: 'FAIL', code: 'NO_MIND_FILES', msg: 'No .mind files found; image tracking will not work' });
        }
        for (const item of inventory.filter(i => i.ext === '.mind')) {
            const mb = item.size / 1e6;
            if (mb > params.maxMindMb) {
                issues.push({
                    level: 'FAIL', code: 'MIND_TOO_LARGE',
                    msg: `${item.path} is ${mb.toFixed(1)}MB (max ${params.maxMindMb}MB); consider fewer targets or smaller sources`,
                });
            }
        }
        const totalGlbMb = totalGlbBytes / 1e6;
        if (totalGlbMb > params.maxGlbMb) {
            issues.push({
                level: 'WARN', code: 'GLB_OVER_BUDGET',
                msg: `Total .glb size ${totalGlbMb.toFixed(1)}MB exceeds budget ${params.maxGlbMb}MB`,
            });
        }
        const lines = [
            `# MindAR build asset check: ${params.buildDir}`,
            '',
            `- .mind files: ${mindCount}`,
            `- Total .glb/.gltf size: ${totalGlbMb.toFixed(2)} MB`,
            `- Total files inventoried: ${inventory.length}`,
            '',
        ];
        if (!issues.length) {
            lines.push('[OK] all asset checks passed');
        }
        else {
            for (const i of issues)
                lines.push(`- [${i.level}] **${i.code}**: ${i.msg}`);
        }
        return {
            content: [{ type: 'text', text: lines.join('\n') }],
            structuredContent: { inventory, issues, totalGlbBytes, mindCount },
        };
    });
}
//# sourceMappingURL=check-assets.js.map