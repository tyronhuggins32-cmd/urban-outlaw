const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
const page=await b.newPage({viewport:{width:900,height:900}});
page.on('pageerror',e=>console.log('PAGEERR',e.message));
await page.goto('http://127.0.0.1:8000/?review=1',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>document.getElementById('loading')?.classList.contains('hidden'),null,{timeout:70000});
const data=await page.evaluate(async()=>{
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const {createReferenceClips}=await import('./scripts/reference-character-animations-v2.js');
  const gltf=await new GLTFLoader().loadAsync('./assets/reference-rig-fluid.glb');
  const root=gltf.scene;
  const rig=createReferenceClips(THREE,root);
  if(rig.boneCount!==44 || rig.animatedBones<40 || rig.helperBones!==10){
    throw new Error('Fluid rig missing weighted animation joints: '+JSON.stringify(rig));
  }
  const skinned=[];
  root.traverse(o=>{if(o.isSkinnedMesh)skinned.push(o)});
  if(skinned.length!==1)throw new Error('Expected exactly one skinned character mesh');
  const indices=skinned[0].geometry.getAttribute('skinIndex');
  const weights=skinned[0].geometry.getAttribute('skinWeight');
  const use=Array.from({length:44},()=>0);
  for(let i=0;i<indices.count;i++){
    for(let slot=0;slot<4;slot++){
      const j=indices.getComponent(i,slot);
      if(j<44 && weights.getComponent(i,slot)>.005)use[j]++;
    }
  }
  if(use.slice(34,44).some(n=>n<12)){
    throw new Error('One or more new helper bones have no actual vertex weights: '+use.slice(34,44));
  }

  root.updateMatrixWorld(true);
  const bones={};
  root.traverse(o=>{if(o.isBone)bones[o.name.toLowerCase().replace(/[^a-z]/g,'')]=o});
  function bone(name){return Object.entries(bones).find(([n])=>n.endsWith(name.toLowerCase()))?.[1]}
  function sample(){
     root.updateMatrixWorld(true);
     const p={};
     for(const n of ['Hips','Spine','Head','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot']){
       const o=bone(n);
       if(!o)continue;
       const v=o.getWorldPosition(new THREE.Vector3());
       p[n]=v.toArray().map(x=>Math.round(x*10000)/10000);
     }
     return p;
  }
  const m=new THREE.AnimationMixer(root);
  const output={rest:sample(),bones:Object.entries(bones).map(([k,v])=>({name:v.name,parent:v.parent?.name,quaternion:v.quaternion.toArray().map(x=>+x.toFixed(4)),position:v.position.toArray().map(x=>+x.toFixed(4))})),states:{}};
  for(const clip of rig.clips){
    m.stopAllAction();m.uncacheRoot(root);
    const action=m.clipAction(clip);
    action.play();
    output.states[clip.name]=[];
    for(const fraction of [0,.125,.25,.375,.5,.625,.75,.875]){
      m.setTime(clip.duration*fraction);
      output.states[clip.name].push({t:fraction,bones:sample()});
    }
  }
  return output;
});
console.log('RIGDATA',JSON.stringify(data));

const foot=(state,t,part)=>data.states[state].find(x=>x.t===t).bones[part];
const rest=data.rest;
for(const state of ['Walk','Run']){
  const left25=foot(state,.25,'LeftFoot'), right25=foot(state,.25,'RightFoot');
  const left75=foot(state,.75,'LeftFoot'), right75=foot(state,.75,'RightFoot');
  if(left25[2] < rest.LeftFoot[2]+.09 || right25[2] > rest.RightFoot[2]-.09){
    throw new Error(state+' gait reversed or sideways at quarter-cycle');
  }
  if(left75[2] > rest.LeftFoot[2]-.09 || right75[2] < rest.RightFoot[2]+.09){
    throw new Error(state+' gait reversed or sideways at three-quarter-cycle');
  }
  for(const side of ['Left','Right']){
    for(const t of [.25,.75]){
      const current=foot(state,t,side+'Foot');
      if(Math.abs(current[0]-rest[side+'Foot'][0])>.045){
        throw new Error(state+' foot drifting laterally instead of striding forward: '+side);
      }
    }
  }
}
for(const state of ['Idle','Walk','Run','Jump']){
  for(const f of data.states[state]){
    for(const side of ['Left','Right']){
      const hand=f.bones[side+'Hand'];
      if(Math.abs(hand[0])<.265){
        throw new Error(state+' hand clips shorts/hip at phase '+f.t+': '+side+' x='+hand[0]);
      }
    }
  }
}
console.log('RIG MOTION VERIFIED: 44 real skinned joints, 10 weighted helpers, forward/back gait and hand clearance across five clips');

await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
