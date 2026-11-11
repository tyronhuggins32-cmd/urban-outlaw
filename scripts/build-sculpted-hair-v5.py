#!/usr/bin/env python3
"""Urban Outlaws reference-guided detachable 3D hair asset.

A separate textured GLB lofted as anatomically guided swept hair masses (v5).
No old swept-cylinder spikes. Contains no head or body. Hair volume, nape, front
fringe, back fan, headband and bow follow the approved turnaround artwork.

Model coordinate: Y-up, face +Z. Hair is exported relative to skull pivot
(0, 1.49, 0) in the existing 1.62 m humanoid source coordinates.
Mount the GLB at world (0, 1.49, 0) at the character's bind pose, then attach
to its Head bone preserving its world transform.
"""
import os, sys, math, json
from pathlib import Path
import numpy as np
import trimesh
from scipy.interpolate import CubicSpline
from PIL import Image, ImageDraw, ImageFilter

OUT=Path(sys.argv[1] if len(sys.argv)>1 else "assets/sculpted-hair-v5.glb")
OUT.parent.mkdir(parents=True,exist_ok=True)
PIVOT=np.array([0.,1.49,0.])
parts=[]
rng=np.random.default_rng(174)
TAU=math.tau

def hair_texture(seed=11,shade=1):
    w,h=512,512
    yy,xx=np.mgrid[0:h,0:w]
    v=yy/h
    u=xx/w
    # Thin, imperfect fiber-like highlight tracks follow the actual strand.
    fibers=(np.sin(v*TAU*16 + .25*np.sin(u*TAU*1.4))*.49 +
            np.sin(v*TAU*31 + .15*np.sin(u*TAU*2.7))*.20 +
            np.sin(v*TAU*49-u*2.1)*.10)
    middle=.5+.5*np.cos(TAU*(v-.5))
    across=(.23+.77*middle)
    root_tip=(.78+.12*np.sin(np.pi*u))*(1-.13*u*u)
    lumen=(fibers*.07+.84)*across*root_tip
    base=np.array([57.,65.,103.])*shade
    rgb=np.clip(base[None,None,:]*(.55+.55*lumen[:,:,None])+
                np.array([5.,6.,11.])*middle[:,:,None],0,255).astype('uint8')
    return Image.fromarray(np.dstack([rgb,np.full((h,w),255,'uint8')]),'RGBA')

from trimesh.visual.material import PBRMaterial
tex=hair_texture()
tex_dark=hair_texture(shade=.76)
tex_secondary=hair_texture(shade=.93)
def mat(n,col=(255,255,255,255),texture=None,rough=.84,metal=0):
    return PBRMaterial(name=n,baseColorFactor=np.array(col,dtype=np.uint8),
                       baseColorTexture=texture,roughnessFactor=rough,
                       metallicFactor=metal,doubleSided=True)
M={
 'strand':mat("LAYERED BLUE BLACK HAIR FIBERS",texture=tex,rough=.85),
 'shadow':mat("HAIR INNER SHADOW FIBERS",texture=tex_dark,rough=.89),
 'upper':mat("DIRECTIONAL LIGHT HAIR FIBERS",texture=tex_secondary,rough=.79),
 'band':mat("DEEP INDIGO CLOTH",col=(29,40,102,255),rough=.96),
 'bandLight':mat("INDIGO FOLDS",col=(43,54,128,255),rough=.94),
 'steel':mat("BRUSHED SILVER HEADBAND",col=(171,188,208,255),metal=.63,rough=.43),
 'ink':mat("DARK ENGRAVING",col=(14,17,27,255),rough=.85),
}
def add(name,vertices,faces,material,uv=None):
    vertices=np.asarray(vertices,dtype='float64')-PIVOT
    m=trimesh.Trimesh(vertices=vertices,faces=np.asarray(faces,dtype=np.int64),process=False,validate=False)
    if uv is None:
        m.visual=trimesh.visual.TextureVisuals(material=M[material])
    else:
        m.visual=trimesh.visual.TextureVisuals(uv=np.asarray(uv,dtype=float),material=M[material])
    parts.append((name,material,m))
    return m

def spline(points,N=32):
    control=np.asarray(points,dtype=float)
    d=np.linalg.norm(np.diff(control,axis=0),axis=1)
    a=np.r_[0,np.cumsum(d)]
    if a[-1]<1e-5:raise ValueError('Invalid hair curve')
    t=np.linspace(0,a[-1],N)
    return np.column_stack([CubicSpline(a,control[:,i],bc_type='natural')(t) for i in range(3)])


