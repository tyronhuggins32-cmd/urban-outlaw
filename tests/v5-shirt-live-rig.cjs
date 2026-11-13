/** Technical compatibility check for Blender V5 shirt versus actual live
 * character skeleton. This test does not certify reference visual fidelity. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(require.resolve('three'));
 globalThis.ProgressEvent=class{constructor(type,opts){Object.assign(this,opts)}};
 const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
 const {inspectSculptedOutfit,V5_SHIRT_PARTS}=await import(pathToFileURL(path.resolve('scripts/import-sculpted-v5-outfit.js')));
 function parseGLB(filename){
   const buf=fs.readFileSync(filename);
   assert.equal(buf.toString('utf8',0,4),'glTF');
   const jsonLen=buf.readUInt32LE(12);
   const doc=JSON.parse(buf.subarray(20,20+jsonLen));
   const binStart=20+jsonLen;
   const binLen=buf.readUInt32LE(binStart);
   const blob=buf.subarray(binStart+8,binStart+8+binLen);
   for(const mesh of doc.meshes||[])for(const p of mesh.primitives||[])delete p.material;
   delete doc.images;delete doc.materials;delete doc.textures;delete doc.samplers;
   if(doc.buffers?.length!==1)throw Error('GLB supports only one BIN buffer in QA');
   doc.buffers[0].uri='data:application/octet-stream;base64,'+blob.toString('base64');
   return new GLTFLoader().parseAsync(JSON.stringify(doc),'').then(x=>x.scene);
 }
 const live=await parseGLB('assets/reference-rig-fluid.glb');
 const candidate=await parseGLB('art/v5/generated/v5-shirt-candidate.glb');
 const result=inspectSculptedOutfit(THREE,live,candidate);
 assert.equal(result.status,'VISUAL_CANDIDATE_NOT_APPROVED');
 assert.deepEqual(new Set(result.parts.map(x=>x.name)),new Set(V5_SHIRT_PARTS));
 assert(result.triangles>10000,'Shirt candidate is too low-poly for reference folds');
 assert(result.parts.every(p=>p.bones.length>=44),'Candidate lost original 44-joint bone mapping');
 const scale=result.sourceRigScale;
 assert([scale.x,scale.y,scale.z].every(v=>Number.isFinite(v)&&v>.5&&v<1.8),'Non-finite rig scale');
 assert.equal(result.replacementMode,'FULL_CHARACTER_RIG','Proportion changes must be treated as full rig replacement');
 assert(result.bindDeviation>.015&&result.bindDeviation<.40,'Unexpected candidate skeleton mismatch');
 console.log('V5 FULL-RIG REPLACEMENT COMPATIBILITY VERIFIED',JSON.stringify({
   parts:result.parts.map(p=>p.name),triangleCount:result.triangles,
   fullRigScale:[scale.x,scale.y,scale.z].map(v=>+v.toFixed(3)),
   bindDeviation:+result.bindDeviation.toFixed(3),
   replacementMode:result.replacementMode,status:result.status
 }));
})().catch(e=>{console.error('V5 LIVE-RIG INCOMPATIBLE',e);process.exit(1)});
