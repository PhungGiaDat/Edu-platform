// src/tools/validate-target.ts
//
// MCP tool: validate a single image file for MindAR targeting.
import { z } from 'zod';
import { checkImage } from '../image-utils.js';
var ResponseFormat;
(function (ResponseFormat) {
    ResponseFormat["MARKDOWN"] = "markdown";
    ResponseFormat["JSON"] = "json";
})(ResponseFormat || (ResponseFormat = {}));
const InputSchema = z.object({
    imagePath: z.string().min(1).describe('Absolute path to the image file'),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
        .describe('Output format: "markdown" for human-readable or "json" for machine-readable'),
}).strict();
export function registerValidateTarget(server) {
    server.registerTool('mindar_validate_target', {
        title: 'Validate MindAR Target Image',
        description: `Validate a single image for use as a MindAR image target.

Checks resolution, file size, aspect ratio, and format compatibility.
Use this BEFORE compiling .mind files to catch low-quality targets.

Args:
  - imagePath (string): absolute path to the image file
  - response_format ('markdown' | 'json'): output format (default: markdown)

Returns: validation report with PASS/WARN/FAIL per check.

Error Handling: returns a clear error if the file cannot be read or
the format is unsupported.`,
        inputSchema: InputSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async (params) => {
        try {
            const result = await checkImage(params.imagePath);
            const fail = result.issues.filter(i => i.level === 'FAIL').length;
            const warn = result.issues.filter(i => i.level === 'WARN').length;
            if (params.response_format === ResponseFormat.JSON) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ result, fail, warn }, null, 2) }],
                    structuredContent: { result, fail, warn },
                };
            }
            const lines = [
                `# MindAR target validation: ${result.file}`,
                '',
                result.dim ? `- Resolution: ${result.dim.w}x${result.dim.h}` : '- Resolution: unknown',
                `- File size: ${(result.size / 1024).toFixed(0)} KB`,
                '',
            ];
            if (!result.issues.length) {
                lines.push('[OK] ready to compile');
            }
            else {
                for (const i of result.issues) {
                    lines.push(`- [${i.level}] **${i.code}**: ${i.msg}`);
                }
                lines.push('', `Summary: ${fail} failure(s), ${warn} warning(s)`);
            }
            return {
                content: [{ type: 'text', text: lines.join('\n') }],
                structuredContent: { result, fail, warn },
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: 'text', text: `Error: ${msg}` }] };
        }
    });
}
//# sourceMappingURL=validate-target.js.map