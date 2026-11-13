/**
 * Development-only V5 garment integration for Urban Outlaw.
 *
 * Full proportion-scaled candidate rigs are NOT detachable shirt skins.
 * A live-rig mismatch must never be hidden by blindly rebinding them.
 * The whole source sculpt is previewed, and the old V8 shirt is hidden,
 * while its separate gray shorts, wraps, sandals, head and hair remain.
 * This module cannot approve or publish artwork.
 */
import {inspectSculptedOutfit, V5_SHIRT_PARTS} from './import-sculpted-v5-outfit.js';

export const V5_CANDIDATE_URL='./assets/candidates/v5-shirt-candidate.glb';
export const V5_UNAPPROVED='V5_SOURCED_SCULPT_NOT_APPROVED';

export function verifyV5PlayableRig(THREE,originalRig,candidateScene){
  const proof=inspectSculptedOutfit(THREE,originalRig,candidateScene);
  if(proof.replacementMode!=='FULL_CHARACTER_RIG'){
    throw Error('Expected proportion-corrected whole V5 rig, not detachable clothing');
  }
  if(proof.parts.length!==V5_SHIRT_PARTS.length || proof.triangles<10000){
    throw Error('V5 sculpt is incomplete: '+proof.parts.length+' pieces / '+proof.triangles+' triangles');
  }
  return proof;
}

/**
 * Restore the exact original head/body mesh inside Blender's scaled candidate
 * armature. Blender re-indexes the imported source on GLB export, but the
 * existing hair cleanup uses exact original triangle/vertex indexes. Swapping
 * only the body geometry back preserves the canonical face and separate hair
 * while keeping the candidate's *entire* root and cloth rig scale.
 *
 * Bone indices must be remapped by name, never assumed to match Blender's.
 * We intentionally do not merge or detach armatures.
 */
export function restoreCanonicalBody(THREE,originalRig,candidateScene){
  function body(scene){
    let found=null;
    scene.traverse(o=>{
      if(o.isSkinnedMesh&&o.skeleton?.bones?.length>=44&&
         !/^v5_shirt_/i.test(o.name)&&
         !/referencev8|fittednavy|loosegray/i.test(o.name)&&!found)found=o;
    });
    if(!found)throw Error('No original 44-bone body was found');
    return found;
  }
  const src=body(originalRig),dst=body(candidateScene);
  const boneMap=new Map(dst.skeleton.bones.map((bone,i)=>[
    bone.name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,''),i
  ]));
  const order=src.skeleton.bones.map(b=>boneMap.get(
    b.name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,'')
  ));
  if(order.some(x=>x===undefined))throw Error('Candidate lost original bone names');
  const geo=src.geometry.clone();
  const skin=geo.getAttribute('skinIndex');
  if(!skin)throw Error('Source head has no weights');
  const indices=new Uint16Array(skin.array.length);
  for(let i=0;i<skin.count;i++)for(let k=0;k<4;k++){
    const originalIndex=skin.getComponent(i,k);
    indices[i*4+k]=order[originalIndex];
  }
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  if(!geo.index||geo.getAttribute('position').count<20000)
    throw Error('Canonical face geometry is unexpectedly small');
  const old=dst.geometry;dst.geometry=geo;
  dst.material=Array.isArray(src.material)?src.material.map(m=>m.clone()):src.material.clone();
  dst.frustumCulled=false;
  old.dispose();
  return {vertices:geo.getAttribute('position').count,
    triangles:geo.index.count/3,
    skinningBones:dst.skeleton.bones.length,
    remappedBones:order.filter((x,i)=>x!==i).length};
}

export function selectV5ShirtForPreview(character){
  const required=new Set(V5_SHIRT_PARTS);
  const present=new Set();
  character.traverse(o=>{
    if(o.isSkinnedMesh && required.has(o.name)){
      if(!o.visible)throw Error(o.name+' was accidentally hidden');
      present.add(o.name);
      o.frustumCulled=false;
    }
  });
  if(required.size!==present.size){
    throw Error('V5 original shirt parts are missing: '+[...required].filter(n=>!present.has(n)).join(','));
  }

  // The reference V8 shorts/wraps remain usable, but its old collar, shirt,
  // double sleeve shells and hem would hide the new sculpt. Remove them ONLY
  // inside the sandbox candidate rig. Keep the main game's normal outfit.
  const hidden=new Set([
    'ReferenceV8NavyShirt','ReferenceV8ShirtHem','ReferenceV8RaisedCollar',
    'LeftReferenceV8ClothSleeve','RightReferenceV8ClothSleeve',
    'LeftReferenceV8SleeveHem','RightReferenceV8SleeveHem',
    'FittedNavyCombatTunic_Skinned44','HighNinjaCollar',
    'TunicWaistHem','LooseHangingShirtHem','UchihaFanBackCrest'
  ]);
  let hiddenCount=0;
  character.traverse(o=>{
    if(hidden.has(o.name)){
      if(o.visible)hiddenCount++;
      o.visible=false;
    }
  });
  const v8Shirt=character.getObjectByName('ReferenceV8NavyShirt');
  if(!v8Shirt || v8Shirt.visible)throw Error('Legacy V8 navy shirt is still visible over sculpt');
  if(!character.getObjectByName('ReferenceV8GrayShortsWaist')?.visible)
    throw Error('Playable V5 proof has no gray shorts');
  return {status:V5_UNAPPROVED,shirtMeshes:present.size,
    hiddenLegacyShirtMeshes:hiddenCount,lowerClothes:'V8 shorts prototype'};
}
