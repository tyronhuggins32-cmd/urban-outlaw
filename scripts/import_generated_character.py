#!/usr/bin/env python3
"""Safely import a third-party glTF GLB into Urban Outlaws after basic shape validation.

Usage:
  python3 scripts/import_generated_character.py URL /path/to/output.glb [--require-rig]
Requires trimesh, numpy. Rejects multicharacter collages, unexpectedly flat geometry
and non-GLB inputs. Passing is a technical check, NOT visual approval.
"""
import argparse, pathlib, struct, sys, urllib.request
import numpy as np
import trimesh
p=argparse.ArgumentParser()
p.add_argument('url')
p.add_argument('dest')
p.add_argument('--require-rig', action='store_true')
args=p.parse_args()
assert args.url.startswith('https://'), 'HTTPS GLB required'
req=urllib.request.Request(args.url,headers={'User-Agent':'UrbanOutlaws-AssetImport/1'})
with urllib.request.urlopen(req,timeout=180) as resp:
    data=resp.read(30*1024*1024+1)
assert len(data)<30*1024*1024, 'Large model, not suitable for mobile'
assert len(data)>100_000, 'File too small to contain character'
magic,version,length=struct.unpack_from('<4sII',data)
assert magic==b'glTF' and version==2 and length==len(data), 'Invalid GLB container'
raw=trimesh.load(file_obj=__import__('io').BytesIO(data),file_type='glb',force='scene')
bounds=np.array(raw.bounds)
sizes=bounds[1]-bounds[0]
print('GLB:',len(data),'bytes;',len(raw.geometry),'meshes;',sizes,'Y-up bounds')
assert np.isfinite(sizes).all() and np.min(sizes)>.025, 'Invalid or flat mesh'
assert sizes[1]/sizes[0] > 1.7, 'Too wide for a single upright character; possible view-sheet collage'
assert sizes[1]/sizes[2] > 2.0, 'Too deep for a single upright character; possible collage'
assert 0.35 < sizes[1] < 3.5, 'Unexpected model scale'
if args.require_rig:
    import json
    json_size,json_type=struct.unpack_from('<I4s',data,12)
    assert json_type==b'JSON'
    doc=json.loads(data[20:20+json_size])
    assert len(doc.get('skins',[]))>=1, 'No skeleton skin found'
    assert len(doc.get('nodes',[]))>15, 'Too few skeletal nodes'
    print('Skins:',len(doc['skins']),'bones:',len(doc['nodes']))
out=pathlib.Path(args.dest)
out.parent.mkdir(parents=True,exist_ok=True)
out.write_bytes(data)
print('Accepted technical checks, written:',out)
