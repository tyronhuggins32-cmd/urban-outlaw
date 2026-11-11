/**
 * Urban Outlaws: replace the earlier procedural plastic hair with the approved
 * standalone GLB. The old script still provides eyelid/iris details and trims
 * the source sculpt's old hair, but every old hair/headband mesh is hidden.
 * The GLB is mounted on the existing animated HEAD bone as one detachable
 * accessory. It contains no face or body geometry.
 */
export function installDetachableHair(THREE, humanoid, hairScene) {
  humanoid.updateMatrixWorld(true);
  let headBone=null;
  humanoid.traverse(o=>{
    if(o.isBone && o.name.toLowerCase().replace(/[^a-z]/g,'').endsWith('head'))headBone=o;
  });
  if(!headBone)throw new Error('Animated skull bone not found');
  // No procedural overlay is generated anymore, eliminating the double
  // headband, shadow spikes and hair/face intersections.
  const oldHairHidden=0,faceDetailsRetained=8;

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
    // The reference-sculpted source includes its original forehead protector.
    // The replacement asset's protector sat higher, creating TWO plates.
    // Seat its silver plate and engraving directly over the original instead.
    if(o.material?.name==='BRUSHED SILVER HEADBAND' ||
       o.material?.name==='DARK ENGRAVING'){
      o.position.y-=.008;
      o.position.z+=.053;
      o.scale.x*=1.15;
      if(o.material?.name==='BRUSHED SILVER HEADBAND'){
        const p=o.geometry.getAttribute('position');
        let mid=0;for(let i=0;i<p.count;i++)mid+=p.getY(i);
        mid/=p.count;
        for(let i=0;i<p.count;i++)p.setY(i,mid+(p.getY(i)-mid)*1.27);
        p.needsUpdate=true;
        o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
      }
    }
  });
  const required=['LAYERED BLUE BLACK HAIR FIBERS','HAIR INNER SHADOW FIBERS',
    'DEEP INDIGO CLOTH','BRUSHED SILVER HEADBAND'];
  if(groups<6||groups>12||triangles<10000||
     required.some(name=>!categories.has(name))){
    throw new Error('Detachable hair GLB does not match expected mesh/material schema');
  }
  const localBounds=new THREE.Box3().setFromObject(hairScene);
  const height=localBounds.getSize(new THREE.Vector3()).y;
  if(height<.35||height>.55)throw new Error('Detachable hair dimensions invalid');


  // Cover the source character's old low-resolution forehead decal, without
  // deleting face polygons or lowering the correct silver plate onto the eyes.
  // This gently curved navy underband sits below the new metal, above eyes.
  const panelVerts=[],panelFaces=[];
  const W=18,rows=3;
  for(let row=0;row<rows;row++){
    const y=1.365+(1.425-1.365)*row/(rows-1)-1.49;
    for(let i=0;i<=W;i++){
      const x=-.089+.178*i/W;
      const z=.197-.013*(x/.089)**2;
      panelVerts.push(x,y,z);
    }
  }
  for(let row=0;row<rows-1;row++){
    for(let i=0;i<W;i++){
      const a=row*(W+1)+i,b=a+1,c=a+(W+1),d=c+1;
      panelFaces.push(a,b,c,b,d,c);
    }
  }
  const bandGeometry=new THREE.BufferGeometry();
  bandGeometry.setAttribute('position',new THREE.Float32BufferAttribute(panelVerts,3));
  bandGeometry.setIndex(panelFaces);
  bandGeometry.computeVertexNormals();
  const bandMaterial=new THREE.MeshStandardMaterial({
    name:'Curved navy underband covers legacy badge', color:0x1a244b,
    roughness:.95, side:THREE.DoubleSide
  });
  const underband=new THREE.Mesh(bandGeometry,bandMaterial);
  underband.name='Single forehead cloth concealment strip';
  underband.userData.accessory='Hair';
  underband.castShadow=false;
  hairScene.add(underband);

  hairScene.name='APPROVED_DETACHABLE_HAIR_ONE_ASSET';
  hairScene.userData.role='Hair';
  hairScene.userData.detachable=true;
  hairScene.userData.approvedReference='42752EC5-3A4A-44CB-BE56-E32611725D95.jpeg';
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
