#!/usr/bin/env python3
"""Urban Outlaws reference-guided detachable 3D hair asset.

A real textured GLB without a head/face/body. Hair is swept as organic,
flattened curved locks (not random plastic cones). Hair volume, nape, front
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

OUT=Path(sys.argv[1] if len(sys.argv)>1 else "assets/approved-detachable-hair.glb")
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
    base=np.array([53.,60.,97.])*shade
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

def blade(name,points,width,thick=.20,roll=.0,kind='strand',samples=35,sides=12,bend=0,side_profile=False):
    # Flattened organic hair leaf with full curved 3D thickness and a narrow tip.
    path=spline(points,samples)
    directions=np.gradient(path,axis=0)
    dirs=directions/(np.linalg.norm(directions,axis=1,keepdims=True)+1e-10)
    verts=[];uv=[];faces=[]
    for i,(p,tangent) in enumerate(zip(path,dirs)):
        t=i/(samples-1)
        # Width blooms after the root and tapers naturally at the tip.
        envelope=max(.003,((1-t)**.70)*(.66+.45*math.sin(math.pi*min(t/.84,1))**.75))
        if t> .90:envelope*=max(.04,((1-t)/.10)**1.5)
        # The root is buried in its neighbor to avoid naked rod-like starts.
        w=width*envelope
        orient=(np.array([.23,1.,.15],float) if side_profile else
                np.array([1.,.06*math.sin(2*math.pi*t+roll),.05],float))
        width_axis=orient-tangent*np.dot(orient,tangent)
        if np.linalg.norm(width_axis)<.05:
            width_axis=np.array([.2,0,1.])-tangent*np.dot([.2,0,1.],tangent)
        width_axis/=max(np.linalg.norm(width_axis),1e-8)
        thick_axis=np.cross(tangent,width_axis)
        thick_axis/=max(np.linalg.norm(thick_axis),1e-8)
        angle=roll*(.5+t*.25)+bend*t
        ca,sa=np.cos(angle),np.sin(angle)
        aa=width_axis*ca+thick_axis*sa
        bb=-width_axis*sa+thick_axis*ca
        for k in range(sides):
            a=TAU*k/sides
            # Offset around the ellipse with mild planar ribbing.
            crest=1+.026*np.cos(a*7+t*11)
            pp=p+w*crest*(np.cos(a)*aa + thick*np.sin(a)*bb)
            verts.append(pp)
            uv.append((t,k/sides))
    for i in range(samples-1):
        for k in range(sides):
            a=i*sides+k;b=i*sides+(k+1)%sides
            c=(i+1)*sides+k;d=(i+1)*sides+(k+1)%sides
            faces.extend(((a,c,b),(b,c,d)))
    # Close the root and tapered tip.
    add(name,verts,faces,kind,uv)

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

# Scalp foundation. A low dome under the broad interwoven sheets.
ellipsoid('Navy scalp cap',[0,1.487,-.018],[.095,.083,.091],'shadow',4)
ellipsoid('Tapered rear underhair',[0,1.435,-.055],[.087,.074,.068],'shadow',3)

# Backward swept main layers: two stacked ranks, carefully distributed from
# the middle line to the side silhouette. These form the asymmetric "fan".
for rank in range(3):
  count=[7,7,6][rank]
  for i in range(count):
    u=(i-(count-1)/2)/((count-1)/2)
    st=np.sign(u)
    bx=u*(.055+.006*rank)
    start=[bx,1.551-.021*rank-.013*abs(u),-.029-.018*rank]
    tip_x=u*(.134+.013*rank)+.007*np.sin(i*2.31+rank)
    tip_z=-.263-.038*(1-abs(u))-.010*rank+.015*np.cos(i*1.51)
    tip_y=1.619-.014*rank-.026*abs(u)+.010*np.sin(i*.93)
    blade(f'Swept upper layer {rank} lock {i}',[
        start,
        [bx*1.26,1.603-.014*rank,-.091-.011*rank],
        [tip_x*.75,tip_y+.014,tip_z+.070],
        [tip_x,tip_y,tip_z]],
        [.037,.033,.029][rank]*(1-.15*abs(u)),
        [.23,.21,.19][rank],
        roll=.19*u,kind=('upper' if (i+rank)%5==0 else 'strand' if rank<2 else 'shadow'),
        samples=33,side_profile=True)

# Crown fan: taller, directional leaves, subtly staggered with visible
# space only near the tips. The back view shows an overlapping feather crown.
for i in range(9):
  u=(i-4)/4
  blade(f'High crown petal {i}',[
      [.063*u,1.554,-.057],
      [.086*u,1.611,-.105],
      [.108*u,1.677-.024*abs(u),-.140-.013*i/8],
      [.122*u,1.695-.035*abs(u)+.007*np.cos(i*2),-.180-.018*abs(u)]],
      .032-.004*abs(u),.30,roll=.14*u,
      kind='strand' if i%4 else 'upper',samples=34,side_profile=True)

# Long black-blue curtain fringe. Broad sheets flow from a center part,
# opening around the metal protector, framing cheeks and narrowing to tips.
for side in [-1,1]:
    blade(f'Front center long lock {side}',[
        [side*.016,1.562,.068],
        [side*.022,1.566,.117],
        [side*.033,1.480,.145],
        [side*.038,1.389,.153],
        [side*.046,1.339,.135]],.022,.21,kind='upper',roll=.15*side,samples=41)
    blade(f'Face framing long bang {side}',[
        [side*.051,1.566,.068],
        [side*.078,1.558,.111],
        [side*.089,1.469,.150],
        [side*.092,1.367,.149],
        [side*.102,1.321,.114]],.031,.15,kind='strand',roll=.17*side,samples=45)
    blade(f'Outer long cheek curtain {side}',[
        [side*.078,1.55,.044],
        [side*.103,1.511,.100],
        [side*.112,1.435,.113],
        [side*.117,1.362,.106],
        [side*.111,1.345,.092]],.025,.17,kind='shadow',roll=.09*side,samples=39)
    blade(f'Temple ribbon {side}',[
        [side*.086,1.528,.025],
        [side*.117,1.486,.052],
        [side*.127,1.393,.052],
        [side*.123,1.342,.027]],.020,.23,kind='strand',samples=31)
    # Inward split at forehead; forehead plate stays visible.
    blade(f'Fine inward fringe {side}',[
        [side*.024,1.564,.069],
        [side*.033,1.516,.137],
        [side*.042,1.440,.153],
        [side*.046,1.400,.146]],.010,.16,kind='upper',samples=29)

# Lower nape. Distinct pointed locks form the back silhouette under the tie.
for rank in range(2):
 for i in range(12):
    u=(i-5.5)/5.5
    blade(f'Nape point rank {rank} {i}',[
       [u*.079,1.482-.013*rank,-.058],
       [u*.106,1.428-.025*rank,-.104],
       [u*.125,1.374-.025*rank,-.123],
       [u*.118,1.331-.038*rank,-.135]],
       .0155-.002*rank,.19,kind='shadow' if (i+rank)%3 else 'strand',
       samples=27)

# Textured indigo forehead wrap, continuous with the side/back tied strips.
strip('Full indigo forehead band',1.410,.104,.045,.105,'band')
# Wrapped fabric across temple, overlapping nape.
strip('Secondary folded band',1.384,.106,.012,.108,'bandLight')

# The reference plate is a rectangular softly rounded metal strip above eyes.
plate=trimesh.creation.box(extents=[.145,.051,.007])
plate.vertices+=np.array([0,1.418,.149])
add('Single silver forehead protector',plate.vertices,plate.faces,'steel')
# Raised raised dark edging and corner rivets, separate game mesh parts.
for y in [1.394,1.442]:
  pipe('Forehead plate edge',[[-.068,y,.155],[0,y,.156],[.068,y,.155]],.0016,'ink',20)
for side in [-1,1]:
  for y in [1.397,1.439]:
    ellipsoid(f'Plate rivet {side} {y}',[side*.062,y,.157],[.003,.003,.0025],'ink',2)
# Embossed leaf-like spiral insignia.
curve=[]
for j in range(49):
    t=j/48
    theta=2.55*np.pi*t+1.1
    r=.001+.022*t
    curve.append([r*np.cos(theta),1.418+r*np.sin(theta),.1587])
pipe('Engraved plate spiral',curve,.002,'ink',44,8)
pipe('Leaf spiral tail',[[.006,1.409,.159],[-.013,1.392,.160],[-.023,1.411,.160]],.0021,'ink',16)

# Back tied fabric across hair and two broad falling bow-like ribbons.
ellipsoid('Rear tie knot',[0,1.415,-.126],[.021,.021,.017],'bandLight',3)
for side in [-1,1]:
    blade(f'Tied back cloth tail {side}',[
        [side*.005,1.414,-.133],
        [side*.034,1.404,-.162],
        [side*.071,1.365,-.176],
        [side*.091,1.314,-.192]],.029,.28,kind='bandLight',samples=35)
    blade(f'Folded bow loop {side}',[
        [side*.007,1.418,-.131],
        [side*.035,1.440,-.159],
        [side*.069,1.429,-.184],
        [side*.082,1.406,-.183]],.024,.29,kind='band',samples=30)

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
