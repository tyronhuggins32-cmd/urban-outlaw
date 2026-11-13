"""
Urban Outlaw V5 shirt candidate — an actual offline Blender garment source.
Not a runtime stack of cylinders and not an approval sheet.

Build: PYTHONPATH=/usr/lib/python3/dist-packages blender -b -t 2 \
  --python tools/blender/build_v5_shirt.py

The output stays in art/v5/generated/ and is NOT merged into the live game.
"""
import math, os, json, random, bpy
import numpy as np
from pathlib import Path
from mathutils import Vector

OUT=Path('art/v5/generated')
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path('assets/reference-rig-fluid.glb').resolve()))
arm=next((o for o in bpy.data.objects if o.type=='ARMATURE' and len(o.data.bones)>=40),None)
assert arm, 'Original character armature not imported'
source=next((o for o in bpy.data.objects if o.type=='MESH' and len(o.vertex_groups)>20),None)
assert source,'Could not find original rigged humanoid body'
bn={b.name.lower().replace('mixamorig',''):b.name for b in arm.data.bones}
def bone(key):
    a=[value for name,value in bn.items() if name.endswith(key.lower())]
    if not a: raise RuntimeError('No skeleton joint '+key)
    return a[0]
N={k:bone(k) for k in ['Hips','Spine','Spine1','Spine2','Neck','LeftShoulder','RightShoulder','LeftArm','RightArm','LeftForeArm','RightForeArm']}
print('V5_SHIRT_JOINTS',N,flush=True)
def head(name):
    return arm.data.bones[N[name]].head_local.copy()
def tail(name):
    return arm.data.bones[N[name]].tail_local.copy()
# Our mesh vertices are in armature-local Blender coordinates, not hardcoded
# world coordinates. For this rig Z is the vertical axis after GLB import.
cx=head('Spine2').x
cy=head('Spine2').y
print('V5_SHIRT_ARM_COORDS',[(k,tuple(round(v,3) for v in head(k))) for k in N],flush=True)
# Reference originally specifies garment z=.79..1.35 on a 1.65m character.
# Relative scale and vertical offset follow the imported character when needed.
verts=[source.matrix_world @ v.co for v in source.data.vertices]
low=min(v.z for v in verts);high=max(v.z for v in verts)
HEIGHT=high-low
S=HEIGHT/1.65
print('V5_BODY_EXTENTS',low,high,HEIGHT,S,flush=True)
# Build local coordinates in the original in-game Y-up convention transformed
# into Blender Z-up. Body base in source rig at Z=0.
def pos(x,y,z):
    return (cx+x*S,cy+y*S,low+z*S)
def smooth(v):
    x=max(0,min(1,v));return x*x*(3-2*x)
def gauss(x,mu,sigma):
    return math.exp(-.5*((x-mu)/sigma)**2)
def mix(a,b,t):return a+(b-a)*t

# Navy cloth: knit noise is physically integrated into a texture, while
# geometry holds actual sewn folds. A crisp fan emblem is printed into the
# back-center UV island without an extra floating sprite plane.
def texture(filename,crest=False,base=(26,39,83)):
    dim=1024
    rng=np.random.default_rng(198)
    X,Y=np.meshgrid(np.arange(dim),np.arange(dim))
    grain=3*np.sin(X*.18)+2*np.sin(Y*.14)+rng.normal(0,2,(dim,dim))
    weave=np.where((X%5)==0,-5,0)+np.where((Y%6)==0,-4,0)
    lum=np.maximum(.80,1+(grain+weave)/255)
    rgb=np.empty((dim,dim,4),dtype=np.float32)
    # Reference front shirt has three asymmetric, wide folds above the waist.
    # Keep fine knit independent of folds so it still looks like fabric under
    # a directional light. The two fields follow the same waist geometry.
    U=X/dim;V=Y/dim
    front=np.exp(-.5*((U-.75)/.135)**4)
    back=np.exp(-.5*((U-.25)/.20)**4)
    def crease(v0,width,amount):
        return amount*np.exp(-.5*((V-v0)/width)**2)
    y1=.17+.11*(U-.75)
    y2=.265-.085*(U-.75)
    y3=.36+.13*(U-.75)
    shading=1+front*(
        crease(y1-.025,.020,.075)+crease(y1+.018,.016,-.125)+
        crease(y2-.023,.018,.065)+crease(y2+.016,.020,-.108)+
        crease(y3-.019,.016,.04)+crease(y3+.019,.020,-.085)
    ) +back*(crease(.20,.025,-.055)+crease(.30,.021,-.045))
    for i in range(3):rgb[:,:,i]=np.clip(base[i]/255*lum*shading,0,1)
    rgb[:,:,3]=1
    if crest:
        # u=.25 corresponds to the back-facing +Y quadrant in this pattern.
        # The atlas's v coordinate increases with physical shirt height.
        xc,yc=int(dim*.25),int(dim*.71)
        dx=X-xc;dy=Y-yc
        rx,ry=100,189
        circle=(dx/rx)**2+(dy/ry)**2<=1
        red=circle&(dy>=0)&(dy<=ry)
        bowl=(dx/(rx*.89))**2+(dy/109)**2<=1
        white=bowl&(dy<0)&(dy>=-106)
        outline=(np.abs(dx)<rx)&(np.abs(dy)<=4)
        handle=(np.abs(dx)<8)&(dy>=-198)&(dy<=-98)
        rgb[red,:3]=[.68,.28,.34]
        rgb[white,:3]=[.94,.92,.90]
        rgb[outline,:3]=[.15,.19,.31]
        rgb[handle,:3]=[.94,.92,.90]
    image=bpy.data.images.new(filename,width=dim,height=dim,alpha=True)
    image.pixels.foreach_set(rgb.reshape(-1))
    image.filepath_raw=str((OUT/filename).resolve())
    image.file_format='PNG';image.save()
    return image

