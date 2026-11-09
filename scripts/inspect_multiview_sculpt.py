import io, urllib.request, numpy as np, trimesh
url='https://api.thrixel.com/api/v1/6071cd8a-fe6e-4f70-ae10-fc051c7f14ad/download?format=glb&textures=webp&draco=false&quality=full'
raw=urllib.request.urlopen(url,timeout=180).read()
scene=trimesh.load(io.BytesIO(raw),file_type='glb',force='scene')
mesh=trimesh.util.concatenate([m for m in scene.geometry.values()])
print("Input bounds",mesh.bounds,"faces",len(mesh.faces),"vertices",len(mesh.vertices))
components=mesh.split(only_watertight=False)
print("Connected components:",len(components))
for c in sorted(components,key=lambda x:len(x.faces),reverse=True)[:30]:
 print("component",len(c.faces),"center",np.round(c.centroid,3),"bounds",np.round(c.bounds,3))
cent=mesh.triangles_center
h,bins=np.histogram(cent[:,0],bins=44)
print("X histogram",list(zip(np.round(bins[:-1],2),h)))
