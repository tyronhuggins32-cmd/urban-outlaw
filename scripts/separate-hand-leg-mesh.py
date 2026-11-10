#!/usr/bin/env python3
"""Remove accidental HAND-THIGH voxel bridges from the reference-sculpted GLB.

Usage: python3 scripts/separate-hand-leg-mesh.py assets/reference-rig.glb assets/reference-rig-separated.glb
The sculpt, materials, original vertex weights, bone hierarchy and 4 animations are preserved.
Only offending cross-anatomy triangle indices are removed, without reordering vertices.
No third-party dependencies. Built from the immutable original GLB each time.
"""
import json,struct,sys,pathlib,collections,math
src=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'assets/reference-rig.glb')
dst=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else 'assets/reference-rig-separated.glb')
assert src!=dst,"Do not destroy the unmodified reference GLB."
raw=src.read_bytes()
magic,version,total=struct.unpack_from('<4sII',raw,0)
assert magic==b'glTF' and version==2 and total==len(raw)
jsonlen,jsontype=struct.unpack_from('<I4s',raw,12)
assert jsontype==b'JSON'
doc=json.loads(raw[20:20+jsonlen])
bpos=20+jsonlen
blen,btype=struct.unpack_from('<I4s',raw,bpos)
assert btype==b'BIN\x00'
data=bytearray(raw[bpos+8:bpos+8+blen])
assert doc.get('skins') and doc.get('meshes'),"Expected skinned character"
bone_names=[doc['nodes'][i].get('name','').lower() for i in doc['skins'][0]['joints']]
def owner(name):
  if any(x in name for x in ('hand','finger','bone_10','bone_11','bone_12','bone_13','bone_14','bone_15','bone_20','bone_21','bone_22','bone_23','bone_24','bone_25')):return 'HAND'
  if 'forearm' in name:return 'FOREARM'
  if 'upleg' in name:return 'THIGH'
  if any(x in name for x in ('leg','foot','toe')):return 'LEG'
  if any(x in name for x in ('hip','pelvis')):return 'HIP'
  return 'OTHER'
group=[owner(n) for n in bone_names]
formats={5126:('f',4),5125:('I',4),5123:('H',2),5122:('h',2),5121:('B',1),5120:('b',1)}
def read_acc(i):
  a=doc['accessors'][i]; v=doc['bufferViews'][a['bufferView']]
  fmt,sz=formats[a['componentType']]
  width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  stride=v.get('byteStride',width*sz)
  offset=v.get('byteOffset',0)+a.get('byteOffset',0)
  output=[struct.unpack_from('<'+fmt*width,data,offset+k*stride) for k in range(a['count'])]
  if a.get('normalized'):
    divisor={5121:255,5123:65535,5120:127,5122:32767}.get(a['componentType'])
    assert divisor
    output=[tuple(max(-1.0,float(val)/divisor) for val in row) for row in output]
  return output
fixed=0; removed=0; kept=0; audit=[]
for mesh in doc['meshes']:
  for primitive in mesh['primitives']:
    a=primitive.get('attributes',{})
    if not {'POSITION','JOINTS_0','WEIGHTS_0'}.issubset(a) or 'indices' not in primitive:continue
    joints=read_acc(a['JOINTS_0']);weights=read_acc(a['WEIGHTS_0'])
    scores=[]
    for jj,ww in zip(joints,weights):
      totals=collections.defaultdict(float)
      for idx,weight in zip(jj,ww):
        assert int(idx)<len(group)
        totals[group[int(idx)]]+=max(0,float(weight))
      scores.append(max(totals,key=totals.get))
    original=read_acc(primitive['indices'])
    faces=[tuple(int(x[0]) for x in original[k:k+3]) for k in range(0,len(original),3)]
    assert len(faces)>30000
    out=[]
    for face in faces:
      categories={scores[i] for i in face}
      if 'HAND' in categories and categories.intersection({'THIGH','LEG','HIP'}):
        removed+=1
        continue
      out.extend(face)
    if len(out)==len(original):continue
    fixed+=1;kept+=len(out)//3
    # Add an uncompressed uint32 index buffer; glTF skinning, PBR maps and
    # all bind-pose transforms remain byte-for-byte unchanged.
    while len(data)%4:data.append(0)
    offset=len(data)
    data.extend(struct.pack('<'+'I'*len(out),*out))
    view_id=len(doc['bufferViews'])
    doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(out)*4,'target':34963})
    accessor_id=len(doc['accessors'])
    doc['accessors'].append({'bufferView':view_id,'componentType':5125,'count':len(out),
                             'type':'SCALAR','min':[min(out)],'max':[max(out)]})
    primitive['indices']=accessor_id
    audit.append({'mesh':mesh.get('name',''), 'faces_before':len(faces),'faces_after':len(out)//3})
assert fixed==1 and removed>=100, 'Expected one original mesh with hand-thigh bridges'
assert kept>40000, 'Unexpected severe geometry loss'
doc['buffers'][0]['byteLength']=len(data)
j=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf8')
j+=b' '*((-len(j))%4)
data+=b'\0'*((-len(data))%4)
size=12+8+len(j)+8+len(data)
dst.parent.mkdir(parents=True,exist_ok=True)
with dst.open('wb') as f:
  f.write(struct.pack('<4sII',b'glTF',2,size))
  f.write(struct.pack('<I4s',len(j),b'JSON'));f.write(j)
  f.write(struct.pack('<I4s',len(data),b'BIN\x00'));f.write(data)
check=dst.read_bytes()
assert struct.unpack_from('<4sII',check)==(b'glTF',2,len(check))
print("ANATOMY BRIDGE REPAIR",json.dumps({'removed_cross_connected_faces':removed,
      'remaining_faces':kept,'original_faces':kept+removed,'meshes_modified':fixed,
      'skins':len(doc['skins']),'joint_count':len(doc['skins'][0]['joints']),
      'nodes':len(doc['nodes']),'bytes':len(check),'audit':audit}))
