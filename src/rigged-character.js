/**
 * Lightweight Mixamo-style glTF skeleton animation for Urban Outlaws.
 * Animates actual bones and GPU skinning, not disconnected material-group meshes.
 * This module has no global dependencies; pass the imported THREE object.
 */
export function createCharacterController(scene, THREE) {
  const bones=new Map();
  scene.traverse(obj=>{
    if (!obj.isBone) return;
    const name=obj.name.toLowerCase().replace(/mixamorig[\s:_-]*/g,'').replace(/[^a-z]/g,'');
    bones.set(name,obj);
  });
  const keys=['hips','spine','spine1','spine2','head','leftarm','rightarm','leftforearm','rightforearm','leftupleg','rightupleg','leftleg','rightleg','leftfoot','rightfoot'];
  const found=keys.filter(name=>bones.has(name));
  if (!bones.has('hips') || found.length<8) return null;
  const base=new Map();
  for (const bone of bones.values()) base.set(bone,{quat:bone.quaternion.clone(),pos:bone.position.clone()});
  const q=new THREE.Quaternion(), e=new THREE.Euler();
  let clock=0,phase=0,blend=0;
  function poseBone(name,dx,dy,dz) {
    const bone=bones.get(name); if(!bone)return;
    e.set(dx,dy,dz,'XYZ');
    q.setFromEuler(e);
    bone.quaternion.copy(base.get(bone).quat).multiply(q);
  }
  function reset() {
    for (const [bone,initial] of base){
      bone.position.copy(initial.pos);
      bone.quaternion.copy(initial.quat);
    }
  }
  function tick(dt, state, locomotionSpeed=1){
    const jump=state==='Jump';
    const moving=state==='Run'||state==='Walk';
    const fast=state==='Run';
    clock+=dt;
    blend=THREE.MathUtils.damp(blend,moving?1:0,11,dt);
    phase+=dt*(fast?13.5:9.0)*locomotionSpeed;
    const s=Math.sin(phase), c=Math.cos(phase);
    const a=fast? .70:.39, arm=fast?.67:.42;
    reset();
    const hips=bones.get('hips');
    const back=base.get(hips).pos;
    hips.position.y=back.y+(jump?-.028:blend*.012*(1-c*c)+.004*Math.sin(clock*2.6));
    poseBone('spine',jump?-.10:blend*(fast?.09:.04), .025*s*blend, .016*s*blend);
    poseBone('spine1',jump?-.04:0,.012*s*blend, -.015*s*blend);
    poseBone('spine2',jump?0:.013*Math.sin(clock*.9),0,0);
    poseBone('head',jump?.065:-.013*Math.sin(clock*1.3),-.02*s*blend,0);
    poseBone('leftarm',jump?-.55: arm*s*blend,0,-.12);
    poseBone('rightarm',jump?-.55:-arm*s*blend,0,.12);
    poseBone('leftforearm',jump?-.30:-.09-.21*Math.max(0,s)*blend,0,0);
    poseBone('rightforearm',jump?-.30:-.09-.21*Math.max(0,-s)*blend,0,0);
    poseBone('leftupleg',jump?-.27:-a*s*blend,0,.012);
    poseBone('rightupleg',jump?-.22:a*s*blend,0,-.012);
    poseBone('leftleg',jump?.49:.58*Math.max(0,-s)*blend,0,0);
    poseBone('rightleg',jump?.49:.58*Math.max(0,s)*blend,0,0);
    poseBone('leftfoot',jump?-.08:-.17*Math.max(0,-s)*blend,0,0);
    poseBone('rightfoot',jump?-.08:-.17*Math.max(0,s)*blend,0,0);
  }
  return {tick,reset,boneCount:bones.size,foundNames:found};
}
