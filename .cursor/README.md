# mindar-agent-skills

A modular set of Agent Skills + a Node.js MCP server for working with
[MindAR](https://github.com/hiukim/mind-ar-js) — Web AR image and face
tracking — from any coding agent (Claude Code, Codex, Cursor, etc.).

> **Status:** MVP — 6 skills + 1 MCP server. Designed to be installed
> alongside the `ar-mobile-edu` skill or standalone.

## What's in here

```
.cursor/
├── README.md                          # This file
├── LICENSE                            # MIT
├── skills/
│   ├── mindar-project-scaffold/       # create new MindAR projects
│   ├── mindar-image-tracking/          # build image-tracking scenes
│   ├── mindar-target-compiler/         # compile targets to .mind files
│   ├── mindar-face-tracking/           # build face-tracking scenes
│   ├── mindar-media-interactions/      # video/audio/gesture
│   └── mindar-performance-debug/       # diagnose WebAR issues
├── mcp/                               # mindar-mcp-server (Node.js/TypeScript)
└── tools/
    └── mindar/                        # standalone scripts
```

The scripts live in `.cursor/tools/mindar/`:
- `validate-targets.mjs` — validate image targets before compilation
- `check-webar-build.mjs` — pre-flight checks for a WebAR build

## MVP skills

| Skill                          | Use when                                                |
| ------------------------------ | ------------------------------------------------------- |
| `mindar-project-scaffold`      | Starting a new MindAR project                            |
| `mindar-image-tracking`        | Building a scene that tracks image targets               |
| `mindar-target-compiler`       | Preparing and compiling `.mind` files                   |
| `mindar-face-tracking`         | Building face AR (filters, occluders, makeup)           |
| `mindar-media-interactions`    | Video, audio, gestures on targets                       |
| `mindar-performance-debug`     | Camera, HTTPS, tracking, FPS, model jitter issues       |

## MCP server

`mindar-mcp-server` exposes tools to coding agents:

| Tool                              | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| `mindar_validate_target`          | Check image resolution, contrast, feature density |
| `mindar_compile_targets`          | Compile multiple PNGs/JPGs to a single `.mind`    |
| `mindar_check_assets`             | Validate `.glb`, `.mind`, texture budgets          |
| `mindar_diagnose_build`           | Run browser checks for HTTPS, permissions, WebGL  |
| `mindar_scaffold_project`         | Generate a starter project for a chosen stack     |

The MCP server lives in `.cursor/mcp/` and uses stdio transport
(local process spawned by the agent). See `.cursor/mcp/README.md`.

## Install

### As Claude Code skills

```bash
npx skills add . -g -y
```

This installs each `skills/*` directory into your personal skills store.

### As Cursor project skills

Drop the `skills/` folders into your `.cursor/skills/` directory. Each is
self-contained.

### MCP server

```bash
cd .cursor/mcp
npm install
npm run build
```

Then register the server with your agent. For Claude Code add to
`~/.claude/mcp_servers.json`:

```json
{
  "mcpServers": {
    "mindar": {
      "command": "node",
      "args": ["<path>/.cursor/mcp/dist/index.js"]
    }
  }
}
```

## References

- MindAR SDK: https://github.com/hiukim/mind-ar-js
- A-Frame: https://aframe.io
- Three.js: https://threejs.org
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk

## License

MIT