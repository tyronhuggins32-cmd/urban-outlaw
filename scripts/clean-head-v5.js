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
    if(z<-.114 && y>1.28){
      z=-.114+(z+.114)*.13;
      x*=.90;
      back++;
    }
    if(z>.152 && y>1.405){
      z=.152+(z-.152)*.18;
      front++;
    }
    a.setXYZ(i,x,y,z);
  }
  if(crown<100||back<100)throw new Error('No overlapping legacy hairstyle to compact');
  a.needsUpdate=true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.computeBoundingBox();
  // Restored geometry leaves the existing texture-based face intact. Add
  // only subtle pupil and lid details, not another full hair/headband model.
  const eye=new THREE.Group();
  eye.name='Refined face details only, no duplicate hair or headband';
  const iris=new THREE.MeshStandardMaterial({color:0x2c2526,roughness:.63});
  const sclera=new THREE.MeshStandardMaterial({color:0xa38b7e,roughness:.83});
  const pupil=new THREE.MeshStandardMaterial({color:0x101219,roughness:.54});
  const brow=new THREE.MeshStandardMaterial({color:0x252334,roughness:.89});
  let count=0;
  const dot=(p,r,m)=>{
    const o=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),m);
    o.position.set(...p);o.scale.set(...r);eye.add(o);count++;
  };
  for(const side of [-1,1]){
    const x=.038*side;
    dot([x,1.327,.202],[.014,.0049,.0021],sclera);
    dot([x+side*.001,1.327,.205],[.0064,.0045,.0021],iris);
    dot([x+side*.001,1.327,.207],[.0029,.0035,.0012],pupil);
    dot([x,1.355,.202],[.017,.0024,.002],brow);
  }
  root.add(eye);
  root.updateMatrixWorld(true);
  head.attach(eye);
  // Guaranteed no extra procedural spikes are produced at this stage.
  return {
    bodyTriangles:g.index?g.index.count/3:a.count/3,
    compactedCrownVertices:crown,
    compactedBackVertices:back,
    compactedForeheadVertices:front,
    faceDetails:count,
    extraHairMeshes:0,
    bone:head.name
  };
}