shirtTex=texture('v5_shirt_backfan.png',True)
plainTex=texture('v5_shirt_navy.png')
def material(name,img):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(.10,.15,.29,1)
    mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value=.88
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=img
    mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
    return mat
NAVY=material('Shirt navy knit with full back Uchiha fan',shirtTex)
PLAIN=material('Shirt plain navy knit',plainTex)

# Pattern-based 3D cloth surface. Each ring is irregular and independently
# shaped from waist to shoulder, producing fabric not a straight cylinder.
def mesh_surface(name,rows,segments,shape,weight,mat,thickness=None):
    vertices=[];faces=[];UV=[]
    for i in range(rows+1):
        t=i/rows
        for j in range(segments):
            u=j/segments
            vertices.append(shape(t,u))
            UV.append((u,t))
    for i in range(rows):
        for j in range(segments):
            a=i*segments+j;b=i*segments+(j+1)%segments
            c=(i+1)*segments+j;d=(i+1)*segments+(j+1)%segments
            faces.append((a,b,d,c))
    me=bpy.data.meshes.new(name+' geometry')
    me.from_pydata(vertices,[],faces);me.update()
    me.materials.append(mat)
    obj=bpy.data.objects.new(name,me)
    bpy.context.collection.objects.link(obj)
    uv=me.uv_layers.new(name='Garment UV')
    for poly in me.polygons:
        poly.use_smooth=True
        for li in poly.loop_indices:
            uv.data[li].uv=UV[me.loops[li].vertex_index]
    # Four-joint weight transfer is fixed at creation and normalized.
    groups={n:obj.vertex_groups.new(name=n) for n in set(N.values())}
    for i in range(rows+1):
        t=i/rows
        for j in range(segments):
            weights=weight(t,j/segments)
            tot=sum(max(0,w) for w in weights.values())
            if tot<.001:raise ValueError('Unweighted garment vertex '+name)
            for target,w in weights.items():
                if w>0:groups[N[target]].add([i*segments+j],float(w/tot),'REPLACE')
    arm_mod=obj.modifiers.new('Existing 44 bone skeletal binding','ARMATURE')
    arm_mod.object=arm
    obj.parent=arm
    obj.matrix_parent_inverse=arm.matrix_world.inverted()
    solid=obj.modifiers.new('Soft cotton shell thickness','SOLIDIFY')
    # A robust, manifold seam-fusion shell must remain thicker than voxels.
    # The earlier .003 m wall was narrower than the remesh cell and left
    # see-through chest pinholes. This thickness goes inward by default.
    solid.thickness=.018*S if thickness is None else thickness
    solid.offset=-.6
    solid.use_rim=True
    return obj

# Envelope follows the reference: relaxed shoulders, slim torso, soft drape
# at abdomen and waistband. The rectangular tailoring comes from a modified
# superellipse circumference; it never uses straight cylinder rings.
profile=[
    (.763,.183,.159),(.810,.184,.161),(.865,.186,.163),
    (.930,.180,.153),(.985,.185,.142),(1.070,.192,.150),
    (1.135,.199,.153),(1.177,.181,.142),(1.207,.153,.126),
    (1.242,.115,.108)
]
def width(z):
    for k in range(1,len(profile)):
        lo,hi=profile[k-1],profile[k]
        if z<=hi[0]:
            w=smooth((z-lo[0])/(hi[0]-lo[0]))
            return mix(lo[1],hi[1],w)*1.008,mix(lo[2],hi[2],w)
    return profile[-1][1]*1.008,profile[-1][2]
