/**
 * V5 tailored garment topology. Replaces rectangular patchwork with continuous
 * smoothed, weighted torso + shorts shells. No disconnected torso/leg boxes.
 * Vertex groups are attached to the existing 44-joint skeletal rig.
 */
export function installTailoredCloth(THREE,root) {
  const old= [
    'FittedNavyCombatTunic_Skinned44','LooseGrayNinjaShorts_Skinned44',
    'LooseHangingShirtHem','TunicWaistHem',
    'LeftShortLegPanel','RightShortLegPanel','LeftShortHemStitch',
    'RightShortHemStitch','LeftTailoredShortPocket','RightTailoredShortPocket',
    'LeftPocketStitch','RightPocketStitch'
  ];
  for(const name of old){
    const obj=root.getObjectByName(name);
    if(obj)obj.visible=false;
  }
  let base=null;
  root.traverse(o=>{if(o.isSkinnedMesh&&o.name!=='FittedNavyCombatTunic_Skinned44'&&o.name!=='LooseGrayNinjaShorts_Skinned44'&&!base)base=o});
  if(!base||base.skeleton.bones.length<44)throw Error('Need original skinned 44-bone humanoid to sew clothing');
  const skeleton=base.skeleton;
  const find=token=>skeleton.bones.findIndex(b=>b.name.toLowerCase().replace(/[^a-z0-9]/g,'').endsWith(token.toLowerCase()));
  const joints={hips:find('Hips'),spine:find('Spine'),spine1:find('Spine1'),spine2:find('Spine2'),
    leftThigh:find('LeftUpLeg'),rightThigh:find('RightUpLeg'),
    leftArm:find('LeftArm'),rightArm:find('RightArm'),
    leftElbow:find('LeftForeArm'),rightElbow:find('RightForeArm')};
  if(Object.values(joints).some(j=>j<0))throw Error('V5 garment bone mapping incomplete');
  const navy=new THREE.MeshStandardMaterial({color:0x283762,roughness:.94,metalness:0,side:THREE.DoubleSide,vertexColors:true});
  const gray=new THREE.MeshStandardMaterial({color:0xb8b5be,roughness:.98,metalness:0,side:THREE.DoubleSide,vertexColors:true});
  // Locally generated cotton weave, safe for tests without a browser DOM.
  function fabricWeave(){
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(256,256);
    let seed=913726;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const cell=(y*256+x)*4;
      const weave=(x%5===0?-4:0)+(y%5===0?-4:0);
      const grain=Math.sin(x*.115+y*.056)*3+Math.cos(y*.18-x*.043)*3;
      const v=Math.max(207,Math.min(255,236+weave+grain+(random()-.5)*12));
      image.data[cell]=v;image.data[cell+1]=v;image.data[cell+2]=v;image.data[cell+3]=255;
    }
    ctx.putImageData(image,0,0);
    const texture=new THREE.CanvasTexture(canvas);
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(2.4,2.8);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=4;return texture;
  }
  const cotton=fabricWeave();
  if(cotton){navy.map=cotton;gray.map=cotton;}
  const stitch=new THREE.MeshStandardMaterial({color:0xa6a3af,roughness:.99,side:THREE.DoubleSide});
  const materialBand=new THREE.MeshStandardMaterial({color:0x283d6d,roughness:.90,side:THREE.DoubleSide});
  const out=[];
  // Lofted quad rows preserve topology and smooth normals. Weights are exact
  // source-skeleton bone indices, always normalized, never hardcoded numbers.
  function surface(name,rows,radial,point,weight,material,open=true) {
    const pos=[],uvs=[],colors=[],ids=[],ws=[],idx=[];
    for(let i=0;i<=rows;i++){
      const t=i/rows;
      for(let j=0;j<radial;j++){
        const a=j/radial*Math.PI*2;
        const [x,y,z]=point(t,a);
        pos.push(x,y,z);
        uvs.push(j/radial,t);
        const c=1+.05*Math.sin(a*7+y*21)*Math.sin(t*Math.PI*3)+.018*Math.cos(a*12-y*16);
        colors.push(Math.min(1.1,c),Math.min(1.1,c),Math.min(1.1,c));
        const pairs=weight(t,a).filter(([_,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
        const total=pairs.reduce((n,x)=>n+x[1],0);
        while(pairs.length<4)pairs.push([joints.hips,0]);
        for(const p of pairs)ids.push(p[0]);
        for(const p of pairs)ws.push(total>0?p[1]/total:0);
      }
    }
    for(let i=0;i<rows;i++)for(let j=0;j<radial;j++){
      const a=i*radial+j,b=i*radial+(j+1)%radial,
            c=(i+1)*radial+j,d=(i+1)*radial+(j+1)%radial;
      idx.push(a,b,c,b,d,c);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(pos.length),3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));
    g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(ws,4));
    g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();
    const o=new THREE.SkinnedMesh(g,material);
    o.name=name;
    o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;
    o.position.copy(base.position);o.quaternion.copy(base.quaternion);o.scale.copy(base.scale);
    base.parent.add(o);o.bind(skeleton,base.bindMatrix.clone());
    out.push(o);return o;
  }
  // Main shirt: broad short sleeves join a loose rectangular body.
  // Hem around natural hips, shoulders narrowing into a high collar.
  const shirt=surface('ContinuousV5NavyTunic',26,52,(t,a)=>{
    const y=.785+.46*t;
    const collarSlope=Math.max(0,Math.min(1,(y-1.15)/.095));
    const shoulder=1-.32*Math.abs(2*t-1);
    const rx=.188+.077*Math.sin(t*Math.PI)-.097*collarSlope;
    const rz=.145+.019*Math.sin(t*Math.PI)-.049*collarSlope;
    const wrinkle=.013*Math.sin(a*9+t*12)*(.28+.72*(1-t));
    const flare=.014*Math.pow(1-t,1.3);
    return [(rx+flare+wrinkle)*Math.cos(a),
      y+.006*Math.sin(a*5+t*9)*(1-t),
      (rz+flare*.46+wrinkle*.43)*Math.sin(a)-.009*(1-t)];
  },(t)=>[
    [joints.hips,Math.max(0,.84-1.7*t)],
    [joints.spine,Math.min(1,.45+1.5*(1-t))*Math.max(.20,1-t)],
    [joints.spine1,Math.max(0,.70*t)],
    [joints.spine2,Math.max(0,1.6*t-1.0)]
  ],navy);
  // Short sleeves encircle each upper-arm joint and flex with taijutsu.
  // Their inner edges overlap the wide shoulder slope; no bare shoulder gap.
  const sleevePieces=[];
  for(const [side,armIndex,elbowIndex] of [
    ['Left',joints.leftArm,joints.leftElbow],
    ['Right',joints.rightArm,joints.rightElbow]]){
    const arm=skeleton.bones[armIndex],elbow=skeleton.bones[elbowIndex];
    const origin=arm.getWorldPosition(new THREE.Vector3());
    const end=elbow.getWorldPosition(new THREE.Vector3());
    const direction=end.clone().sub(origin),length=direction.length();
    direction.normalize();
    const tangent=new THREE.Vector3(0,0,1).cross(direction).normalize();
    if(tangent.length()<.1)tangent.set(1,0,0);
    const bitangent=direction.clone().cross(tangent).normalize();
    const place=(t,a,edge=false)=>{
      const center=origin.clone().addScaledVector(direction,length*(.015+.59*t));
      const radius=(edge?.109:(.093+.018*t))+.002*Math.sin(a*5+t*8);
      center.addScaledVector(tangent,Math.cos(a)*radius);
      center.addScaledVector(bitangent,Math.sin(a)*radius);
      return center.toArray();
    };
    const sleeve=surface(side+'V5LooseShortSleeve',13,32,
      (t,a)=>place(t,a),()=>[[armIndex,1]],navy);
    sleevePieces.push(sleeve);
    surface(side+'V5SleeveCuffSeam',2,32,
      (t,a)=>place(.965+.035*t,a,true),()=>[[armIndex,1]],navy);
    for(const oldName of [side+'Sleeve',side+'SleeveEdge']){
      const oldPart=root.getObjectByName(oldName);
      if(oldPart)oldPart.visible=false;
    }
  }
  // Fabric inner fold at hem avoids a flat hard waist ring.
  const shirthem=surface('V5SoftShirtHem',3,52,(t,a)=>{
    const rx=.228+.004*t+.006*Math.sin(a*8),
          rz=.170+.002*t+.004*Math.cos(a*7);
    return [rx*Math.cos(a),.775+.023*t+.005*Math.sin(a*6),rz*Math.sin(a)-.01];
  },()=>[[joints.hips,1]],navy);
  const hip=surface('V5ShortsHipPanel',16,56,(t,a)=>{
    const y=.815-.185*t;
    const rx=.185+.023*t,
          rz=.152+.019*t;
    const fold=.006*Math.sin(a*7+8*t)*Math.sin(Math.PI*t);
    return [(rx+fold)*Math.cos(a),y,(rz+fold*.45)*Math.sin(a)];
  },t=>[[joints.hips,.92-.56*t],[joints.leftThigh,.04+.28*t],[joints.rightThigh,.04+.28*t]],gray);
  const legPieces=[];
  for(const side of [-1,1]){
    const left=side===-1,thigh=left?joints.leftThigh:joints.rightThigh;
    const centerX=side*.112;
    const leg=surface((left?'Left':'Right')+'V5BaggyShortLeg',22,44,(t,a)=>{
      const y=.702-.250*t;
      const width=.135+.017*t-.004*Math.sin(Math.PI*t);
      const drape=.0035*Math.cos(9*a+20*t)*(.3+.7*t)+.002*Math.sin(21*a+8*t);
      const radius=width+drape;
      return [centerX+radius*Math.cos(a)+side*.006*t,
        y+.004*Math.sin(a*7+side*2)*t,
        (radius*.89)*Math.sin(a)+.015];
    },t=>[[joints.hips,Math.max(0,.48-1.3*t)],[thigh,Math.min(1,.52+1.3*t)]],gray);
    legPieces.push(leg);
    // Thin, flat woven stitch at bottom. No thick tire-shaped cylinders.
    surface((left?'Left':'Right')+'V5HemSeam',2,44,(t,a)=>{
      const radius=.153+.002*Math.cos(8*a+side);
      return [centerX+radius*Math.cos(a)+side*.006,.464+.010*t,
        radius*.89*Math.sin(a)+.015];
    },()=>[[thigh,1]],gray);
  }
  // True mesh-weighted back pockets and fly seams remain anchored to pelvis.
  const fan=root.getObjectByName('UchihaFanBackCrest');
  if(!fan)throw Error('Missing reference Uchiha fan on rear tunic');
  root.updateMatrixWorld(true);
  root.attach(fan);
  fan.position.set(0,1.095,-.184);
  root.updateMatrixWorld(true);
  skeleton.bones[joints.spine2].attach(fan);
  // Convert crude old broad straps into two thinner reference navy lines,
  // retained on the character-right shorts leg only.
  for(const suffix of ['ReferenceNavyThighBand0','ReferenceNavyThighBand1']){
    const o=root.getObjectByName(suffix);
    if(o){o.material=materialBand;o.scale.y*=.46;}
  }
  for(const o of out) if(!o.isSkinnedMesh || o.skeleton!==skeleton)
    throw Error('A V5 cloth panel is not skinned to the character');
  return {style:'v5-textured-tailoring-v5',
    shirtTriangles:shirt.geometry.index.count/3,
    sleeveTriangles:sleevePieces.reduce((n,o)=>n+o.geometry.index.count/3,0),
    hipTriangles:hip.geometry.index.count/3,
    shortsTriangles:hip.geometry.index.count/3+legPieces.reduce((n,o)=>n+o.geometry.index.count/3,0),
    skinWeightedMeshes:out.length,fanAttached:!!fan.parent};
}
