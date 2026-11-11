/**
 * Urban Outlaws V6: a SINGLE unified hair volume mounted on the animated
 * skull. The navy wrap and tied cloth are part of the same detachable GLB.
 * No duplicate forehead plate, procedural hair, floating eye/face geometry
 * or additional underband. The original source protector remains visible.
 */
export function installDetachableHair(THREE, humanoid, hairScene) {
  humanoid.updateMatrixWorld(true);
  let headBone=null,body=null;
  humanoid.traverse(o=>{
    if(o.isBone && o.name.toLowerCase().replace(/[^a-z]/g,'').endsWith('head'))headBone=o;
    if(o.isSkinnedMesh&&!body)body=o;
  });
  if(!headBone||!body)throw new Error('Reference head bone or skinned character missing');
  const allowed=new Set([
    'URBAN HAIR CONTINUOUS SCULPT',
    'INDIGO HEADBAND UNDER FRINGE',
    'NAVY HAIR TIE BOW'
  ]);
  const names=new Set();let groups=0,triangles=0;
  hairScene.traverse(o=>{
    if(!o.isMesh)return;
    groups++;
    triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.getAttribute('position').count/3;
    const n=o.material?.name;
    if(!allowed.has(n))throw new Error('Unexpected hair accessory material '+n);
    names.add(n);
    o.castShadow=true;
    o.receiveShadow=false;
    o.frustumCulled=false;
    o.userData.accessory='Hair';
    o.userData.detachable=true;
    // No new geometry is added by this installer.
  });
  if(groups!==3||names.size!==3||triangles<65000||triangles>110000){
    throw new Error('V6 unified sculpt invalid: '+groups+' groups '+triangles+' triangles');
  }
  hairScene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(hairScene);
  const height=bounds.getSize(new THREE.Vector3()).y;
  if(height<.30||height>.50)throw new Error('V6 hair scale mismatch '+height);
  hairScene.name='URBAN_OUTLAWS_UNIFIED_SCULPT_HAIR_V6';
  hairScene.userData.detachable=true;
  hairScene.userData.mountBone=headBone.name;
  hairScene.userData.attachmentVersion='continuous-volume-v6';
  // GLB positions are local to source skull pivot (0,1.49,0).
  hairScene.position.set(0,1.49,0);
  humanoid.add(hairScene);
  humanoid.updateMatrixWorld(true);
  headBone.attach(hairScene);
  hairScene.updateMatrixWorld(true);
  if(hairScene.parent!==headBone)throw new Error('V6 hair failed skull bone attachment');
  return {
    name:hairScene.name,meshGroups:groups,triangles:Math.round(triangles),
    originalHairHidden:0,faceMeshesRetained:0,
    mountBone:headBone.name,height:Number(height.toFixed(4))
  };
}
