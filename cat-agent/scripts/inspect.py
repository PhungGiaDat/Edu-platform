"""
Inspect the imported cat mesh.

Run this INSIDE Blender (via Blender MCP execute_code or Text Editor > Run Script).

Reports:
- Object names, types, dimensions
- Polygon count, vertex count
- World orientation
- Existing materials, armatures, vertex groups, animations
- Mesh clean state (non-manifold, loose verts, degenerate faces)

This script is READ-ONLY. It does NOT modify the scene.
"""

import bpy
import mathutils


def humanize(value, unit="m"):
    """Format a value with sensible units."""
    if abs(value) < 0.01:
        return f"{value * 1000:.1f} {unit[:-1] if len(unit) > 1 else 'mm'}"
    return f"{value:.3f} {unit}"


def inspect_object(obj):
    """Return a dict with key info about an object."""
    info = {
        "name": obj.name,
        "type": obj.type,
        "location": list(obj.location),
        "dimensions": list(obj.dimensions),
        "scale": list(obj.scale),
    }

    if obj.type == "MESH":
        mesh = obj.data
        info.update({
            "vertices": len(mesh.vertices),
            "edges": len(mesh.edges),
            "polygons": len(mesh.polygons),
            "non_manifold_edges": sum(1 for e in mesh.edges if not e.is_manifold),
            "loose_verts": len([v for v in mesh.vertices if not v.link_edges]),
            "materials": [m.name for m in mesh.materials if m],
            "uv_layers": [uv.name for uv in mesh.uv_layers],
            "vertex_groups": [vg.name for vg in obj.vertex_groups],
        })
    elif obj.type == "ARMATURE":
        info.update({
            "bones": [b.name for b in obj.data.bones],
            "actions": [a.name for a in bpy.data.actions],
        })

    return info


def main():
    print("=" * 60)
    print("CAT INSPECTION REPORT")
    print("=" * 60)

    scene = bpy.context.scene
    print(f"Scene: {scene.name}")
    print(f"Frame: {scene.frame_current}/{scene.frame_end}")
    print(f"Unit system: {scene.unit_settings.system}")
    print(f"Unit scale: {scene.unit_settings.scale_length}")
    print()

    print(f"Objects in scene: {len(scene.objects)}")
    print("-" * 60)

    for obj in scene.objects:
        info = inspect_object(obj)
        print(f"\n[{info['type']}] {info['name']}")
        print(f"  Location:   {tuple(round(v, 3) for v in info['location'])}")
        print(f"  Dimensions: {tuple(round(v, 3) for v in info['dimensions'])}")
        print(f"  Scale:      {tuple(round(v, 3) for v in info['scale'])}")

        if obj.type == "MESH":
            print(f"  Topology:   {info['vertices']} verts / {info['edges']} edges / {info['polygons']} polys")
            print(f"  Health:     {info['non_manifold_edges']} non-manifold edges, {info['loose_verts']} loose verts")
            print(f"  Materials:  {info['materials']}")
            print(f"  UV layers:  {info['uv_layers']}")
            print(f"  Vertex groups: {info['vertex_groups']}")
        elif obj.type == "ARMATURE":
            print(f"  Bones ({len(info['bones'])}): {info['bones'][:10]}{'...' if len(info['bones']) > 10 else ''}")
            print(f"  Actions: {info['actions']}")

    print()
    print("=" * 60)
    print("RECOMMENDATIONS")
    print("=" * 60)

    # Heuristics
    mesh_objs = [o for o in scene.objects if o.type == "MESH"]
    if not mesh_objs:
        print("No MESH objects found. Import the cat FBX first.")
    else:
        for obj in mesh_objs:
            verts = len(obj.data.vertices)
            if verts > 500_000:
                print(f"[{obj.name}] Very high-poly ({verts} verts). DECIMATE or RETOPO before rigging.")
            elif verts > 50_000:
                print(f"[{obj.name}] High-poly ({verts} verts). Duplicating source and decimating copy is recommended.")
            elif verts < 1000:
                print(f"[{obj.name}] Low-poly ({verts} verts). Use as-is for cartoon style.")

            if obj.dimensions[2] < 0.1:
                print(f"[{obj.name}] Suspiciously flat in Z. Check world orientation.")

    armature_objs = [o for o in scene.objects if o.type == "ARMATURE"]
    if armature_objs:
        print(f"Armature already present: {armature_objs[0].name}")
    else:
        print("No armature — a Cat Quadruped Rig must be created.")


if __name__ == "__main__":
    main()
