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
  const {createReferenceClips}=await import('./scripts/reference-character-animations.js');
  const gltf=await new GLTFLoader().loadAsync('./assets/reference-rig.glb');
  const root=gltf.scene;
  const rig=createReferenceClips(THREE,root);
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
await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
