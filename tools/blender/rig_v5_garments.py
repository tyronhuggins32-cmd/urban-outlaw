"""
V5 garment art pipeline, not a procedural in-game clothes generator.

Run with Blender 4.x:
  blender -b --python tools/blender/rig_v5_garments.py -- \
      --rig assets/reference-rig-fluid.glb \
      --clothes art/v5/source/clothes-sculpt.glb \
      --output art/v5/candidates/v5-clothes-rigged.glb \
      --renders art/v5/proofs

The clothes GLB MUST contain seven hand-sculpted separate meshes named:
  V5_Shirt_Body, V5_Shirt_Collar, V5_Shirt_LeftSleeve,
  V5_Shirt_RightSleeve, V5_Shorts_Waist, V5_Shorts_LeftLeg,
  V5_Shorts_RightLeg.
Source should be modeled at the original rig's unposed rest dimensions.
Imported sculpt meshes receive surface-interpolated bone weights from the
existing 44-bone body; no cylindrical replacement mesh is generated here.

This exports a candidate ONLY. The release gate remains fail-closed until
the reference comparison and animation checks approve it.
"""
import argparse
import sys
from pathlib import Path


REQUIRED = (
    "V5_Shirt_Body",
    "V5_Shirt_Collar",
    "V5_Shirt_LeftSleeve",
    "V5_Shirt_RightSleeve",
    "V5_Shorts_Waist",
    "V5_Shorts_LeftLeg",
    "V5_Shorts_RightLeg",
)


def parse_cli():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--rig", required=True)
    parser.add_argument("--clothes", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--renders", required=True)
    return parser.parse_args(argv)


def import_gltf(bpy, path):
    pre = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(Path(path).resolve()))
    return set(bpy.data.objects) - pre


def transfer_source_weights(bpy, source, target, armature):
    if target.type != "MESH" or not len(target.data.polygons):
        raise ValueError("Not a modeled garment mesh: " + target.name)
    if not target.data.uv_layers:
        raise ValueError("Garment has no unwrapped texture coordinates: " + target.name)

    # Avoid hidden transforms: closest-surface interpolation must be performed
    # in matching world space. Geometry is already aligned to the base rig.
    for modifier in list(target.modifiers):
        if modifier.type == "ARMATURE":
            target.modifiers.remove(modifier)
    target.parent = None
    target.matrix_world = source.matrix_world.copy()
    target.vertex_groups.clear()

    transfer = target.modifiers.new("44-bone closest surface weights", "DATA_TRANSFER")
    transfer.object = source
    transfer.use_vert_data = True
    transfer.data_types_verts = {"VGROUP_WEIGHTS"}
    transfer.vert_mapping = "POLYINTERP_NEAREST"
    transfer.layers_vgroup_select_src = "ALL"
    transfer.layers_vgroup_select_dst = "NAME"
    transfer.mix_mode = "REPLACE"
    transfer.mix_factor = 1.0

    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=transfer.name)

    if not target.vertex_groups:
        raise ValueError("No skin weights transferred to " + target.name)

    bpy.ops.object.vertex_group_limit_total(limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)

    # Check coverage rather than silently letting parts stay frozen in combat.
    for vertex in target.data.vertices:
        if not vertex.groups:
            raise ValueError(target.name + " has unweighted vertex " + str(vertex.index))
        total = sum(g.weight for g in vertex.groups)
        if abs(total - 1.0) > .03:
            raise ValueError(target.name + " has invalid normalized weight " +
                             str(vertex.index) + ":" + str(total))

    arm = target.modifiers.new("UrbanOutlaw44Armature", "ARMATURE")
    arm.object = armature
    target.parent = armature
    target.matrix_parent_inverse = armature.matrix_world.inverted()


def render_angle(bpy, scene, name, degrees, out_dir, target, height):
    from math import radians, sin, cos
    from mathutils import Vector

    cam = bpy.data.objects.get("V5_ART_QA_CAMERA")
    if cam is None:
        camera_data = bpy.data.cameras.new("V5_QA_ORTHOGRAPHIC")
        cam = bpy.data.objects.new("V5_ART_QA_CAMERA", camera_data)
        scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = max(1.3, height * 1.3)
    distance = max(3.0, height * 2.7)
    angle = radians(degrees)
    cam.location = target + Vector((distance * sin(angle), -distance * cos(angle), height * .05))
    direction = target - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1200
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str((out_dir / (name + ".png")).resolve())
    bpy.ops.render.render(write_still=True)


def main():
    import bpy
    from mathutils import Vector

    args = parse_cli()
    for f in (args.rig, args.clothes):
        if not Path(f).is_file():
            raise FileNotFoundError("Required input asset not found: " + f)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    rig_objects = import_gltf(bpy, args.rig)
    source_meshes = [o for o in rig_objects if o.type == "MESH"
                     and len(o.vertex_groups) >= 20]
    if not source_meshes:
        raise RuntimeError("The original 44-joint skinned character cannot be found")
    source = max(source_meshes, key=lambda x: len(x.data.vertices))
    armature = next((m.object for m in source.modifiers if m.type == "ARMATURE"), None)
    if armature is None:
        raise RuntimeError("Original body is not connected to an armature")
    if len(armature.data.bones) < 44:
        raise RuntimeError("Original armature has fewer than 44 bones")

    imported = import_gltf(bpy, args.clothes)
    garments = [o for o in imported if o.type == "MESH" and o.name in REQUIRED]
    missing = set(REQUIRED) - {o.name for o in garments}
    if missing:
        raise RuntimeError("Missing hand-sculpted garment parts: " + ", ".join(sorted(missing)))

    for garment in garments:
        transfer_source_weights(bpy, source, garment, armature)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    source.select_set(True)
    for garment in garments:
        garment.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output.resolve()), export_format="GLB",
        use_selection=True, export_skins=True, export_animations=False,
        export_texcoords=True, export_normals=True, export_materials="EXPORT",
    )

    # QA rendering is deliberately separate from release. A successful GLB
    # export does not imply visual approval.
    out_dir = Path(args.renders)
    out_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    bpy.ops.object.select_all(action="DESELECT")
    for garment in garments:
        garment.select_set(True)
    world_center = source.matrix_world @ Vector((0, 0, 0))
    dims = source.dimensions
    height = max(dims.x, dims.y, dims.z)
    for view, angle in (("front", 0), ("side", 90), ("back", 180), ("three-quarter", 40)):
        render_angle(bpy, scene, view, angle, out_dir, world_center, height)

    print("V5 CANDIDATE BUILT, NOT APPROVED:", output)


if __name__ == "__main__":
    main()
