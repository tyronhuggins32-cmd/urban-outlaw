/**
 * Urban Outlaw combat costume V1.
 * All pieces are real 3D meshes on the existing 44-joint character.
 * The fitted shirt uses the SAME skinned body topology/weights as the sculpt;
 * accessories ride the corresponding bones, instead of floating at world XYZ.
 */
export function fitCombatWardrobe(THREE, root) {
  root.updateMatrixWorld(true);
  let body;
  const bones=[];
  root.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh&&!body)body=o});
  if(!body || bones.length<34)throw Error('Combat wardrobe requires original skinned rig');
  const find=(suffix)=>bones.find(b=>b.name.toLowerCase().replace(/[^a-z0-9]/g,'').endsWith(suffix.toLowerCase()));
  const spine=find('Spine2'),neck=find('Neck'),leftArm=find('LeftArm'),rightArm=find('RightArm');
  const leftElbow=find('LeftForeArm'),rightElbow=find('RightForeArm');
  const leftHand=find('LeftHand'),rightHand=find('RightHand');
  const leftCalf=find('LeftLeg'),rightCalf=find('RightLeg'),leftFoot=find('LeftFoot'),rightFoot=find('RightFoot');
  const leftThigh=find('LeftUpLeg'),rightThigh=find('RightUpLeg');
  if([spine,neck,leftArm,rightArm,leftElbow,rightElbow,leftHand,rightHand,leftCalf,rightCalf,leftFoot,rightFoot,leftThigh,rightThigh].some(v=>!v)) throw Error('Wardrobe joint map incomplete');

  const navy=new THREE.MeshStandardMaterial({color:0x1b294e,roughness:.92,metalness:0,side:THREE.DoubleSide});
  const hem=new THREE.MeshStandardMaterial({color:0x253862,roughness:.84});
  const dark=new THREE.MeshStandardMaterial({color:0x101a38,roughness:.83});
  const wraps=new THREE.MeshStandardMaterial({color:0xe4e2de,roughness:1});
  const trim=new THREE.MeshStandardMaterial({color:0x9da7bf,roughness:.65,metalness:.2});
  const gear=new THREE.MeshStandardMaterial({color:0x212c49,roughness:.86});
  const result={meshes:[],shirtTriangles:0,wrapBands:0,boots:0};
  const mesh=(g,m,name)=>{const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;result.meshes.push(o);return o};
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const worldPos=b=>b.getWorldPosition(new THREE.Vector3());
  const mount=(o,b)=>{root.add(o);root.updateMatrixWorld(true);b.attach(o);o.updateMatrixWorld(true);return o};

  // Extract cloth by triangle from the sculpted skinned mesh. Preserve exact
  // skin weights, normals, UVs, and bone mapping for deforming with animations.
  const source=body.geometry,position=source.getAttribute('position'),joint=source.getAttribute('skinIndex'),weight=source.getAttribute('skinWeight');
  const src=source.index?.array;
  if(!src||!joint||!weight)throw Error('Expected indexed skinned sculpt');
  const allowed=/hips|spine|chestbreath/i;
  const skinNames=body.skeleton.bones.map(b=>b.name);
  function bodyWeight(i){
    let w=0;
    for(let k=0;k<4;k++){
      const id=joint.getComponent(i,k);
      if(allowed.test(skinNames[id]||''))w+=weight.getComponent(i,k);
    }
    return w;
  }
  const eligible=new Uint8Array(position.count);
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    eligible[i]=(y>.805&&y<1.334&&Math.abs(x)<.275&&Math.abs(z)<.23&&bodyWeight(i)>.48)?1:0;
  }
  const triangles=[];
  for(let i=0;i<src.length;i+=3){
    const a=src[i],b=src[i+1],c=src[i+2];
    if(eligible[a]&&eligible[b]&&eligible[c])triangles.push(a,b,c);
  }
  if(triangles.length<600)throw Error('Could not fit navy combat shirt: '+triangles.length/3+' triangles');
  const shirtGeometry=source.clone();
  shirtGeometry.setIndex(triangles);
  const p=shirtGeometry.getAttribute('position'),n=shirtGeometry.getAttribute('normal');
  // Gentle offset stops skin z-fighting while keeping original rig deformation.
  if(n)for(let i=0;i<p.count;i++){
    if(eligible[i]){
      const x=p.getX(i),z=p.getZ(i),y=p.getY(i);
      const offset=.012;
      p.setXYZ(i,x+n.getX(i)*offset,y+n.getY(i)*offset,z+n.getZ(i)*offset);
    }
  }
  p.needsUpdate=true;
  shirtGeometry.computeBoundingSphere();
  const shirt=new THREE.SkinnedMesh(shirtGeometry,navy);
  shirt.name='FittedNavyCombatTunic_Skinned44';
  shirt.castShadow=true;shirt.frustumCulled=false;shirt.receiveShadow=false;
  shirt.position.copy(body.position);shirt.quaternion.copy(body.quaternion);shirt.scale.copy(body.scale);
  body.parent.add(shirt);
  shirt.bind(body.skeleton,body.bindMatrix.clone());
  result.meshes.push(shirt);result.shirtTriangles=triangles.length/3;

  // Raised dark-blue collar enclosing the lower neck, linked to upper spine.
  const collar=mesh(new THREE.CylinderGeometry(.151,.163,.185,32,2,true),navy,'HighNinjaCollar');
  collar.position.set(0,1.288,-.016);mount(collar,spine);
  const collarEdge=mesh(new THREE.TorusGeometry(.151,.009,7,32),hem,'CollarTopSeam');
  collarEdge.rotation.x=Math.PI/2;collarEdge.position.set(0,1.379,-.016);mount(collarEdge,spine);
  // Band at shirt waist and hem, without covering fitted shorts.
  const waist=mesh(new THREE.CylinderGeometry(.164,.165,.06,28,1,true),dark,'TunicWaistHem');
  waist.position.set(0,.837,0);mount(waist,find('Hips'));

  // Tube accessories in the unchanged source skeleton's bind-space.
  const axisY=V(0,1,0);
  function tubeBetween(name,a,b,ratioA,ratioB,radius,material,bindBone){
    const start=worldPos(a),end=worldPos(b),from=start.clone().lerp(end,ratioA),to=start.clone().lerp(end,ratioB);
    const dir=to.clone().sub(from),len=dir.length();
    const o=mesh(new THREE.CylinderGeometry(radius*.94,radius,len,16,1,false),material,name);
    o.position.copy(from.add(to).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(axisY,dir.normalize());
    mount(o,bindBone);return o;
  }
  function ringAt(name,a,b,t,radius,thickness,material,bindBone){
    const start=worldPos(a),end=worldPos(b),direction=end.clone().sub(start).normalize();
    const ring=mesh(new THREE.CylinderGeometry(radius,radius,thickness,14,1,true),material,name);
    ring.position.copy(start.lerp(end,t));ring.quaternion.setFromUnitVectors(axisY,direction);
    mount(ring,bindBone);result.wrapBands++;return ring;
  }
  for(const side of ['Left','Right']){
    const arm=side==='Left'?leftArm:rightArm,elbow=side==='Left'?leftElbow:rightElbow,hand=side==='Left'?leftHand:rightHand;
    const calf=side==='Left'?leftCalf:rightCalf,foot=side==='Left'?leftFoot:rightFoot;
    const thigh=side==='Left'?leftThigh:rightThigh;
    // Soft, fitted short sleeves, sized to upper arm, with solid rolled trim.
    tubeBetween(side+'Sleeve',arm,elbow,.10,.58,.069,navy,arm);
    ringAt(side+'SleeveEdge',arm,elbow,.58,.071,.018,hem,arm);
    // Cloth forearm wraps follow the true elbow-to-wrist axis while attacking.
    tubeBetween(side+'ForearmWrapBase',elbow,hand,.21,.91,.052,wraps,elbow);
    for(let i=0;i<8;i++)ringAt(side+'ForearmWrap'+i,elbow,hand,.24+i*.088,.054,.009,i%3===0?trim:wraps,elbow);
    // Shin bandages + a navy cuff at the upper edge of each shin.
    tubeBetween(side+'ShinUnderwrap',calf,foot,.22,.91,.086,wraps,calf);
    for(let i=0;i<8;i++)ringAt(side+'ShinWrap'+i,calf,foot,.24+i*.088,.089,.013,i%3===0?trim:wraps,calf);
    ringAt(side+'TopShinBand',calf,foot,.19,.094,.027,navy,calf);
    ringAt(side+'AnkleCuff',calf,foot,.92,.088,.034,navy,calf);
    // Sandal sole and wide forefoot strap, bound to each actual foot joint.
    const sole=mesh(new THREE.BoxGeometry(.168,.036,.275),dark,side+'CombatSandalSole');
    sole.position.copy(worldPos(foot)).add(V(0,-.059,.084));mount(sole,foot);result.boots++;
    const sandal=mesh(new THREE.BoxGeometry(.170,.045,.073),navy,side+'OpenToeStrap');
    sandal.position.copy(worldPos(foot)).add(V(0,-.015,.132));mount(sandal,foot);
    // Trouser band accents and a compact padded equipment pouch.
    if(side==='Right'){
      const strap=mesh(new THREE.BoxGeometry(.024,.047,.22),navy,'OuterThighStrap');
      strap.position.copy(worldPos(thigh)).add(V(-.10,-.19,.02));mount(strap,thigh);
      const pouch=mesh(new THREE.BoxGeometry(.083,.19,.112),gear,'ShinobiThighPouch');
      pouch.position.copy(worldPos(thigh)).add(V(-.151,-.215,.016));mount(pouch,thigh);
      const buckle=mesh(new THREE.BoxGeometry(.012,.042,.045),trim,'PouchBuckle');
      buckle.position.copy(worldPos(thigh)).add(V(-.199,-.18,.04));mount(buckle,thigh);
    }
  }
  root.updateMatrixWorld(true);
  return {shirtTriangles:result.shirtTriangles,accessories:result.meshes.length-1,wrapBands:result.wrapBands,boots:result.boots,style:'navy-combat-uniform-v1'};
}
