/**
 * Fix the layered-head failure without destroying the reference sculpt.
 * The earlier pipeline cut thousands of original head triangles, creating
 * visible holes around ears and neck. This pass shrinks only obsolete
 * original hair projections back INSIDE the replacement hairstyle, keeping
 * every triangle, UV, weight, original material and the 44-bone rig intact.
 */
export function cleanLegacyCharacterHead(THREE, root) {
  root.updateMatrixWorld(true);
  let head=null,skin=null;
  root.traverse(o=>{
    if(o.isBone && o.name.toLowerCase().replace(/[^a-z]/g,'').endsWith('head')) head=o;
    if(o.isSkinnedMesh && !skin)skin=o;
  });
  if(!head||!skin)throw new Error('Missing skinned reference character or head joint');
  const g=skin.geometry;
  const a=g.getAttribute('position');
  if(!a||a.itemSize!==3||a.count<20000)throw new Error('Unexpected character head geometry');
  let crown=0,back=0,front=0;
  // Retain all original head surfaces. Don't delete faces or detach skin
  // indices: the previous destructive cut caused the white gaps seen
  // around the ear and nape. This is a non-destructive shape correction.
  for(let i=0;i<a.count;i++){
    let x=a.getX(i),y=a.getY(i),z=a.getZ(i);
    if(y>1.515){
      y=1.515+(y-1.515)*.22;
      x*=.80;z*=.65;
      crown++;
    }
    if(z<-.095 && y>1.315){
      z=-.095+(z+.095)*.08;
      x*=.86;
      back++;
    }
    if(z>.152 && y>1.405){
      z=.152+(z-.152)*.12;
      front++;
    }
    a.setXYZ(i,x,y,z);
  }
  if(crown<100||back<100)throw new Error('No overlapping legacy hairstyle to compact');
  a.needsUpdate=true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.computeBoundingBox();
  // The source mesh already has a painted face. Extra eye spheres were
  // showing up as dark dots on the cheeks in the real browser screenshot.
  // Keep one anatomical face, no glued-on artificial eyeballs.
  return {
    bodyTriangles:g.index?g.index.count/3:a.count/3,
    compactedCrownVertices:crown,
    compactedBackVertices:back,
    compactedForeheadVertices:front,
    faceDetails:0,
    extraHairMeshes:0,
    bone:head.name
  };
}
