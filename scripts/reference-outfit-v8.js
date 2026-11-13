/**
 * Urban Outlaw V8: tailored reference shirt + gray Bermudas.
 *
 * An intentionally new garment architecture, not more cylinders stacked on
 * the older v4/v5 pieces. Smooth 3D pattern shells are weighted to the SAME
 * 44-bone skeleton, with a dark navy raised collar, eased shoulders, sleeves,
 * shaped waist, leg-separated fitted shorts and genuine cloth textures.
 */
export function fitReferenceOutfit(THREE,root) {
  root.updateMatrixWorld(true);
  let body=null;
  root.traverse(o=>{
    if(o.isSkinnedMesh && !/^v5_shirt_/i.test(o.name) && o.name!=='FittedNavyCombatTunic_Skinned44' &&
       o.name!=='LooseGrayNinjaShorts_Skinned44' && !body)body=o;
  });
  if(!body||body.skeleton.bones.length<44)throw new Error('Reference clothing requires original 44-bone body');
  // Cut ONLY the covered original undergarment polygons from the source
  // skinned body, preserving all hands, exposed legs, neck and face. The legacy
  // dark-gray shorts previously broke through the new light-gray waist in
  // multiple sharp triangular artifacts.
  const source=body.geometry,points=source.getAttribute('position');
  const si=source.getAttribute('skinIndex'),sw=source.getAttribute('skinWeight');
  const original=source.index?.array;
  if(!original||!si||!sw)throw new Error('Reference outfit requires indexed, weighted body geometry');
  const names=body.skeleton.bones.map(b=>b.name.toLowerCase());
  function covered(i){
    const y=points.getY(i),x=points.getX(i),z=points.getZ(i);
    if(y<.435||y>.870||Math.abs(x)>.36||Math.abs(z)>.32)return false;
    let weight=0;
    for(let k=0;k<4;k++){
      const name=names[si.getComponent(i,k)]||'';
      if(/hips|upleg|spine/.test(name))weight+=sw.getComponent(i,k);
    }
    return weight>.33;
  }
  const cleanIndex=[],cleanGroups=[];
  const groupSet=source.groups.length?source.groups:
    [{start:0,count:original.length,materialIndex:0}];
  for(const group of groupSet){
    const before=cleanIndex.length;
    for(let k=group.start;k<group.start+group.count;k+=3){
      const a=original[k],b=original[k+1],c=original[k+2];
      if(covered(a)&&covered(b)&&covered(c))continue;
      cleanIndex.push(a,b,c);
    }
    const count=cleanIndex.length-before;
    if(count)cleanGroups.push({start:before,count,materialIndex:group.materialIndex});
  }
  const removedUnderlayerTriangles=(original.length-cleanIndex.length)/3;
  if(removedUnderlayerTriangles<200)throw new Error('Old shorts underlayer was not removed');
  const unclipped=source.clone();
  unclipped.setIndex(cleanIndex);
  unclipped.clearGroups();
  for(const g of cleanGroups)unclipped.addGroup(g.start,g.count,g.materialIndex);
  body.geometry=unclipped;

  const skeleton=body.skeleton;
  const get=k=>skeleton.bones.findIndex(b=>b.name.toLowerCase().replace(/[^a-z0-9]/g,'').endsWith(k.toLowerCase()));
  const bi={
    hips:get('Hips'),spine:get('Spine'),spine1:get('Spine1'),spine2:get('Spine2'),
    leftArm:get('LeftArm'),rightArm:get('RightArm'),leftThigh:get('LeftUpLeg'),rightThigh:get('RightUpLeg')
  };
  if(Object.values(bi).some(v=>v<0))throw new Error('Reference garment is missing bone mapping');

  // Hide the earlier clipped stacked tube silhouette, retaining the user's
  // high resolution head, source body, forearm wraps and footwear.
  const obsolete=new Set([
    'FittedNavyCombatTunic_Skinned44','LooseGrayNinjaShorts_Skinned44',
    'HighNinjaCollar','CollarTopSeam','TunicWaistHem','LooseHangingShirtHem',
    'UchihaFanBackCrest','LeftSleeve','RightSleeve','LeftSleeveEdge','RightSleeveEdge',
    'LeftShortLegPanel','RightShortLegPanel','LeftShortHemStitch','RightShortHemStitch',
    'LeftTailoredShortPocket','RightTailoredShortPocket',
    'LeftPocketStitch','RightPocketStitch','OuterThighStrap',
    'ShinobiThighPouch','PouchBuckle','ReferenceNavyThighBand0','ReferenceNavyThighBand1'
  ]);
  root.traverse(o=>{if(obsolete.has(o.name))o.visible=false;});
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  const mix=(a,b,t)=>a+(b-a)*t;
  const profile=[
    // y, lateral half-width, front/back half-depth.
    [.795,.201,.145],[.850,.199,.140],[.915,.191,.134],
    [1.010,.186,.131],[1.097,.196,.134],[1.160,.213,.152],
    [1.207,.183,.140],[1.250,.108,.097]
  ];
  function atHeight(y) {
    for(let i=1;i<profile.length;i++)if(y<=profile[i][0]){
      const lo=profile[i-1],hi=profile[i],t=smooth((y-lo[0])/(hi[0]-lo[0]));
      return [mix(lo[1],hi[1],t),mix(lo[2],hi[2],t)];
    }
    return profile.at(-1).slice(1);
  }
  // Shared matching fabric textures. The fan symbol is baked into the shirt
  // atlas, with no protruding, floating 2D panel or duplicate crest.
  function cottonCanvas(color,logo=false) {
    if(typeof document==='undefined')return null;
    const size=512,c=document.createElement('canvas');
    c.width=c.height=size;
    const ctx=c.getContext('2d'),img=ctx.createImageData(size,size);
    const base=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16)];
    let seed=650731;
    const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const index=(y*size+x)*4;
      const threads=(x%4===0?-4:0)+(y%4===0?-5:0);
      const noise=(rand()-.5)*9+Math.sin(y*.13+x*.05)*2;
      const shade=1+(threads+noise)/255;
      img.data[index]=Math.round(base[0]*shade);
      img.data[index+1]=Math.round(base[1]*shade);
      img.data[index+2]=Math.round(base[2]*shade);
      img.data[index+3]=255;
    }
    ctx.putImageData(img,0,0);
    if(logo){
      // Back faces negative Z. In the torso's cylindrical UV map,
      // that is u=.75. t=.7 is the upper-center of the jersey.
      const x=size*.75,y=size*.355,r=34;
      ctx.beginPath();ctx.arc(x,y,r,Math.PI,2*Math.PI);ctx.closePath();
      ctx.fillStyle='#b24c58';ctx.fill();
      ctx.beginPath();ctx.moveTo(x-r,y+1);ctx.lineTo(x+r,y+1);
      ctx.quadraticCurveTo(x+r*.70,y+27,x,y+29);
      ctx.quadraticCurveTo(x-r*.70,y+27,x-r,y+1);
      ctx.closePath();ctx.fillStyle='#f1eeeb';ctx.fill();
      ctx.fillRect(x-5,y+26,10,38);
      ctx.lineWidth=1.4;ctx.strokeStyle='#d6d1d0';
      ctx.beginPath();ctx.moveTo(x-r,y+2);ctx.lineTo(x+r,y+2);ctx.stroke();
    }
    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
    tex.anisotropy=4;
    return tex;
  }
  const navy=new THREE.MeshStandardMaterial({
    color:0xffffff,roughness:.94,side:THREE.DoubleSide,
    map:cottonCanvas('#1e2e58',true)
  });
  const navyPlain=new THREE.MeshStandardMaterial({
    color:0xffffff,roughness:.94,side:THREE.DoubleSide,
    map:cottonCanvas('#1e2e58')
  });
  const gray=new THREE.MeshStandardMaterial({
    color:0xffffff,roughness:.97,side:THREE.DoubleSide,
    map:cottonCanvas('#bebcc2')
  });
  const navyLine=new THREE.MeshStandardMaterial({color:0x263a68,roughness:.9,side:THREE.DoubleSide});
  const seam=new THREE.MeshStandardMaterial({color:0xaaa8ae,roughness:1,side:THREE.DoubleSide});
  const pocket=new THREE.MeshStandardMaterial({color:0x9c999f,roughness:.96,side:THREE.DoubleSide});
  const all=[];
  // The meshes share the source rig's bind pose, so movements remain
  // continuous even during simultaneous footwork + punch blends.
  function cloth(name,rows,radials,fn,weightFn,material) {
    const vert=[],uv=[],idx=[],skinIndex=[],skinWeight=[];
    for(let i=0;i<=rows;i++){
      const t=i/rows;
      for(let j=0;j<radials;j++){
        const u=j/radials,a=u*Math.PI*2,[x,y,z]=fn(t,a);
        vert.push(x,y,z);uv.push(u,t);
        const raw=weightFn(t,a).filter(p=>p[1]>0).sort((x,y)=>y[1]-x[1]).slice(0,4);
        const total=raw.reduce((s,p)=>s+p[1],0);
        if(total<=0)throw Error('Unweighted vertex in '+name);
        for(let k=0;k<4;k++){
          skinIndex.push(raw[k]?.[0]??bi.hips);
          skinWeight.push(raw[k]?raw[k][1]/total:0);
        }
      }
    }
    for(let i=0;i<rows;i++)for(let j=0;j<radials;j++){
      const a=i*radials+j,b=i*radials+(j+1)%radials,
        c=(i+1)*radials+j,d=(i+1)*radials+(j+1)%radials;
      idx.push(a,b,c,b,d,c);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vert,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));
    geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
    geo.setIndex(idx);geo.computeVertexNormals();geo.computeBoundingSphere();
    const mesh=new THREE.SkinnedMesh(geo,material);
    mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=false;mesh.frustumCulled=false;
    mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);
    body.parent.add(mesh);mesh.bind(skeleton,body.bindMatrix.clone());
    all.push(mesh);return mesh;
  }

  // Slightly rectangular drape; the original 7.4 mid-torso bulge is gone.
  const torso=cloth('ReferenceV8NavyShirt',48,72,(t,a)=>{
    const y=mix(.795,1.250,t),[rx,rz]=atHeight(y);
    const folds=(.0035+.004*(1-t))*Math.sin(a*8+16*t)+
      .002*Math.sin(a*13-11*t);
    const frontBias=Math.sin(a)>0?.009:0;
    const upperShoulder=Math.exp(-Math.pow((y-1.192)/.055,2));
    const shoulderBack=Math.sin(a)<0?.045*upperShoulder*Math.pow(Math.abs(Math.cos(a)),.65):0;
    return [(rx+folds)*Math.cos(a),
      y+.004*Math.sin(a*5+8*t)*(1-t),
      (rz+shoulderBack+folds*.38+frontBias)*Math.sin(a)-.007];
  },(t)=>{
    const w=smooth(t);
    return [[bi.hips,Math.max(0,.90-2.0*w)],
      [bi.spine,Math.max(0,1-Math.abs(w-.42)*2.0)],
      [bi.spine1,Math.max(0,1-Math.abs(w-.80)*2.0)],
      [bi.spine2,Math.max(0,(w-.76)*3.5)]];
  },navy);

  // Lower shirt hem subtly flares outward, with the same shape as the body.
  // It is slightly outside the gray waist to prevent z-fighting.
  const hem=cloth('ReferenceV8ShirtHem',3,72,(t,a)=>{
    const y=.791+.018*t,[rx,rz]=atHeight(y);
    return [(rx+.003)*Math.cos(a),y+.004*Math.sin(a*6),
      (rz+.002)*Math.sin(a)-.007];
  },()=>[[bi.hips,1]],navyPlain);

  // High, standing collar with an OPEN front edge below the chin.
  const collar=cloth('ReferenceV8RaisedCollar',12,56,(t,a)=>{
    const sin=Math.sin(a),front=smooth((sin-.1)/.9);
    const y=mix(1.224,1.334-.077*front,t);
    const rx=mix(.109,.121,t),rz=mix(.102,.110,t);
    return [rx*Math.cos(a),y,rz*sin-.006];
  },(t)=>[[bi.spine2,1]],navyPlain);

  // Smooth shoulder-to-sleeve join. The sleeve's uppermost rings start
  // INSIDE the shoulder shell and gradually fall away from the body.
  const arms=[];
  for(const [side,key] of [['Left',bi.leftArm],['Right',bi.rightArm]]){
    const arm=skeleton.bones[key];
    const upper=arm.getWorldPosition(new THREE.Vector3());
    const elbow=skeleton.bones.find(b=>b.name.toLowerCase().endsWith(side.toLowerCase()+'forearm'));
    if(!elbow)throw Error('Missing arm hinge for sleeve');
    const down=elbow.getWorldPosition(new THREE.Vector3()).sub(upper);
    const length=down.length();down.normalize();
    let uAxis=new THREE.Vector3(0,0,1).cross(down);
    if(uAxis.length()<.15)uAxis=new THREE.Vector3(1,0,0);
    uAxis.normalize();
    const vAxis=down.clone().cross(uAxis).normalize();
    const sleeveFn=(t,a,hem=false)=>{
      const p=upper.clone().addScaledVector(down,length*(.05+.49*t));
      const radius=hem?.079:mix(.098,.079,t)+.002*Math.sin(8*a+5*t);
      p.addScaledVector(uAxis,radius*Math.cos(a));
      p.addScaledVector(vAxis,radius*.94*Math.sin(a));
      return p.toArray();
    };
    arms.push(cloth(side+'ReferenceV8ClothSleeve',18,44,(t,a)=>sleeveFn(t,a),
      ()=>[[key,1]],navyPlain));
    cloth(side+'ReferenceV8SleeveHem',2,44,(t,a)=>sleeveFn(.97+.03*t,a,true),
      ()=>[[key,1]],navyLine);
  }

  // A waist yoke runs from hip to crotch and tapers very slightly outward.
  // ALL its vertices follow the pelvis, preventing older jagged waist gaps.
  const hip=cloth('ReferenceV8GrayShortsWaist',24,64,(t,a)=>{
    const y=mix(.823,.665,t);
    const x=mix(.178,.191,t),z=mix(.127,.145,t);
    const fold=.006*Math.cos(7*a+15*t)*Math.sin(Math.PI*t);
    return [(x+fold)*Math.cos(a),y,(z+fold*.4)*Math.sin(a)];
  },()=>[[bi.hips,1]],gray);

  // Two true thigh-weighted short legs, loose and knee length, with a small
  // overlap inside the waist shell that hides seams on diagonal combat poses.
  const legMeshes=[];
  for(const [side,thigh] of [['Left',bi.leftThigh],['Right',bi.rightThigh]]){
    const sign=side==='Left'?-1:1,center=sign*.105;
    const legFn=(t,a,offset=0)=>{
      const y=mix(.694,.446,t);
      const r=mix(.113,.125,t)+
        .005*Math.sin(a*10+19*t)*(0.35+.65*t)+
        .002*Math.sin(a*5-11*t)*Math.sin(Math.PI*t);
      return [center+(r+offset)*Math.cos(a)+sign*.005*t,
        y+.006*Math.sin(5*a+11*t)*t,
        (r*.88+offset)*Math.sin(a)+.008];
    };
    const legWeight=t=>[[bi.hips,1-smooth(t/.40)],[thigh,smooth(t/.40)]];
    legMeshes.push(cloth(side+'ReferenceV8GrayShortLeg',36,56,(t,a)=>legFn(t,a),
      t=>legWeight(t),gray));
    cloth(side+'ReferenceV8ShortHemSeam',2,56,(t,a)=>legFn(.976+.024*t,a,.0015),
      ()=>[[thigh,1]],seam);
    if(side==='Right'){
      // Two stitched navy bands 1/3 up from the right shorts leg hem.
      for(const [j,at] of [.64,.77].entries()){
        cloth('RightReferenceV8ThighBand'+j,2,56,(t,a)=>
          legFn(at+t*.055,a,.003),u=>legWeight(at+u*.055),navyLine);
      }
    }
  }

  // Pocket flap, flush with the outside of the shorts rather than a box.
  // The panel is mounted to a thigh bone and follows its actual rotation.
  const pocketSide=skeleton.bones[bi.rightThigh];
  const flat=new THREE.Shape();
  flat.moveTo(-.041,.065);flat.lineTo(.041,.065);flat.lineTo(.041,-.050);
  flat.lineTo(0,-.069);flat.lineTo(-.041,-.050);flat.closePath();
  const pouch=new THREE.Mesh(new THREE.ShapeGeometry(flat),navyLine);
  pouch.name='ReferenceV8ThighPouch';
  pouch.castShadow=true;pouch.frustumCulled=false;
  const p=pocketSide.getWorldPosition(new THREE.Vector3());
  root.add(pouch);
  pouch.position.copy(p).add(new THREE.Vector3(.235,-.22,.017));
  root.updateMatrixWorld(true);pocketSide.attach(pouch);

  for(const piece of all)if(piece.skeleton!==skeleton)
    throw new Error('Reference clothing is not bound to original skeleton');
  return {
    style:'reference-v8-ninja-tailored',pieces:all.length,
    shirtTriangles:torso.geometry.index.count/3,
    shortsTriangles:hip.geometry.index.count/3+
      legMeshes.reduce((sum,o)=>sum+o.geometry.index.count/3,0),
    sleeveTriangles:arms.reduce((sum,o)=>sum+o.geometry.index.count/3,0),
    crest:'fabric-integrated-uchiha-fan',collar:collar.name,
    fabricTexture:!!navy.map,removedUnderlayerTriangles
  };
}
