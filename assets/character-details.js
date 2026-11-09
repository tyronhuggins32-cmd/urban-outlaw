// Volumetric hair and continuous bandage textures, independent of the sheet's background.
export function refineCharacter(THREE, model) {
  const hair = new THREE.MeshStandardMaterial({color:0x111726, roughness:.8});
  const hairSheen = new THREE.MeshStandardMaterial({color:0x1a2235, roughness:.75});
  function add(geometry, material, name) {
    const mesh=new THREE.Mesh(geometry,material); mesh.name=name;
    mesh.castShadow=true; model.add(mesh); return mesh;
  }
  function lock(points, radius, material=hair) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const steps=12, sides=8, frames=curve.computeFrenetFrames(steps,false), vertices=[],indices=[];
    for(let i=0;i<=steps;i++) {
      const t=i/steps, p=curve.getPointAt(t), r=radius*Math.pow(1-t,.65)+.001;
      for(let j=0;j<sides;j++) {
        const a=j/sides*Math.PI*2;
        const q=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r)
          .addScaledVector(frames.binormals[i],Math.sin(a)*r*.55);
        vertices.push(q.x,q.y,q.z);
        if(i<steps) { const k=i*sides+j, next=i*sides+(j+1)%sides;indices.push(k,next,k+sides,next,next+sides,k+sides); }
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    add(g,material,'HEAD_SculptedLock');
  }
  const old=[]; model.traverse(o=>{if(o.isMesh && /HEAD_(HairCap|CrownSpike|BackDuckTail|LongBang|SideBang)/.test(o.name))old.push(o)});
  old.forEach(o=>o.parent.remove(o));
  const cap=add(new THREE.SphereGeometry(1,32,20,0,Math.PI*2,0,Math.PI*.60),hair,'HEAD_RoundedHair');
  cap.position.set(0,3.79,-.025);cap.scale.set(.29,.29,.25);
  for(let row=0;row<3;row++)for(let i=-2;i<=2;i++) {
    const x=i*.09, y=3.88-row*.13;
    lock([[x,y,-.08],[x*1.4,y+.09,-.24],[x*1.75,y+.20,-.43-row*.025]],.105,row===0?hairSheen:hair);
  }
  for(const side of [-1,1]) {
    lock([[side*.07,4.00,.09],[side*.23,3.86,.22],[side*.235,3.38,.23]],.094);
    lock([[side*.18,3.98,.01],[side*.29,3.79,.10],[side*.28,3.40,.08]],.078,hairSheen);
    lock([[side*.11,4.01,.10],[side*.17,3.91,.25],[side*.19,3.57,.27]],.055,hairSheen);
  }
  const cloth=new THREE.MeshStandardMaterial({color:0x26324b,roughness:1});
  const sleeves=[];model.traverse(o=>{if(o.isMesh && o.name.includes('_Sleeve'))sleeves.push(o)});
  sleeves.forEach(o=>o.parent.remove(o));
  for(const side of [-1,1]) {
    const profile=[[0,0],[.18,0],[.205,.06],[.21,.22],[.205,.39],[.16,.53],[.08,.57],[0,.58]].map(p=>new THREE.Vector2(...p));
    const sleeve=add(new THREE.LatheGeometry(profile,32),cloth,side<0?'ARM_L_SmoothSleeve':'ARM_R_SmoothSleeve');
    sleeve.position.set(side*.55,2.65,0);sleeve.rotation.z=side*.13;
  }
  function wrapMaterial(arm) {
    const c=document.createElement('canvas');c.width=64;c.height=512;const g=c.getContext('2d');
    g.fillStyle='#c8c6be';g.fillRect(0,0,64,512);
    for(let y=0;y<512;y+=27){g.fillStyle='#9f9f99';g.fillRect(0,y,64,2);g.fillStyle='#dedcd3';g.fillRect(0,y+3,64,3);}
    g.fillStyle='#1b2949';g.fillRect(0,0,64,24);
    if(arm){g.fillRect(0,153,64,24);g.fillStyle='#e0bea3';g.fillRect(0,0,64,153);g.fillStyle='#1b2949';g.fillRect(0,488,64,24);}
    else g.fillRect(0,488,64,24);
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({map,roughness:1});
  }
  const armWrap=wrapMaterial(true),shinWrap=wrapMaterial(false);
  model.traverse(o=>{
    if(!o.isMesh || !/Forearm|WrappedShin/.test(o.name))return;
    const arm=o.name.includes('Forearm'),p=o.geometry.attributes.position, uv=[];
    for(let i=0;i<p.count;i++) uv.push(.5,(p.getY(i)-(arm?1.911:.42))/(arm?.749:.56));
    o.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));o.material=arm?armWrap:shinWrap;
  });
}
