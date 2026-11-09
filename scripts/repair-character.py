"""Repair the v0.5 GLB, preserving the source artwork and animated part names.
Usage: python scripts/repair-character.py path/to/original.glb output.glb
"""
import json, math, struct, sys
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes()
n=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+n]); data=bytearray(raw[n+28:])
def material(name,color):
    doc['materials'].append({'name':name,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[*color,1],'metallicFactor':0,'roughnessFactor':.92}})
    return len(doc['materials'])-1
navy=material('Continuous navy cloth', [.025,.045,.115])
wrap=material('Ivory bandage cloth',[.65,.64,.60])
shorts=material('Light gray shorts',[.49,.49,.48])
skin=5; hair=3
seen=set()
for node in doc['nodes']:
    name=node.get('name','')
    if 'mesh' not in node: continue
    # The fifth sector was an exact duplicate of the first, causing z-fighting.
    if '_sector4_' in name:
        del node['mesh'];continue
    p=doc['meshes'][node['mesh']]['primitives'][0]
    part=name.split('_sector')[0]
    solid=None
    if 'HairCap' in part or 'Bang' in part: solid=hair
    elif any(s in part for s in ['Sleeve','NavySandal','HeadbandTail']): solid=navy
    elif 'Forearm' in part or 'WrappedShin' in part: solid=wrap
    elif any(s in part for s in ['Hand','Finger','BareKnee','Toe']): solid=skin
    elif '_side' in name:
        solid= shorts if any(s in part for s in ['Short','Waist']) else skin if 'Face' in part else navy
    if solid is not None: p['material']=solid
    # Rear source is off-center within its crop (300/478, not 0.51).
    if '_back' in name and 'TEXCOORD_0' in p['attributes'] and solid is None:
        a=doc['accessors'][p['attributes']['TEXCOORD_0']];v=doc['bufferViews'][a['bufferView']];off=v.get('byteOffset',0)+a.get('byteOffset',0)
        for i in range(a['count']):
            u,w=struct.unpack_from('<ff',data,off+i*8);struct.pack_into('<ff',data,off+i*8,min(.99,u+.115),w)
    ai=p['attributes']['POSITION']
    if ai in seen:continue
    seen.add(ai);a=doc['accessors'][ai];v=doc['bufferViews'][a['bufferView']];off=v.get('byteOffset',0)+a.get('byteOffset',0)
    points=[]
    for i in range(a['count']):
        x,y,z=struct.unpack_from('<fff',data,off+i*12)
        # Widen the silhouette, especially the undersized head; retain height.
        x*=1.42 if name.startswith('HEAD_') else 1.18
        z*=1.25
        points.append((x,y,z));struct.pack_into('<fff',data,off+i*12,x,y,z)
    a['min']=[min(p[k] for p in points) for k in range(3)];a['max']=[max(p[k] for p in points) for k in range(3)]
doc['asset']['generator']='Urban Outlaw character repair (scripts/repair-character.py)'
s=json.dumps(doc,separators=(',',':')).encode();s+=b' '*((-len(s))%4)
data+=b'\0'*((-len(data))%4)
out=struct.pack('<III',0x46546c67,2,28+len(s)+len(data))+struct.pack('<II',len(s),0x4e4f534a)+s+struct.pack('<II',len(data),0x004e4942)+data
Path(sys.argv[2]).write_bytes(out)
