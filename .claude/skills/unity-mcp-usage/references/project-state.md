# Project State — Discovering What's Actually in the Project

> Use at the start of any task to ground yourself in the live Unity
> Editor state. The file system is not the source of truth — Unity
> is.

## Why this skill exists

The file system has the files. The Unity Editor has the truth:

- Files that didn't compile (silent fail)
- Packages that were installed but not committed to `manifest.json`
- Scenes that were authored but not in build settings
- Components that exist but fail to attach at runtime

Trust the file system for "what code is on disk".
Trust the Editor for "what code Unity sees".

## Three quick discovery calls

```text
1. mcpforunity://project/info → packages, Unity version
2. mcpforunity://editor/state → is compiling, ready for tools
3. mcpforunity://menu-items → discoverable menu paths
```

### Packages

```text
read mcpforunity://project/info
```

Returns the **actual** installed packages, not just `manifest.json`:

```json
{
  "data": {
    "packages": {
      "com.unity.xr.arfoundation": "6.0.7",
      "com.unity.xr.arkit": "6.0.6",
      "com.unity.xr.arcore": "6.0.6",
      "com.unity.xr.management": "4.5.4",
      "com.coplaydev.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main"
    },
    "unityVersion": "6000.x.x"
  }
}
```

Cross-check this against `Packages/manifest.json` to find drift.

### Editor state

```text
read mcpforunity://editor/state
```

```json
{
  "data": {
    "compilation": {
      "is_compiling": false
    },
    "advice": {
      "ready_for_tools": true
    },
    "playMode": "stopped"
  }
}
```

Always check `data.advice.ready_for_tools` before issuing tool
calls. `false` means Unity is mid-reload.

### Menu items

```text
read mcpforunity://menu-items
```

Returns ~300 menu paths. Useful for:

- Finding the right menu to invoke (e.g. `Tools/Unity MCP Server/...`)
- Discovering third-party tooling (e.g. `Window/UnitySkills`)
- Locating build settings (`File/Build Settings...`)

## Discovering the scene

```text
manage_scene action="get_hierarchy" page_size=50
```

This is the equivalent of looking at the Hierarchy window. Returns:

```json
{
  "data": {
    "hierarchy": [
      {
        "name": "Main Camera",
        "type": "Camera",
        "children": []
      },
      {
        "name": "ARSession",
        "type": "GameObject",
        "children": [
          { "name": "ARTrackedImageManager", "type": "ARTrackedImageManager" }
        ]
      }
    ],
    "next_cursor": null
  }
}
```

For large scenes, paginate. `page_size=50` is a good starting point.
Follow `next_cursor` until null.

## Discovering a GameObject's components

```text
manage_gameobject action="get_components" target="ARSession" include_properties=false
```

Returns:

```json
{
  "data": {
    "components": [
      { "type": "ARSession", "properties": null },
      { "type": "ARTrackedImageManager", "properties": null }
    ]
  }
}
```

For full property values, `include_properties=true`. **Be cautious
with page size** — large lists return big payloads.

## Discovering assets

```text
manage_asset action="search" filter="t:Texture2D" page_size=25
```

Filters:
- `t:Texture2D` — texture type
- `t:Material` — material
- `t:Prefab` — prefab
- `t:Scene` — scene
- `ref-image` — image tracking reference (in this project's dictionary)

For a name-based search:
```text
manage_asset action="search" search_pattern="ARSession" page_size=25
```

## Discovering tags and layers

```text
read mcpforunity://project/tags
```

The `Tags & Layers` configuration. Useful when adding a new layer
for an AR plane category.

## Discovering tests

```text
read mcpforunity://tests
```

Returns the test list (slow on first read — caches after).

## Discovering the active instance

```text
read mcpforunity://instances
```

```json
{
  "data": {
    "instances": [
      {
        "name": "unity_AF8E6C4C",
        "hash": "AF8E6C4C",
        "projectPath": "E:/.../mobile/unity",
        "isActive": true
      }
    ]
  }
}
```

Pin to a specific instance:
```text
set_active_instance instance="unity_AF8E6C4C"
```

## Discovering the build settings

```text
manage_scene action="get_build_settings"
```

Returns the list of scenes in Build Settings:

```json
{
  "data": {
    "scenes": [
      { "path": "Assets/Scenes/ARScene.unity", "buildIndex": 0, "enabled": true },
      { "path": "Assets/Scenes/ARTestScene.unity", "buildIndex": 1, "enabled": true }
    ]
  }
}
```

To enable/disable a scene:
```text
manage_build action="scenes" operation="set_enabled" path="Assets/Scenes/ARScene.unity" enabled=true
```

## Discovering the project tags and ASMDEFs

Tags are simple. ASMDEFs are scattered across `Assets/`. To find them:

```text
manage_asset action="search" filter="t:AssemblyDefinitionAsset" page_size=50
```

This project's important ASMDEFs:
- `Assets/ARRuntime.asmdef` — AR runtime code
- `Assets/Editor/AREditor.asmdef` — AR editor code
- `Assets/Tests/EditMode/*` — test fixtures

## A pre-task checklist

Before any Unity-side change:

```text
1. read mcpforunity://editor/state → ready_for_tools
2. read mcpforunity://project/info → confirm packages
3. manage_scene action="get_hierarchy" → understand current scene
4. (if modifying scripts) read_console → no pre-existing errors
5. (if running tests) mcpforunity://tests → discover test list
```

This is 2-3 tool calls and surfaces most "stale view" issues.

## See also

- `references/script-mutation.md` — actually making changes
- `references/verify-flow.md` — post-edit verification
- `references/server-config.md` — connection issues
