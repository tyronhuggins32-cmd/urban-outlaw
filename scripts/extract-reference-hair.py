"""Separate and refine the avatar's actual layered hair mesh, retaining its UVs.
No primitive clumps or volume guide generation. Source GLB remains untouched.
"""
import json,struct,io,hashlib
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--reference-shape",action="store_true",help="Apply the visibly narrower V10 silhouette and strand normals")
parser.add_argument("--refine",action="store_true",help="Apply the bounded V9 silhouette refinement")
parser.add_argument("--embed-texture",action="store_true",help="Embed source atlas for offline rendering")
parser.add_argument("--out",type=Path,help="Override output GLB path")
args=parser.parse_args()
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
# Refine the accepted source sculpt rather than replacing its layered topology.
# All measurements are in avatar meters; front/skin boundary vertices stay fixed.
if args.refine or args.reference_shape:
 original=verts.copy()
 crown=np.clip((verts[:,1]-1.445)/.11,0,1)
 rear=np.clip((.075-verts[:,2])/.13,0,1)
 sweep=crown*(.35+.65*rear)
 verts[:,1]-=.007*sweep
 verts[:,2]-=.012*sweep
 verts[:,0]*=1-.045*crown*rear
 # Make the broad curtain surfaces less lumpy without rounding their tips.
 geo,inv=np.unique(np.round(verts,6),axis=0,return_inverse=True)
 weldedFaces=inv[faces]
 edges=np.sort(np.concatenate([weldedFaces[:,[0,1]],weldedFaces[:,[1,2]],weldedFaces[:,[2,0]]]),axis=1)
 edges,counts=np.unique(edges,axis=0,return_counts=True)
 boundary=np.zeros(len(geo),bool);boundary[np.unique(edges[counts==1])]=True
 sums=np.zeros_like(geo);degree=np.zeros(len(geo))
 for a,b in [(edges[:,0],edges[:,1]),(edges[:,1],edges[:,0])]:
  np.add.at(sums,a,geo[b]);np.add.at(degree,a,1)
 delta=sums/np.maximum(degree[:,None],1)-geo
 length=np.linalg.norm(delta,axis=1)
 delta*=np.minimum(.22,.0012/np.maximum(length,1e-9))[:,None]
 curtain=(geo[:,2]>.065)&(geo[:,1]>1.28)&(geo[:,1]<1.49)&(abs(geo[:,0])>.065)&~boundary
 verts+=delta[inv]*curtain[inv,None]
 # Lift only the lowest rear nape ends, leaving the face-framing bangs long.
 nape=np.clip((1.325-original[:,1])/.09,0,1)*np.clip((-.055-original[:,2])/.07,0,1)
 verts[:,1]+=.008*nape
 # Retain the original bow sculpt, with a more compact tail spread.
 source=c[ids]/255.0
 cloth=(source[:,2]>source[:,0]*1.4)&(source[:,2]>source[:,1]*1.15)&(source[:,2]>.18)&(original[:,2]<-.13)&(original[:,1]<1.385)
 tail=np.clip((1.385-original[:,1])/.075,0,1)*cloth
 verts[:,0]*=1-.12*tail
 verts[:,1]+=.004*tail
 print('V9 maximum source vertex adjustment:',float(np.linalg.norm(verts-original,axis=1).max()))
if args.reference_shape:
 # A stronger silhouette pass: taper the radial crown into swept layered locks.
 # Keep scalp roots and the face boundary fixed; warp farther-out locks smoothly.
 q=verts.copy()
 crown=np.clip((q[:,1]-1.425)/.10,0,1)
 side=np.clip((abs(q[:,0])-.075)/.09,0,1)
 rear=np.clip((.08-q[:,2])/.15,0,1)
 verts[:,0]*=1-.19*crown-.10*side*rear
 verts[:,1]-=.019*crown*rear
 verts[:,2]-=.024*crown*rear
 # Bow the long curtains around the temples, then bring the ends inward.
 curtain=np.clip((q[:,2]-.045)/.05,0,1)*np.clip((abs(q[:,0])-.060)/.035,0,1)
 lower=np.clip((1.43-q[:,1])/.15,0,1)
 verts[:,0]*=1-.10*curtain*lower
 verts[:,2]+=.010*curtain*np.sin(lower*np.pi)
 # Taper the lower rear locks toward the center of the nape.
 nape=np.clip((1.37-q[:,1])/.12,0,1)*np.clip((-.055-q[:,2])/.065,0,1)
 verts[:,0]*=1-.12*nape
 verts[:,1]+=.010*nape
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
# Directional strand coordinates are separate from the untouched source atlas UVs.
strandTex=None
if args.reference_shape:
 flow=verts.copy();front=np.clip((flow[:,2]+.025)/.12,0,1)
 strandUV=np.stack([flow[:,0]/.004+.18*np.sin((flow[:,1]-1.35)*9),front*flow[:,1]/.24+(1-front)*flow[:,2]/.24],axis=1).astype('f4')
 # Cloth and the inner cap sample the flat corner of the normal texture.
 clothSource=(c[ids][:,2]>c[ids][:,0]*1.3)&(c[ids][:,2]>c[ids][:,1]*1.1)&(c[ids][:,2]>38)
 clothSource|=(verts[:len(ids),2]<-.125)&(verts[:len(ids),1]<1.405)
 strandUV[:len(ids)][clothSource]=[0,0]
 strandUV[len(ids):]=[0,0]
 strandTex=add(strandUV,'VEC2')
