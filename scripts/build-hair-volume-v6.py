#!/usr/bin/env python3
"""V6: single continuous volumetric hair sculpt. Y-up, +Z front.
This completely replaces the V4/V5 tapered tube and ribbon hair generators.
GLB local origin is the original head pivot (0,1.49,0). Original leaf metal
protector remains part of the character so no duplicate plate is generated.
"""
import sys,math,json
from pathlib import Path
import numpy as np
import trimesh
from scipy.ndimage import gaussian_filter
from skimage.measure import marching_cubes
from PIL import Image
from trimesh.visual.material import PBRMaterial

out=Path(sys.argv[1] if len(sys.argv)>1 else 'assets/hair-volume-v6.glb')
out.parent.mkdir(parents=True,exist_ok=True)
step=.0041
lower=np.array([-.193,-.220,-.360])
upper=np.array([.193,.238,.225])
dims=np.ceil((upper-lower)/step).astype(int)+1
field=np.zeros(tuple(dims),bool)

def ball(center,radii):
    center=np.array(center,float);radii=np.array(radii,float)
    lo=np.maximum(np.floor((center-radii-lower)/step).astype(int)-1,0)
    hi=np.minimum(np.ceil((center+radii-lower)/step).astype(int)+2,dims)
    if np.any(lo>=hi):return
    a=(np.arange(lo[0],hi[0])*step+lower[0]-center[0])/radii[0]
    b=(np.arange(lo[1],hi[1])*step+lower[1]-center[1])/radii[1]
    c=(np.arange(lo[2],hi[2])*step+lower[2]-center[2])/radii[2]
    field[lo[0]:hi[0],lo[1]:hi[1],lo[2]:hi[2]] |= \
        a[:,None,None]**2+b[None,:,None]**2+c[None,None,:]**2<=1

def cubic(points,t):
    a,b,c,d=np.asarray(points,float)
    return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d

def sculpt(points,radii):
    # Much denser than a stack of spheres, and blurred into one closed shell.
    for t in np.linspace(0,1,105):
        size=max(.045,(1-t**3)**.53*(.78+.22*np.sin(np.pi*t)))
        ball(cubic(points,t),np.asarray(radii)*size)

# Skull fitting, underlayer and continuous hair volume.
ball([0,.053,-.030],[.102,.104,.112])
ball([0,.098,-.057],[.085,.058,.087])
ball([0,.010,-.069],[.092,.092,.096])

# Seven groups of volume guides, authored for front, side and rear silhouette.
for i in range(5):
    u=(i-2)/2
    targetz=[-.258,-.276,-.285,-.276,-.258][i]
    targety=[.101,.122,.137,.122,.101][i]
    sculpt([[u*.061,.100,-.051],[u*.077,.155,-.098],
            [u*.092,targety+.042,targetz+.065],[u*.112,targety,targetz]],
           [.045,.034,.026])

for i in range(4):
    u=(i-1.5)/1.5
    sculpt([[u*.063,.050,-.068],[u*.085,.063,-.141],
            [u*.114,.051,-.215],[u*.116,.026,-.261]],
           [.028,.024,.014])
for i in range(4):
    u=(i-1.5)/1.5
    sculpt([[u*.035,.102,-.040],[u*.060,.171,-.082],
            [u*.085,.195,-.139],[u*.098,.176-.016*abs(u),-.182]],
           [.030,.022,.017])

# Face-framing curtains with clear forehead parting, not a stiff spike fence.
for side in (-1,1):
    for x,tip,depth,width in [
        (.031,-.096,.118,.027),
        (.072,-.178,.133,.038),
        (.103,-.150,.106,.031)]:
        sculpt([[side*(x-.012),.105,.078],
                [side*(x+.006),.100,.143],
                [side*(x+.013),tip+.100,depth+.025],
                [side*(x+.014),tip,depth]], [width,.023,.015])
    for j in range(2):
        x=.035+.046*j
        sculpt([[side*x,.028,-.073],
                [side*(x+.009),-.026,-.116],
                [side*(x+.013),-.091,-.136],
                [side*(x+.009),-.141-.014*j,-.132]],
               [.023,.023,.014])

# Closed, contiguous hair mesh, not disconnected wedge or tube objects.
smooth=gaussian_filter(field.astype(np.float32),sigma=1.4)
vertices,faces,_,_=marching_cubes(smooth,.5,spacing=(step,step,step))
vertices+=lower
hair=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
hair.remove_unreferenced_vertices();hair.fix_normals()

