#!/usr/bin/env python3
"""Diagnose unintended geometry bridges between hands and thighs in a rigged GLB.
Read-only: computes skin-weight ownership, edge interfaces, component sizes.
"""
import struct,json,collections,sys,math
p=sys.argv[1] if len(sys.argv)>1 else 'assets/reference-rig.glb'
b=open(p,'rb').read()
magic,version,length=struct.unpack_from('<4sII',b)
assert magic==b'glTF' and length==len(b)
json_size, typ=struct.unpack_from('<I4s',b,12)
g=json.loads(b[20:20+json_size]);pos=20+json_size
bin_size,typ=struct.unpack_from('<I4s',b,pos)
assert typ==b'BIN\x00'
bin_data=memoryview(b)[pos+8:pos+8+bin_size]
print("meshes",len(g['meshes']),"skins",len(g.get('skins',[])),"nodes",len(g['nodes']))
bone_names=[g['nodes'][n].get('name','') for n in g['skins'][0]['joints']]
print("BONES",[(i,n) for i,n in enumerate(bone_names)])
def accessor(index):
    a=g['accessors'][index]
    view=g['bufferViews'][a['bufferView']]
    offset=view.get('byteOffset',0)+a.get('byteOffset',0)
    count=a['count']; typ=a['type']; comp=a['componentType']
    dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[typ]
    fmt,bs={5126:('f',4),5125:('I',4),5123:('H',2),5121:('B',1)}[comp]
    stride=view.get('byteStride',dims*bs)
    out=[]
    for i in range(count):
        out.append(struct.unpack_from('<'+fmt*dims,bin_data,offset+i*stride))
    if a.get('normalized') and comp==5121:
        out=[tuple(v/255 for v in row) for row in out]
    if a.get('normalized') and comp==5123:
        out=[tuple(v/65535 for v in row) for row in out]
    return out
def cat(name):
    n=name.lower()
    if 'hand' in n or 'finger' in n or any(t in n for t in ['bone_10','bone_11','bone_12','bone_13','bone_14','bone_15','bone_20','bone_21','bone_22','bone_23','bone_24','bone_25']):return 'HAND'
    if 'forearm' in n:return 'FOREARM'
    if 'arm' in n or 'shoulder' in n:return 'ARM'
    if 'upleg' in n or 'thigh' in n:return 'THIGH'
    if 'leg' in n or 'foot' in n or 'toe' in n:return 'LEG'
    if 'hips' in n or 'pelvis' in n:return 'HIP'
    return 'TORSO'
groups=[cat(n) for n in bone_names]
print("CLASSES",collections.Counter(groups))
for mesh in g['meshes']:
 for prim in mesh['primitives']:
    attrs=prim['attributes'];print('ATTRS',list(attrs.keys()),'mode',prim.get('mode',4))
    if not {'POSITION','JOINTS_0','WEIGHTS_0'}.issubset(attrs):continue
    xyz=accessor(attrs['POSITION']);js=accessor(attrs['JOINTS_0']);ws=accessor(attrs['WEIGHTS_0'])
    indices=[int(v[0]) for v in accessor(prim['indices'])] if 'indices' in prim else list(range(len(xyz)))
    dominant=[]; scores=[]; counts=collections.Counter()
    for i,(bone_ids,weights) in enumerate(zip(js,ws)):
        d=collections.defaultdict(float)
        for k,v in zip(bone_ids,weights):
            if int(k)<len(groups):d[groups[int(k)]]+=float(v)
        item=max(d,key=d.get);dominant.append(item);scores.append(d);counts[item]+=1
    print("VERTEX OWNERSHIP",dict(counts),"vertex_total",len(xyz),"face_count",len(indices)//3)
    print('BBOX',tuple((round(min(x[k] for x in xyz),4),round(max(x[k] for x in xyz),4)) for k in range(3)))
    bridges=[];f_pairs=collections.Counter(); sensitive=[]
    for f in range(0,len(indices),3):
        inds=indices[f:f+3]
        cls={dominant[i] for i in inds}
        if 'HAND' in cls and cls.intersection({'HIP','THIGH','LEG'}):
            center=tuple(sum(xyz[i][k] for i in inds)/3 for k in range(3))
            bridges.append((f//3,center,tuple(sorted(cls)),tuple(inds)))
        if 'HAND' in cls and 'FOREARM' in cls: f_pairs['HAND/FOREARM']+=1
        if 'HAND' in cls and 'HIP' in cls:f_pairs['HAND/HIP']+=1
        if 'HAND' in cls and 'THIGH' in cls:f_pairs['HAND/THIGH']+=1
        if 'HAND' in cls and 'LEG' in cls:f_pairs['HAND/LEG']+=1
        if cls.intersection({'HAND','FOREARM'}) and cls.intersection({'HIP','THIGH','LEG'}):
            center=tuple(sum(xyz[i][k] for i in inds)/3 for k in range(3))
            sensitive.append((f//3,center,tuple(sorted(cls)),tuple(inds)))
    print("BRIDGE_FACES_HAND_LEG",len(bridges),"INTERFACE_COUNTS",dict(f_pairs),"HAND/FOREARM_TO_LOWER",len(sensitive))
    print('SAMPLES',bridges[:15])
    print('SENSITIVE SAMPLES',sensitive[:15])
    print("HAND VERTEX RANGE",[(k,round(min(x[j] for i,x in enumerate(xyz) if dominant[i]=='HAND'),3),round(max(x[j] for i,x in enumerate(xyz) if dominant[i]=='HAND'),3)) for j,k in enumerate('XYZ')] if counts['HAND'] else [])
