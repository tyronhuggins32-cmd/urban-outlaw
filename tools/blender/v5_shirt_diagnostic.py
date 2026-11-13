import bpy, sys
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/home/runner/work/urban-outlaw/urban-outlaw/assets/reference-rig-fluid.glb")
print("V5_RIG_SUMMARY_START")
for obj in bpy.data.objects:
  if obj.type=="ARMATURE":
    print("ARMATURE",obj.name,"bonecount",len(obj.data.bones))
    for bone in obj.data.bones:
      if any(k in bone.name.lower() for k in ['spine','hip','neck','arm','shoulder','head','hand']):
        print("BONE",bone.name,tuple(round(x,3) for x in obj.matrix_world@bone.head_local), tuple(round(x,3) for x in obj.matrix_world@bone.tail_local))
  if obj.type=="MESH":
    bounds=[obj.matrix_world @ Vector(c) for c in obj.bound_box]
    print("MESH",obj.name,"verts",len(obj.data.vertices),"size",tuple(round(x,3) for x in obj.dimensions),
      "min",tuple(round(min(v[i] for v in bounds),3) for i in range(3)),
      "max",tuple(round(max(v[i] for v in bounds),3) for i in range(3)),
      "groups",len(obj.vertex_groups))
print("V5_RIG_SUMMARY_END")
