"""Separate and refine the avatar's actual layered hair mesh, retaining its UVs.
No primitive clumps or volume guide generation. Source GLB remains untouched.
"""
import json,struct,io,hashlib,sys
from pathlib import Path
import numpy as np
from PIL import Image
raw=Path('assets/reference-rig-fluid.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);blob=raw[28+n:]
def ar(idx):
 a=g['accessors'][idx];v=g['bufferViews'][a['bufferView']];dt={5126:np.float32,5123:np.uint16,5125:np.uint32,5121:np.uint8}[a['componentType']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
 return np.ndarray((a['count'],w),dtype=dt,buffer=blob,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',w*np.dtype(dt).itemsize),np.dtype(dt).itemsize))
p=g['meshes'][0]['primitives'][0];xyz=ar(p['attributes']['POSITION']);uv=ar(p['attributes']['TEXCOORD_0']);normal=ar(p['attributes']['NORMAL']);idx=ar(p['indices']).ravel().reshape(-1,3)
v=g['bufferViews'][g['images'][0]['bufferView']];imageBytes=blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];image=np.array(Image.open(io.BytesIO(imageBytes)).convert('RGB'));h,w=image.shape[:2]
c=image[np.clip((uv[:,1]*h).astype(int),0,h-1),np.clip((uv[:,0]*w).astype(int),0,w-1)].astype(float);dark=c.mean(1)<120
x,y,z=xyz.T
face=(z>.025)&(z<.142)&(abs(x)<.080)&(y>1.20)&(y<1.399)
ear=(abs(x)>.084)&(y>1.315)&(y<1.455)&(z>-.016)&(z<.077)&~dark
neck=(y<1.3)&(abs(x)<.065)&(z>-.075)
hair=(y>1.46)|((y>1.30)&(z<-.055))|((y>1.25)&(z<-.08))|((y>1.27)&(abs(x)>.083)&(z<0)&dark)|((y>1.23)&(abs(x)>.065)&(z>.06)&dark)
hair&=~face&~ear&~neck
remove=(hair[idx].sum(1)>=2)&(y[idx].min(1)>1.20)&~face[idx].any(1)&~ear[idx].any(1)
# Keep the exact shared boundary vertices so the fitted piece meets the skin.
faces=idx[remove];ids=np.unique(faces);remap=np.full(len(xyz),-1,dtype=int);remap[ids]=np.arange(len(ids));faces=remap[faces].astype('u2');verts=xyz[ids].copy();normals=normal[ids].copy()
# Lay the existing crown's higher points back, rather than making a tall crest.
t=np.clip((verts[:,1]-1.48)/.14,0,1);verts[:,1]-=t*.043;verts[:,2]-=t*.035
# Repair painted skin-colored gaps on the hair with local vertex tinting.
# The face/body texture itself is never edited.
texcoords=uv[ids].copy();colors=np.ones((len(verts),3),dtype=np.float32)
sourceColor=c[ids]/255.0
paintedSkin=((sourceColor[:,0]>sourceColor[:,2]*1.15)&(sourceColor[:,0]>sourceColor[:,1]*1.1)&(sourceColor.mean(1)>.18))|(sourceColor.mean(1)>.48)
colors[paintedSkin]=np.minimum(1,np.array([.018,.023,.038])/np.maximum(sourceColor[paintedSkin]**2.2,.001))
# A close-fitting rear scalp shell fills real openings between existing locks.
# It is not a replacement hair mass; the original layered surfaces stay outside.
darkIds=np.flatnonzero((c[ids].mean(1)<75)&(c[ids][:,2]>=c[ids][:,0]*.8))
capUV=texcoords[darkIds[np.argmin(np.linalg.norm(c[ids][darkIds]-np.array([22,27,38]),axis=1))]]
blueIds=np.flatnonzero((c[ids][:,2]>c[ids][:,0]*1.25)&(verts[:,2]<-.08))
bowUV=texcoords[blueIds[np.argmin(np.linalg.norm(c[ids][blueIds]-np.array([30,46,89]),axis=1))]] if len(blueIds) else capUV
extraV=[];extraN=[];extraUV=[];extraF=[]
def shell(center,radii,latitudes,longitudes,thetaMax,alphaStart,alphaEnd,uvTile):
 offset=len(verts)+len(extraV)
 for i in range(latitudes+1):
  theta=thetaMax*i/latitudes
  for j in range(longitudes+1):
   alpha=alphaStart+(alphaEnd-alphaStart)*j/longitudes
   q=np.array([np.sin(theta)*np.sin(alpha),np.cos(theta),np.sin(theta)*np.cos(alpha)])
   extraV.append(np.array(center)+q*np.array(radii));n=q/np.array(radii);extraN.append(n/np.linalg.norm(n));extraUV.append(uvTile)
 for i in range(latitudes):
  for j in range(longitudes):
   a=offset+i*(longitudes+1)+j;b=a+1;d=a+longitudes+1;e=d+1;extraF.extend([[a,d,b],[b,d,e]])
shell([0,1.4,.005],[.089,.115,.12],18,40,np.pi*.66,np.pi/2,np.pi*1.5,capUV)
shell([0,1.397,-.146],[.019,.018,.011],12,20,np.pi,0,np.pi*2,bowUV)
verts=np.concatenate([verts,np.asarray(extraV,dtype='f4')]);normals=np.concatenate([normals,np.asarray(extraN,dtype='f4')]);texcoords=np.concatenate([texcoords,np.asarray(extraUV,dtype='f4')]);colors=np.concatenate([colors,np.ones((len(extraV),3),dtype='f4')]);faces=np.concatenate([faces,np.asarray(extraF,dtype='u2')])
accessors=[];views=[];outblob=bytearray()
def add(vals,typ,component=5126):
 while len(outblob)%4:outblob.append(0)
 off=len(outblob);outblob.extend(vals.tobytes());vi=len(views);views.append({'buffer':0,'byteOffset':off,'byteLength':vals.nbytes});ai=len(accessors);a={'bufferView':vi,'componentType':component,'count':len(vals),'type':typ}
 if typ=='VEC3':a.update(min=vals.min(0).astype(float).tolist(),max=vals.max(0).astype(float).tolist())
 accessors.append(a);return ai
pos=add(verts.astype('f4'),'VEC3');nor=add(normals.astype('f4'),'VEC3');tex=add(texcoords.astype('f4'),'VEC2');color=add(colors.astype('f4'),'VEC3');indices=add(faces.ravel(),'SCALAR',5123)
while len(outblob)%4:outblob.append(0)
embed='--embed-texture' in sys.argv
imageView=None
if embed:
 off=len(outblob);outblob.extend(imageBytes);imageView=len(views);views.append({'buffer':0,'byteOffset':off,'byteLength':len(imageBytes)})
# A single fitted metal plate replaces the visibly blurred source artwork.
# It follows the measured forehead surface, and sits just in front of it.
def plateZ(x):return .141-5.7*x*x
pv=[];pn=[];pf=[];NX=24;NY=8
for depth in [0,-.003]:
 for row in range(NY+1):
  yy=1.347+.05*row/NY;dy=abs(yy-1.372)
  xmax=.07 if dy<=.018 else .063+np.sqrt(max(0,.007**2-(dy-.018)**2))
  for col in range(NX+1):
   xx=-xmax+2*xmax*col/NX;pv.append([xx,yy,plateZ(xx)+depth]);nn=np.array([11.4*xx,0,1]);pn.append(nn/np.linalg.norm(nn)*(1 if depth==0 else -1))
layer=(NX+1)*(NY+1)
for row in range(NY):
 for col in range(NX):
  a=row*(NX+1)+col;b=a+1;d=a+NX+1;e=d+1
  pf.extend([[a,b,d],[b,e,d],[a+layer,d+layer,b+layer],[b+layer,d+layer,e+layer]])
edge=list(range(NX+1))+[r*(NX+1)+NX for r in range(1,NY+1)]+[NY*(NX+1)+c for c in range(NX-1,-1,-1)]+[r*(NX+1) for r in range(NY-1,0,-1)]
for i,a in enumerate(edge):b=edge[(i+1)%len(edge)];pf.extend([[a,a+layer,b],[b,a+layer,b+layer]])
metalPos=add(np.asarray(pv,dtype='f4'),'VEC3');metalNormal=add(np.asarray(pn,dtype='f4'),'VEC3');metalIndices=add(np.asarray(pf,dtype='u2').ravel(),'SCALAR',5123)
# Dimensional dark engraving and six rivet heads, not a second forehead wrap.
gv=[];gn=[];gf=[]
def stroke(points,radius):
 off=len(gv)
 for i,(x0,y0) in enumerate(points):
  tangent=np.array(points[min(len(points)-1,i+1)])-np.array(points[max(0,i-1)])
  across=np.array([-tangent[1],tangent[0]]);across/=np.linalg.norm(across)+1e-12
  for sign in [-1,1]:
   xx,yy=np.array([x0,y0])+sign*radius*across;gv.append([xx,yy,plateZ(xx)+.0016]);gn.append([0,0,1])
 for i in range(len(points)-1):a=off+i*2;gf.extend([[a,a+1,a+2],[a+1,a+3,a+2]])
spiral=[]
for i in range(81):
 t=i/80;a=t*np.pi*2.5;r=.001+.011*t;spiral.append((-.002+r*np.cos(a),1.371+r*np.sin(a)))
stroke(spiral,.00125);stroke([spiral[-1],(.016,1.393),(.011,1.379)],.00125);stroke([(-.013,1.370),(-.023,1.355),(-.006,1.355)],.00125)
for xx in [-.059,.059]:
 for yy in [1.360,1.372,1.384]:
  # Small dark rivet discs.
  off=len(gv);gv.append([xx,yy,plateZ(xx)+.0018]);gn.append([0,0,1])
  for j in range(12):a=j*np.pi/6;gv.append([xx+.0017*np.cos(a),yy+.0017*np.sin(a),plateZ(xx)+.0018]);gn.append([0,0,1])
  for j in range(12):gf.append([off,off+1+j,off+1+(j+1)%12])
glyphPos=add(np.asarray(gv,dtype='f4'),'VEC3');glyphNormal=add(np.asarray(gn,dtype='f4'),'VEC3');glyphIndices=add(np.asarray(gf,dtype='u2').ravel(),'SCALAR',5123)
out={'asset':{'version':'2.0','generator':'Urban Outlaws original sculpt hair extraction'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Reference Sculpt Hair','mesh':0}],'meshes':[{'name':'Reference Sculpt Hair','primitives':[{'attributes':{'POSITION':pos,'NORMAL':nor,'TEXCOORD_0':tex,'COLOR_0':color},'indices':indices,'material':0}]}],'materials':[{'name':'REFERENCE SCULPT HAIR','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'roughnessFactor':.70,'metallicFactor':0,'baseColorFactor':[.85,.90,1,1]},'doubleSided':True}],'textures':[{'source':0}],'images':[{'bufferView':imageView,'mimeType':'image/webp'}],'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(outblob)}]}
if not embed:
 del out['textures'];del out['images'];out['materials'][0]['pbrMetallicRoughness'].pop('baseColorTexture')
out['meshes'][0]['primitives'].extend([
 {'attributes':{'POSITION':metalPos,'NORMAL':metalNormal},'indices':metalIndices,'material':1},
 {'attributes':{'POSITION':glyphPos,'NORMAL':glyphNormal},'indices':glyphIndices,'material':2}])
out['materials'].extend([
 {'name':'REFERENCE FOREHEAD METAL','pbrMetallicRoughness':{'baseColorFactor':[.53,.57,.63,1],'roughnessFactor':.45,'metallicFactor':.72},'doubleSided':True},
 {'name':'REFERENCE LEAF ENGRAVING','pbrMetallicRoughness':{'baseColorFactor':[.006,.008,.012,1],'roughnessFactor':.8,'metallicFactor':0},'doubleSided':True}])
j=json.dumps(out,separators=(',',':')).encode();j+=b' '*((-len(j))%4);outblob+=b'\0'*((-len(outblob))%4);glb=struct.pack('<4sII',b'glTF',2,28+len(j)+len(outblob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(outblob),b'BIN\0')+outblob;Path('assets/reference-sculpt-hair-v8.glb').write_bytes(glb)
def ranges(bits):
 output=[]
 for i in np.flatnonzero(bits):
  i=int(i)
  if output and output[-1][0]+output[-1][1]==i:output[-1][1]+=1
  else:output.append([i,1])
 return output
cleanup={'version':1,'sourceSha256':hashlib.sha256(raw).hexdigest(),'vertexCount':len(xyz),'triangleCount':len(idx),'vertices':ranges(hair),'triangles':ranges(remove),'removedTriangles':int(remove.sum()),'protectedFaceVertices':int(face.sum())}
Path('assets/legacy-hair-cleanup.json').write_text(json.dumps(cleanup,separators=(',',':')))
print('Separated',len(faces),'hair triangles;',len(ids),'vertices; asset',len(glb),'bytes; bounds',verts.min(0),verts.max(0))
