// src/tools/diagnose-build.ts
//
// MCP tool: pre-flight checks for a WebAR build (HTTPS, WebGL, camera).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const InputSchema = z.object({
  buildDir: z.string().min(1).describe('Absolute path to the built project directory'),
  url: z.string().url().optional().describe('Optional production URL to verify HTTPS'),
}).strict();

type Input = z.infer<typeof InputSchema>;

interface Issue {
  level: 'FAIL' | 'WARN';
  code: string;
  msg: string;
}

export function registerDiagnoseBuild(server: McpServer) {
  server.registerTool(
    'mindar_diagnose_build',
    {
      title: 'Diagnose WebAR Build',
      description: `Pre-flight checks for a WebAR build.

Walks the diagnostic order from mindar-performance-debug:
  HTTPS → Camera permission → Browser support → Target file → targetIndex
  → Asset paths → WebGL errors → Tracking stability → Rendering perf

Args:
  - buildDir (string): absolute path to the built project directory
  - url (string, optional): production URL to verify HTTPS scheme

Returns: list of issues + reminders. This tool does NOT run the build
in a browser; it inspects the static output only.

What this tool checks:
  - index.html exists and references getUserMedia + mindar
  - .mind files present in build
  - HTTPS scheme if URL provided
  - Asset subdirectories exist (assets/, targets/, static/)

What this tool cannot check (requires a real browser):
  - Actual camera permission prompt
  - WebGL context creation
  - Per-frame performance`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: Input) => {
      const issues: Issue[] = [];

      // Check index.html
      let html: string | null = null;
      try {
        html = await fs.readFile(path.join(params.buildDir, 'index.html'), 'utf-8');
      } catch {
        issues.push({ level: 'FAIL', code: 'NO_INDEX', msg: 'No index.html found in build' });
      }

      if (html) {
        if (!/getUserMedia|getusermedia/i.test(html)) {
          issues.push({ level: 'FAIL', code: 'NO_CAMERA_API', msg: 'No getUserMedia call detected; camera access will fail' });
        }
        if (!/mind-?ar|mindar/i.test(html)) {
          issues.push({ level: 'FAIL', code: 'NO_MINDAR', msg: 'No reference to mindar in index.html' });
        }
        if (!/<script[^>]+type=["']module["']/i.test(html) && !/import\s/m.test(html)) {
          issues.push({ level: 'WARN', code: 'NO_ESM', msg: 'No ES module import detected; consider module-type script' });
        }
      }

      // Check asset subdirs
      const subdirs = ['assets', 'targets', 'static'];
      let found = false;
      for (const sub of subdirs) {
        try {
          await fs.access(path.join(params.buildDir, sub));
          found = true;
        } catch {}
      }
      if (!found) {
        issues.push({ level: 'WARN', code: 'NO_ASSETS_DIR', msg: 'No assets/targets/static directory found' });
      }

      // Walk for .mind files
      async function* walk(d: string): AsyncIterable<string> {
        const entries = await fs.readdir(d, { withFileTypes: true });
        for (const e of entries) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) yield* walk(p);
          else yield p;
        }
      }
      let mindCount = 0;
      try {
        for await (const p of walk(params.buildDir)) {
          if (path.extname(p).toLowerCase() === '.mind') mindCount++;
        }
      } catch {}
      if (mindCount === 0) {
        issues.push({ level: 'FAIL', code: 'NO_MIND_FILES', msg: 'No .mind files in build; image tracking will not work' });
      }

      // HTTPS check
      if (params.url) {
        try {
          const u = new URL(params.url);
          if (u.protocol !== 'https:') {
            issues.push({ level: 'FAIL', code: 'NOT_HTTPS', msg: `URL is ${u.protocol}; camera requires HTTPS` });
          }
        } catch {
          issues.push({ level: 'FAIL', code: 'BAD_URL', msg: `Invalid URL: ${params.url}` });
        }
      } else {
        issues.push({ level: 'WARN', code: 'NO_URL', msg: 'Production URL not provided; HTTPS not verified. Pass url= to verify.' });
      }

      // Reminders for things this tool can't check
      issues.push({
        level: 'WARN', code: 'MANUAL_BROWSER_CHECK',
        msg: 'Test on real devices: iPhone 11+ (Safari), Pixel 4a+ (Chrome), desktop Chrome. Camera permission and WebGL cannot be checked from static inspection.',
      });

      const lines = [
        `# MindAR build diagnosis: ${params.buildDir}`,
        '',
        `- .mind files: ${mindCount}`,
        params.url ? `- URL: ${params.url}` : '- URL: not provided',
        '',
      ];
      if (!issues.length) {
        lines.push('[OK] no issues found');
      } else {
        for (const i of issues) lines.push(`- [${i.level}] **${i.code}**: ${i.msg}`);
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent: { issues, mindCount },
      };
    }
  );
}