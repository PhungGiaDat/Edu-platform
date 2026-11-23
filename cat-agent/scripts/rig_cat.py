"""
Create a quadruped cat rig using Blender Armature.

Hierarchy:
    root
    └── pelvis
        ├── spine_01
        │   └── spine_02
        │       └── spine_03 (chest)
        │           ├── neck_01
        │           │   ├── neck_02
        │           │   │   └── head
        │           │   │       ├── jaw
        │           │   │       ├── ear.L
        │           │   │       └── ear.R
        │           │   └── IK constraint later
        ├── tail_01 ... tail_06
        ├── leg_front.L (shoulder)
        │   ├── upper_arm.L
        │   │   └── forearm.L
        │   │       └── paw_front.L
        ├── leg_front.R
        ├── leg_back.L (hip)
        │   ├── thigh.L
        │   │   └── shin.L
        │   │       └── paw_back.L
        └── leg_back.R

Front legs: 3 bones (shoulder, upper_arm, forearm, paw) — corrected to 4 below.
Rear legs:  4 bones (hip, thigh, shin, paw).
Tail: 6 bones.
"""

import bpy
import mathutils


RIG_NAME = "cat_rig"
TARGET_MESH = "Mesh_0_optimized"  # Set after run_optimize

# Bone lengths (in meters, cat roughly 0.5m long x 0.25m tall)
SPINE_LENGTH = 0.075
NECK_LENGTH = 0.05
HEAD_LENGTH = 0.07
SHOULDER_LENGTH = 0.04
UPPER_LEG_LENGTH = 0.07
LOWER_LEG_LENGTH = 0.07
PAW_LENGTH = 0.025
HIP_LENGTH = 0.04
THIGH_LENGTH = 0.08
SHIN_LENGTH = 0.08
TAIL_BONE_LENGTH = 0.05
TAIL_BONES = 6


def create_armature(midpoint):
    """Create empty armature object centered at midpoint."""
    arm_data = bpy.data.armatures.new(RIG_NAME + "_data")
    arm_obj = bpy.data.objects.new(RIG_NAME, arm_data)
    bpy.context.collection.objects.link(arm_obj)
    arm_obj.location = midpoint
    return arm_obj


def enter_edit_mode(arm_obj):
    bpy.ops.object.select_all(action="DESELECT")
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")


def add_bone(edit_bones, name, head, tail, parent=None, roll=0.0):
    bone = edit_bones.new(name)
    bone.head = mathutils.Vector(head)
    bone.tail = mathutils.Vector(tail)
    bone.align_roll(mathutils.Vector((0, 0, 1)) if roll == 0.0 else mathutils.Vector((roll, 0, 0)))
    if parent:
        bone.parent = parent
        bone.use_connect = False
    return bone


def get_midpoint():
    """Use mesh bbox center if available, else origin."""
    mesh = bpy.data.objects.get(TARGET_MESH)
    if mesh:
        return tuple(c / 2 for c in mesh.dimensions)
    return (0, 0, 0.15)


def build_spine_chain(edit_bones):
    """root -> pelvis -> spine_01 -> spine_02 -> spine_03 (chest)."""
    root = add_bone(edit_bones, "root",       (0, -0.25, 0.15), (0, -0.20, 0.15))
    pelvis = add_bone(edit_bones, "pelvis",    (0, -0.20, 0.15), (0, -0.10, 0.15), parent=root)
    s1 = add_bone(edit_bones, "spine_01",         (0, -0.10, 0.15), (0, -0.05, 0.17), parent=pelvis)
    s2 = add_bone(edit_bones, "spine_02",         (0, -0.05, 0.17), (0,  0.00, 0.19), parent=s1)
    chest = add_bone(edit_bones, "spine_03",       (0,  0.00, 0.19), (0,  0.05, 0.21), parent=s2)
    return root, pelvis, chest


def build_neck_head(edit_bones, chest):
    """neck_01 -> neck_02 -> head + jaw + ears."""
    n1 = add_bone(edit_bones, "neck_01", (0, 0.05, 0.21), (0, 0.10, 0.24), parent=chest)
    n2 = add_bone(edit_bones, "neck_02", (0, 0.10, 0.24), (0, 0.15, 0.26), parent=n1)
    head = add_bone(edit_bones, "head",   (0, 0.15, 0.26), (0, 0.22, 0.26), parent=n2)
    # Jaw hangs from head
    jaw = add_bone(edit_bones, "jaw",       (0, 0.20, 0.245), (0, 0.22, 0.235), parent=head)
    # Ears
    ear_l = add_bone(edit_bones, "ear.L",  (-0.025, 0.18, 0.275), (-0.030, 0.19, 0.30), parent=head)
    ear_r = add_bone(edit_bones, "ear.R",  ( 0.025, 0.18, 0.275), ( 0.030, 0.19, 0.30), parent=head)
    return head, jaw, ear_l, ear_r