def torso(t,u):
    z=mix(.763,1.242,t);theta=u*math.tau
    X,Y=math.cos(theta),math.sin(theta)
    halfw,halfd=width(z)
    chest=smooth((z-1.04)/.135)
    bottom=1-smooth((z-.925)/.23)
    # Looser but non-bulbous shirt with side drape.
    folds=(
       .012*bottom*math.sin(9*theta+z*20)+
       .005*math.sin(6*theta-17*z)*gauss(z,.95,.11)
    )
    # Three distinct slanted folds above the gathered waistband, the most
    # prominent feature in the user's close-up.
    localX=(halfw+folds)*X
    front=Y<0
    diagonal=(
      .037*gauss(z,.824+.20*localX,.030)*gauss(localX,-.025,.17)+
      .024*gauss(z,.880-.26*localX,.024)*gauss(localX,.040,.17)+
      .015*gauss(z,.943+.12*localX,.022)+
      -.015*gauss(z,.847+.20*localX,.014)*gauss(localX,-.015,.15)
    ) if front else (
      .008*gauss(z,.831-.20*localX,.021)+
      .005*gauss(z,.892+.20*localX,.022)
    )
    d=(halfd+folds*.45+diagonal)*Y
    squareness=.06
    x=(halfw+folds)*math.copysign(abs(X)**(1-squareness),X)
    y=(halfd+folds*.4+diagonal)*math.copysign(abs(Y)**(1-squareness),Y)
    return pos(x,y,z+.003*bottom*math.sin(theta*6))
def torso_weights(t,u):
    z=mix(.763,1.242,t)
    if z<.92:
        f=smooth((z-.763)/.157)
        base={'Hips':1-f*.6,'Spine':f*.6}
    elif z<1.08:
        f=smooth((z-.92)/.16)
        base={'Spine':1-f,'Spine1':f}
    else:
        f=smooth((z-1.08)/.162)
        base={'Spine1':1-f,'Spine2':f}
    # The upper shoulder fabric should deform with the shoulder joint,
    # rather than remaining pinned to the chest while the sleeve rotates.
    lateral=math.cos(u*math.tau)
    shoulder=.66*gauss(z,1.159,.056)*smooth((abs(lateral)-.27)/.68)
    if shoulder>.001:
        base={k:v*(1-shoulder) for k,v in base.items()}
        side='Left' if lateral>0 else 'Right'
        base[side+'Shoulder']=shoulder*.58
        base[side+'Arm']=shoulder*.42
    return base
body=mesh_surface('V5_Shirt_Body',84,112,torso,torso_weights,NAVY)

# 3D collar is open at the face, slightly higher behind and gently folded.
def collar_shape(t,u):
    theta=u*math.tau;X,Y=math.cos(theta),math.sin(theta)
    front=max(0,-Y)
    z0=1.183
    center_front=gauss(X,0,.47) if front>0 else 0
    # The front of the collar falls below the mouth while the back remains
    # tall under the tied hair, matching the user's actual V5 close-up.
    z1=1.316-.077*front-.021*front*center_front
    z=mix(z0,z1,t)
    rX=mix(.118,.132,t)+.0015*math.sin(theta*4+t*math.pi)
    rY=mix(.103,.114,t)
    fold=.006*gauss(t,.32,.12)*math.cos(theta*2)+.003*gauss(t,.82,.14)*math.sin(theta*3)
    rolled=.006*gauss(t,.93,.10)+.004*gauss(t,.18,.09)
    softR=1+.020*math.cos(theta*5+.6)*gauss(t,.42,.22)
    z+=.003*math.sin(theta*5+.6)*gauss(t,.95,.14)
    return pos(((rX+fold)*softR+rolled)*X,((rY+fold)*softR+rolled)*Y,z)
collar=mesh_surface('V5_Shirt_Collar',27,88,collar_shape,lambda t,u:{'Spine2':1},PLAIN,thickness=.007*S)

# Shirt bottom doubled edge and inset stitch ridge, both deform with hips.
def hem_shape(t,u):
    x,y,z=torso(.012+t*.014,u)
    a=u*math.tau
    wave=.005*S*(math.sin(6*a+.9)+.45*math.sin(11*a-1.2))
    return (x+S*.006*math.cos(a),y+S*.006*math.sin(a),z-S*.003*(1-t)+wave*(1-t))
