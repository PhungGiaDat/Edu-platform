// Unity MCP Server - Entry Point
// Connects Cursor to Unity Editor via HTTP
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerUnityHealth, registerUnityBuild, registerUnityBuildStatus, registerUnityDiagnostics, registerUnityPackages, registerUnityValidateTarget, registerUnityScenes } from './tools/unity-tools.js';
const server = new McpServer({
    name: 'unity-editor-mcp',
    version: '1.0.0',
});
registerUnityHealth(server);
registerUnityBuild(server);
registerUnityBuildStatus(server);
registerUnityDiagnostics(server);
registerUnityPackages(server);
registerUnityValidateTarget(server);
registerUnityScenes(server);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('unity-editor-mcp running on stdio');
}
main().catch((err) => {
    console.error('Failed to start unity-editor-mcp:', err);
    process.exit(1);
});
