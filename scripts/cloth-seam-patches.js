/**
 * Small independent cloth surfaces conceal the cut edges left by physically
 * separating the character's hand mesh from the shorts. They follow the thigh
 * bones, never the hand bones, so there are no stretched bridges on animation.
 * All coordinates are in the source sculpt's 1.62m Y-up bind-pose space.
 */
export function attachSeamPatches(THREE,root){
  root.updateMatrixWorld(true);
  const bones=[];
  root.traverse(o=>{if(o.isBone)bones.push(o)});
  const find=(part)=>bones.find(b=>b.name.toLowerCase().replace(/[^a-z]/g,'').endsWith(part));
  const right=find('rightupleg'), left=find('leftupleg');
  if(!right||!left)throw new Error('Cloth seam cannot bind to both thigh joints');
  let original=null;
  root.traverse(o=>{if(o.isSkinnedMesh&&!original)original=o});
  if(!original)throw new Error('Missing skinned sculpt for cloth patches');
  const originalMaterial=Array.isArray(original.material)?original.material[0]:original.material;
  const cloth=originalMaterial.clone();
  cloth.side=THREE.DoubleSide;
  cloth.roughness=Math.max(.88,cloth.roughness??.9);
  const patches=[];
  for(const [sign,bone,name,uv] of [[-1,left,'Left',[.3681,.7223]],[1,right,'Right',[.8405,.5706]]]){
    const verts=[],tex=[],faces=[];
    const nx=26,ny=20;
    // Curved side wall, with soft taper at waist and hem. The patch sits just
    // outside the original fabric and spans only its previously fused region.
    for(let yi=0;yi<=ny;yi++){
      const t=yi/ny, y=.523+.225*t;
      const envelope=.82+.18*Math.sin(Math.PI*t);
      for(let ai=0;ai<=nx;ai++){
        const a=-1.25+2.5*ai/nx;
        const x=sign*(.118+.066*Math.cos(a)*envelope);
        const z=.020+.097*Math.sin(a);
        const point=bone.worldToLocal(new THREE.Vector3(x,y,z));
        verts.push(point.x,point.y,point.z);
        tex.push(uv[0],uv[1]);
      }
    }
    for(let yi=0;yi<ny;yi++)for(let ai=0;ai<nx;ai++){
      const a=yi*(nx+1)+ai,b=a+1,c=a+nx+1,d=c+1;
      faces.push(a,b,c,b,d,c);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));
    geo.setIndex(faces);
    geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,cloth);
    mesh.name='IndependentShortsSidePanel_'+name;
    mesh.castShadow=true;
    mesh.receiveShadow=false;
    mesh.frustumCulled=false;
    bone.add(mesh);
    patches.push(mesh);
  }
  return patches;
}
