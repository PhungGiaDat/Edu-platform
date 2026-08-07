// src/index.ts — main entry point
//
// Registers all MindAR tools with the MCP server and starts the stdio
// transport. Each tool is defined in src/tools/.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerValidateTarget } from './tools/validate-target.js';
import { registerValidateTargetsDir } from './tools/validate-targets-dir.js';
import { registerCompileTargets } from './tools/compile-targets.js';
import { registerCheckAssets } from './tools/check-assets.js';
import { registerDiagnoseBuild } from './tools/diagnose-build.js';
import { registerScaffoldProject } from './tools/scaffold-project.js';

const server = new McpServer({
  name: 'mindar-mcp-server',
  version: '1.0.0',
});

registerValidateTarget(server);
registerValidateTargetsDir(server);
registerCompileTargets(server);
registerCheckAssets(server);
registerDiagnoseBuild(server);
registerScaffoldProject(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('mindar-mcp-server running on stdio');
}

main().catch((err) => {
  console.error('Failed to start mindar-mcp-server:', err);
  process.exit(1);
});