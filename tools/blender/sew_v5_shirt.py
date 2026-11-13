"""
Seamless armhole surgery for the V5 shirt. This does NOT emit separate
shoulder-cap cylinders. It fuses the torso and both sleeve fabric shells into
one continuous, smoothly sewn garment, restores UVs and source 44-bone
weights, then lets the editor judge pose renders before publication.

Only use in offline art build, never as an in-game runtime procedural mesh.
"""
import math
import bpy
from mathutils import kdtree


def select_one(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj


def apply_solid(obj):
    select_one(obj)
    for mod in list(obj.modifiers):
        if mod.type == "SOLIDIFY":
            bpy.ops.object.modifier_apply(modifier=mod.name)


def sew_torso_to_sleeves(body, sleeves, scale, center, bottom):
    parts=[body]+list(sleeves)
    for part in parts:
        apply_solid(part)
    # Joining the independently art-shaped fabric parts produces one common
    # donor surface with weights for both chest and sleeve joint regions.
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:part.select_set(True)
    bpy.context.view_layer.objects.active=body
    bpy.ops.object.join()
    joined=body
    joined.name="V5_Shirt_Body"

    donor=joined.copy()
    donor.data=joined.data.copy()
    bpy.context.collection.objects.link(donor)
    donor.name="SHIRT_WEIGHT_DONOR_PRIVATE"
    donor.hide_render=True
    donor.hide_set(True)

    select_one(joined)
    # Local voxels merge the armholes, removing open sleeve/root overlaps.
    # Resolution stays fine enough to preserve the reference's fabric folds
    # without multiplying mobile game polygons excessively.
    joined.data.remesh_voxel_size=max(.0050, .0085*scale)
    joined.data.use_remesh_preserve_volume=True
    bpy.ops.object.voxel_remesh()

    if len(joined.data.polygons)<1500:
        raise RuntimeError("Seamless garment fusion returned too little geometry")

    # Very small surface relaxation removes shoulder sawtooth artifacts and
    # softens the old tube-on-tube intersection without erasing waist folds.
    relax=joined.modifiers.new("Tailored seam surface relaxation","SMOOTH")
    relax.factor=.62
    relax.iterations=3
    bpy.ops.object.modifier_apply(modifier=relax.name)

    # Retarget weights from the art-shaped donor surface. Remesh operators
    # discard original per-vertex weights; never leave garments unweighted.
    donor_coords=donor.data.vertices
    kd=kdtree.KDTree(len(donor_coords))
    for v in donor_coords:kd.insert(v.co,v.index)
    kd.balance()
    weights=[]
    donor_group_name={g.index:g.name for g in donor.vertex_groups}
    for vertex in donor_coords:
        vals={}
        for group in vertex.groups:
            name=donor_group_name.get(group.group)
            if name:
                vals[name]=vals.get(name,0)+group.weight
        weights.append(vals)
    for group in list(joined.vertex_groups):
        joined.vertex_groups.remove(group)
    target={}
    for name in {n for weight in weights for n in weight}:
        target[name]=joined.vertex_groups.new(name=name)
    weighted_vertices=0
    for vertex in joined.data.vertices:
        candidates=kd.find_n(vertex.co,5)
        acc={}
        for _,index,dist in candidates:
            vweight=1.0/((dist+.006*scale)**2)
            for name,w in weights[index].items():
                acc[name]=acc.get(name,0)+vweight*w
        order=sorted(acc.items(),key=lambda p:p[1],reverse=True)[:4]
        total=sum(w for _,w in order)
        if total<=0:raise RuntimeError("Unweighted sewn garment vertex")
        for name,w in order:
            if w/total>1.e-5:target[name].add([vertex.index],w/total,"REPLACE")
        weighted_vertices+=1
    if weighted_vertices!=len(joined.data.vertices):
        raise RuntimeError("Shirt weights incomplete")

    # Rebuild UVs on the remeshed polygon surface. The custom texture's
    # actual back emblem remains centered at u=.25 and v=.65; the sleeves
    # keep the same cotton knit without a projected symbol on the arms.
    uv=joined.data.uv_layers.active or joined.data.uv_layers.new(name="V5 Sewn UV")
    cx,cy=center
    vert_uv=[]
    for vertex in joined.data.vertices:
        x,y,z=vertex.co
        u=(math.atan2(y-cy,x-cx)/(2*math.pi))%1.0
        v=(z-bottom-.763*scale)/(.479*scale)
        vert_uv.append((u,v))
    for loop in joined.data.loops:
        uv.data[loop.index].uv=vert_uv[loop.vertex_index]

    for poly in joined.data.polygons:poly.use_smooth=True
    # Remove donor from final scene; it must never overlay the shirt.
    donor.hide_set(False)
    bpy.data.objects.remove(donor,do_unlink=True)
    return {
        "new_vertices":len(joined.data.vertices),
        "new_faces":len(joined.data.polygons),
        "weighted_vertices":weighted_vertices,
        "joined_parts":len(parts),
        "mesh":joined
    }
