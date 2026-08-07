# mindar-mcp-server

Node.js MCP server that exposes MindAR workflow tools to coding agents
(Claude Code, Codex, Cursor). Uses stdio transport.

## Tools

| Tool                              | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| `mindar_validate_target`          | Validate a single image file for MindAR targeting |
| `mindar_validate_targets_dir`     | Validate all images in a directory                |
| `mindar_compile_targets`          | Compile a directory of images into a `.mind` file |
| `mindar_check_assets`             | Validate `.glb`, `.mind`, texture budgets         |
| `mindar_diagnose_build`           | Pre-flight HTTPS / WebGL / permission checks      |
| `mindar_scaffold_project`         | Generate a starter project for a chosen stack     |

## Install

```bash
npm install
npm run build
```

## Register with Claude Code

Add to `~/.claude/mcp_servers.json` (or the project's `.mcp.json`):

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

## Tool-by-tool

### mindar_validate_target

Validate a single image: resolution, aspect ratio, file size, format.

```json
{
  "imagePath": "/path/to/target.jpg",
  "response_format": "markdown"
}
```

Returns:
- Resolution
- File size
- Aspect ratio
- PASS/WARN/FAIL with specific messages

### mindar_validate_targets_dir

Validate all images in a directory.

```json
{
  "dirPath": "/path/to/targets/source",
  "response_format": "json"
}
```

Returns per-image results + a summary.

### mindar_compile_targets

Compile source images to a `.mind` file. Runs validation first; aborts
on FAIL. Currently uses the official web-based compiler via headless
Chrome (puppeteer) — full implementation requires `puppeteer` as a
peer dep. If puppeteer is unavailable, this returns an actionable error.

```json
{
  "sourceDir": "/path/to/targets/source",
  "outFile":   "/path/to/public/targets/targets.mind",
  "emitManifest": true,
  "filterType": 0
}
```

### mindar_check_assets

Validate build output assets: `.mind` exists, `.glb` budget, image
budgets.

```json
{
  "buildDir": "/path/to/dist",
  "maxGlbMb": 30,
  "maxMindMb": 5
}
```

### mindar_diagnose_build

Run a set of pre-flight checks against a built project directory and
optional URL.

```json
{
  "buildDir": "/path/to/dist",
  "url": "https://example.com"
}
```

### mindar_scaffold_project

Generate a starter MindAR project in a target directory.

```json
{
  "stack": "vanilla-threejs",
  "projectName": "my-mindar-app",
  "targetDir": "/path/to/new-project"
}
```

Supported stacks: `vanilla-threejs`, `aframe`, `react-threejs`,
`typescript-vite`.

## License

MIT