hem=mesh_surface('V5_Shirt_Hem',5,112,hem_shape,lambda t,u:{'Hips':.85,'Spine':.15},PLAIN,thickness=.006*S)

# The sleeve axis uses original arm endpoints, not guessed world coordinates.
def sleeve(side):
    upper=head(side+'Arm')
    elbow=head(side+'ForeArm')
    direction=(elbow-upper).normalized()
    distance=(elbow-upper).length
    # The source bone bind pose may be angled: a sleeve follows that exact
    # direction and overlaps the shoulder seam for a continuous silhouette.
    axisU=direction.cross(Vector((0,1,0)))
    if axisU.length<.1:axisU=Vector((0,0,1)).cross(direction)
    axisU.normalize()
    axisV=direction.cross(axisU).normalized()
    def sculpt(t,u,offset=0):
        theta=u*math.tau
        center=upper+direction*(distance*mix(-.07,.65,t))
        center.x+=(.008 if side=='Left' else -.008)*S*smooth(t)
        sleeveR=mix(.084,.089,t)*S+offset
        wrinkle=.004*S*math.sin(theta*7+t*12)*(.30+.70*t)
        center+=axisU*math.cos(theta)*(sleeveR+wrinkle)
        center+=axisV*math.sin(theta)*(.9*sleeveR+wrinkle*.5)
        return tuple(center)
    def weights(t,u):
        # Bind root sleeve rings to chest/shoulder; gradually hand off skin
        # weights toward the upper arm down the sleeve. The cuff remains free
        # to follow the attacking limb without tearing its shoulder seam.
        armShare=.35+.65*smooth(t/.60)
        shoulderShare=(1-armShare)*.62
        chestShare=(1-armShare)*.38
        return {side+'Arm':armShare,side+'Shoulder':shoulderShare,'Spine2':chestShare}
    name='V5_Shirt_'+side+'Sleeve'
    sleeveObj=mesh_surface(name,25,64,sculpt,weights,PLAIN)
    def cuff(t,u):
        return sculpt(.967+.033*t,u,offset=.002*S)
    mesh_surface(name+'_Cuff',4,64,cuff,lambda t,u:{side+'Arm':1},PLAIN,thickness=.005*S)
    return sleeveObj
l=sleeve('Left');r=sleeve('Right')

# Reconstruct the armholes rather than leaving two tubes intersecting the
# shirt shell. This produces ONE skinned torso-and-sleeves garment.
import sys as _sys
_sys.path.insert(0,str(Path(__file__).resolve().parent))
from sew_v5_shirt import sew_torso_to_sleeves
stitched=sew_torso_to_sleeves(body,[l,r],S,(cx,cy),low)
print('V5_SHIRT_SEWING',stitched['new_faces'],stitched['weighted_vertices'],flush=True)

# Preserve separate hem, raised cowl and sleeve cuff embroidery only.
# None of these are shoulder caps.
garments=[body,collar,hem]+[
  o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith('_Cuff')]
assert len(garments)==5,len(garments)
assert all(any(m.type=='ARMATURE' and m.object==arm for m in o.modifiers) for o in garments)

# V5 reference: slender early-teen body. The original GLB was visibly too
# broad and short, which made any shirt look like a square poncho. A common
# rig-level scale, rather than per-garment deformation, preserves all fitted
# clothing and animation relationships. This is a candidate, not a live edit.
arm.scale.x*=.88
arm.scale.y*=.96
arm.scale.z*=1.11
bpy.context.view_layer.update()
print('V5_PROPORTION_CORRECTION',tuple(round(x,3) for x in arm.scale),flush=True)

# Export a portable GLB with its original skeleton for future in-game skin
# retargeting. Keep source .blend for real editable sculpt refinements.
bpy.ops.wm.save_as_mainfile(filepath=str((OUT/'v5-shirt-candidate.blend').resolve()))
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
source.select_set(True)  # Full-rig replacement needs source body, not cloth only
for obj in garments:obj.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=str((OUT/'v5-shirt-candidate.glb').resolve()),
                          export_format='GLB',use_selection=True,
                          export_skins=True,export_animations=False,
                          export_texcoords=True,export_normals=True)

# Render only the upper body at matched fixed focal length (not a collage or
# new approval sheet). These are diagnostic candidate views, not approved art.
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type in {'MESH','ARMATURE'}:
        obj.hide_render=(obj.type=='MESH' and obj not in garments and obj!=source)