def build_legs(edit_bones, pelvis, chest):
    """4 legs: 4 bones each."""
    # Front-leg left
    sh_l = add_bone(edit_bones, "shoulder.L",   (-0.06, 0.02, 0.18), (-0.07, 0.05, 0.15), parent=chest)
    up_l = add_bone(edit_bones, "upper_arm.L",  (-0.07, 0.05, 0.15), (-0.08, 0.08, 0.10), parent=sh_l)
    lo_l = add_bone(edit_bones, "forearm.L",    (-0.08, 0.08, 0.10), (-0.08, 0.10, 0.04), parent=up_l)
    pa_l = add_bone(edit_bones, "paw_front.L",  (-0.08, 0.10, 0.04), (-0.08, 0.10, 0.02), parent=lo_l)

    # Front-leg right
    sh_r = add_bone(edit_bones, "shoulder.R",   ( 0.06, 0.02, 0.18), ( 0.07, 0.05, 0.15), parent=chest)
    up_r = add_bone(edit_bones, "upper_arm.R",  ( 0.07, 0.05, 0.15), ( 0.08, 0.08, 0.10), parent=sh_r)
    lo_r = add_bone(edit_bones, "forearm.R",    ( 0.08, 0.08, 0.10), ( 0.08, 0.10, 0.04), parent=up_r)
    pa_r = add_bone(edit_bones, "paw_front.R",  ( 0.08, 0.10, 0.04), ( 0.08, 0.10, 0.02), parent=lo_r)

    # Rear-leg left
    hip_l = add_bone(edit_bones, "hip.L",        (-0.06, -0.18, 0.18), (-0.07, -0.14, 0.15), parent=pelvis)
    th_l = add_bone(edit_bones, "thigh.L",       (-0.07, -0.14, 0.15), (-0.08, -0.10, 0.10), parent=hip_l)
    sh_l2 = add_bone(edit_bones, "shin.L",       (-0.08, -0.10, 0.10), (-0.08, -0.08, 0.04), parent=th_l)
    pa_l2 = add_bone(edit_bones, "paw_back.L",   (-0.08, -0.08, 0.04), (-0.08, -0.08, 0.02), parent=sh_l2)

    # Rear-leg right
    hip_r = add_bone(edit_bones, "hip.R",        ( 0.06, -0.18, 0.18), ( 0.07, -0.14, 0.15), parent=pelvis)
    th_r = add_bone(edit_bones, "thigh.R",       ( 0.07, -0.14, 0.15), ( 0.08, -0.10, 0.10), parent=hip_r)
    sh_r2 = add_bone(edit_bones, "shin.R",       ( 0.08, -0.10, 0.10), ( 0.08, -0.08, 0.04), parent=th_r)
    pa_r2 = add_bone(edit_bones, "paw_back.R",   ( 0.08, -0.08, 0.04), ( 0.08, -0.08, 0.02), parent=sh_r2)


def build_tail(edit_bones, pelvis):
    """6-bone tail chain hanging from pelvis."""
    prev = pelvis
    x, y, z = 0.0, -0.22, 0.15
    for i in range(1, TAIL_BONES + 1):
        y -= TAIL_BONE_LENGTH
        z -= 0.01
        prev = add_bone(
            edit_bones,
            f"tail_{i:02d}",
            (x, y + TAIL_BONE_LENGTH, z + 0.01),
            (x, y, z),
            parent=prev,
        )


def main():
    print("=" * 60)
    print("CAT QUADRUPED RIG")
    print("=" * 60)

    midpoint = get_midpoint()
    arm_obj = create_armature(midpoint)
    enter_edit_mode(arm_obj)

    edit_bones = arm_obj.data.edit_bones
    root, pelvis, chest = build_spine_chain(edit_bones)
    build_neck_head(edit_bones, chest)
    build_legs(edit_bones, pelvis, chest)
    build_tail(edit_bones, pelvis)

    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"[rig] Created {RIG_NAME} with {len(edit_bones)} bones")
    print("[rig] IK constraints to be added by skin.py")
    print("[rig] Run skin.py next to attach mesh to bones.")


if __name__ == "__main__":
    main()
