/**
 * Urban Outlaws: replace the earlier procedural plastic hair with the approved
 * standalone GLB. The old script still provides eyelid/iris details and trims
 * the source sculpt's old hair, but every old hair/headband mesh is hidden.
 * The GLB is mounted on the existing animated HEAD bone as one detachable
 * accessory. It contains no face or body geometry.
 */
export function installDetachableHair(THREE, humanoid, hairScene) {
  humanoid.updateMatrixWorld(true);
  let headBone=null, oldOverlay=null;
  humanoid.traverse(o=>{
    if(o.isBone && o.name.toLowerCase().replace(/[^a-z]/g,'').endsWith('head'))headBone=o;
    if(o.name==='Ninja Head: reference v3, attached to skull joint')oldOverlay=o;
  });
  if(!headBone || !oldOverlay)throw new Error('Expected skull bone and original face-detail group');
  const preserve=new Set([
    'Natural ivory sclera','Deep brown iris','Dark pupils and eyeliner',
    'Shadowed upper eyelids','Eye reflections'
  ]);
  let oldHairHidden=0,faceDetailsRetained=0;
  oldOverlay.traverse(o=>{
    if(!o.isMesh)return;
    const name=o.material?.name||'';
    if(preserve.has(name)){o.visible=true;faceDetailsRetained++;}
    else {o.visible=false;oldHairHidden++;}
  });
  if(oldHairHidden<4||faceDetailsRetained<3){
    throw new Error('Could not separate procedural hair from facial details');
  }

  let groups=0,triangles=0;
  const categories=new Set();
  hairScene.traverse(o=>{
    if(!o.isMesh)return;
    groups++;
    triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.getAttribute('position').count/3;
    categories.add(o.material?.name);
    o.castShadow=true;
    o.receiveShadow=false;
    o.frustumCulled=false;
    o.userData.accessory='Hair';
  });
  const required=['LAYERED BLUE BLACK HAIR FIBERS','HAIR INNER SHADOW FIBERS',
    'DEEP INDIGO CLOTH','BRUSHED SILVER HEADBAND'];
  if(groups<6||groups>12||triangles<35000||
     required.some(name=>!categories.has(name))){
    throw new Error('Detachable hair GLB does not match expected mesh/material schema');
  }
  const localBounds=new THREE.Box3().setFromObject(hairScene);
  const height=localBounds.getSize(new THREE.Vector3()).y;
  if(height<.35||height>.55)throw new Error('Detachable hair dimensions invalid');

  hairScene.name='APPROVED_DETACHABLE_HAIR_ONE_ASSET';
  hairScene.userData.role='Hair';
  hairScene.userData.detachable=true;
  hairScene.userData.approvedReference='game_hair_asset_approval_sheet.png';
  // The asset coordinates are skull-relative; lift to source world head
  // position, then Three.js head.attach converts to existing bind-space.
  hairScene.position.set(0,1.49,0);
  humanoid.add(hairScene);
  humanoid.updateMatrixWorld(true);
  headBone.attach(hairScene);
  hairScene.updateMatrixWorld(true);
  if(hairScene.parent!==headBone)throw new Error('Detachable hair failed head-bone attachment');
  return {name:hairScene.name,meshGroups:groups,triangles:Math.round(triangles),
    originalHairHidden:oldHairHidden,faceMeshesRetained:faceDetailsRetained,
    mountBone:headBone.name,height:+height.toFixed(4)};
}
