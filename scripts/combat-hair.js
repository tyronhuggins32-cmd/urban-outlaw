/**
 * 3D swept-back hair refinement for the existing detachable reference sculpt.
 * Adds tapered, curved scalp-anchored volumes (not disconnected cone spikes).
 * Builds ONE additional scalp mesh, follows the head bone on every animation.
 */
export function refineCombatHair(THREE,root,hairScene) {
  const head=[];
  root.traverse(o=>{if(o.isBone&&o.name.toLowerCase().replace(/[^a-z]/g,'').endsWith('head'))head.push(o)});
  if(head.length!==1)throw Error('Cannot fit hair flow without skull bone');
  const hairRoot=head[0];
  const dark=new THREE.MeshStandardMaterial({color:0x29385f,roughness:.88,metalness:.02,side:THREE.DoubleSide});
  const strands=[];
  let tintCount=0;
  hairScene.traverse(o=>{
    if(!o.isMesh)return;
    if(o.material?.name==='REFERENCE SCULPT HAIR'){
      o.material.color.setRGB(.86,.90,1.0);
      o.material.roughness=.88;
      o.material.needsUpdate=true;tintCount++;
    }
  });
  if(tintCount!==1)throw Error('Expected a single source-sculpt hair material');
  // Natural asymmetric layered sweep, strongest silhouette on the side/back.
  // The original front bangs and blue ties remain untouched.
  const locks=[
    [-.13,1.485,-.055, -.23,1.53,-.28,.035],
    [-.07,1.515,-.035, -.14,1.565,-.32,.042],
    [-.025,1.525,-.04, -.07,1.58,-.35,.047],
    [.045,1.52,-.035, .09,1.57,-.35,.048],
    [.105,1.49,-.055, .21,1.54,-.30,.041],
    [-.145,1.45,-.085, -.22,1.48,-.29,.034],
    [-.078,1.46,-.09, -.13,1.49,-.32,.039],
    [.065,1.46,-.085, .13,1.49,-.33,.039],
    [.14,1.45,-.08, .23,1.48,-.29,.033],
    [0,1.465,-.10, .01,1.51,-.365,.040]
  ];
  const positions=[],uvs=[],indices=[];
  const ringCount=15,radial=10,TAU=2*Math.PI;
  for(let k=0;k<locks.length;k++){
    const [x,y,z,tipX,tipY,tipZ,radius]=locks[k];
    const base=positions.length/3;
    const path=new THREE.CatmullRomCurve3([
      new THREE.Vector3(x,y,z),
      new THREE.Vector3(x*.88+(tipX-x)*.28,y+.026,z-.052),
      new THREE.Vector3(tipX*.62+x*.38,Math.max(y,tipY)+.012,tipZ*.58+z*.42),
      new THREE.Vector3(tipX,tipY,tipZ)
    ],false,'catmullrom',.5);
    for(let i=0;i<=ringCount;i++){
      const t=i/ringCount;
      const center=path.getPoint(t),tangent=path.getTangent(Math.min(.999,t)).normalize();
      let binormal=new THREE.Vector3(0,1,0).cross(tangent).normalize();
      if(binormal.length()<.1)binormal=new THREE.Vector3(1,0,0);
      const normal=tangent.clone().cross(binormal).normalize();
      // Broad rounded base, flattened elliptical middle, needle-fine tip.
      const envelope=Math.pow(1-t,.80)*(.83+.17*Math.sin(Math.PI*t));
      const w=radius*envelope,h=radius*.38*envelope;
      for(let j=0;j<radial;j++){
        const angle=j/radial*TAU;
        const ridge=1+.075*Math.sin(3*angle+k*.8);
        const p=center.clone().addScaledVector(binormal,Math.cos(angle)*w*ridge)
          .addScaledVector(normal,Math.sin(angle)*h);
        positions.push(p.x,p.y,p.z);
        uvs.push(t,j/radial);
      }
    }
    for(let i=0;i<ringCount;i++)for(let j=0;j<radial;j++){
      const a=base+i*radial+j,b=base+i*radial+(j+1)%radial;
      const c=a+radial,d=b+radial;
      indices.push(a,b,c,b,d,c);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();
  const extension=new THREE.Mesh(g,dark);
  extension.name='SweptLayeredHairVolume_HeadSkinned';
  extension.castShadow=true;extension.receiveShadow=false;extension.frustumCulled=false;
  root.updateMatrixWorld(true);
  root.add(extension);
  hairRoot.attach(extension);
  root.updateMatrixWorld(true);
  return {style:'layered-swept-v1',locks:locks.length,triangles:indices.length/3,attachment:hairRoot.name};
}
