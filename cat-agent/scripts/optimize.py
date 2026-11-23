"""
Optimize the imported cat mesh.

DUPLICATES the source mesh first so the original imported FBX is NEVER destroyed.

Operations:
1. Duplicate the highest-poly MESH object as `<name>_optimized`
2. Apply all transforms
3. Remove doubles (merge by distance)
4. Recalculate normals
5. (Optional) Decimate via Blender 3.0+ Geometry Nodes modifier — runs from CLI

Run INSIDE Blender.
"""

import bpy
import math


SOURCE_NAME = "Mesh_0"  # Override per scene
TARGET_VTX = 30000      # Target vertex count for retopo
MERGE_DISTANCE = 0.0005
DECIMATE_RATIO_FALLBACK = 0.5  # If manual target fails (e.g. head/legs)


def duplicate_for_safety(source_name):
    """Duplicate the source mesh, never modify the original."""
    src = bpy.data.objects.get(source_name)
    if src is None:
        for obj in bpy.context.scene.objects:
            if obj.type == "MESH":
                src = obj
                break
    if src is None:
        raise RuntimeError("No MESH object found in scene to optimize.")

    new_obj = src.copy()
    new_obj.data = src.data.copy()
    new_obj.name = f"{src.name}_optimized"
    if new_obj.data:
        new_obj.data.name = f"{src.name}_optimized_mesh"
    bpy.context.collection.objects.link(new_obj)
    print(f"[duplicate] {src.name} -> {new_obj.name}")
    return new_obj


def apply_transforms(obj):
    """Apply location/rotation/scale so the mesh sits in world space."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    print(f"[transforms] Applied for {obj.name}")


def remove_doubles(obj, distance=0.0005):
    """Merge duplicate vertices within distance."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=distance)
    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"[remove_doubles] threshold={distance}")


def recalculate_normals(obj):
    """Fix inconsistent normals (outward-facing)."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"[normals] Recalculated outward")


def add_decimate_modifier(obj, ratio=0.5):
    """Add a Decimate modifier (collapses edges)."""
    mod = obj.modifiers.new(name="Decimate", type="DECIMATE")
    mod.ratio = ratio
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f"[decimate] ratio={ratio}")


def main():
    print("=" * 60)
    print("CAT OPTIMIZATION PIPELINE")
    print("=" * 60)

    obj = duplicate_for_safety(SOURCE_NAME)
    apply_transforms(obj)
    remove_doubles(obj, MERGE_DISTANCE)
    recalculate_normals(obj)

    # Try to target vertex count via fall-back decimation
    vcount = len(obj.data.vertices)
    print(f"Before decimate: {vcount} vertices")
    if vcount > TARGET_VTX:
        ratio = max(0.05, TARGET_VTX / vcount)
        add_decimate_modifier(obj, ratio)
        vcount = len(obj.data.vertices)
        print(f"After decimate:  {vcount} vertices")

    print(f"\nFinal: {obj.name} now has {vcount} vertices")
    print("Source mesh untouched. Ready for clean-up & rigging.")


if __name__ == "__main__":
    main()
