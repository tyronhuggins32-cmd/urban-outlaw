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
