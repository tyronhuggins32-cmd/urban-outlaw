/**
 * Urban Outlaw V5 tailored clothing pass.
 * Uses the *same* sculpted and weighted GLB geometry for shirt and shorts.
 * No independent mannequin, no paper approval render.
 */
export function tailorNinjaClothes(THREE,root) {
  root.updateMatrixWorld(true);
  const body=[];const bones=[];
  root.traverse(o=>{
    if(o.isBone)bones.push(o);
    if(o.isSkinnedMesh && o.name!=='FittedNavyCombatTunic_Skinned44' &&
       o.name!=='LooseGrayNinjaShorts_Skinned44')body.push(o);
  });
  const base=body.find(o=>o.skeleton?.bones?.length>=40);
  const shirt=root.getObjectByName('FittedNavyCombatTunic_Skinned44');
  if(!base||!shirt)throw Error('V5 clothes require original skinned humanoid and fitted tunic');
  const bone=(key)=>bones.find(b=>b.name.toLowerCase().replace(/[^a-z0-9]/g,'').endsWith(key.toLowerCase()));
  const hips=bone('Hips'),spine=bone('Spine2');
  const thighs=[bone('LeftUpLeg'),bone('RightUpLeg')];
  if(!hips||!spine||thighs.some(b=>!b))throw Error('Missing clothing bone mounts');
  const navy=new THREE.MeshStandardMaterial({color:0x202d56,roughness:.96,side:THREE.DoubleSide});
  const navyTrim=new THREE.MeshStandardMaterial({color:0x233962,roughness:.90,side:THREE.DoubleSide});
  const gray=new THREE.MeshStandardMaterial({color:0xc9c7ca,roughness:.98,side:THREE.DoubleSide});
  const seam=new THREE.MeshStandardMaterial({color:0x96949e,roughness:1,side:THREE.DoubleSide});
  const red=new THREE.MeshStandardMaterial({color:0xa14b59,roughness:.95,side:THREE.DoubleSide});
  const white=new THREE.MeshStandardMaterial({color:0xe6e1e0,roughness:.95,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x121c34,roughness:.92,side:THREE.DoubleSide});
  const added=[];
  const attachAt=(part,b,pos)=>{
    root.add(part);part.position.copy(pos);root.updateMatrixWorld(true);
    b.attach(part);part.castShadow=true;part.frustumCulled=false;
    added.push(part);return part;
  };
  const W=(x,y,z)=>new THREE.Vector3(x,y,z);
  const world=b=>b.getWorldPosition(new THREE.Vector3());
  const soften=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};

  // Original shirt stays a skinned cloth surface, but gently loosen its lower
  // silhouette and add subtle drape folds without touching bone indices.
  shirt.material=navy;
  const shirtGeo=shirt.geometry,sp=shirtGeo.getAttribute('position'),sn=shirtGeo.getAttribute('normal');
  let shirtDrape=0;
  for(let i=0;i<sp.count;i++){
    const x=sp.getX(i),y=sp.getY(i),z=sp.getZ(i);
    if(y<.80||y>1.32||Math.abs(x)>.295||Math.abs(z)>.26)continue;
    const skirt=soften((1.04-y)/.26);
    const folds=Math.sin(42*x+3.5*z)*Math.cos(y*27)+.38*Math.sin(y*59+x*18);
    const puff=skirt*(.017+.009*folds);
    sp.setXYZ(i,x+sn.getX(i)*puff,y+skirt*.004,z+sn.getZ(i)*puff);
    shirtDrape++;
  }
  sp.needsUpdate=true;shirtGeo.computeVertexNormals();shirtGeo.computeBoundingSphere();

  // Reuse anatomy's original 44-bone skin weights for actual cloth shorts.
  const source=base.geometry,p=source.getAttribute('position'),
    joints=source.getAttribute('skinIndex'),weights=source.getAttribute('skinWeight');
  const src=source.index?.array;const names=base.skeleton.bones.map(b=>b.name.toLowerCase());
  if(!src||!joints||!weights)throw Error('Rigged source cloth geometry missing');
  function upperWeight(i){
    let sum=0;
    for(let k=0;k<4;k++)if(/hips|upleg|spine/.test(names[joints.getComponent(i,k)]||''))
      sum+=weights.getComponent(i,k);
    return sum;
  }
  const eligible=new Uint8Array(p.count);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    eligible[i]=(y>.45&&y<.845&&Math.abs(x)<.34&&Math.abs(z)<.30&&upperWeight(i)>.45)?1:0;
  }
  const indices=[];
  for(let i=0;i<src.length;i+=3){
    const a=src[i],b=src[i+1],c=src[i+2];
    if(eligible[a]&&eligible[b]&&eligible[c])indices.push(a,b,c);
  }
  if(indices.length<600)throw Error('Shorts body-fit selection too small: '+indices.length/3);
  const shortsGeo=source.clone();
  shortsGeo.setIndex(indices);
  const shortP=shortsGeo.getAttribute('position'),
        shortN=shortsGeo.getAttribute('normal');
  let pleatCount=0;
  for(let i=0;i<shortP.count;i++){
    if(!eligible[i])continue;
    const x=shortP.getX(i),y=shortP.getY(i),z=shortP.getZ(i);
    const fade=soften((.835-y)/.095),hemFlare=soften((.70-y)/.24);
    const side=Math.sign(x||1);
    const pleat=Math.sin((x-side*.12)*37+z*14+y*16)
               +.35*Math.sin((x+z)*67-y*21);
    const loosen=fade*(.015+.024*hemFlare)+.006*fade*pleat;
    // Inflate outward, flare loose shorts toward knees; no skin-weight edits.
    shortP.setXYZ(i,x+shortN.getX(i)*loosen+side*.012*hemFlare*fade,
      y+fade*.004, z+shortN.getZ(i)*loosen);
    pleatCount++;
  }
  shortP.needsUpdate=true;
  shortsGeo.computeVertexNormals();shortsGeo.computeBoundingSphere();
  const shorts=new THREE.SkinnedMesh(shortsGeo,gray);
  shorts.name='LooseGrayNinjaShorts_Skinned44';
  shorts.castShadow=true;shorts.frustumCulled=false;shorts.receiveShadow=false;
  shorts.position.copy(base.position);shorts.quaternion.copy(base.quaternion);shorts.scale.copy(base.scale);
  base.parent.add(shorts);shorts.bind(base.skeleton,base.bindMatrix.clone());added.push(shorts);

  // Three-dimensional tailored hem with shallow irregular folds.
  // The side fabric follows each thigh bone throughout full combat animation.
  let cuffs=0;
  for(let side=0;side<2;side++){
    const leg=thighs[side],s=side===0?1:-1;
    const legPos=world(leg);
    const skirt=new THREE.Mesh(
      new THREE.CylinderGeometry(.14,.162,.235,28,5,true),gray);
    skirt.name=(s>0?'Left':'Right')+'ShortLegPanel';
    const gp=skirt.geometry.getAttribute('position');
    for(let i=0;i<gp.count;i++){
      const x=gp.getX(i),y=gp.getY(i),z=gp.getZ(i);
      const f=Math.sin(Math.atan2(z,x)*7+side*2.2);
      gp.setXYZ(i,x*(1+.026*f),y+(.004*f),z*(1+.026*f));
    }
    gp.needsUpdate=true;skirt.geometry.computeVertexNormals();
    // A waist-to-knee panel whose top remains at the actual thigh joint.
    attachAt(skirt,leg,legPos.clone().add(W(0,-.125,0)));
    const hem=new THREE.Mesh(new THREE.CylinderGeometry(.163,.163,.013,28,1,true),seam);
    hem.name=(s>0?'Left':'Right')+'ShortHemStitch';
    attachAt(hem,leg,legPos.clone().add(W(0,-.246,0)));cuffs++;

    // Sewn angled front pockets: unobtrusive, not floating squares.
    const pocketShape=new THREE.Shape();
    pocketShape.moveTo(-.067,.042);pocketShape.lineTo(.062,.042);
    pocketShape.lineTo(.054,-.039);pocketShape.lineTo(.012,-.067);
    pocketShape.lineTo(-.059,-.038);pocketShape.closePath();
    const pocket=new THREE.Mesh(new THREE.ShapeGeometry(pocketShape),gray);
    pocket.name=(s>0?'Left':'Right')+'TailoredShortPocket';
    const pocketPos=legPos.clone().add(W(s*.076,-.06,.144));
    attachAt(pocket,leg,pocketPos);
    const topStitch=new THREE.Mesh(new THREE.BoxGeometry(.127,.003,.004),seam);
    topStitch.name=(s>0?'Left':'Right')+'PocketStitch';
    attachAt(topStitch,leg,pocketPos.clone().add(W(0,.040,.003)));

    // Right leg in the sheet has two flat navy bands around the shorts.
    if(side===1){
      for(let j=0;j<2;j++){
        const band=new THREE.Mesh(new THREE.CylinderGeometry(.157,.157,.031,28,1,true),navyTrim);
        band.name='ReferenceNavyThighBand'+j;
        attachAt(band,leg,legPos.clone().add(W(0,-.178+j*.055,0)));
      }
    }
  }

  // Wavy hanging shirt hem rather than a rigid belt cylinder.
  const oldHem=root.getObjectByName('TunicWaistHem');
  if(oldHem)oldHem.visible=false;
  const hemGeo=new THREE.CylinderGeometry(.199,.212,.058,40,4,true);
  const hp=hemGeo.getAttribute('position');
  for(let i=0;i<hp.count;i++){
    const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i);
    hp.setY(i,y+.008*Math.sin(Math.atan2(z,x)*5)+.004*Math.cos(x*29));
  }
  hp.needsUpdate=true;hemGeo.computeVertexNormals();
  const shirttail=new THREE.Mesh(hemGeo,navy);
  shirttail.name='LooseHangingShirtHem';
  attachAt(shirttail,hips,W(0,.819,0));

  // Reference Uchiha fan crest: red upper fan, white lower blade & handle.
  // Real surface geometry attached to back upper torso, never a billboard HUD.
  const crest=new THREE.Group();crest.name='UchihaFanBackCrest';
  const top=new THREE.Shape();top.moveTo(-.086,0);top.absarc(0,0,.086,Math.PI,0,true);top.lineTo(-.086,0);
  const topMesh=new THREE.Mesh(new THREE.ShapeGeometry(top),red);
  const bottom=new THREE.Shape();
  bottom.moveTo(-.086,0);bottom.lineTo(.086,0);bottom.lineTo(.064,-.046);
  bottom.quadraticCurveTo(0,-.072,-.064,-.046);bottom.closePath();
  const bottomMesh=new THREE.Mesh(new THREE.ShapeGeometry(bottom),white);
  const handle=new THREE.Mesh(new THREE.BoxGeometry(.021,.071,.002),white);
  handle.position.set(0,-.084,0);
  for(const [mesh,z]of [[topMesh,0],[bottomMesh,-.001],[handle,-.001]]){
    mesh.position.z=z;crest.add(mesh);
  }
  attachAt(crest,spine,W(0,1.095,-.251));
  crest.rotation.y=Math.PI; // Face outward from the back with correct handedness.
  root.updateMatrixWorld(true);
  return {
    style:'v5-tailored-ninja-v2',shirtTriangles:shirtGeo.index.count/3,
    shortsTriangles:indices.length/3,shirtDrapeVertices:shirtDrape,
    shortsAdjustedVertices:pleatCount,hemPanels:cuffs,pockets:2,
    crest:crest.name,extraMeshes:added.length
  };
}
