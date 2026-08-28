---
name: unity-mcp-usage
description: Use the unity-mcp tools (48 tools, namespace `user-unityMCP`) to drive the Unity Editor from this project. Use when verifying package versions, reading compile errors, creating/modifying Unity scripts, taking scene screenshots, running EditMode/PlayMode tests, or making any mutation inside `mobile/unity/Assets/` that needs to compile against the actual Unity install. The MCP server is wired at project level (`e:\University\Graduted Project\Edu-platform\.Codex\settings.local.json` + user-level `C:\Users\LENOVO\.cursor\mcp.json`) via `mcpforunityserver==10.1.2`. All 48 Unity MCP tools are allow-listed for Codex. Load only when an MCP call is the right path per the routing rule in `AGENTS.md` (section 5); prefer Besty UnitySkills REST for most live Editor operations.
---

# Unity MCP Usage

This project has the **Unity MCP** server (`com.coplaydev.unity-mcp`)
configured at two levels:

- **Project-level** (Codex): `e:\University\Graduted Project\Edu-platform\.Codex\settings.local.json`
- **User-level** (Cursor): `C:\Users\LENOVO\.cursor\mcp.json`
- **Cursor project-level** (best-effort): `e:\University\Graduted Project\Edu-platform\.cursor\mcp.json` — write is gated by Cursor; if empty (`{}`), the user-level config above still wires Unity MCP

Both wire the same command: `uvx --from mcpforunityserver==10.1.2 mcp-for-unity --transport stdio`.
48 tools are allow-listed for Codex (all `mcp__UnityMCP__*`).
Use them whenever you need to verify what the Unity Editor actually
sees — compiled code, runtime state, package versions, scene
contents — rather than what the file system appears to have.

## When to load this skill

Load this skill when:

- You need to know whether a script change compiled successfully
- The EditMode/PlayMode test results are required to verify a change
- You need to inspect the live scene hierarchy or GameObject state
- You want to verify the manifest.json package list matches the
  actually-installed packages
- You need to insert a script via Unity Editor (so type resolution
  is correct)
- You want to run a menu item programmatically

Do NOT load this skill for:

- Static file reads (`Read` tool is faster)
- Plain code edits to `.cs` files that don't need editor verification
- Web/frontend changes (no Unity involvement)

## When to load references

| If you need to…                              | Load                          |
| -------------------------------------------- | ----------------------------- |
| Run a script mutation safely                 | `references/script-mutation.md` |
| Verify state after an edit                   | `references/verify-flow.md`    |
| Configure the MCP server                     | `references/server-config.md`  |
| Discover what's currently in the project     | `references/project-state.md`  |

## Tool inventory (48 tools)

### Resources (read-only)

- `mcpforunity://editor/state` — `is_compiling`, `ready_for_tools`, etc.
- `mcpforunity://project/info` — installed packages, Unity version
- `mcpforunity://project/tags` — tags and layers
- `mcpforunity://tests` — test results
- `mcpforunity://menu-items` — discoverable menu paths
- `mcpforunity://instances` — connected Unity instances

### Tools

| Tool | Use |
|---|---|
| `manage_editor` | Play mode, pause, step, build target, scene reload |
| `manage_scene` | CRUD scenes; `get_hierarchy` is the primary inspector |
| `manage_gameobject` | Read/transform components on a GameObject |
| `manage_components` | Add/remove/configure components |
| `manage_asset` | Search, create, import, delete assets |
| `manage_prefabs` | Open/save prefabs |
| `manage_material` | Create/edit materials |
| `manage_shader` | Find shaders in the project |
| `manage_texture` | Import textures |
| `manage_animation` | Animate properties |
| `manage_camera` | Take screenshots (`screenshot`, `screenshot_multiview`) |
| `manage_ui` | Canvas, Button, Image, etc. |
| `manage_packages` | Add/remove packages |
| `manage_build` | Build settings, scene lists |
| `manage_physics` | Raycasts, layer collisions |
| `manage_graphics` | Render settings, render pipeline |
| `manage_scriptable_object` | Create/configure SOs |
| `manage_profiler` | Profiler markers |
| `manage_probuilder` | ProBuilder geometry |
| `manage_vfx` | Visual effects |
| `manage_tools` | Custom Editor tools |
| `manage_script` | Read/write C# scripts (structured) |
| `manage_script_capabilities` | Manage reflection-based tool generation |
| `create_script` | Create a new script from scratch |
| `delete_script` | Delete a script |
| `validate_script` | Check syntax without applying |
| `apply_text_edits` | Apply a list of edits to a script (precise) |
| `script_apply_edits` | Apply structured edits (anchor-based, safer) |
| `get_sha` | Hash of a file (for safe edits) |
| `find_in_file` | Search inside a script |
| `find_gameobjects` | Find GameObjects by name/components |
| `refresh_unity` | Force asset refresh / domain reload |
| `read_console` | Read Unity Console (errors, warnings, logs) |
| `run_tests` | Run EditMode / PlayMode tests |
| `get_test_job` | Poll an async test job |
| `execute_code` | Run arbitrary C# inside Unity (use carefully) |
| `execute_menu_item` | Invoke a menu by path |
| `import_model` | Import a 3D model |
| `import_model_file` | Import from a file path |
| `generate_image` | Generate a texture via AI |
| `generate_audio` | Generate audio via AI |
| `generate_model` | Generate a 3D model via AI |
| `batch_execute` | Run multiple tools in one call |
| `set_active_instance` | Pin routing to a specific Unity instance |
| `debug_request_context` | Debug tool-call context |
| `mcp_auth` | OAuth for MCP servers |
| `unity_reflect` | Reflect on Unity API types/members |
| `unity_docs` | Read Unity docs |

## Quick start

### 1. Verify Unity is up

```text
Read mcpforunity://editor/state → check data.advice.ready_for_tools
```

If not ready, wait. Don't issue tool calls during a domain reload.

### 2. Read package list

```text
Read mcpforunity://project/info → confirm installed packages
```

### 3. Make your edit

Either:
- Use `manage_script` for structured C# edits
- Use `apply_text_edits` for precise replacements
- Use `Read` + `Write` for plain file edits (but then verify via
  `read_console`)

### 4. Verify compilation

```text
read_console action=filter "logType: ["error"]"
```

If errors → fix. If clean → continue.

### 5. Run tests if applicable

```text
run_tests testMode="EditMode" filter="MyTestSuite"
→ get jobId
get_test_job jobId=...
```

## Anti-patterns

- **Don't** issue `manage_script` / `create_script` while Unity is
  compiling. Wait for `data.advice.ready_for_tools == true`.
- **Don't** use `execute_code` to bypass the type system. The MCP
  tools are reflection-aware; the cost of using them correctly is
  lower than debugging a runtime-cast error from `execute_code`.
- **Don't** rely on `apply_text_edits` without reading the file first.
  Line/column counts are 1-indexed and off-by-one errors break your
  edit silently.
- **Don't** poll `read_console` more than once per second. The
  Console pipeline is rate-limited in some Unity versions.

## See also

- `references/script-mutation.md` — safe edit workflow
- `references/verify-flow.md` — post-edit verification
- `references/server-config.md` — server config and re-connection
- `references/project-state.md` — discovering project state
