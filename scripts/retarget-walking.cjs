/** Bake the free PINOC Walking motion onto the existing mesh's unusual bone axes.
 * npm install --no-save three@0.166.1
 * NODE_PATH=node_modules node scripts/retarget-walking.cjs SOURCE.glb
 */
(async()=>{
const THREE=await import(require.resolve('three'));
const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
const fs=require('node:fs');
globalThis.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
async function load(path){const b=fs.readFileSync(path),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n));for(const m of g.meshes||[])for(const p of m.primitives)delete p.material;delete g.materials;delete g.images;delete g.textures;delete g.samplers;g.buffers[0].uri='data:application/octet-stream;base64,'+b.subarray(28+n).toString('base64');return new GLTFLoader().parseAsync(JSON.stringify(g),'')}
const src=await load(process.argv[2]),dst=await load('assets/reference-rig-fluid.glb');
const key=o=>o.name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,'');
const map=root=>{const m=new Map();root.traverse(o=>{if(o.isBone)m.set(key(o),o)});return m};
const sm=map(src.scene),tm=map(dst.scene);src.scene.updateMatrixWorld(true);dst.scene.updateMatrixWorld(true);
const pos=o=>o.getWorldPosition(new THREE.Vector3()),quat=o=>o.getWorldQuaternion(new THREE.Quaternion());
const end={hips:'spine',spine:'spine1',spine1:'spine2',spine2:'neck',neck:'head',leftshoulder:'leftarm',rightshoulder:'rightarm',leftarm:'leftforearm',rightarm:'rightforearm',leftforearm:'lefthand',rightforearm:'righthand',leftupleg:'leftleg',rightupleg:'rightleg',leftleg:'leftfoot',rightleg:'rightfoot',leftfoot:'lefttoebase',rightfoot:'righttoebase'};
function frame(o,m){
 const child=m.get(end[key(o)]);
 const y=child?pos(child).sub(pos(o)):o.parent.isBone?pos(o).sub(pos(o.parent)):new THREE.Vector3(0,1,0);
 y.applyQuaternion(quat(o).invert()).normalize();
 let z=new THREE.Vector3(0,0,1).applyQuaternion(quat(o).invert());
 z.addScaledVector(y,-z.dot(y));
 if(z.length()<.1){z=new THREE.Vector3(0,1,0).applyQuaternion(quat(o).invert());z.addScaledVector(y,-z.dot(y))}
 z.normalize();const x=new THREE.Vector3().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
}
const ordered=[];dst.scene.traverse(o=>{if(o.isBone&&sm.has(key(o)))ordered.push(o)});
const correction=new Map(ordered.map(o=>[key(o),frame(sm.get(key(o)),sm).multiply(frame(o,tm).invert())]));
// Foot skin uses different pivot-to-toe placement on the two rigs. Preserve
// the neutral sole orientation instead of aligning those unequal pivot vectors.
for(const o of ordered)if(/(foot|toebase)$/.test(key(o)))correction.set(key(o),quat(sm.get(key(o))).invert().multiply(quat(o)));
const length=m=>pos(m.get('leftupleg')).distanceTo(pos(m.get('leftleg')))+pos(m.get('leftleg')).distanceTo(pos(m.get('leftfoot')));
const scale=length(tm)/length(sm),restHip=pos(tm.get('hips'));
const sourceClip=src.animations[0],mixer=new THREE.AnimationMixer(src.scene);mixer.clipAction(sourceClip).play();
// Stable middle section of the repeated walk. Left heel reaches forward at 25%.
const duration=1.0277777778,start=2.2666666667-duration*.25,count=96;
function sourceAt(t){mixer.setTime(t);src.scene.updateMatrixWorld(true);return pos(sm.get('hips'));}
const first=sourceAt(start),last=sourceAt(start+duration);
const data={version:1,source:{provider:'PINOC free curated library',asset:'32d71c7f-e88a-4d1f-9c0c-1fde2da5f060',name:'Walking',creditsCharged:0},duration,groundSpeed:(last.z-first.z)/duration*scale,times:[],bones:{},hips:[]};
for(const o of ordered)data.bones[key(o)]=[];
for(let i=0;i<=count;i++){
 const u=i/count,h=sourceAt(start+u*duration);data.times.push(u*duration);
 for(const o of ordered){
  const desired=quat(sm.get(key(o))).multiply(correction.get(key(o)));
  // Fit arm clearance to this mesh's broad hips without changing the recorded swing.
  if(/^(left|right)(arm|forearm|hand)$/.test(key(o)))desired.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),key(o).startsWith('left')?.25:-.30));
  const parentQ=o.parent.getWorldQuaternion(new THREE.Quaternion());
  o.quaternion.copy(parentQ.invert().multiply(desired)).normalize();o.updateMatrixWorld(true);
 }
 const hip=tm.get('hips'),target=restHip.clone().add(new THREE.Vector3((h.x-first.x-u*(last.x-first.x))*scale,(h.y-first.y)*scale,0));
 hip.position.copy(hip.parent.worldToLocal(target));dst.scene.updateMatrixWorld(true);
 data.hips.push(...hip.position.toArray());
 for(const o of ordered)data.bones[key(o)].push(...o.quaternion.toArray());
}
// Distribute the small source-cycle drift so the baked loop closes exactly.
for(const values of Object.values(data.bones)){
 const a=new THREE.Quaternion().fromArray(values,0),b=new THREE.Quaternion().fromArray(values,count*4),delta=a.clone().multiply(b.invert());
 let previous=a;
 for(let i=0;i<=count;i++){
  const u=i/count,correction=new THREE.Quaternion().slerp(delta,u*u*(3-2*u));
  const q=correction.multiply(new THREE.Quaternion().fromArray(values,i*4)).normalize();
  if(previous.dot(q)<0)q.set(-q.x,-q.y,-q.z,-q.w);
  values.splice(i*4,4,...q.toArray());previous=q;
 }
}
for(let c=0;c<3;c++){const drift=data.hips[count*3+c]-data.hips[c];for(let i=0;i<=count;i++)data.hips[i*3+c]-=i/count*drift;}
// Ground the actual deformed foot surfaces, not just ankle pivots. This
// preserves heel/toe roll while eliminating the float from unequal meshes.
let skin;dst.scene.traverse(o=>{if(o.isSkinnedMesh&&!skin)skin=o});
const position=skin.geometry.attributes.position,feet=[];
for(let i=0;i<position.count;i++)if(position.getY(i)<.17)feet.push(i);
const vertex=new THREE.Vector3();
for(let frame=0;frame<=count;frame++){
 for(const o of ordered)o.quaternion.fromArray(data.bones[key(o)],frame*4);
 const hip=tm.get('hips');hip.position.fromArray(data.hips,frame*3);dst.scene.updateMatrixWorld(true);skin.skeleton.update();
 let floor=Infinity;
 for(const i of feet){vertex.fromBufferAttribute(position,i);skin.applyBoneTransform(i,vertex);vertex.applyMatrix4(skin.matrixWorld);floor=Math.min(floor,vertex.y)}
 const grounded=pos(hip);grounded.y-=floor;hip.position.copy(hip.parent.worldToLocal(grounded));
 data.hips.splice(frame*3,3,...hip.position.toArray());
}
for(let c=0;c<3;c++){const drift=data.hips[count*3+c]-data.hips[c];for(let i=0;i<=count;i++)data.hips[i*3+c]-=i/count*drift;}
for(const v of [data.times,data.hips,...Object.values(data.bones)])for(let i=0;i<v.length;i++)v[i]=+v[i].toFixed(7);
fs.writeFileSync('assets/animations/walking-retargeted.json',JSON.stringify(data));
console.log('BAKED',ordered.length,'bones; duration',duration,'ground speed',data.groundSpeed,'scale',scale);
})().catch(e=>{console.error(e);process.exit(1)});