source.hide_render=False
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=False
bpy.context.view_layer.cycles.use_denoising=False
scene.render.resolution_x=750
scene.render.resolution_y=1120
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
world=bpy.data.worlds.new('Neutral shirt proof backdrop')
scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.73,.77,.86,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
def area(name,location,power,size):
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size
    obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj)
    obj.location=location
    direction=Vector(pos(0,0,1.05))-obj.location
    obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
area('front key',pos(-1.7,-2.2,2.8),190,3)
area('back rim',pos(1.5,1.9,2.3),160,2.5)
area('soft fill',pos(2,-2,.7),90,3)
camData=bpy.data.cameras.new('Orthographic garment QA only')
cam=bpy.data.objects.new('QA shirt camera',camData)
scene.collection.objects.link(cam);scene.camera=cam
camData.type='ORTHO';camData.ortho_scale=1.53*S
target=arm.matrix_world @ Vector(pos(0,0,1.12))
for name,ang in [('front',0),('right_side',90),('back',180),('three_quarter',38)]:
    angle=math.radians(ang)
    cam.location=arm.matrix_world @ Vector(pos(math.sin(angle)*2.3,-math.cos(angle)*2.3,1.08))
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str((OUT/('shirt_'+name+'.png')).resolve())
    bpy.ops.render.render(write_still=True)
    print('V5_SHIRT_RENDER',name,flush=True)

# Non-public animation QA. A garment that renders correctly only while idle
# does not qualify as a combat outfit. Pose both upper arms and verify their
# attached sleeve panels follow the same 44-bone skeleton.
arm.pose.bones[N['LeftArm']].rotation_mode='XYZ'
arm.pose.bones[N['RightArm']].rotation_mode='XYZ'
from bpy_extras.object_utils import world_to_camera_view
proofs={}
scene.frame_set(1)
for poseName,left,right,spine,hips,leg in [
    ('guard',.46,-.48,.08,0,0),
    ('jab',.70,-.11,.10,0,0),
    ('cross',-.13,.86,-.11,0,0),
    ('kick',-.16,.15,-.10,0,.94),
    ('dodge',-.40,-.39,.36,.14,0),
    ('ninja_run',-.90,-.89,.34,0,.45),
]:
    arm.pose.bones[N['LeftArm']].rotation_euler=(left,0,-.12)
    arm.pose.bones[N['RightArm']].rotation_euler=(right,0,.12)
    arm.pose.bones[N['Spine1']].rotation_mode='XYZ'
    arm.pose.bones[N['Spine1']].rotation_euler=(spine,0,0)
    arm.pose.bones[N['Hips']].rotation_mode='XYZ'
    arm.pose.bones[N['Hips']].rotation_euler=(hips,0,0)
    leg_name=next((b.name for b in arm.data.bones if b.name.lower().endswith('rightupleg')),None)
    if leg_name:
        arm.pose.bones[leg_name].rotation_mode='XYZ'
        arm.pose.bones[leg_name].rotation_euler=(leg,0,0)
    bpy.context.view_layer.update()
    cam.location=arm.matrix_world @ Vector(pos(0,-2.3,1.08))
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str((OUT/('shirt_combat_'+poseName+'.png')).resolve())
    shoulder_points={}
    for side in ('Left','Right'):
        joint=arm.pose.bones[N[side+'Arm']]
        uv=world_to_camera_view(scene,cam,arm.matrix_world @ joint.head)
        shoulder_points[side]=[round(uv.x*scene.render.resolution_x,2),
                               round((1-uv.y)*scene.render.resolution_y,2)]
    proofs[poseName]=shoulder_points
    bpy.ops.render.render(write_still=True)
    print('V5_SHIRT_COMBAT_POSE',poseName,shoulder_points,flush=True)
for bone in arm.pose.bones:
    bone.rotation_mode='XYZ'
    bone.rotation_euler=(0,0,0)
with open(OUT/'pose-shoulder-points.json','w') as f:
    json.dump(proofs,f,indent=2)

with open(OUT/'shirt-stats.json','w') as f:
    json.dump({'status':'NOT APPROVED','garment_meshes':[o.name for o in garments],
       'vertices':sum(len(o.data.vertices) for o in garments),
       'faces':sum(len(o.data.polygons) for o in garments),
       'source_rig':arm.name,'reference':'IMG_0286/IMG_0287 front/back close-ups'},f,indent=2)
print('V5_SHIRT_CANDIDATE_READY_NOT_APPROVED',flush=True)
