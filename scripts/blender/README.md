# Blender MCP Setup

This folder holds the `blender-mcp` addon source for installation into Blender.

## Why is it in the repo?

`blender-mcp` is a third-party project that **requires Blender installed locally** to function. The MCP server (`uvx blender-mcp`) only brokers messages between your AI client and a running Blender process — it cannot rig or animate without Blender actually running with this addon loaded.

This file is a **local reference copy** so the team can:
- Audit the exact addon code that will run inside Blender
- Diff it against upstream `MCPBlender/blender-mcp` for security/correctness
- Re-install on any teammate's machine without re-downloading from GitHub

It is **not** a working rig/animation tool by itself.

## When can Codex actually use this?

Both conditions must be true:

1. **Blender is installed** on the same machine (≥ 3.0, 4.x recommended)
2. **This addon is enabled** in that Blender (Edit ▸ Preferences ▸ Add-ons)
3. **Blender is open** with the MCP server connected (sidebar `N` ▸ BlenderMCP ▸ Connect)

Then the MCP config in `~/.codex/config.toml` and `~/.cursor/mcp.json` (already wired) will route Codex/Cursor commands into Blender over TCP `localhost:9876`.

## Workflow when Blender IS available

```
1. Open Blender → sidebar N → BlenderMCP tab → click "Connect to MCP server"
2. Tell Codex: "Import model/ragdollcat.fbx, auto-rig with 4-leg quadruped
   armature, add idle + walk cycle animations, export as
   frontend-web/public/assets/models/ragdollcat.glb"
3. Codex sends MCP commands → addon executes in Blender → result returns
```

## Workflow when Blender is NOT available (current state)

Without Blender, the MCP config blocks Codex startup with connection errors. To disable:

**Codex** — comment out the block in `~/.codex/config.toml`:
```toml
# [mcp_servers.blender]
# command = "..."
# args = [...]
```

**Cursor** — remove the `blender` entry from `~/.cursor/mcp.json`.

## Alternatives that don't need Blender

| Tool | What it does | Limitation |
|------|-------------|------------|
| `gltf-transform` (CLI, Node) | Optimize/inspect/edit .glb | No rig creation, no animation |
| `fbx2glb` (Node CLI) | Convert .fbx → .glb | Static geometry only |
| Three.js `GLTFExporter` | Export scenes from web | Requires runtime scene |
| Run Blender in Docker | Headless Blender via container | Needs Docker Desktop |

For the ragdoll cat animation, **none of these replace a real rig** — you'd get a static mesh at best.

## Files

- `addon.py` — exact copy of `addon.py` from `MCPBlender/blender-mcp` v1.2, the version pinned by the official PyPI release. Kept in sync manually.