def loft(name,points,halfwidth,thickness,kind='strand',axis=(1,0,0),roll=0,steps=40):
    P=np.asarray(points,dtype=float);axis=np.asarray(axis,dtype=float)
    if P.shape!=(4,3):raise ValueError(name+' requires four authored sculpt landmarks')
    def bez(t):
        a,b,c,d=P
        return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d
    vertices=[];uv=[];faces=[];sides=10
    for i in range(steps+1):
        t=i/steps;center=bez(t)
        tangent=bez(min(1,t+.001))-bez(max(0,t-.001))
        tangent/=max(np.linalg.norm(tangent),1e-9)
        broad=axis-tangent*np.dot(axis,tangent)
        if np.linalg.norm(broad)<.06:broad=np.cross(tangent,[0,0,1])
        broad/=max(np.linalg.norm(broad),1e-9)
        normal=np.cross(tangent,broad);normal/=max(np.linalg.norm(normal),1e-9)
        taper=max(.002,(1-t**1.65)**.78)*(.78+.28*np.sin(np.pi*t)**2)
        w=halfwidth*taper;ang=roll*(.4+.6*t)
        broad,normal=broad*np.cos(ang)+normal*np.sin(ang),-broad*np.sin(ang)+normal*np.cos(ang)
        for j in range(sides):
            a=TAU*j/sides;side=np.cos(a);bump=np.sin(a)
            ridge=.0035*np.sin(8*np.pi*(side+.2)+t*5)*np.sin(np.pi*t)
            v=center+broad*w*side+normal*(thickness*taper*bump*(.24+.76*(1-side*side)**.56)+ridge)
            vertices.append(v);uv.append((t,(side+1)*.5))
    for i in range(steps):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;c=(i+1)*sides+j;d=(i+1)*sides+(j+1)%sides
            faces.extend(((a,c,b),(b,c,d)))
    add(name,vertices,faces,kind,uv)

def ellipsoid(name,center,radii,material,subdiv=3):
    mesh=trimesh.creation.icosphere(subdivisions=subdiv,radius=1)
    mesh.vertices=mesh.vertices*np.asarray(radii)+np.asarray(center)
    add(name,mesh.vertices,mesh.faces,material)

def strip(name,center_y,width,height,depth,material,seg=48):
    # Curved cloth wrapped around skull; no face geometry included.
    verts=[];faces=[]
    for j,dy in enumerate([-height/2,height/2]):
        for i in range(seg):
            a=TAU*i/seg
            verts.append((width*np.sin(a),center_y+dy,depth*np.cos(a)))
    for i in range(seg):
        a=i;b=(i+1)%seg;c=seg+i;d=seg+(i+1)%seg
        faces.extend(((a,b,c),(b,d,c)))
    add(name,verts,faces,material)

