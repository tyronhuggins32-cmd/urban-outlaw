"""Technical shirt-artifact verification. Not a substitute for visual approval."""
from pathlib import Path
import json
import struct

out=Path('art/v5/generated')
glb=out/'v5-shirt-candidate.glb'
if not glb.exists():
    raise SystemExit('Shirt GLB not exported')
data=glb.read_bytes()
assert data[:4]==b'glTF' and len(data)>100_000
json_len,chunk_type=struct.unpack_from('<II',data,12)
assert chunk_type==0x4E4F534A
asset=json.loads(data[20:20+json_len].decode('utf8'))
meshes=asset.get('meshes',[])
required={
    'V5_Shirt_Body geometry',
    'V5_Shirt_Collar geometry',
    'V5_Shirt_Hem geometry',
    'V5_Shirt_LeftSleeve_Cuff geometry',
    'V5_Shirt_RightSleeve_Cuff geometry'
}
names={mesh.get('name') for mesh in meshes}
assert required<=names, ('Missing garment parts',required-names)
assert not any(name in names for name in ['V5_Shirt_LeftSleeve geometry','V5_Shirt_RightSleeve geometry']), 'Old detached sleeve tubes still exported'
assert len(required)==5, 'One-piece shoulder garment requirement changed'
assert len(asset.get('skins',[]))==1
skin=asset['skins'][0]
assert len(skin['joints'])>=44, 'Original 44-bone rig not preserved'
for mesh in meshes:
    for primitive in mesh.get('primitives',[]):
        attrs=primitive['attributes']
        assert {'POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'}<=set(attrs),mesh['name']
        assert 'material' in primitive,mesh['name']
assert any('back' in m.get('name','').lower() or 'fan' in m.get('name','').lower() for m in asset.get('materials',[]))
for f in ['shirt_front.png','shirt_back.png','shirt_right_side.png',
          'shirt_three_quarter.png','shirt_combat_guard.png','shirt_combat_jab.png']:
    image=out/f
    assert image.exists() and image.stat().st_size>25_000, 'Missing art proof '+f
print('V5 SHIRT GLB, SKIN, UV, MATERIAL AND 6 RENDERS VERIFIED')
print('VISUAL APPROVAL STATUS: NOT APPROVED. DO NOT PUBLISH.')
