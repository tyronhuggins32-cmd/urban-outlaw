"""Urban Outlaw playable ninja mesh refinement (no paid assets).
Usage: python scripts/upgrade_character.py [input.glb] [output.glb]
Z-up glTF model, -Y forward. Output remains compatible with Three.js game importer.
"""
from pathlib import Path
import sys, math
import numpy as np
import trimesh

SOURCE=Path(sys.argv[1] if len(sys.argv)>1 else 'assets/ninja-character.glb')
OUTPUT=Path(sys.argv[2] if len(sys.argv)>2 else 'assets/ninja-character.glb')
scene=trimesh.load(str(SOURCE),force='scene')
assert len(scene.geometry)>25, 'Expected the existing textured ninja GLB'
original_faces=sum(len(g.faces) for g in scene.geometry.values())

replacements={'shirt_sleeve','shorts'}
result=trimesh.Scene()
for name,geometry in scene.geometry.items():
    if name in replacements: continue
    mesh=geometry.copy()
    if name.startswith('hair'):
        v=mesh.vertices.copy()
        mask=(v[:,2]>1.64)&(v[:,1]>.13)
        v[mask,1]=.13+(v[mask,1]-.13)*.88
        crown=v[:,2]>1.73
        v[crown,2]=1.73+(v[crown,2]-1.73)*.42
        v[crown,1]+=.015
        mesh.vertices=v
    if name=='skin_light':
        centroids=mesh.triangles_center
        knees=(centroids[:,2]>.478)&(centroids[:,2]<.540)&(np.abs(centroids[:,0])>.050)&(np.abs(centroids[:,0])<.165)
        mesh.update_faces(~knees)
        mesh.remove_unreferenced_vertices()
    if name=='shorts_lit':
        centroids=mesh.triangles_center
        waistband=(centroids[:,2]>.865)&(centroids[:,2]<.930)
        mesh.update_faces(~waistband)
        mesh.remove_unreferenced_vertices()
    result.add_geometry(mesh,geom_name=name,node_name=name)

def mat(name,color,roughness=.95):
    return trimesh.visual.material.PBRMaterial(name=name,
        baseColorFactor=np.array((*color,255))/255.0,
        metallicFactor=0.0,roughnessFactor=roughness,doubleSided=True)

fabric=mat('indigo_cotton_soft_folds',(37,46,88))
cuff=mat('indigo_hem_stitch',(25,31,62))
soft_shorts=mat('stone_cotton_short_folds',(189,191,202))
soft_stitch=mat('short_hem_stitch',(151,154,165))
hair_matte=mat('individual_hair_strands',(26,34,57),.70)

def curved_shell(stations,material,tag,azimuth=48,sub=8,seed=0,relief=.012):
    from scipy.interpolate import CubicSpline
    st=np.array(stations,dtype=float)
    t=np.arange(len(st)); fine=np.linspace(0,len(st)-1,(len(st)-1)*sub+1)
    sm=np.stack([CubicSpline(t,st[:,k],bc_type='natural')(fine) for k in range(5)],axis=1)
    verts=[];faces=[]
    for k,(cx,cy,z,rx,ry) in enumerate(sm):
        along=k/max(1,len(sm)-1)
        for i in range(azimuth):
            a=2*math.pi*i/azimuth
            fold=(math.sin(a*7+along*7.4+seed)*.55 + math.sin(a*11-along*2.5+seed)*.24 + math.cos(a*3+along*12.5)*.2)
            w=1+relief*fold
            verts.append((cx+rx*math.cos(a)*w,cy+ry*math.sin(a)*w,z+.0025*math.sin(5*a+seed)*along))
    for k in range(len(sm)-1):
        for i in range(azimuth):
            u=k*azimuth+i;v=k*azimuth+(i+1)%azimuth
            faces.extend(((u,v,u+azimuth),(v,v+azimuth,u+azimuth)))
    mesh=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    mesh.visual=trimesh.visual.TextureVisuals(material=material)
    result.add_geometry(mesh,geom_name=tag,node_name=tag)
    return sm

def tube(points,radii,material,tag,sides=9):
    pts=np.asarray(points,dtype=float); verts=[]; faces=[]
    for i,p in enumerate(pts):
        d=pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]
        d=d/(np.linalg.norm(d)+1e-9)
        cross=np.cross(d,[0,1,0]);cross/=np.linalg.norm(cross)+1e-9
        along=np.cross(d,cross)
        for k in range(sides):
            a=2*np.pi*k/sides
            verts.append(p+radii[i]*(math.cos(a)*cross+math.sin(a)*along))
    for i in range(len(pts)-1):
        for k in range(sides):
            u=i*sides+k;v=i*sides+(k+1)%sides
            faces.extend(((u,v,u+sides),(v,v+sides,u+sides)))
    m=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    m.visual=trimesh.visual.TextureVisuals(material=material)
    result.add_geometry(m,geom_name=tag,node_name=tag)

