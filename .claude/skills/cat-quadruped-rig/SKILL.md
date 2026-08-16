---
name: cat-quadruped-rig
description: Rigging, animating, or inspecting a cat/quadruped 3D model in Blender via the Blender MCP server. Covers quadruped armature topology, eating animation, mouth/jaw robotics, and safe execution boundaries.
user-invocable: false
---

# Cat Quadruped Rig — Blender MCP Workflow

This is the Claude-host mirror of the same skill that lives in `.cursor/skills/cat-quadruped-rig/SKILL.md`. Keep both files in sync.

## Triggers

Activate this skill when the user mentions any of:
- "cat", "dog", "pet", "quadruped", "animal" + 3D / Blender / model
- "rig the cat", "animate eating", "make it eat"
- "blender mcp" + cat / pet / animal
- Skinning, weighting, or animating a four-legged creature
- Importing FBX/GLB of an animal into Blender

Do NOT activate for:
- General Blender questions unrelated to a specific 3D model
- Humanoid rigging
- Three.js / WebGL rendering of a model

## Workflow

The project workspace contains a copy-pasteable Blueprint at `cat-agent/`. Always point to it as the first step:

```
cat-agent/
├── AGENTS.md            ← operating rules for the agent
├── README.md            ← user-facing workflow
├── scripts/
│   ├── inspect.py       ← read-only audit
│   ├── optimize.py      ← duplicate + decimate
│   ├── rig_cat.py       ← quadruped armature
│   ├── skin.py          ← auto-skin + IK
│   ├── animate_eat.py   ← CAT_EAT action
│   └── export.py        ← GLB export
└── assets/              ← drop cat.fbx here
```

### Step 1 — Confirm setup

Before doing anything, verify:
1. Blender is running with `blender-mcp` addon enabled and **Connected** in the N-panel
2. The `mcp__blender__*` tools are available
3. The user has dropped a cat FBX/GLB into `cat-agent/assets/` (or knows its path)

If Blender is not connected, stop and ask the user to start it. Do not retry in a tight loop.

### Step 2 — Inspect

Run `scripts/inspect.py` via `mcp__blender__execute_code` (or open in Blender Text Editor). Read the report before any modification.

### Step 3 — Optimize

Run `scripts/optimize.py`. It duplicates the source mesh first.

### Step 4 — Rig

Run `scripts/rig_cat.py`. Take a side-view screenshot, verify bones are inside body parts.

### Step 5 — Skin

Run `scripts/skin.py`. Test by rotating one paw 90° and screenshotting.

### Step 6 — Animate

Run `scripts/animate_eat.py`. CAT_EAT action: 5s @ 30fps, 4 phases.

### Step 7 — Export

Run `scripts/export.py`. Output goes to `cat-agent/exports/`.

## Iteration pattern

```
1. Reason
2. Execute bpy script
3. mcp__blender__get_viewport_screenshot
4. Compare against expected state
5. If wrong, modify and goto (2)
6. If right, proceed
```

## External knowledge references

Fetch on demand — do NOT copy into the project:

| Need | Source |
|------|--------|
| Rigging, FK/IK, keyframes, NLA, FCurves | `ra100/blender-claude-plugin/skills/blender-animation-rigging/SKILL.md` |
| Safe MCP execution patterns | `NousResearch/hermes-agent/optional-skills/creative/blender-mcp/SKILL.md` |
| Pose/deformation QA | `affaan-m/everything-claude-code/skills/blender-motion-state-inspection/SKILL.md` |

Use `WebFetch` on demand.

## Safety boundaries

`mcp__blender__execute_code` runs Python via `exec()` inside Blender. The agent MUST:

1. Only use `bpy` and `mathutils` in `execute_code` calls.
2. Refuse `os`, `subprocess`, `socket`, `urllib`, `shutil`, `__import__`, `getattr` indirection.
3. Never import user-provided Python from outside the Blender process.

If the user asks for an operation that requires those modules, explain the boundary and offer a `bpy`-only alternative.

## Rules

- Never destroy the original imported mesh. Duplicate first.
- One Action per animation.
- Take a screenshot after every meaningful step.
- Save checkpoints before destructive operations to `cat-agent/checkpoints/`.
- Stay within `bpy` API.
