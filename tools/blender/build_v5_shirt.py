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
N={k:bone(k) for k in ['Hips','Spine','Spine1','Spine2','Neck','LeftArm','RightArm','LeftForeArm','RightForeArm']}
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
def texture(filename,crest=False,base=(35,49,94)):
    dim=1024
    rng=np.random.default_rng(198)
    X,Y=np.meshgrid(np.arange(dim),np.arange(dim))
    grain=3*np.sin(X*.18)+2*np.sin(Y*.14)+rng.normal(0,2,(dim,dim))
    weave=np.where((X%5)==0,-5,0)+np.where((Y%6)==0,-4,0)
    lum=np.maximum(.80,1+(grain+weave)/255)
    rgb=np.empty((dim,dim,4),dtype=np.float32)
    for i in range(3):rgb[:,:,i]=np.clip(base[i]/255*lum,0,1)
    rgb[:,:,3]=1
    if crest:
        # u=.25 corresponds to the back-facing +Y quadrant in this pattern.
        # The atlas's v coordinate increases with physical shirt height.
        xc,yc=int(dim*.25),int(dim*.64)
        dx=X-xc;dy=Y-yc;r=73
        circle=dx*dx+dy*dy<=r*r
        red=circle&(dy>=0)&(dy<=r)
        white=circle&(dy<0)&(dy>=-43)&(np.abs(dx)<r*np.sqrt(np.clip(1-(dy/(r*.80))**2,0,1)))
        outline=(circle)&(np.abs(dy)<=3)
        handle=(np.abs(dx)<9)&(dy>=-85)&(dy<=-40)
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
def mesh_surface(name,rows,segments,shape,weight,mat):
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
    solid.thickness=.003*S
    solid.offset=-.6
    solid.use_rim=True
    return obj

# Envelope follows the reference: relaxed shoulders, slim torso, soft drape
# at abdomen and waistband. The rectangular tailoring comes from a modified
# superellipse circumference; it never uses straight cylinder rings.
profile=[
    (.790,.196,.153),(.835,.199,.155),(.905,.193,.146),
    (.985,.189,.142),(1.070,.193,.151),(1.135,.211,.156),
    (1.177,.225,.151),(1.207,.194,.141),(1.242,.115,.108)
]
def width(z):
    for k in range(1,len(profile)):
        lo,hi=profile[k-1],profile[k]
        if z<=hi[0]:
            w=smooth((z-lo[0])/(hi[0]-lo[0]))
            return mix(lo[1],hi[1],w),mix(lo[2],hi[2],w)
    return profile[-1][1:]
def torso(t,u):
    z=mix(.790,1.242,t);theta=u*math.tau
    X,Y=math.cos(theta),math.sin(theta)
    halfw,halfd=width(z)
    chest=smooth((z-1.04)/.135)
    bottom=1-smooth((z-.850)/.20)
    # Looser but non-bulbous shirt with side drape.
    folds=(
       .006*bottom*math.sin(9*theta+z*20)+
       .0035*math.sin(6*theta-17*z)*gauss(z,.95,.11)
    )
    # Three distinct slanted folds above the gathered waistband, the most
    # prominent feature in the user's close-up.
    localX=(halfw+folds)*X
    front=Y<0
    diagonal=(
      .010*gauss(z,.845+.12*localX,.021)*gauss(localX,-.055,.14)+
      .007*gauss(z,.886-.29*localX,.015)*gauss(localX,.080,.13)+
      .004*gauss(z,.943+.11*localX,.012)
    ) if front else (
      .008*gauss(z,.831-.20*localX,.021)+
      .005*gauss(z,.892+.20*localX,.022)
    )
    d=(halfd+folds*.45+diagonal)*Y
    squareness=.15
    x=(halfw+folds)*math.copysign(abs(X)**(1-squareness),X)
    y=(halfd+folds*.4+diagonal)*math.copysign(abs(Y)**(1-squareness),Y)
    return pos(x,y,z+.003*bottom*math.sin(theta*6))
