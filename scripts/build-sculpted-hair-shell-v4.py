#!/usr/bin/env python3
"""Urban Outlaws reference-guided detachable 3D hair asset.

A separate textured GLB lofted as broad sculpted volumetric hair shells.
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

OUT=Path(sys.argv[1] if len(sys.argv)>1 else "assets/sculpted-hair-shell-v4.glb")
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
    base=np.array([64.,71.,110.])*shade
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



# A compact smooth scalp, then independent broad leaf-shell volumes.
ellipsoid('Scalp underlayer',[0,1.511,-.024],[.105,.093,.107],'shadow',4)
for i in range(9):
    x=(i-4)/4
    loft('Layered nape '+str(i),
         [[.073*x,1.48,-.075],[.090*x,1.442,-.116],[.095*x,1.390,-.138],[.088*x,1.339-.019*(i%3),-.135]],
         .021,.008,'shadow' if i%3 else 'strand',axis=(1,.3,.08),steps=30)
# Rear-facing fan sculpt constrained by side silhouette, with broad midsections.
fan=[(-.013,1.598,-.288,1.630,.044),(-.035,1.582,-.298,1.599,.042),
     (-.049,1.559,-.282,1.562,.041),(-.059,1.542,-.258,1.527,.040),
     (-.075,1.512,-.236,1.494,.035)]
for side in (-1,1):
    for i,(sz,sy,ez,ey,w) in enumerate(fan):
        x0=side*(.035+.008*i);ex=side*(.105+.011*(i%3))
        loft('Swept crest %s %s'%(side,i),
             [[x0,sy,sz],[side*(.080+.007*i),sy+.050-.006*i,-.110-.010*i],
              [ex*.9,ey+.021,-.207-.009*i],[ex,ey,ez]],w,.010,
             'upper' if i in (0,3) else 'strand',axis=(.3,1,.05),roll=side*.1,steps=41)
for i in range(5):
    x=(i-2)/2
    loft('Central rear sheet '+str(i),
         [[x*.044,1.557,-.063],[x*.093,1.617,-.113],
          [x*.126,1.631-.018*(i%2),-.185],[x*.149,1.615-.024*(i%3),-.257]],
          .030,.010,'strand',axis=(.4,1,.1),steps=39)
# Five sculpted crown spikes, not a dense row of plastic cones.
for i in range(5):
    x=(i-2)/2
    loft('Crown folded section '+str(i),
         [[x*.048,1.564,-.020],[x*.082,1.629,-.067],
          [x*.100,1.670-.016*abs(x),-.111],
          [x*.126,1.684-.029*abs(x)+.007*np.sin(i*1.9),-.157]],
         .035-.004*abs(x),.013,'upper' if i%3==0 else 'strand',
         axis=(1,.25,0),roll=x*.15,steps=38)
for i in range(3):
    x=i-1
    loft('Front scalp split '+str(i),
         [[x*.031,1.588,.015],[x*.050,1.630,.085],
          [x*.068,1.616,.137],[x*.082,1.570,.152]],
         .026,.011,'strand',axis=(1,.05,.05),steps=35)
# Separate curtain sheets reach below cheek; silver protector is visible behind them.
for side in (-1,1):
    loft('Inner curtain '+str(side),
        [[side*.012,1.592,.076],[side*.024,1.617,.135],
         [side*.028,1.446,.172],[side*.042,1.339,.146]],
        .026,.009,'upper',axis=(1,.04,0),steps=44)
    loft('Main cheek bang '+str(side),
        [[side*.045,1.584,.049],[side*.084,1.604,.116],
         [side*.083,1.477,.163],[side*.091,1.310,.131]],
        .033,.010,'strand',axis=(1,.02,0),steps=47)
    loft('Outer side bang '+str(side),
        [[side*.085,1.546,.015],[side*.117,1.569,.095],
         [side*.126,1.456,.105],[side*.121,1.333,.074]],
        .027,.009,'shadow',axis=(.90,.1,.1),steps=45)
    loft('Middle fringe '+str(side),
        [[side*.013,1.58,.061],[side*.033,1.58,.124],
         [side*.052,1.484,.177],[side*.053,1.402,.151]],
        .013,.006,'strand',axis=(1,0,0),steps=38)
strip('Indigo wrap',1.413,.109,.038,.104,'band')
strip('Lower wrap crease',1.389,.109,.015,.104,'bandLight')
plate=trimesh.creation.box(extents=[.140,.049,.006]);plate.apply_translation([0,1.426,.150])
add('Forehead silver protector',plate.vertices,plate.faces,'steel')
for x in (-.064,.064):
    for y in (1.406,1.446):
        ellipsoid('Plate rivet',[x,y,.1555],[.0028,.0028,.002],'ink',1)
spiral=[]
for j in range(21):
    t=j/20;ang=.6+2.65*np.pi*t;rad=.002+.021*t
    spiral.append([rad*np.cos(ang),1.424+rad*np.sin(ang),.156])
pipe('Raised engraved leaf',spiral,.002,'ink',36,6)
ellipsoid('Bow knot core',[0,1.424,-.129],[.026,.021,.017],'bandLight',2)
for side in (-1,1):
    loft('Folded bow '+str(side),
         [[side*.012,1.430,-.124],[side*.049,1.456,-.165],
          [side*.076,1.456,-.181],[side*.080,1.419,-.171]],
         .032,.012,'bandLight',axis=(.10,1,.05),steps=37)
    loft('Loose navy tie '+str(side),
         [[side*.009,1.430,-.137],[side*.043,1.432,-.181],
          [side*.080,1.384,-.217],[side*.108,1.334,-.206]],
         .027,.009,'band',axis=(.20,1,0),steps=37)

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
