/** Remove only texture-classified obsolete hair. Preserve the face, ears, UVs,
 * normals, skin weights and the existing metal forehead plate. */
export function cleanLegacyCharacterHead(THREE,root,cleanup){
 let skin,head;root.traverse(o=>{if(o.isSkinnedMesh&&!/^v5_shirt_/i.test(o.name)&&!skin)skin=o;if(o.isBone&&/head$/i.test(o.name))head=o});
 if(!skin||!head||cleanup?.version!==1)throw new Error('Head cleanup data missing');
 if(skin.userData.hairCleanup)return skin.userData.hairCleanup;
 const g=skin.geometry,p=g.attributes.position,idx=g.index;
 if(p.count!==cleanup.vertexCount||idx.count/3!==cleanup.triangleCount)throw new Error('Head cleanup does not match source mesh');
 const remove=new Uint8Array(cleanup.triangleCount);
 for(const [start,count]of cleanup.triangles)remove.fill(1,start,start+count);
 const keep=[];for(let i=0;i<cleanup.triangleCount;i++)if(!remove[i])keep.push(idx.getX(i*3),idx.getX(i*3+1),idx.getX(i*3+2));
 g.setIndex(keep);
 const used=new Uint8Array(p.count);for(const i of keep)used[i]=1;
 // Hide any boundary hair vertices inside the new cap. Only classified dark
 // hair is moved, so painted eyes, brows and skin retain their exact positions.
 let crown=0,back=0;
 for(const [start,count]of cleanup.vertices)for(let i=start;i<start+count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(y>1.45)crown++;if(z<.05)back++;
  const dx=x/.080,dy=(y-1.425)/.080,dz=(z-.045)/.075;
  const length=Math.hypot(dx,dy,dz);
  if(!used[i]&&length>.84){const s=.84/length;x*=s;y=1.425+(y-1.425)*s;z=.045+(z-.045)*s;}
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
 const result={bodyTriangles:keep.length/3,removedTriangles:cleanup.removedTriangles,compactedCrownVertices:crown,compactedBackVertices:back,compactedForeheadVertices:0,faceDetails:0,extraHairMeshes:0,bone:head.name};
 skin.userData.hairCleanup=result;return result;
}