def torso_weights(t,u):
    z=mix(.79,1.242,t)
    if z<.92:
        f=smooth((z-.79)/.13)
        return {'Hips':1-f*.6,'Spine':f*.6}
    if z<1.08:
        f=smooth((z-.92)/.16)
        return {'Spine':1-f,'Spine1':f}
    f=smooth((z-1.08)/.162)
    return {'Spine1':1-f,'Spine2':f}
body=mesh_surface('V5_Shirt_Body',84,112,torso,torso_weights,NAVY)

# 3D collar is open at the face, slightly higher behind and gently folded.
def collar_shape(t,u):
    theta=u*math.tau;X,Y=math.cos(theta),math.sin(theta)
    front=max(0,-Y)
    z0=1.228
    z1=1.340-.045*front
    z=mix(z0,z1,t)
    rX=mix(.115,.139,t)+.003*math.sin(theta*4+t*math.pi)
    rY=mix(.103,.117,t)
    fold=.008*gauss(t,.72,.14)*math.cos(theta*2)
    return pos((rX+fold)*X,(rY+fold)*Y,z)
collar=mesh_surface('V5_Shirt_Collar',27,88,collar_shape,lambda t,u:{'Spine2':1},PLAIN)

# Shirt bottom doubled edge and inset stitch ridge, both deform with hips.
def hem_shape(t,u):
    x,y,z=torso(.007+t*.030,u)
    a=u*math.tau
    return (x+S*.003*math.cos(a),y+S*.003*math.sin(a),z-S*.005*(1-t))
hem=mesh_surface('V5_Shirt_Hem',5,112,hem_shape,lambda t,u:{'Hips':.85,'Spine':.15},PLAIN)

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
        center=upper+direction*(distance*mix(.04,.53,t))
        sleeveR=mix(.101,.083,t)*S+offset
        wrinkle=.003*S*math.sin(theta*7+t*12)*(.4+.6*t)
        center+=axisU*math.cos(theta)*(sleeveR+wrinkle)
        center+=axisV*math.sin(theta)*(.9*sleeveR+wrinkle*.5)
        return tuple(center)
    weights=lambda t,u:{side+'Arm':1}
    name='V5_Shirt_'+side+'Sleeve'
    sleeveObj=mesh_surface(name,25,64,sculpt,weights,PLAIN)
    def cuff(t,u):
        return sculpt(.967+.033*t,u,offset=.002*S)
    mesh_surface(name+'_Cuff',4,64,cuff,weights,PLAIN)
    return sleeveObj
l=sleeve('Left');r=sleeve('Right')

# Make the model inspectable in the original rig, but do not delete any
# character component, shorts or hair from the base.
garments=[body,collar,hem,l,r]+[
  o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith('_Cuff')]
assert len(garments)==7,len(garments)
assert all(any(m.type=='ARMATURE' and m.object==arm for m in o.modifiers) for o in garments)

# Export a portable GLB with its original skeleton for future in-game skin
# retargeting. Keep source .blend for real editable sculpt refinements.
bpy.ops.wm.save_as_mainfile(filepath=str((OUT/'v5-shirt-candidate.blend').resolve()))
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
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
scene.cycles.samples=12
scene.render.resolution_x=750
scene.render.resolution_y=940
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
camData.type='ORTHO';camData.ortho_scale=1.15*S
target=Vector(pos(0,0,1.055))
for name,ang in [('front',0),('right_side',90),('back',180),('three_quarter',38)]:
    angle=math.radians(ang)
    cam.location=Vector(pos(math.sin(angle)*2.3,-math.cos(angle)*2.3,1.08))
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str((OUT/('shirt_'+name+'.png')).resolve())
    bpy.ops.render.render(write_still=True)
    print('V5_SHIRT_RENDER',name,flush=True)
with open(OUT/'shirt-stats.json','w') as f:
    json.dump({'status':'NOT APPROVED','garment_meshes':[o.name for o in garments],
       'vertices':sum(len(o.data.vertices) for o in garments),
       'faces':sum(len(o.data.polygons) for o in garments),
       'source_rig':arm.name,'reference':'IMG_0286/IMG_0287 front/back close-ups'},f,indent=2)
print('V5_SHIRT_CANDIDATE_READY_NOT_APPROVED',flush=True)