pos=add(verts.astype('f4'),'VEC3');nor=add(normals.astype('f4'),'VEC3');tex=add(texcoords.astype('f4'),'VEC2');color=add(colors.astype('f4'),'VEC3');indices=add(faces.ravel(),'SCALAR',5123)
while len(outblob)%4:outblob.append(0)
embed=args.embed_texture
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
out={'asset':{'version':'2.0','generator':'Urban Outlaws original sculpt hair extraction'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Reference Sculpt Hair','mesh':0}],'meshes':[{'name':'Reference Sculpt Hair','primitives':[{'attributes':{'POSITION':pos,'NORMAL':nor,'TEXCOORD_0':tex,'COLOR_0':color},'indices':indices,'material':0}]}],'materials':[{'name':'REFERENCE SCULPT HAIR','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'roughnessFactor':(.60 if args.reference_shape else .66 if args.refine else .70),'metallicFactor':0,'baseColorFactor':([.72,.79,1,1] if args.reference_shape else [.81,.87,1,1] if args.refine else [.85,.90,1,1])},'doubleSided':True}],'textures':[{'source':0}],'images':[{'bufferView':imageView,'mimeType':'image/webp'}],'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(outblob)}]}
if not embed:
 del out['textures'];del out['images'];out['materials'][0]['pbrMetallicRoughness'].pop('baseColorTexture')
if args.reference_shape:
 # Subtle tangent-space grooves: actual material normals, no string geometry.
 size=256;yy,xx=np.mgrid[:size,:size];u=xx/size;v=yy/size
 phase=2*np.pi*(u+.024*np.sin(v*2*np.pi))
 slope=.22*np.cos(phase)+.09*np.cos(phase*3+.4)+.035*np.cos(phase*7)
 ny=.025*np.sin(phase)*np.cos(v*2*np.pi);nz=np.ones_like(slope)
 normalPixels=np.stack([-slope,ny,nz],axis=2);normalPixels/=np.linalg.norm(normalPixels,axis=2)[:,:,None]
 normalPixels=(normalPixels*.5+.5)*255;normalPixels[:5,:5]=[128,128,255];normalPixels[-5:,:5]=[128,128,255];normalPixels[:5,-5:]=[128,128,255];normalPixels[-5:,-5:]=[128,128,255]
 stream=io.BytesIO();Image.fromarray(normalPixels.astype('uint8'),'RGB').save(stream,format='PNG');png=stream.getvalue()
 while len(outblob)%4:outblob.append(0)
 off=len(outblob);outblob.extend(png);vi=len(views);views.append({'buffer':0,'byteOffset':off,'byteLength':len(png)})
 images=out.setdefault('images',[]);imageIndex=len(images);images.append({'bufferView':vi,'mimeType':'image/png'})
 textures=out.setdefault('textures',[]);textureIndex=len(textures);textures.append({'source':imageIndex})
 out['materials'][0]['normalTexture']={'index':textureIndex,'texCoord':1,'scale':.35}
 out['meshes'][0]['primitives'][0]['attributes']['TEXCOORD_1']=strandTex
 out['buffers'][0]['byteLength']=len(outblob)
out['meshes'][0]['primitives'].extend([
 {'attributes':{'POSITION':metalPos,'NORMAL':metalNormal},'indices':metalIndices,'material':1},
 {'attributes':{'POSITION':glyphPos,'NORMAL':glyphNormal},'indices':glyphIndices,'material':2}])
out['materials'].extend([
 {'name':'REFERENCE FOREHEAD METAL','pbrMetallicRoughness':{'baseColorFactor':[.53,.57,.63,1],'roughnessFactor':.45,'metallicFactor':.72},'doubleSided':True},
 {'name':'REFERENCE LEAF ENGRAVING','pbrMetallicRoughness':{'baseColorFactor':[.006,.008,.012,1],'roughnessFactor':.8,'metallicFactor':0},'doubleSided':True}])
j=json.dumps(out,separators=(',',':')).encode();j+=b' '*((-len(j))%4);outblob+=b'\0'*((-len(outblob))%4);glb=struct.pack('<4sII',b'glTF',2,28+len(j)+len(outblob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(outblob),b'BIN\0')+outblob;(args.out or Path('assets/reference-sculpt-hair-v10.glb' if args.reference_shape else 'assets/reference-sculpt-hair-v9.glb' if args.refine else 'assets/reference-sculpt-hair-v8.glb')).write_bytes(glb)
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
