// Unity MCP Tools - Unity Editor HTTP API client
import { z } from 'zod';
const UNITY_PORT = 9999;
const BASE_URL = `http://localhost:${UNITY_PORT}`;
async function unityRequest(endpoint, params) {
    let url = `${BASE_URL}${endpoint}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }
    catch (error) {
        throw new Error(error instanceof Error && error.message.includes('timeout')
            ? 'Unity Editor not running. Start MCP server via: Tools > Unity MCP Server > Start Server'
            : `Unity connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// Schemas
const BuildTargetSchema = z.object({
    target: z.enum(['Android', 'iOS', 'Standalone']).optional().default('Android'),
    outputPath: z.string().optional(),
});
const ValidateTargetSchema = z.object({
    path: z.string().describe('Path to target image file (.png, .jpg)'),
});
// Tool: unity_health
export function registerUnityHealth(server) {
    server.registerTool('unity_health', {
        title: 'Unity Health Check',
        description: 'Check if Unity Editor MCP server is running and responsive',
        inputSchema: z.object({}),
    }, async () => {
        try {
            const result = await unityRequest('/api/health');
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Unity Editor not connected.\n\nTo enable:\n1. Open Unity Editor\n2. Go to Tools > Unity MCP Server > Start Server\n3. Wait for "[UnityServer] Started on http://localhost:9999"` }],
                isError: true,
            };
        }
    });
}
// Tool: unity_build_player
export function registerUnityBuild(server) {
    server.registerTool('unity_build_player', {
        title: 'Unity Player Build',
        description: 'Trigger a Unity Player build (Android/iOS/Standalone)',
        inputSchema: BuildTargetSchema,
    }, async (params) => {
        try {
            const buildParams = {};
            if (params?.target)
                buildParams['buildTarget'] = params.target;
            if (params?.outputPath)
                buildParams['buildPath'] = params.outputPath;
            const result = await unityRequest('/api/build/player', buildParams);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                isError: !result.success,
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Build failed: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    });
}
// Tool: unity_build_status
export function registerUnityBuildStatus(server) {
    server.registerTool('unity_build_status', {
        title: 'Unity Build Status',
        description: 'Get the last Unity build result and status',
        inputSchema: z.object({}),
    }, async () => {
        try {
            const result = await unityRequest('/api/build/status');
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    });
}
// Tool: unity_diagnostics
export function registerUnityDiagnostics(server) {
    server.registerTool('unity_diagnostics', {
        title: 'Unity Diagnostics',
        description: 'Run Unity project diagnostics - connection, packages, scenes',
        inputSchema: z.object({}),
    }, async () => {
        try {
            const [health, packageList, sceneList] = await Promise.all([
                unityRequest('/api/health').catch(() => ({ status: 'unavailable' })),
                unityRequest('/api/package/list').catch(() => ({ packages: [] })),
                unityRequest('/api/scenes/list').catch(() => ({ scenes: [] })),
            ]);
            const result = {
                unityConnected: health.status === 'ok',
                project: await unityRequest('/api/project/path').catch(() => ({ path: 'unknown' })),
                packages: packageList.packages || [],
                scenes: sceneList.scenes || [],
                timestamp: new Date().toISOString(),
            };
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                isError: !result.unityConnected,
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Diagnostics failed: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    });
}
// Tool: unity_packages
export function registerUnityPackages(server) {
    server.registerTool('unity_packages', {
        title: 'Unity Packages',
        description: 'List installed Unity packages',
        inputSchema: z.object({}),
    }, async () => {
        try {
            const result = await unityRequest('/api/package/list');
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    });
}
// Tool: unity_validate_target
export function registerUnityValidateTarget(server) {
    server.registerTool('unity_validate_target', {
        title: 'Validate AR Target',
        description: 'Validate an AR target image file (.png, .jpg)',
        inputSchema: ValidateTargetSchema,
    }, async (params) => {
        try {
            const result = await unityRequest('/api/targets/validate', { path: params.path });
            const output = result.valid
                ? `✓ Target image valid\n  Path: ${result.path}\n  Size: ${(result.size / 1024).toFixed(1)} KB\n  Format: ${result.format.toUpperCase()}`
                : `✗ Target image invalid\n  Error: ${result.error || 'Unknown error'}`;
            return {
                content: [{ type: 'text', text: output }],
                isError: !result.valid,
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Validation failed: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    });
}
// Tool: unity_scenes
export function registerUnityScenes(server) {
    server.registerTool('unity_scenes', {
        title: 'Unity Scenes',
        description: 'List enabled scenes in Unity build settings',
        inputSchema: z.object({}),
    }, async () => {
        try {
            const result = await unityRequest('/api/scenes/list');
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    });
}
