"""
Create the CAT_EAT action.

5 seconds, 30 FPS = 150 frames.

Phases:
  0-25  : Stand, look down at bowl
  25-50 : Lower head & chest toward bowl
  50-120: Chew (jaw open/close cycles)
  120-150: Head up, return to neutral

Bones animated:
  - neck_01, neck_02, head (head rotation)
  - spine_03 (chest pitch)
  - jaw (open/close)
  - tail_01..tail_06 (gentle sway)
  - ear.L, ear.R (occasional twitch)
"""

import bpy
import math


RIG_NAME = "cat_rig"
ACTION_NAME = "CAT_EAT"
FPS = 30
DURATION_SEC = 5.0
END_FRAME = int(FPS * DURATION_SEC)  # 150


def make_or_get_action(rig):
    """Create a new Action and bind it to the rig."""
    if ACTION_NAME in bpy.data.actions:
        bpy.data.actions.remove(bpy.data.actions[ACTION_NAME])
    action = bpy.data.actions.new(ACTION_NAME)
    if rig.animation_data is None:
        rig.animation_data_create()
    rig.animation_data.action = action
    return action


def insert_key(rig, bone_name, frame, rotation_euler, location=None):
    """Insert a rotation keyframe for a pose bone."""
    pb = rig.pose.bones[bone_name]
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = rotation_euler
    pb.keyframe_insert(data_path="rotation_euler", frame=frame)
    if location is not None:
        pb.location = location
        pb.keyframe_insert(data_path="location", frame=frame)


def insert_jaw_open(rig, frame, open_value):
    """Open the jaw by rotating around X (positive = open)."""
    pb = rig.pose.bones["jaw"]
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = (open_value, 0.0, 0.0)
    pb.keyframe_insert(data_path="rotation_euler", frame=frame)


def main():
    print("=" * 60)
    print(f"ANIMATING {ACTION_NAME}")
    print("=" * 60)

    rig = bpy.data.objects.get(RIG_NAME)
    if rig is None:
        raise RuntimeError(f"Rig '{RIG_NAME}' not found.")

    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = END_FRAME
    bpy.context.scene.render.fps = FPS

    action = make_or_get_action(rig)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")

    # Reset all bones
    for pb in rig.pose.bones:
        pb.rotation_euler = (0.0, 0.0, 0.0)
        pb.location = (0.0, 0.0, 0.0)

    # ───── Phase 1: Stand & look down (0-25) ─────
    insert_key(rig, "neck_01", 0,  (math.radians(15), 0, 0))
    insert_key(rig, "neck_02", 0,  (math.radians(10), 0, 0))
    insert_key(rig, "head",    0,  (math.radians(15), 0, 0))
    insert_key(rig, "spine_03", 0, (math.radians(5), 0, 0))
    insert_jaw_open(rig, 0, 0.0)

    insert_key(rig, "neck_01", 25, (math.radians(20), 0, 0))
    insert_key(rig, "neck_02", 25, (math.radians(15), 0, 0))
    insert_key(rig, "head",    25, (math.radians(20), 0, 0))

    # ───── Phase 2: Lower head & chest (25-50) ─────
    insert_key(rig, "neck_01", 50, (math.radians(35), 0, 0))
    insert_key(rig, "neck_02", 50, (math.radians(30), 0, 0))
    insert_key(rig, "head",    50, (math.radians(35), 0, 0))
    insert_key(rig, "spine_03", 50, (math.radians(15), 0, 0))

    # ───── Phase 3: Chew (50-120) ─────
    chew_cycles = [
        (55, 0.30), (62, 0.05), (68, 0.35), (75, 0.05),
        (82, 0.30), (89, 0.05), (96, 0.40), (103, 0.05),
        (110, 0.30), (117, 0.05),
    ]
    for frame, open_val in chew_cycles:
        insert_jaw_open(rig, frame, open_val)

    # Subtle head bob during chewing
    for frame in range(50, 121, 15):
        bob = (math.radians(2) * math.sin(frame * 0.6), 0, 0)
        insert_key(rig, "head", frame, (math.radians(35) + bob[0], 0, 0))

    # ───── Phase 4: Head up (120-150) ─────
    insert_key(rig, "neck_01", 120, (math.radians(35), 0, 0))
    insert_key(rig, "neck_02", 120, (math.radians(30), 0, 0))
    insert_key(rig, "head",    120, (math.radians(35), 0, 0))
    insert_jaw_open(rig, 120, 0.0)

    insert_key(rig, "neck_01", 150, (math.radians(15), 0, 0))
    insert_key(rig, "neck_02", 150, (math.radians(10), 0, 0))
    insert_key(rig, "head",    150, (math.radians(15), 0, 0))
    insert_key(rig, "spine_03", 150, (math.radians(5), 0, 0))

    # ───── Tail sway across whole action ─────
    for i in range(1, 7):
        for frame in range(0, END_FRAME + 1, 30):
            sway = math.radians(8) * math.sin(frame * 0.15 + i * 0.5)
            insert_key(rig, f"tail_{i:02d}", frame, (0, 0, sway))

    # ───── Ear twitches (occasional) ─────
    insert_key(rig, "ear.L", 30,  (math.radians(-5), 0, 0))
    insert_key(rig, "ear.L", 35,  (math.radians(-15), 0, 0))
    insert_key(rig, "ear.L", 40,  (math.radians(-5), 0, 0))
    insert_key(rig, "ear.R", 80,  (math.radians(5), 0, 0))
    insert_key(rig, "ear.R", 85,  (math.radians(15), 0, 0))
    insert_key(rig, "ear.R", 90,  (math.radians(5), 0, 0))

    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"Action '{ACTION_NAME}' created with {END_FRAME + 1} frames.")
    print("View in Action Editor or Dope Sheet.")


if __name__ == "__main__":
    main()