for s in (-1,1):
    curved_shell([
        (s*.166,-.005,1.266,.057,.071),
        (s*.180,-.008,1.246,.063,.076),
        (s*.205,-.011,1.209,.068,.076),
        (s*.225,-.011,1.170,.067,.073),
        (s*.244,-.012,1.121,.058,.068),
    ],fabric,f'soft_sleeve_{s}',seed=2*s,relief=.035)
    for i in range(32):
        a=2*np.pi*i/32; b=2*np.pi*(i+1)/32
        tube([(s*.244+.058*math.cos(a),-.012+.068*math.sin(a),1.124),
              (s*.244+.058*math.cos(b),-.012+.068*math.sin(b),1.124)],
             [.0023,.0023],cuff,f'sleeve_hem_{s}_{i}',5)

for s in (-1,1):
    x=s*.102
    curved_shell([
        (x,-.010,.573,.087,.084),
        (x,-.009,.590,.091,.090),
        (x,-.008,.627,.093,.091),
        (x,-.006,.678,.095,.089),
        (x,-.008,.743,.092,.090),
        (x,-.008,.810,.081,.084),
        (x,-.005,.883,.078,.081),
    ],soft_shorts,f'soft_short_leg_{s}',azimuth=56,sub=7,seed=s*.8,relief=.065)
    for a in np.linspace(0,2*np.pi,18,endpoint=False):
        pts=[]
        for t in np.linspace(0,.14,9):
            pts.append((x+(.090+.002*np.sin(2*t))*np.cos(a+.16*t),
                        -.009+.090*np.sin(a+.16*t),.575+.09*t))
        tube(pts,[.0015+.00035*np.sin(3*t)**2 for t in np.linspace(0,1,9)],soft_stitch,
             f'trouser_fabric_fold_{s}_{a:.2f}',6)
    cuffpts=[(x+.090*math.cos(a),-.008+.088*math.sin(a),.585+.004*math.sin(a*6))
             for a in np.linspace(0,2*np.pi,85)]
    tube(cuffpts,[.0020]*len(cuffpts),soft_stitch,f'short_hem_{s}',6)

curved_shell([(0,.035,.803,.140,.040),(0,.034,.831,.153,.044),
              (0,.033,.883,.168,.051),(0,.030,.909,.144,.048)],
             soft_shorts,'shorts_waist_bridge',azimuth=64,sub=6,relief=.05)

for s in (-1,1):
    for k in range(12):
        phase=k/11
        path=[(s*(.024+.006*k),.060,1.700+.008*(k%3)),
              (s*(.050+.006*k),.109,1.710+.006*(k%3)),
              (s*(.081+.006*k),.151+.012*phase,1.699+.006*(k%3))]
        tube(path,[.0007,.0010,.0002],hair_matte,f'sculpted_hair_strand_{s}_{k}',5)

# Consolidate new microgeometry by material: 40 draw calls, not 166.
source_names=set(scene.geometry)
merged=trimesh.Scene()
for name,geo in result.geometry.items():
    if name in source_names and name not in replacements:
        merged.add_geometry(geo,geom_name=name,node_name=name)
material_parts={}
for name,geo in result.geometry.items():
    if name not in source_names:
        material_parts.setdefault(geo.visual.material.name,[]).append(geo)
for key,parts in material_parts.items():
    united=trimesh.util.concatenate(parts)
    united.visual=trimesh.visual.TextureVisuals(material=parts[0].visual.material)
    merged.add_geometry(united,geom_name='upgrade_'+key,node_name='upgrade_'+key)
result=merged

bounds=result.bounds
assert np.isfinite(bounds).all(), 'Non-finite geometry'
assert .45 < bounds[1,0]-bounds[0,0] < .75, 'Unexpected width'
assert 1.7 < bounds[1,2]-bounds[0,2] < 2.0, 'Unexpected height'
assert any('high_detail_face' in k for k in result.geometry), 'Missing face'
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
OUTPUT.write_bytes(result.export(file_type='glb'))
check=trimesh.load(str(OUTPUT),force='scene')
assert len(check.geometry)>=len(scene.geometry), 'Refined export lost parts'
print(f'Urban Outlaw upgraded GLB: {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)')
print(f'Triangles {original_faces:,} -> {sum(len(g.faces) for g in check.geometry.values()):,}, meshes {len(scene.geometry)} -> {len(check.geometry)}')
print('Bounds',check.bounds)
