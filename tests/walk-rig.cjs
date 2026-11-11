(async()=>{
globalThis.ProgressEvent=class ProgressEvent {constructor(type,options){this.type=type;Object.assign(this,options)}};
const THREE=await import(require.resolve('three'));
const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
const fs=require('node:fs');
const {createReferenceClips}=await import(require('node:url').pathToFileURL(require('node:path').resolve('scripts/reference-character-animations-v2.js')));
const b=fs.readFileSync('assets/reference-rig-fluid.glb');
const size=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+size));const binary=b.subarray(28+size);
for(const m of g.meshes)for(const p of m.primitives)delete p.material;
delete g.materials;delete g.images;delete g.textures;delete g.samplers;
g.buffers[0].uri='data:application/octet-stream;base64,'+binary.toString('base64');
const {scene:root}=await new GLTFLoader().parseAsync(JSON.stringify(g),'');
const rig=createReferenceClips(THREE,root),clip=rig.clips.find(x=>x.name==='Walk'),mixer=new THREE.AnimationMixer(root);
mixer.clipAction(clip).play();const bones={};root.traverse(o=>{if(o.isBone)for(const k of ['LeftFoot','RightFoot','LeftHand','RightHand'])if(o.name.endsWith(k))bones[k]=o;});
const samples=[];
for(let i=0;i<120;i++){
 mixer.setTime(i/120*clip.duration);root.updateMatrixWorld(true);
 const sample={t:i/120};for(const k of ['LeftFoot','RightFoot','LeftHand','RightHand'])sample[k]=bones[k].getWorldPosition(new THREE.Vector3()).toArray();samples.push(sample);
}
for(const side of ['Left','Right']){
 const stance=samples.filter(s=>{const p=((s.t+(side==='Right'?.5:0)-.25)%1+1)%1;return p<.6});
 const ys=stance.map(x=>x[side+'Foot'][1]); const xs=samples.map(x=>x[side+'Foot'][0]);
 const clearance=Math.min(...samples.map(x=>Math.abs(x[side+'Hand'][0])));
 console.log(side,JSON.stringify({stanceVerticalRange:Math.max(...ys)-Math.min(...ys),lateralRange:Math.max(...xs)-Math.min(...xs),minHandClearance:clearance}));
 if(Math.max(...ys)-Math.min(...ys)>.008)throw Error('Excessive planted-foot bob');
 if(Math.max(...xs)-Math.min(...xs)>.07)throw Error('Sideways foot drift');
 if(clearance<.265)throw Error('Hand hits shorts');
}
console.log('REAL RIG WALK VERIFIED',rig.boneCount,'bones',clip.duration,'seconds');

})().catch(e=>{console.error(e);process.exit(1)});
