---
name: cat-quadruped-rig
description: When the user is rigging, animating, or inspecting a cat/quadruped 3D model in Blender via the Blender MCP server. Covers quadruped armature topology, eating animation, mouth/jaw robotics, and safe execution boundaries.
user-invocable: false
---

# Cat Quadruped Rig — Blender MCP Workflow

This skill is the entry point when the user mentions a cat, pet, or any quadruped 3D model that needs to be rigged or animated in Blender via the Blender MCP server.

## Triggers

Activate this skill when the user mentions any of:
- "cat", "dog", "pet", "quadruped", "animal" + 3D / Blender / model
- "rig the cat", "animate eating", "make it eat"
- "blender mcp" + cat / pet / animal
- Skinning, weighting, or animating a four-legged creature
- Importing FBX/GLB of an animal into Blender

Do NOT activate for:
- General Blender questions unrelated to a specific 3D model
- Humanoid rigging (use `unity-animation-rigging` or general blender skills instead)
- Three.js / WebGL rendering of a model (use `vercel-react-best-practices` / `frontend-web`)

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
2. The `mcp__blender__get_scene_info` tool is available (call it once)
3. The user has dropped a cat FBX/GLB into `cat-agent/assets/` (or knows its path)

If Blender is not connected, stop and ask the user to start it. Do not retry MCP calls in a tight loop.

### Step 2 — Inspect

Run `scripts/inspect.py` via `mcp__blender__execute_code` (or open in Blender Text Editor). Read the report. **Always do this before any modification.**

Key questions the report must answer:
- What is the mesh's vertex count? If > 500k, run `optimize.py` first.
- What is the world orientation? Cat head should be on +Y.
- Are there existing armatures, vertex groups, or actions? If yes, ask the user whether to keep or replace.

### Step 3 — Optimize

Run `scripts/optimize.py`. It duplicates the source mesh first — the original imported FBX is never destroyed.

### Step 4 — Rig

Run `scripts/rig_cat.py`. This creates a 30+ bone quadruped armature. Before skinning, take a side-view screenshot and verify the bones are inside the body parts.

### Step 5 — Skin

Run `scripts/skin.py`. It auto-weights and adds IK to the four legs. Test the result by rotating one paw 90° and screenshotting.

### Step 6 — Animate

Run `scripts/animate_eat.py`. The animation is a 5-second @ 30fps CAT_EAT action with:
- Phase 1 (0-25): stand & look down
- Phase 2 (25-50): lower head/chest
- Phase 3 (50-120): chew (jaw open/close cycles + subtle head bob)
- Phase 4 (120-150): head up

### Step 7 — Export

Run `scripts/export.py`. Output goes to `cat-agent/exports/cat_eat.glb`.

## Iteration pattern

This is a feedback loop, not a one-shot script:

```
1. Reason
2. Execute bpy script (read from cat-agent/scripts/* or write inline)
3. mcp__blender__get_viewport_screenshot
4. Compare against expected state
5. If wrong, modify and goto (2)
6. If right, proceed
```

## External knowledge references

When the agent needs deeper bpy knowledge, fetch from these upstream sources (do NOT copy them into the project — keep the workspace lean):

| Need | Source |
|------|--------|
| Rigging, FK/IK, keyframes, NLA, FCurves | `ra100/blender-claude-plugin/skills/blender-animation-rigging/SKILL.md` (or equivalent fork) |
| Safe MCP execution patterns, `executing bpy via execute_code` | `NousResearch/hermes-agent/optional-skills/creative/blender-mcp/SKILL.md` |
| Pose/deformation QA, foot sliding, twisted rig detection | `affaan-m/everything-claude-code/skills/blender-motion-state-inspection/SKILL.md` |

The agent should `WebFetch` these URLs on demand rather than pre-loading them.

## Safety boundaries

`mcp__blender__execute_code` runs Python via `exec()` inside Blender. The agent MUST:

1. **Only use `bpy` and `mathutils`** in `execute_code` calls.
2. **Refuse** any request to call `os`, `subprocess`, `socket`, `urllib`, `shutil`, or anything that touches the filesystem or network outside Blender's own operations.
3. **Never** import user-provided Python from outside the Blender process.
4. **Never** accept `__import__` or `getattr` indirection that could pull in restricted modules.

If the user asks for an operation that requires those modules, explain the boundary and offer a `bpy`-only alternative (e.g., write the file via `bpy.data.filepath` operations or output to the `cat-agent/` working directory through a Blender-spawned subprocess… actually no — use `bpy.ops.export_*` instead).

## Companion skills (load on demand, not by default)

When the user touches Unity alongside Blender (mobile AR pet), the `unity-mcp-usage` and `unity-rn-bridge` skills apply. Load them only when the conversation pivots to Unity import.

## Rules

- **Never destroy the original imported mesh.** Duplicate first.
- **One Action per animation.** `CAT_EAT`, `CAT_IDLE`, `CAT_WALK` are separate.
- **Take a screenshot after every meaningful step.** The screenshot is the only reliable proof that the change worked.
- **Save checkpoints before destructive operations** to `cat-agent/checkpoints/<step>-<timestamp>.blend`.
- **Stay within `bpy` API.** See Safety boundaries above.