# Low-sheen cool-black hair fibers with directionally mapped strand highlights.
n=512
u=np.linspace(0,1,n)[None,:]
v=np.linspace(0,1,n)[:,None]
fiber=(.45*np.sin(v*math.tau*62+.30*np.sin(u*12))+
       .18*np.sin(v*math.tau*103+.20*np.cos(u*25))+
       .08*np.sin(v*math.tau*143))
c=np.broadcast_to(np.array([46.,50.,79.]),(n,n,3)).copy()
c+=12*fiber[:,:,None]
c+=np.array([4,5,10])*np.cos(u*math.pi)[...,None]
texture=Image.fromarray(np.uint8(np.clip(c,1,255)),'RGB')
texcoord=np.column_stack([
 (np.arctan2(hair.vertices[:,0],hair.vertices[:,2])/(math.tau)+.5)%1,
 np.clip((hair.vertices[:,1]+.22)/.46,0,1)])
hair.visual=trimesh.visual.TextureVisuals(uv=texcoord,material=PBRMaterial(
 name='URBAN HAIR CONTINUOUS SCULPT',
 baseColorTexture=texture,roughnessFactor=.89,metallicFactor=0,
 doubleSided=True))

def material(name,color):
    return PBRMaterial(name=name,
        baseColorFactor=np.array([*color,255],dtype=np.uint8),
        roughnessFactor=.95,metallicFactor=0,doubleSided=True)
bandmat=material('INDIGO HEADBAND UNDER FRINGE',(28,37,86))
bowmat=material('NAVY HAIR TIE BOW',(39,50,112))

seg=72
vtx=[];idx=[]
for y in [-.065,-.035]:
    for j in range(seg):
        a=j*math.tau/seg
        vtx.append([.110*math.sin(a),y,.104*math.cos(a)])
for j in range(seg):
    a=j;b=(j+1)%seg;d=seg+j;e=seg+(j+1)%seg
    idx.extend([[a,d,b],[b,d,e]])
wrap=trimesh.Trimesh(vertices=vtx,faces=idx,process=False)
wrap.visual=trimesh.visual.TextureVisuals(material=bandmat)

def ribbon(control,width):
    v=[];f=[]
    for i in range(21):
        t=i/20;p=cubic(control,t)
        tangent=cubic(control,min(1,t+.002))-cubic(control,max(0,t-.002))
        tangent/=np.linalg.norm(tangent)+1e-10
        axis=np.array([1.,.22,0]);axis-=tangent*np.dot(axis,tangent)
        axis/=np.linalg.norm(axis)+1e-10
        depth=np.cross(axis,tangent);depth/=np.linalg.norm(depth)+1e-10
        w=width*(.9+.2*np.sin(t*np.pi))*max(.08,1-t**4)
        for a,b in [(-1,-1),(1,-1),(-1,1),(1,1)]:
            v.append(p+a*axis*w+b*depth*.008)
    for k in range(20):
        for a,b in [(0,1),(1,3),(3,2),(2,0)]:
            i=k*4+a;j=k*4+b;z=(k+1)*4+a;q=(k+1)*4+b
            f.extend([[i,z,j],[j,z,q]])
    mesh=trimesh.Trimesh(vertices=v,faces=f,process=False)
    mesh.visual=trimesh.visual.TextureVisuals(material=bowmat)
    return mesh

pieces=[]
for side in [-1,1]:
    pieces.append(ribbon([[side*.007,-.041,-.134],
        [side*.050,-.006,-.180],[side*.075,-.035,-.204],
        [side*.079,-.073,-.179]],.027))
    pieces.append(ribbon([[side*.008,-.052,-.137],
        [side*.037,-.069,-.164],[side*.076,-.123,-.200],
        [side*.099,-.161,-.195]],.021))
bow=trimesh.util.concatenate(pieces)
bow.visual=trimesh.visual.TextureVisuals(material=bowmat)

scene=trimesh.Scene()
for name,mesh in [
 ('Unified Sculpted Hair',hair),('Single Indigo Wrap',wrap),
 ('Tied Navy Bow',bow)]:
    scene.add_geometry(mesh,geom_name=name,node_name=name)
out.write_bytes(scene.export(file_type='glb'))
check=trimesh.load(out,force='scene')
tris=sum(len(m.faces) for m in check.geometry.values())
assert len(check.geometry)==3 and 65000<tris<110000 and out.stat().st_size>500000
print(json.dumps({'output':str(out),'triangles':tris,
 'mesh_groups':len(check.geometry),'bytes':out.stat().st_size,
 'bounds':check.bounds.tolist(),'build':'continuous-volume-v6'}))
