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
# Verify the critical shoulder/armhole doesn't expose a beige skin patch
# ABOVE the sleeve hem during guard or jab. This was a visible defect in the
# previous connected-mesh candidate and was invisible to pure GLB validation.
import numpy as np
from PIL import Image
for pose in ('guard','jab'):
    pixels=np.asarray(Image.open(out/('shirt_combat_'+pose+'.png')).convert('RGB'),dtype=np.int16)
    exposed=pixels[365:431,515:560]
    skin=((exposed[:,:,0]>125)&(exposed[:,:,1]>90)&
          (exposed[:,:,2]<165)&
          (exposed[:,:,0]-exposed[:,:,1]>12)&
          (exposed[:,:,0]>exposed[:,:,2]))
    count=int(skin.sum())
    print('SHOULDER_EXPOSED_SKIN_PIXELS',pose,count)
    assert count<=4, 'Sleeve armhole leaks skin during '+pose+': '+str(count)+' pixels'
print('V5 SHIRT GLB, SKIN, UV, MATERIAL, SHOULDER COVERAGE AND 6 RENDERS VERIFIED')
print('VISUAL APPROVAL STATUS: NOT APPROVED. DO NOT PUBLISH.')
