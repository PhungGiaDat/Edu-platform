// src/tools/validate-targets-dir.ts
//
// MCP tool: validate all images in a directory for MindAR targeting.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { checkImage, EXT_OK } from '../image-utils.js';

enum ResponseFormat {
  MARKDOWN = 'markdown',
  JSON = 'json',
}

const InputSchema = z.object({
  dirPath: z.string().min(1).describe('Absolute path to the directory containing target images'),
  response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
    .describe('Output format: "markdown" for human-readable or "json" for machine-readable'),
}).strict();

type Input = z.infer<typeof InputSchema>;

export function registerValidateTargetsDir(server: McpServer) {
  server.registerTool(
    'mindar_validate_targets_dir',
    {
      title: 'Validate MindAR Target Images in Directory',
      description: `Validate every supported image in a directory for MindAR targeting.

Walks the directory, runs the same checks as mindar_validate_target on
each file, and reports a summary. Use this as a pre-compile gate.

Args:
  - dirPath (string): absolute path to the directory
  - response_format ('markdown' | 'json'): output format (default: markdown)

Returns: per-image results + summary (PASS/WARN/FAIL counts).`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: Input) => {
      let entries: string[];
      try {
        entries = await fs.readdir(params.dirPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: cannot read directory ${params.dirPath}: ${msg}` }] };
      }

      const images = entries.filter(e => EXT_OK.has(path.extname(e).toLowerCase()));
      if (!images.length) {
        return { content: [{ type: 'text', text: 'No supported images found. Use JPG, PNG, or WebP.' }] };
      }

      const results = await Promise.all(
        images.map(img => checkImage(path.join(params.dirPath, img)))
      );

      const totalFail = results.reduce((s, r) => s + r.issues.filter(i => i.level === 'FAIL').length, 0);
      const totalWarn = results.reduce((s, r) => s + r.issues.filter(i => i.level === 'WARN').length, 0);

      if (params.response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ results, totalFail, totalWarn }, null, 2) }],
          structuredContent: { results, totalFail, totalWarn },
        };
      }

      const lines = [
        `# MindAR target validation: ${results.length} image(s) in ${params.dirPath}`,
        '',
      ];
      for (const r of results) {
        lines.push(`## ${r.file}${r.dim ? ` (${r.dim.w}x${r.dim.h}, ${(r.size / 1024).toFixed(0)}KB)` : ''}`);
        if (!r.issues.length) {
          lines.push('- [OK] ready to compile');
        } else {
          for (const i of r.issues) {
            lines.push(`- [${i.level}] **${i.code}**: ${i.msg}`);
          }
        }
        lines.push('');
      }
      lines.push(`Summary: ${totalFail} failure(s), ${totalWarn} warning(s)`);
      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent: { results, totalFail, totalWarn },
      };
    }
  );
}