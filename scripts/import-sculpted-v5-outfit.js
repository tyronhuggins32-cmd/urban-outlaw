/**
 * V5 sculpted-outfit candidate importer.
 *
 * Unlike the old procedural garment generators, this imports a standalone
 * hand-authored clothing GLB made in Blender/Maya. The file must be rigged to
 * Urban Outlaw's existing 44-bone skeleton in its original bind pose.
 *
 * IMPORTANT: Importing here is for candidate review. Do not publish the asset
 * or hide the live outfit until every visual and animation approval gate passes.
 */
export function inspectSculptedOutfit(THREE,character,outfitScene){
  let characterBody=null;
  character.traverse(node=>{
    if(node.isSkinnedMesh && node.skeleton?.bones.length===44 &&
      !characterBody && !/referencev8|fittednavy|loosegray/i.test(node.name))
      characterBody=node;
  });
  if(!characterBody)throw Error('V5 candidate: cannot find 44-bone source body');
  const original=characterBody.skeleton;
  const clean=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,'');
  const byName=new Map(original.bones.map(b=>[clean(b.name),b]));
  const allowedNames=[
    'V5_Shirt_Body','V5_Shirt_Collar','V5_Shirt_LeftSleeve',
    'V5_Shirt_RightSleeve','V5_Shorts_Waist','V5_Shorts_LeftLeg',
    'V5_Shorts_RightLeg'
  ];
  const garments=[];
  outfitScene.traverse(node=>{if(node.isSkinnedMesh)garments.push(node)});
  const names=new Set(garments.map(g=>g.name));
  const missing=allowedNames.filter(n=>!names.has(n));
  if(missing.length)throw Error('V5 candidate missing garment surfaces: '+missing.join(', '));
  const results=[];
  for(const garment of garments){
    const attr=garment.geometry.attributes;
    if(!attr?.position||!attr?.normal||!attr?.uv||!attr?.skinIndex||!attr?.skinWeight)
      throw Error(garment.name+': missing normals, UVs or rig weights');
    if(garment.geometry.index?.count<1200)
      throw Error(garment.name+': insufficient sculpted topology');
    const mapped=[];
    for(const bone of garment.skeleton.bones){
      const match=byName.get(clean(bone.name));
      if(!match)throw Error(garment.name+': unknown bone '+bone.name);
      mapped.push(match);
    }
    // Check actual bind pose. A mismatched bind cannot be fixed by arbitrary
    // geometry repositioning, because combat would tear the sleeves/waist.
    const bodyBoneIndices=new Map(original.bones.map((b,i)=>[b,i]));
    for(let i=0;i<mapped.length;i++){
      const rest=original.boneInverses[bodyBoneIndices.get(mapped[i])];
      const other=garment.skeleton.boneInverses[i];
      let deviation=0;
      for(let k=0;k<16;k++)deviation=Math.max(deviation,
        Math.abs(rest.elements[k]-other.elements[k]));
      if(deviation>.012)throw Error(garment.name+': bind pose mismatch '+mapped[i].name+
        ' ('+deviation.toFixed(4)+')');
    }
    const sw=attr.skinWeight,si=attr.skinIndex;
    for(let i=0;i<sw.count;i+=Math.max(1,Math.floor(sw.count/250))){
      const ws=[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)];
      if(Math.abs(ws.reduce((a,b)=>a+b,0)-1)>.01 ||
        !ws.every(Number.isFinite))throw Error(garment.name+': invalid weights');
      const idx=[si.getX(i),si.getY(i),si.getZ(i),si.getW(i)];
      if(idx.some(k=>k<0||k>=mapped.length))throw Error(garment.name+': bone index out of range');
    }
    results.push({name:garment.name,mesh:garment,bones:mapped,
      triangles:garment.geometry.index.count/3,vertices:attr.position.count});
  }
  return {results,original,body:characterBody,
    triangles:results.reduce((n,r)=>n+r.triangles,0)};
}

export function installSculptedOutfit(THREE,character,outfitScene) {
  const candidate=inspectSculptedOutfit(THREE,character,outfitScene);
  const attached=[];
  for(const item of candidate.results){
    const old=item.mesh;
    const g=old.geometry.clone();
    const material=Array.isArray(old.material) ?
      old.material.map(m=>m.clone()) : old.material.clone();
    const out=new THREE.SkinnedMesh(g,material);
    out.name='ApprovedCandidate_'+item.name;
    out.castShadow=true;out.receiveShadow=false;out.frustumCulled=false;
    out.position.copy(old.position);out.quaternion.copy(old.quaternion);
    out.scale.copy(old.scale);
    const oldSkeleton=old.skeleton;
    out.bind(new THREE.Skeleton(item.bones,
      oldSkeleton.boneInverses.map(m=>m.clone())),old.bindMatrix.clone());
    candidate.body.parent.add(out);
    attached.push(out);
  }
  // IMPORTANT: This importer only mounts the candidate in review mode.
  // A separate release procedure must explicitly choose which older garment
  // surfaces to hide after the approval contract has been signed.
  return {meshes:attached,triangles:candidate.triangles,status:'CANDIDATE_ONLY'};
}
