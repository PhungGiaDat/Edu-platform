# Server Config — Connection & Re-launch

> The Unity MCP server configuration for this project and how to
> recover from connection issues.

## Current configuration

The Unity MCP server is wired at two levels:

### Project-level (Claude Code)

`e:\University\Graduted Project\Edu-platform\.claude\settings.local.json`:

```json
{
  "mcpServers": {
    "unityMCP": {
      "type": "stdio",
      "command": "C:\\Users\\LENOVO\\.local\\bin\\uvx.exe",
      "args": [
        "--from",
        "mcpforunityserver==10.1.2",
        "mcp-for-unity",
        "--transport",
        "stdio"
      ]
    }
  }
}
```

All 48 `mcp__UnityMCP__*` tools are allow-listed under
`permissions.allow` in the same file.

Equivalent CLI command:

```bash
claude mcp add --scope local --transport stdio UnityMCP -- \
  "C:\Users\LENOVO\.local\bin\uvx.exe" \
  --offline --from "mcpforunityserver==10.1.2" mcp-for-unity
```

### User-level (Cursor)

`C:\Users\LENOVO\.cursor\mcp.json`:

```json
{
  "mcpServers": {
    "unityMCP": {
      "type": "stdio",
      "command": "C:\\Users\\LENOVO\\.local\\bin\\uvx.exe",
      "args": [
        "--from",
        "mcpforunityserver==10.1.2",
        "mcp-for-unity",
        "--transport",
        "stdio"
      ]
    }
  }
}
```

Note: Cursor config omits the `--offline` flag. Both work in
practice.

## Runtime evidence

Live console (from `read_console`):

```text
MCP-FOR-UNITY: StdioBridgeHost started on port 6400. (OS=WindowsEditor, server=10.1.2)
MCP-FOR-UNITY: [StartupConfigRewrite] refreshed 7 client config(s).
```

The Unity-side bridge host listens on port 6400 for the editor
process. The MCP client (Cursor/Claude Code) connects via stdio
to the `uvx` process, which proxies to the editor.

## How to verify connectivity

A simple ping:

```text
manage_scene action="get_loaded_scenes"
```

If this returns a value (e.g. `{"success":true, ...}`), the bridge
is alive. If it returns an error mentioning "no editor connected"
or similar, the bridge is broken.

## Recovery actions

### State 1: Bridge alive, but Unity not editing

```text
read mcpforunity://editor/state
```

Check `data.advice.ready_for_tools`. If `false`, Unity is mid-
compilation or in play mode. Wait.

### State 2: Bridge alive, but tool calls fail

```text
refresh_unity force=true
```

Forces a full refresh. Sometimes unsticks a stale bridge.

### State 3: Bridge missing entirely

```text
Tools/Unity MCP Server/Show Server Status
```

If the server isn't running, restart it:

```text
Tools/Unity MCP Server/Start Server
```

Or via the menu path:
```text
execute_menu_item menu_path="Tools/Unity MCP Server/Restart Server"
```

### State 4: Connection works but returns errors

Each tool has its own error handling. Common cases:

- `ns/script/SubsystemNotReady` — Unity is mid-reload. Wait.
- `manage_scene` returns "scene not loaded" — load it first.
- `apply_text_edits` returns "content mismatch" — file changed;
  re-read.

## Multiple Unity instances

If you have multiple Unity Editors open (e.g. different projects):

```text
mcpforunity://instances → list of {Name, Hash} pairs
```

Pin routing:
```text
set_active_instance instance="unity_AF8E6C4C"
```

The instance hash is shown in the console:
```text
[UnitySkills] 776 skills loaded | Instance: unity_AF8E6C4C
```

If you don't pin, the routing will fail with "multiple instances
connected" if more than one is open.

## Re-running the bootstrap

If the `mcpforunityserver` package is updated or the bridge is
broken, you can re-run the local setup:

```text
Window/MCP for Unity/Local Setup Window
```

This walks you through:
1. Verifying the Unity package is installed
2. Re-writing the client config files (`mcp.json`, `settings.local.json`)
3. Restarting the bridge

## Updating the MCP server version

To bump `mcpforunityserver`:

```text
1. Edit C:\Users\LENOVO\.cursor\mcp.json → change "10.1.2" to new version
2. Restart Cursor (or whichever client holds the stdio pipe)
3. uvx will re-download the new version on next launch
```

## Disabling the bridge temporarily

If MCP is misbehaving and you need to work without it:

```text
Tools/Unity MCP Server/Stop Server
```

The `user-unityMCP` namespace will become unavailable. Editor
operations still work via menu items, but you lose the CLI-style
tool surface.

To re-enable:
```text
Tools/Unity MCP Server/Start Server
```

## See also

- `references/script-mutation.md` — using the tools
- `references/verify-flow.md` — post-edit checks
- `references/project-state.md` — discovering project state
