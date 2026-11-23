# Unity Editor MCP Integration

This setup enables Cursor to communicate with Unity Editor via an HTTP server running inside Unity.

## Architecture

```
Cursor (MCP Client)
    │
    │ stdio
    ▼
unity-editor-mcp (Node.js)
    │
    │ HTTP :9999
    ▼
UnityEditorServer.cs (Unity Editor)
    │
    ▼
Unity Editor APIs
```

## Setup

### Step 1: Open Unity Project

Open your Unity project at `mobile/unity/`

### Step 2: Add Unity Editor Server Script

The script is already at: `Assets/Editor/UnityEditorServer.cs`

Unity will compile it automatically.

### Step 3: Start Server in Unity

1. In Unity Editor, go to **Tools > Unity MCP Server > Start Server**
2. You should see: `[UnityServer] Started on http://localhost:9999`

### Step 4: Build the MCP Server (Node.js)

```bash
cd unity-mcp-tools
npm install
npm run build
```

### Step 5: Configure Cursor MCP

Add to your Cursor MCP settings (`settings.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "unity-editor": {
      "command": "node",
      "args": ["path/to/unity-mcp-tools/dist/index.js"],
      "env": {}
    }
  }
}
```

Or use the MCP settings UI in Cursor.

## Available Tools

| Tool | Description |
|------|-------------|
| `unity_health` | Check if Unity Editor is connected |
| `unity_build_player` | Trigger a player build |
| `unity_build_status` | Get last build result |
| `unity_diagnostics` | Run project diagnostics |
| `unity_packages` | List installed packages |
| `unity_validate_target` | Validate AR target image |
| `unity_scenes` | List enabled scenes |

## Example Usage

```
@cursor What's the status of my Unity project?
→ Calls unity_health → Returns connection status

Build the Android APK
→ Calls unity_build_player with target=Android

Validate my target image
→ Calls unity_validate_target with path to .png
```

## Troubleshooting

### "Unity Editor not running"
1. Open Unity project
2. Go to **Tools > Unity MCP Server > Start Server**
3. Check Unity Console for `[UnityServer] Started`

### Port 9999 already in use
Change the port in `UnityEditorServer.cs`:
```csharp
public const int DEFAULT_PORT = 9999;  // Change this
```

Then update `unity-tools.ts`:
```typescript
const UNITY_PORT = 9999;  // Match the port above
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/project/path` | GET | Get project path |
| `/api/build/player` | GET | Trigger build |
| `/api/build/status` | GET | Get build status |
| `/api/compile/errors` | GET | Get compile errors |
| `/api/package/list` | GET | List packages |
| `/api/scene/current` | GET | Current scene |
| `/api/scenes/list` | GET | All enabled scenes |
| `/api/targets/validate` | GET | Validate target image |
| `/api/guid/gen` | GET | Generate new GUID |
