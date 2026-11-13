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
poses=['guard','jab','cross','kick','dodge','ninja_run']
for f in ['shirt_front.png','shirt_back.png','shirt_right_side.png',
          'shirt_three_quarter.png',*[('shirt_combat_'+p+'.png') for p in poses]]:
    image=out/f
    assert image.exists() and image.stat().st_size>25_000, 'Missing art proof '+f
import numpy as np
from PIL import Image
projected=json.loads((out/'pose-shoulder-points.json').read_text())
for pose in poses:
    pixels=np.asarray(Image.open(out/('shirt_combat_'+pose+'.png')).convert('RGB'),dtype=np.int16)
    for side in ('Left','Right'):
        x,y=map(int,projected[pose][side])
        r=14
        patch=pixels[max(0,y-r):min(pixels.shape[0],y+r),
                     max(0,x-r):min(pixels.shape[1],x+r)]
        assert patch.size,'Shoulder joint projection outside render: '+pose+side
        skin=((patch[:,:,0]>118)&(patch[:,:,1]>86)&
              (patch[:,:,2]<164)&
              (patch[:,:,0]-patch[:,:,1]>12)&
              (patch[:,:,0]>patch[:,:,2]+8))
        n=int(skin.sum())
        print('SHOULDER_EXPOSED_SKIN_PIXELS',pose,side,n)
        assert n<=30, f'Exposed skin in shoulder seam ({pose} {side}): {n}'
print('V5 SHIRT GLB, SKIN, UV, MATERIAL, SIX COMBAT POSES AND SHOULDER QA VERIFIED')
print('VISUAL APPROVAL STATUS: NOT APPROVED. DO NOT PUBLISH.')
