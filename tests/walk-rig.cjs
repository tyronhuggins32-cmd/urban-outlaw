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
const rig=createReferenceClips(THREE,root,JSON.parse(fs.readFileSync('assets/animations/walking-retargeted.json','utf8'))),clip=rig.clips.find(x=>x.name==='Walk'),mixer=new THREE.AnimationMixer(root);
mixer.clipAction(clip).play();const bones={};root.traverse(o=>{if(o.isBone)for(const k of ['LeftFoot','RightFoot','LeftHand','RightHand'])if(o.name.endsWith(k))bones[k]=o;});
let mesh;root.traverse(o=>{if(o.isSkinnedMesh)mesh=o});
const restPosition=mesh.geometry.attributes.position,footVertices=[];
for(let i=0;i<restPosition.count;i++)if(restPosition.getY(i)<.17)footVertices.push(i);
const vertex=new THREE.Vector3();
const samples=[];
for(let i=0;i<120;i++){
 mixer.setTime(i/120*clip.duration);root.updateMatrixWorld(true);
 const sample={t:i/120};for(const k of ['LeftFoot','RightFoot','LeftHand','RightHand'])sample[k]=bones[k].getWorldPosition(new THREE.Vector3()).toArray();mesh.skeleton.update();let sole=Infinity;
 for(const j of footVertices){vertex.fromBufferAttribute(restPosition,j);mesh.applyBoneTransform(j,vertex);vertex.applyMatrix4(mesh.matrixWorld);sole=Math.min(sole,vertex.y)}
 sample.sole=sole;samples.push(sample);
}
for(const side of ['Left','Right']){
 const stance=samples.filter(s=>{const p=((s.t+(side==='Right'?.5:0)-.25)%1+1)%1;return p<.6});
 const ys=stance.map(x=>x[side+'Foot'][1]); const xs=samples.map(x=>x[side+'Foot'][0]);
 const clearance=Math.min(...samples.map(x=>Math.abs(x[side+'Hand'][0])));
 console.log(side,JSON.stringify({stanceVerticalRange:Math.max(...ys)-Math.min(...ys),lateralRange:Math.max(...xs)-Math.min(...xs),minHandClearance:clearance}));
 if(Math.max(...ys)-Math.min(...ys)>.10)throw Error('Excessive ankle lift during support/heel rise');
 if(Math.max(...xs)-Math.min(...xs)>.07)throw Error('Sideways foot drift');
 if(clearance<.265)throw Error('Hand hits shorts');
}
const width=Math.max(...samples.map(s=>Math.abs(s.LeftFoot[0]-s.RightFoot[0])));
if(width>.29)throw Error('Wide waddling foot stance: '+width);
const groundError=Math.max(...samples.map(s=>Math.abs(s.sole)));
if(groundError>.012)throw Error('Deformed feet hover or penetrate ground: '+groundError);
console.log('Deformed foot ground error',groundError);
console.log('RECORDED WALK VERIFIED',rig.boneCount,'bones',clip.duration,'seconds; maximum foot spacing',width);

})().catch(e=>{console.error(e);process.exit(1)});
