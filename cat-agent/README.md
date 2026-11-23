# Cat 3D Agent — Rig + Eat Animation

Build a rigged, animated cat in Blender using **Codex CLI or Cursor Agent** with the **Blender MCP server**.

## Prerequisites

1. **Blender 3.6+** installed and running
2. **`blender-mcp` addon** installed and started (Connected state) in Blender
3. **MCP server registered** in Codex (`~/.codex/config.toml`) AND Cursor (`~/.cursor/mcp.json`)
4. **Source model**: drop your cat `FBX` into `assets/cat.fbx`

## Setup verification

### Codex CLI

```bash
codex mcp list
```

You should see `blender` listed.

### Cursor IDE

Composer → Agent mode → prompt:
> "List MCP servers and tools"

You should see `blender` with the tools `get_scene_info`, `execute_code`, etc.

### Blender

In 3D Viewport → `N` key → BlenderMCP panel → green **Connected** status.

## Workflow (run inside Blender, in order)

### Step 1 — Import the cat

```python
# In Blender Text Editor (or via mcp__blender__execute_code)
bpy.ops.import_scene.fbx(filepath="/absolute/path/to/cat-agent/assets/cat.fbx")
```

### Step 2 — Inspect

Open `scripts/inspect.py` in Blender's Text Editor and click **Run Script**.

It prints a report. **Do not skip this** — read it before proceeding.

### Step 3 — Optimize

Edit `scripts/optimize.py` line 13 to match your imported mesh name if it isn't `Mesh_0`. Run it.

This produces a copy `Mesh_0_optimized` with sane topology.

### Step 4 — Rig

Open `scripts/rig_cat.py`, edit `TARGET_MESH` to `Mesh_0_optimized`, run it.

This creates an armature `cat_rig` with 30+ bones.

### Step 5 — Validate rig

Take a screenshot:
```python
bpy.context.view_layer.objects.active = bpy.data.objects['cat_rig']
bpy.ops.view3d.view_selected()
bpy.ops.wm.save_mainfile(filepath="checkpoints/after_rig.blend")
```

Or via MCP: `mcp__blender__get_viewport_screenshot`

### Step 6 — Skin

Open `scripts/skin.py`, run it. Inspect the mesh after skinning — extreme-pose test runs inside.

### Step 7 — Animate

Open `scripts/animate_eat.py`, run it. Then open the **Action Editor** in Blender and select `CAT_EAT`.

### Step 8 — Export

Open `scripts/export.py`, run it. Find `.glb` files in `exports/`.

## Using Codex CLI

In a Codex session in the project root (this folder is `cat-agent/`):

> "Use the Blender MCP server to import `assets/cat.fbx`, run `scripts/inspect.py`, and report the scene state."

Codex will:
1. Discover the `blender` MCP server
2. Call `execute_code` to run the import
3. Call `execute_code` to run inspect.py
4. Read the output, summarize vertices / bones / materials
5. Recommend next steps

> "Run `scripts/optimize.py` and screenshot the result."

Codex will execute, screenshot, and verify.

## Using Cursor

Same workflow. Cursor Agent has access to the same MCP tools, just invoke them naturally in Composer.

## Touch-points (do not modify without thought)

- `scripts/optimize.py` — has `TARGET_VTX = 30000`. Lower this if your mesh is lower-poly to start.
- `scripts/rig_cat.py` — bone positions are in meters, tuned for a cat ~0.5m long. Adjust if your model is different.
- `scripts/animate_eat.py` — phase timings in keyframes. Change `END_FRAME` to lengthen/shorten.

## Output

| File | Contents |
|------|----------|
| `exports/cat_eat.glb` | Mesh + CAT_EAT action |
| `exports/cat_idle.glb` | Mesh only (no animation) |
| `exports/cat_full.glb` | Mesh + all actions |

Upload `cat_eat.glb` to Supabase at `AR_models/pets/cat-eat/` and update MongoDB pet entry for the cat pets.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `execute_code` returns null | bpy script error | Check Blender console for traceback |
| `Module not found` in inspect | bpy not available | You ran outside Blender — open Text Editor |
| Screenshot is blank | Camera not in view | Run `bpy.ops.view3d.view_all()` first |
| GLB is 50MB+ | Decimation not run | Run `optimize.py` with lower `TARGET_VTX` |
| Mesh tears on extreme pose | Bad auto weights | Open Weight Paint mode, paint manually |
