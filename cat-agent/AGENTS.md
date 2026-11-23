# Cat Agent — Blender MCP Workflow

This is the operating procedure for any AI agent (Codex, Cursor Agent, Claude) working on the cat 3D model in this folder.

## Mandatory rules

1. **Always use the Blender MCP server.** Do not attempt to run `bpy` outside Blender. The only correct way to execute Python that touches the scene is via `mcp__blender__execute_code`. You can also run scripts directly in Blender's Text Editor.

2. **Inspect the scene before modifying anything.** Run `scripts/inspect.py` first (or its MCP equivalent). Report:
   - Object names, types, dimensions
   - Mesh topology (verts/edges/polys)
   - Mesh health (non-manifold, loose verts)
   - Existing armatures, vertex groups, actions
   - Take viewport screenshots from front, side, top

3. **Never destroy the original imported mesh.** Every optimization step must:
   - Duplicate the source mesh first (`<name>_optimized`)
   - Apply changes only to the duplicate
   - Keep the original file as ground truth

4. **Duplicate before every destructive operation.** Before retopo, decimate, or remove_doubles, duplicate the mesh. Checkpoints go to `checkpoints/`.

5. **Perform operations incrementally.** Do not chain 6 operations in one `execute_code` call. After each major step, take a screenshot and verify it.

6. **Validate bone alignment before skinning.** After `rig_cat.py`:
   - Switch to side view
   - Take a screenshot
   - Confirm each bone is positioned inside its corresponding body part
   - If a bone is visibly offset, manually fix it before proceeding

7. **Test skinning with extreme poses.** After `skin.py`:
   - Rotate one leg 90° and screenshot
   - Bend the spine 90° and screenshot
   - Reset and proceed only if no glitches

8. **One animation per Action.** `CAT_EAT`, `CAT_IDLE`, `CAT_WALK` are separate Blender Actions. Never put them in the same timeline.

9. **Save checkpoints before destructive operations.** Use File → Save As with a timestamp prefix in `checkpoints/`.

10. **Stay within `bpy`.** Do not call `os`, `subprocess`, `socket`, `urllib`, or any network/filesystem-mutating module from `execute_blender_code`. This is a security boundary — the Blender MCP runs `exec()` and we must not exploit it.

## Workflow order

```
1. inspect.py   →  info report
2. optimize.py  →  _optimized mesh with sane topology
3. rig_cat.py   →  cat_rig armature
4. skin.py      →  parent mesh to rig
5. animate_eat.py →  CAT_EAT action
6. export.py    →  GLB files
```

Each step is a Python script in `scripts/`. Run them from Blender's Text Editor (Run Script) or via `mcp__blender__execute_code` with the file contents.

## Iteration pattern

For every iteration:

```
1. Reason about the problem
2. Generate bpy code (or run a script)
3. Execute via MCP
4. Take a screenshot
5. Compare against expected state
6. If wrong, modify code and goto (3)
7. If right, proceed to next step
```

## File layout

```
cat-agent/
├── AGENTS.md           ← this file
├── README.md           ← user-facing workflow
├── assets/             ← input FBX/GLB files (cat.fbx etc.)
├── scripts/
│   ├── inspect.py      ← read-only scene audit
│   ├── optimize.py     ← duplicate + decimate + merge
│   ├── rig_cat.py      ← create quadruped armature
│   ├── skin.py         ← auto-skin + IK constraints
│   ├── animate_eat.py  ← CAT_EAT action
│   └── export.py       ← GLB export
├── exports/            ← generated GLB files
└── checkpoints/        ← intermediate .blend saves
```

## Failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Mesh inside-out | Normals flipped | Re-run `recalculate_normals` in optimize.py |
| Auto weights produce spikes | Overlapping bones | Move bones apart, re-skin |
| Jaw animation looks fake | Geometry has no inner mouth | Reduce jaw angle; rely on head movement |
| GLB too large | Undecimated mesh | Lower target_verts in optimize.py |
| Front leg IK rotates backward | Bone roll wrong | Re-align via `bone.align_roll` |
