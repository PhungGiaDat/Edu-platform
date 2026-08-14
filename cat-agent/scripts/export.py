"""
Export the rigged cat to GLB.

Produces:
  - exports/cat_idle.glb   (just the mesh, no animation)
  - exports/cat_eat.glb    (mesh + CAT_EAT action)
  - exports/cat_full.glb   (mesh + all actions)

Settings:
  - Format: glTF 2.0 / .glb (binary, single-file)
  - Skins: included
  - Animations: included
  - Compression: enabled
"""

import bpy
import os

EXPORT_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")
MESH_NAME = "Mesh_0_optimized"
RIG_NAME = "cat_rig"


def export_glb(filename, action_name=None):
    """Export the rigged scene to a .glb file.

    If action_name is provided, only that action is included.
    Otherwise, all actions are exported.
    """
    out_path = os.path.join(EXPORT_DIR, filename)
    os.makedirs(EXPORT_DIR, exist_ok=True)

    rig = bpy.data.objects.get(RIG_NAME)
    if rig is None:
        raise RuntimeError(f"Rig '{RIG_NAME}' not found.")

    if action_name is not None and rig.animation_data is not None:
        action = bpy.data.actions.get(action_name)
        if action is None:
            print(f"[WARN] Action '{action_name}' not found. Exporting all actions.")
        else:
            rig.animation_data.action = action

    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_apply=True,
        export_optimize_animation_size=True,
        export_draco_mesh_compression=True,
    )
    print(f"[export] {out_path}")


def main():
    print("=" * 60)
    print("EXPORTING TO GLB")
    print("=" * 60)

    export_glb("cat_idle.glb", action_name=None)
    export_glb("cat_eat.glb",  action_name="CAT_EAT")
    export_glb("cat_full.glb", action_name=None)

    print()
    print(f"All exports saved to: {EXPORT_DIR}")


if __name__ == "__main__":
    main()
