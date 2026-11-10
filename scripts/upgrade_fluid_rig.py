#!/usr/bin/env python3
"""Add 10 genuinely weighted deformation helpers to the repaired ninja GLB.
Uses the existing Mixamo hierarchy; keeps face, hair, textures, UVs and seams.
Usage: python scripts/upgrade_fluid_rig.py INPUT.glb OUTPUT.glb
"""
import json,struct,sys,pathlib
import numpy as np

source=pathlib.Path(sys.argv[1]); dest=pathlib.Path(sys.argv[2])
assert source!=dest
raw=source.read_bytes()
assert struct.unpack_from('<4sII',raw)==(b'glTF',2,len(raw))
jsz,typ=struct.unpack_from('<I4s',raw,12)
assert typ==b'JSON'
g=json.loads(raw[20:20+jsz]);off=20+jsz
bsz,typ=struct.unpack_from('<I4s',raw,off)
assert typ==b'BIN\x00'
blob=bytearray(raw[off+8:off+8+bsz])
skin=g['skins'][0];pr=g['meshes'][0]['primitives'][0]
def ar(aid):
    a=g['accessors'][aid];v=g['bufferViews'][a['bufferView']]
    w={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    dt={5126:np.float32,5121:np.uint8,5123:np.uint16}[a['componentType']]
    stride=v.get('byteStride',w*np.dtype(dt).itemsize)
    return np.ndarray((a['count'],w),dtype=dt,buffer=blob,
         offset=v.get('byteOffset',0)+a.get('byteOffset',0),
         strides=(stride,np.dtype(dt).itemsize))
xyz=ar(pr['attributes']['POSITION'])
joints=ar(pr['attributes']['JOINTS_0'])
weights=ar(pr['attributes']['WEIGHTS_0'])
assert joints.dtype==np.uint8 and weights.dtype==np.float32
base_joints=list(skin['joints'])
indices={g['nodes'][j]['name']:i for i,j in enumerate(base_joints)}
ibm=[x.reshape((4,4),order='F').copy()
     for x in ar(skin['inverseBindMatrices'])]
specs=[
 ('LeftUpperArmSoft','LeftArm','LeftForeArm',.38),
 ('RightUpperArmSoft','RightArm','RightForeArm',.38),
 ('LeftForeArmTwist','LeftForeArm','LeftHand',.32),
 ('RightForeArmTwist','RightForeArm','RightHand',.32),
 ('LeftThighSoft','LeftUpLeg','LeftLeg',.34),
 ('RightThighSoft','RightUpLeg','RightLeg',.34),
 ('LeftCalfTwist','LeftLeg','LeftFoot',.29),
 ('RightCalfTwist','RightLeg','RightFoot',.29),
 ('ChestBreath','Spine1','Spine2',.24),
 ('NeckFollow','Neck','Head',.22)]
counts={}
for helper,base,tip,strength in specs:
    parent_joint=indices['mixamorig:'+base]
    parent_node=base_joints[parent_joint]
    child_node=base_joints[indices['mixamorig:'+tip]]
    assert child_node in g['nodes'][parent_node].get('children',[])
    local=np.array(g['nodes'][child_node].get('translation',[0,0,0]),float)
    midpoint=local*.58
    new_node=len(g['nodes'])
    g['nodes'].append({'name':'UO_'+helper,'translation':midpoint.tolist(),
                       'rotation':[0,0,0,1]})
    g['nodes'][parent_node].setdefault('children',[]).append(new_node)
    invt=np.eye(4);invt[:3,3]=-midpoint
    inverse=invt@ibm[parent_joint]
    new_joint=len(skin['joints'])
    skin['joints'].append(new_node);ibm.append(inverse)
    bind=np.linalg.inv(ibm[parent_joint])
    start=bind[:3,3];end=(bind@np.r_[local,1])[:3]
    axis=end-start;den=max(float(axis@axis),1e-10)
    t=np.clip(((xyz.astype(float)-start)@axis)/den,-.5,1.5)
    entering=np.clip((t-.16)/.46,0,1)
    entering=entering**2*(3-2*entering)
    leaving=np.clip((1.17-t)/.30,0,1)
    leaving=leaving**2*(3-2*leaving)
    influence=entering*leaving*strength
    count=0
    for vi in np.where(influence>.002)[0]:
        sources=np.flatnonzero(joints[vi]==parent_joint)
        if not len(sources):continue
        slot=max(sources,key=lambda k:weights[vi,k])
        parent_weight=float(weights[vi,slot])
        if parent_weight<.16:continue
        portion=float(influence[vi])*parent_weight
        if portion<.003:continue
        empties=np.flatnonzero(weights[vi]<1e-5)
        if len(empties):
            target=int(empties[0]);extra=0.
        else:
            alternatives=[k for k in range(4) if k!=slot]
            target=min(alternatives,key=lambda k:weights[vi,k])
            if weights[vi,target]>.075:continue
            extra=float(weights[vi,target])
        joints[vi,target]=new_joint
        weights[vi,target]=portion+extra
        weights[vi,slot]=parent_weight-portion
        weights[vi]/=float(weights[vi].sum())
        count+=1
    assert count>12,(helper,count)
    counts[helper]=count
assert len(skin['joints'])==len(base_joints)+10==44
assert int(joints.max())<44
assert np.allclose(weights.sum(axis=1),1,atol=1e-3)
while len(blob)%4:blob.append(0)
base=len(blob)
mats=np.stack([m.flatten(order='F') for m in ibm]).astype('<f4')
blob.extend(mats.tobytes())
view=len(g['bufferViews'])
g['bufferViews'].append({'buffer':0,'byteOffset':base,'byteLength':mats.nbytes})
accessor=len(g['accessors'])
g['accessors'].append({'bufferView':view,'componentType':5126,
                       'count':len(skin['joints']),'type':'MAT4'})
skin['inverseBindMatrices']=accessor
g['buffers'][0]['byteLength']=len(blob)
j=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode()
j+=b' '*((-len(j))%4)
blob+=b'\0'*((-len(blob))%4)
total=12+8+len(j)+8+len(blob)
dest.parent.mkdir(parents=True,exist_ok=True)
with dest.open('wb') as f:
    f.write(struct.pack('<4sII',b'glTF',2,total))
    f.write(struct.pack('<I4s',len(j),b'JSON'));f.write(j)
    f.write(struct.pack('<I4s',len(blob),b'BIN\x00'));f.write(blob)
assert struct.unpack_from('<4sII',dest.read_bytes())==(b'glTF',2,dest.stat().st_size)
print('FLUID RIG ADDED',json.dumps({'old_joint_count':len(base_joints),
    'new_joint_count':len(skin['joints']),'weighted_helper_vertices':counts,
    'bytes':dest.stat().st_size}))