def pipe(name,points,radius,material,steps=40,sides=7):
    path=spline(points,steps)
    V=[];F=[]
    for i,p in enumerate(path):
        t=path[min(i+1,steps-1)]-path[max(0,i-1)]
        t=t/(np.linalg.norm(t)+1e-10)
        axis=np.cross(t,[0,1,0])
        if np.linalg.norm(axis)<.1:axis=np.cross(t,[0,0,1])
        axis/=np.linalg.norm(axis)
        perp=np.cross(t,axis)
        for j in range(sides):
            ang=TAU*j/sides
            V.append(p+radius*(axis*np.cos(ang)+perp*np.sin(ang)))
    for i in range(steps-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides
            F.extend(((a,a+sides,b),(b,a+sides,b+sides)))
    add(name,V,F,material)




# V5 anatomy-guided hair sculpt: understated crown, broad backward fan,
# uninterrupted front curtain, narrow nape. No hard spike rings.
ellipsoid('Low textured hair foundation',[0,1.535,-.027],[.099,.093,.110],'shadow',4)
ellipsoid('Short under-nape',[0,1.464,-.072],[.084,.072,.063],'shadow',3)

# Side profile silhouettes. Hair widths are vertical in side view, not
# hundreds of thin spike cylinders. Tip directions all sweep BACK.
for side in (-1,1):
    for tier in range(4):
        lateral=side*(.045+.012*tier)
        target_z=[-.285,-.289,-.269,-.249][tier]
        y=[1.658,1.620,1.567,1.529][tier]
        loft('Broadswept hair panel %s %s'%(side,tier),
             [[side*.039,1.590-.018*tier,-.050],
              [lateral,1.672-.024*tier,-.103],
              [lateral*1.3,y+.012,target_z+.060],
              [lateral*1.52,y,target_z]],
             [.046,.041,.038,.032][tier],.010,
             'upper' if tier==0 else 'strand',axis=(.2,1,.1),steps=42)

# Center crown overlaps the side fans. Only three low peaks are visible,
# avoiding the vertical "cactus" silhouette that appeared in build 3.2.
for i in range(5):
    offset=(i-2)/2
    loft('Layered rear flow '+str(i),
         [[offset*.039,1.590,-.047],
          [offset*.055,1.666,-.099],
          [offset*.105,1.668-.018*abs(offset),-.177],
          [offset*.129,1.642-.033*abs(offset),-.236]],
         .031,.011,'strand',axis=(.25,1,.10),steps=40)
for i in range(3):
    offset=i-1
    loft('Low crown ridge '+str(i),
         [[offset*.045,1.605,-.026],
          [offset*.069,1.652,-.059],
          [offset*.099,1.694,-.127],
          [offset*.125,1.680,-.187]],
         .031,.009,'upper' if i==1 else 'strand',
         axis=(1,.12,0),steps=36)

# Separate curtain pieces as in the front and side reference photos.
for side in (-1,1):
    for i,(x,tip_y,width) in enumerate([(.022,1.397,.026),(.066,1.340,.031),(.099,1.356,.027)]):
        loft('Long cheek framing lock %s %s'%(side,i),
             [[side*(x-.008),1.594,.052],
              [side*(x+.003),1.615,.112],
              [side*(x+.013),tip_y+.091,.155],
              [side*(x+.018),tip_y,.125-.012*i]],
             width,.010,'upper' if i==0 else 'strand',
             axis=(1,.12,0),steps=47)
    loft('Temple behind ear '+str(side),
         [[side*.087,1.554,.035],
          [side*.115,1.550,.097],
          [side*.119,1.435,.092],
          [side*.116,1.390,.046]],
         .023,.008,'shadow',axis=(1,.06,0),steps=36)

# Short pointed nape under the navy tie. All distinct rear sheets remain
# attached to this one detachable accessory, not to the body mesh.
for side in (-1,1):
    for i in range(3):
        x=.035+.029*i
        loft('Feathered nape %s %s'%(side,i),
             [[side*x,1.484,-.082],
              [side*x*1.2,1.463,-.130],
              [side*x*1.24,1.403,-.150],
              [side*x*1.18,1.350-.018*i,-.139]],
             .025,.007,'shadow',axis=(1,.25,.05),steps=31)

strip('Navy forehead wrap',1.442,.101,.043,.103,'band')
plate=trimesh.creation.box(extents=[.133,.043,.006])
plate.apply_translation([0,1.450,.153])
add('Silver forehead protector',plate.vertices,plate.faces,'steel')
for side in (-1,1):
    ellipsoid('Plate rivet '+str(side),
              [side*.058,1.447,.157],[.003,.003,.002],'ink',2)
spiral=[]
for i in range(29):
    t=i/28
    angle=t*TAU*1.4+.3
    radius=.003+.018*t
    spiral.append([radius*np.cos(angle),1.448+radius*np.sin(angle),.158])
pipe('Silver plate leaf engraving',spiral,.0017,'ink',32,6)

ellipsoid('Back navy hair knot',[0,1.437,-.129],
          [.021,.024,.015],'bandLight',3)
for side in (-1,1):
    loft('Wide indigo bow '+str(side),
         [[side*.009,1.440,-.137],
          [side*.041,1.477,-.164],
          [side*.079,1.465,-.186],
          [side*.083,1.430,-.173]],
         .029,.011,'bandLight',axis=(0,1,0),steps=34)
    loft('Descending indigo tie '+str(side),
         [[side*.010,1.430,-.145],
          [side*.042,1.418,-.178],
          [side*.077,1.370,-.203],
          [side*.093,1.335,-.202]],
         .027,.008,'band',axis=(0,1,0),steps=36)

# Merge all pieces sharing the same material into a compact 7-draw-call GLB.
scene=trimesh.Scene()
groups={}
for name,kind,obj in parts: groups.setdefault(kind,[]).append(obj)
for kind,meshes in groups.items():
    vertices=[];faces=[];uv=[];count=0
    for m in meshes:
        vertices.append(m.vertices)
        faces.append(m.faces+count)
        count+=len(m.vertices)
        u=getattr(m.visual,'uv',None)
        if u is None:uv.append(np.zeros((len(m.vertices),2)))
        else:uv.append(u)
    m=trimesh.Trimesh(vertices=np.concatenate(vertices),faces=np.concatenate(faces),process=False)
    m.visual=trimesh.visual.TextureVisuals(uv=np.concatenate(uv),material=M[kind])
    scene.add_geometry(m,geom_name=f'HairPart_{kind}',node_name=f'HairPart_{kind}')
bounds=scene.bounds
assert np.isfinite(bounds).all() and len(scene.geometry)==len(groups)
assert .35 < bounds[1,1]-bounds[0,1] < .55,bounds
assert .35 < bounds[1,2]-bounds[0,2] < .65,bounds
OUT.write_bytes(scene.export(file_type='glb'))
check=trimesh.load(str(OUT),force='scene')
tris=sum(len(g.faces) for g in check.geometry.values())
assert len(check.geometry)>=6 and tris>13000 and OUT.stat().st_size>40000,(tris,OUT.stat().st_size)
print(json.dumps({'asset':str(OUT),'bytes':OUT.stat().st_size,
      'mesh_groups':len(check.geometry),'individual_pieces':len(parts),
      'triangles':tris,'bounds':check.bounds.tolist(),'mount_offset':[0,1.49,0]}))
