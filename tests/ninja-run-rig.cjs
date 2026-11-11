/* Verify the final animation on the ACTUAL loaded 44-joint GLB, not pose constants. */
(async()=>{
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
globalThis.ProgressEvent=class ProgressEvent {constructor(type,options){this.type=type;Object.assign(this,options)}};
const THREE=await import(require.resolve('three'));
const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
const {createReferenceClips}=await import(require('node:url').pathToFileURL(path.resolve('scripts/reference-character-animations-v2.js')));
const b=fs.readFileSync('assets/reference-rig-fluid.glb');
const size=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+size));
const binary=b.subarray(28+size);
for(const mesh of json.meshes)for(const p of mesh.primitives)delete p.material;
delete json.materials;delete json.images;delete json.textures;delete json.samplers;
json.buffers[0].uri='data:application/octet-stream;base64,'+binary.toString('base64');
const root=(await new GLTFLoader().parseAsync(JSON.stringify(json),'')).scene;
const walkData=JSON.parse(fs.readFileSync('assets/animations/walking-retargeted.json','utf8'));
const rig=createReferenceClips(THREE,root,walkData);
assert.equal(rig.boneCount,44);
const run=rig.clips.find(c=>c.name==='Run');
assert.ok(run);
const m=new THREE.AnimationMixer(root),action=m.clipAction(run);action.play();
const bones={};root.traverse(o=>{if(o.isBone)bones[o.name.toLowerCase().replace(/[^a-z]/g,'')]=o});
const get=name=>Object.entries(bones).find(([k])=>k.endsWith(name.toLowerCase()))?.[1];
const position=name=>get(name).getWorldPosition(new THREE.Vector3());
const measurements=[];
for(const fraction of [0,.125,.25,.375,.5,.625,.75,.875]){
 m.setTime(run.duration*fraction);root.updateMatrixWorld(true);
 const head=position('head'),hip=position('hips');
 const leftHand=position('lefthand'),rightHand=position('righthand');
 const leftArm=position('leftarm'),rightArm=position('rightarm');
 const lean=Math.atan2(head.z-hip.z,head.y-hip.y)*180/Math.PI;
 const handsBehind=[leftArm.z-leftHand.z,rightArm.z-rightHand.z];
 const sample={fraction,lean:+lean.toFixed(2),handsBehind:handsBehind.map(n=>+n.toFixed(3)),
   handHeights:[leftHand.y-hip.y,rightHand.y-hip.y].map(n=>+n.toFixed(3))};
 measurements.push(sample);
 console.log('NINJA RIG POSE',JSON.stringify(sample));
 assert.ok(lean>=28&&lean<=65,'Ninja run still looks upright or folded over: '+JSON.stringify(sample));
 assert.ok(handsBehind.every(v=>v>.18),'Hands must trail behind shoulders: '+JSON.stringify(sample));
 assert.ok(sample.handHeights.every(v=>v>.11),'Hands must stay off shorts: '+JSON.stringify(sample));
}
const averages=measurements.reduce((sum,s)=>sum+s.lean,0)/measurements.length;
assert.ok(averages>=32,'Ninja pose too upright overall: '+averages);
console.log('NINJA RUN RIG VERIFIED: actual forward lean '+averages.toFixed(1)+' degrees; arms extended behind shoulders across full cycle');
})().catch(e=>{console.error(e);process.exit(1)});
