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
    joined.data.remesh_voxel_size=max(.0040, .0060*scale)
    joined.data.use_remesh_preserve_volume=True
    bpy.ops.object.voxel_remesh()

    if len(joined.data.polygons)<1500:
        raise RuntimeError("Seamless garment fusion returned too little geometry")
    # One object is not enough: a mesh can silently contain disconnected
    # floating sleeve islands. Require exactly one connected polygon shell.
    count=len(joined.data.vertices)
    parents=list(range(count))
    def rootof(i):
        while parents[i]!=i:
            parents[i]=parents[parents[i]]
            i=parents[i]
        return i
    for edge in joined.data.edges:
        i,j=edge.vertices
        ri,rj=rootof(i),rootof(j)
        if ri!=rj:parents[ri]=rj
    from collections import Counter
    component_by_vertex=[rootof(v.index) for v in joined.data.vertices]
    component_sizes=Counter(component_by_vertex)
    primary,_=component_sizes.most_common(1)[0]
    fragments=[i for i,c in enumerate(component_by_vertex) if c!=primary]
    if fragments:
        # Voxel stitching can create a tiny closed, internal speck (previous
        # run measured an eight-vertex island). That is not a real sleeve.
        # Remove small remesh debris, but NEVER silently accept a detached
        # shoulder or whole sleeve disguised as a second mesh island.
        if len(fragments)>max(32,int(.004*count)):
            raise RuntimeError("Shoulder sleeves are NOT sewn: detached "+
                               str(dict(component_sizes)))
        import bmesh
        bm=bmesh.new()
        bm.from_mesh(joined.data)
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[bm.verts[i] for i in fragments],
                         context="VERTS")
        bm.to_mesh(joined.data)
        bm.free()
        joined.data.update()
        print("V5_SEAM_FRAGMENT_REMOVED",len(fragments),flush=True)

    # Very small surface relaxation removes shoulder sawtooth artifacts and
    # softens the old tube-on-tube intersection without erasing waist folds.
    relax=joined.modifiers.new("Tailored seam surface relaxation","SMOOTH")
    relax.factor=.55
    relax.iterations=2
    bpy.ops.object.modifier_apply(modifier=relax.name)

    # Carve the close-up's asymmetrical gathered cotton folds into actual
    # 3D surface normals. This is not a color overlay: each subtle ridge and
    # valley is geometric, placed diagonally above the waist and blended out
    # before reaching side seams. The previous one-piece render was too flat.
    cx,cy=center
    def smoothstep(x):
        x=max(0.,min(1.,x))
        return x*x*(3-2*x)
    def bump(value,center,width):
        return math.exp(-.5*((value-center)/width)**2)
    displaced=0
    for vertex in joined.data.vertices:
        u=(vertex.co.x-cx)/scale
        z=(vertex.co.z-bottom)/scale
        if z<.775 or z>1.015 or abs(u)>.21:
            continue
        xmask=smoothstep((.215-abs(u))/.06)
        if xmask<=0.:continue
        front=smoothstep((cy-vertex.co.y)/(.126*scale))
        back=smoothstep((vertex.co.y-cy)/(.126*scale))
        ridge1=bump(z,.816+.13*u,.028)
        valley1=bump(z,.848+.13*u,.021)
        ridge2=bump(z,.885-.20*u,.032)
        valley2=bump(z,.913-.20*u,.022)
        ridge3=bump(z,.959+.12*u,.024)
        valley3=bump(z,.978+.12*u,.016)
        frontFold=(.028*ridge1-.012*valley1+
                   .020*ridge2-.012*valley2+
                   .010*ridge3-.008*valley3)
        backFold=(.011*bump(z,.835-.13*u,.031)
                  -.009*bump(z,.876-.13*u,.022)
                  +.008*bump(z,.944+.1*u,.028))
        delta=scale*xmask*(front*frontFold-back*backFold)
        if abs(delta)>.00005:
            vertex.co.y-=delta
            displaced+=1
    # Keep the upper-arm skin behind fabric in guard/jab rotations. A local
    # curved shoulder allowance inflates the real sewn armhole surface (not
    # a separate cap mesh) and gracefully tapers into the shirt's chest.
    protected=0
    for vertex in joined.data.vertices:
        shoulder_x=(vertex.co.x-cx)/scale
        z=(vertex.co.z-bottom)/scale
        side=abs(shoulder_x)
        if z<1.045 or z>1.235 or side<.09 or side>.31:
            continue
        weight=(math.exp(-.5*((z-1.123)/.053)**2)*
                smoothstep((side-.115)/.072)*
                (1-smoothstep((side-.255)/.060)))
        if weight>.015:
            sign=1 if shoulder_x>0 else -1
            vertex.co.x+=sign*.016*scale*weight
            vertex.co.z+=.002*scale*weight
            protected+=1
    joined.data.update()
    print("V5_GARMENT_FOLDS_SCULPTED",displaced,
          "SHOULDER_ALLOWANCE_VERTS",protected,flush=True)

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
    # UV must be unwrapped PER FACE at the angular 0/1 seam. Otherwise
    # Blender interpolates across the whole atlas and paints parts of the
    # red Uchiha crest as thin pink scars on shoulders and side sleeves.
    for face in joined.data.polygons:
        indices=list(face.loop_indices)
        corners=[vert_uv[joined.data.loops[i].vertex_index] for i in indices]
        crossing=max(c[0] for c in corners)-min(c[0] for c in corners)>.5
        for loopid,(u,v) in zip(indices,corners):
            if crossing and u<.5:u+=1.0
            uv.data[loopid].uv=(u,v)

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
