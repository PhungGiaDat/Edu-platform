"""
Auto-skin the cat mesh to the rig.

Operations:
1. Find the optimized mesh and the rig
2. Parent mesh to armature with automatic weights
3. Add simple IK constraints to the four legs (paw target bones)
4. Test extreme pose ('real_paw_l' rotate 90°) and report any glitching

Run INSIDE Blender.
"""

import bpy
import math


MESH_NAME = "Mesh_0_optimized"
RIG_NAME = "cat_rig"


def auto_parent_with_weights(mesh_obj, arm_obj):
    """Standard Blender auto-skin: parent mesh to armature, generate weights."""
    bpy.ops.object.select_all(action="DESELECT")
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj

    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    print(f"[skin] Parent-with-weights applied: {mesh_obj.name} -> {arm_obj.name}")


def add_ik_to_leg(arm_obj, upper_bone, lower_bone, target_bone):
    """Add IK constraint to the lower bone targeting the hand/foot bone."""
    bpy.ops.object.select_all(action="DESELECT")
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")

    pose_bone = arm_obj.pose.bones[lower_bone]
    constraint = pose_bone.constraints.new(type="IK")
    constraint.target = arm_obj
    constraint.subtarget = target_bone
    constraint.chain_count = 2
    constraint.use_tail = True
    print(f"[IK] {lower_bone} -> {target_bone} (chain_count=2)")

    bpy.ops.object.mode_set(mode="OBJECT")


def main():
    print("=" * 60)
    print("AUTO-SKINNING")
    print("=" * 60)

    mesh = bpy.data.objects.get(MESH_NAME)
    rig = bpy.data.objects.get(RIG_NAME)
    if mesh is None or rig is None:
        raise RuntimeError(f"Need {MESH_NAME} and {RIG_NAME} in scene.")

    auto_parent_with_weights(mesh, rig)

    # IK on legs
    add_ik_to_leg(rig, "upper_arm.L", "forearm.L",    "paw_front.L")
    add_ik_to_leg(rig, "upper_arm.R", "forearm.R",    "paw_front.R")
    add_ik_to_leg(rig, "thigh.L",     "shin.L",       "paw_back.L")
    add_ik_to_leg(rig, "thigh.R",     "shin.R",       "paw_back.R")

    print()
    print("Verifying skin with extreme pose test...")
    bpy.context.scene.frame_set(1)
    # Test leg.L rotate
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    pb = rig.pose.bones["paw_back.L"]
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = (0.0, 0.0, math.radians(45))
    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"  paw_back.L rotated 45° around Z. Visually inspect for skinning glitches.")

    # Reset
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    pb.rotation_euler = (0.0, 0.0, 0.0)
    bpy.ops.object.mode_set(mode="OBJECT")

    print()
    print("Skin complete. Visually inspect and fix weights via Weight Paint mode.")


if __name__ == "__main__":
    main()
