/**
 * V5 reference shirt candidate, safely imported with the real 44-bone rig.
 * New topology: torso and sleeves are ONE sewn mesh, plus separate folded
 * collar, soft hem and two narrow sleeve cuffs. This importer deliberately
 * leaves the player's currently approved outfit intact until art signoff.
 */
export const V5_SHIRT_PARTS=Object.freeze([
  'V5_Shirt_Body','V5_Shirt_Collar','V5_Shirt_Hem',
  'V5_Shirt_LeftSleeve_Cuff','V5_Shirt_RightSleeve_Cuff'
]);

const normalizeName=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,'');
function findBody(root){
  let body=null;
  root.traverse(o=>{
    if(o.isSkinnedMesh&&o.skeleton?.bones?.length>=44&&!/^v5_shirt_/i.test(o.name)&&
       !/referencev8|fittednavy|loosegray/i.test(o.name)&&!body)body=o;
  });
  return body;
}
export function inspectSculptedOutfit(THREE,character,outfitScene){
  const body=findBody(character);
  if(!body)throw Error('V5 candidate needs original 44-bone source character');
  const original=body.skeleton;
  const byName=new Map(original.bones.map(b=>[normalizeName(b.name),b]));
  const targetNames=new Set(V5_SHIRT_PARTS);
  const meshes=[];
  outfitScene.updateMatrixWorld(true);
  outfitScene.traverse(mesh=>{
    if(mesh.isSkinnedMesh&&targetNames.has(mesh.name))meshes.push(mesh);
  });
  const names=new Set(meshes.map(m=>m.name));
  const missing=V5_SHIRT_PARTS.filter(name=>!names.has(name));
  if(missing.length)throw Error('Sculpted shirt missing actual sewn fabric: '+missing.join(', '));
  if(meshes.length!==V5_SHIRT_PARTS.length)
    throw Error('Sculpted shirt has duplicate garment mesh names');
  const oldSleeves=[];
  outfitScene.traverse(m=>{
    if(/^V5_Shirt_(LeftSleeve|RightSleeve)$/.test(m.name))oldSleeves.push(m.name);
  });
  if(oldSleeves.length)throw Error('Old detached sleeve tubes must not be present');
  const parentBoneIndex=new Map(original.bones.map((b,i)=>[b,i]));
  let maxBindDeviation=0;
  const results=[];
  for(const mesh of meshes){
    const attr=mesh.geometry.attributes;
    if(!attr?.position||!attr?.normal||!attr?.uv||!attr?.skinIndex||!attr?.skinWeight)
      throw Error(mesh.name+': incomplete sculpted garment (missing UV/normal/weights)');
    const tris=mesh.geometry.index?.count/3||0;
    if(tris<100)throw Error(mesh.name+': missing substantial surface topology');
    if(!mesh.skeleton?.bones?.length)throw Error(mesh.name+': unrigged cloth');
    const remapped=[];
    for(const candidateBone of mesh.skeleton.bones){
      const actual=byName.get(normalizeName(candidateBone.name));
      if(!actual)throw Error(mesh.name+': unknown joint '+candidateBone.name);
      remapped.push(actual);
    }
    for(let i=0;i<remapped.length;i++){
      const sourceIndex=parentBoneIndex.get(remapped[i]);
      const referenceInverse=original.boneInverses[sourceIndex];
      const candidateInverse=mesh.skeleton.boneInverses[i];
      let maxError=0;
      for(let k=0;k<16;k++)
        maxError=Math.max(maxError,Math.abs(referenceInverse.elements[k]-candidateInverse.elements[k]));
      maxBindDeviation=Math.max(maxBindDeviation,maxError);
      // A deliberate root-scale/model-proportion overhaul cannot be installed
      // as shirt-only geometry on the previous skeleton. Validate the changes
      // but require a COMPLETE candidate rig replacement when bind poses differ.
      if(maxError>.40)throw Error(mesh.name+': extreme bind deformation for '+
        remapped[i].name+' ('+maxError.toFixed(4)+')');
    }
    const weights=attr.skinWeight,index=attr.skinIndex;
    const stride=Math.max(1,Math.floor(weights.count/500));
    for(let i=0;i<weights.count;i+=stride){
      const vals=[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)];
      const total=vals.reduce((a,b)=>a+b,0);
      if(Math.abs(total-1)>.012||vals.some(v=>!Number.isFinite(v)))
        throw Error(mesh.name+': unnormalized/nonfinite skin weights at '+i);
      const ids=[index.getX(i),index.getY(i),index.getZ(i),index.getW(i)];
      if(ids.some(j=>j<0||j>=remapped.length))throw Error(mesh.name+': invalid bone index at '+i);
    }
    results.push({name:mesh.name,mesh,bones:remapped,triangles:tris,vertices:attr.position.count});
  }
  const candidateBody=findBody(outfitScene);
  const sourceBone=candidateBody?.skeleton?.bones?.find(b=>normalizeName(b.name).endsWith('hips'));
  const actualBone=original.bones.find(b=>normalizeName(b.name).endsWith('hips'));
  if(!candidateBody||!sourceBone||!actualBone)
    throw Error('Candidate must retain entire original rig for root proportion validation');
  candidateBody.updateMatrixWorld(true);body.updateMatrixWorld(true);
  const sourceScale=candidateBody.getWorldScale(new THREE.Vector3());
  const targetScale=body.getWorldScale(new THREE.Vector3());
  const ratio=new THREE.Vector3(sourceScale.x/targetScale.x,
    sourceScale.y/targetScale.y,sourceScale.z/targetScale.z);
  if(![ratio.x,ratio.y,ratio.z].every(v=>v>.50&&v<1.8))
    throw Error('Candidate has implausible full-rig scale');
  const replacementMode=maxBindDeviation>.015?'FULL_CHARACTER_RIG':'SHIRT_ONLY_SAME_BIND';
  return {body,original,parts:results,
    triangles:results.reduce((a,m)=>a+m.triangles,0),
    sourceRigScale:ratio,bindDeviation:maxBindDeviation,
    replacementMode,
    status:'VISUAL_CANDIDATE_NOT_APPROVED'};
}
/**
 * Creates an isolated preview group. Does not hide any live body geometry,
 * replace the game character, or imply release approval.
 */
export function installSculptedOutfit(THREE,character,outfitScene){
  const info=inspectSculptedOutfit(THREE,character,outfitScene);
  // Preserve the candidate's full scaled armature and reference body for
  // visual review instead of transplanting cloth into a different root scale.
  // No animation state is mutated on the existing playable character.
  // Do not naively clone skinned meshes: it breaks the 44-bone links.
  // Keep this candidate as a verified SOURCE for full-rig replacement after
  // visual signoff; the live character remains untouched here.
  return {...info,sourceScene:outfitScene,
    status:'CANDIDATE_ONLY_REQUIRES_VISUAL_SIGNOFF'};
}
