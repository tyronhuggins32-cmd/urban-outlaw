/** Mount the original layered sculpt as one separate hair model.
 * Source-space coordinates preserve the exact fit to the face and ears.
 * No generated clumps, guessed head pivot, second plate or shader masking.
 */
export function installDetachableHair(THREE, humanoid, hairScene) {
  humanoid.updateMatrixWorld(true);
  let headBone=null,body=null;
  humanoid.traverse(o=>{
    if(o.isBone && o.name.toLowerCase().replace(/[^a-z]/g,'').endsWith('head'))headBone=o;
    if(o.isSkinnedMesh&&!body)body=o;
  });
  if(!headBone||!body)throw new Error('Reference head bone or skinned character missing');
  const allowed=new Set(['REFERENCE SCULPT HAIR','REFERENCE FOREHEAD METAL','REFERENCE LEAF ENGRAVING']);
  const names=new Set();let groups=0,triangles=0;
  hairScene.traverse(o=>{
    if(!o.isMesh)return;
    groups++;
    triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.getAttribute('position').count/3;
    const n=o.material?.name;
    if(!allowed.has(n))throw new Error('Unexpected hair accessory material '+n);
    names.add(n);
    // Reuse the avatar atlas: the extracted hair retains the original UVs.
    const bodyMaterial=Array.isArray(body.material)?body.material[0]:body.material;
    if(n==='REFERENCE SCULPT HAIR' && bodyMaterial?.map && o.material.map!==bodyMaterial.map){
      const previous=o.material.map;o.material.map=bodyMaterial.map;
      if(previous){previous.dispose();previous.image?.close?.();}
      o.material.needsUpdate=true;
    }
    o.castShadow=true;
    o.receiveShadow=false;
    o.frustumCulled=false;
    o.userData.accessory='Hair';
    o.userData.detachable=true;
    // No new geometry is added by this installer.
  });
  if(groups!==3||names.size!==3||triangles<10000||triangles>40000){
    throw new Error('V8 unified sculpt invalid: '+groups+' groups '+triangles+' triangles');
  }
  hairScene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(hairScene);
  const height=bounds.getSize(new THREE.Vector3()).y;
  if(height<.30||height>.50)throw new Error('V8 hair scale mismatch '+height);
  hairScene.name='URBAN_OUTLAWS_UNIFIED_SCULPT_HAIR_V8';
  hairScene.userData.detachable=true;
  hairScene.userData.mountBone=headBone.name;
  hairScene.userData.attachmentVersion='source-sculpt-v8';
  // Geometry is extracted in avatar bind space: no guessed pivot or offset.
  // Existing forehead plate and facial surface remain on the skinned body.
  hairScene.scale.set(1,1,1);
  hairScene.position.set(0,0,0);
  humanoid.add(hairScene);
  humanoid.updateMatrixWorld(true);
  headBone.attach(hairScene);
  hairScene.updateMatrixWorld(true);
  if(hairScene.parent!==headBone)throw new Error('V8 hair failed skull bone attachment');
  return {
    name:hairScene.name,meshGroups:groups,triangles:Math.round(triangles),
    originalHairHidden:0,faceMeshesRetained:0,
    mountBone:headBone.name,height:Number(height.toFixed(4))
  };
}
