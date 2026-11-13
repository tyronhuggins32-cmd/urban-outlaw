/** Full character reconstruction sanity check against original 44-bone GLB. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
  globalThis.ProgressEvent=class{constructor(type,opts){Object.assign(this,opts)}};
  const THREE=await import(require.resolve('three'));
  const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
  const {verifyV5PlayableRig,restoreCanonicalBody,selectV5ShirtForPreview}
    =await import(pathToFileURL(path.resolve('scripts/v5-character-game.js')));
  const {cleanLegacyCharacterHead}
    =await import(pathToFileURL(path.resolve('scripts/clean-head-v5.js')));
  const {fitCombatWardrobe}
    =await import(pathToFileURL(path.resolve('scripts/combat-wardrobe.js')));
  const {fitReferenceOutfit}
    =await import(pathToFileURL(path.resolve('scripts/reference-outfit-v8.js')));
  function parseGLB(filename){
    const buf=fs.readFileSync(filename),n=buf.readUInt32LE(12);
    const doc=JSON.parse(buf.subarray(20,20+n));
    const offset=20+n;const size=buf.readUInt32LE(offset);
    const data=buf.subarray(offset+8,offset+8+size);
    for(const mesh of doc.meshes||[])for(const p of mesh.primitives||[])delete p.material;
    delete doc.materials;delete doc.textures;delete doc.images;delete doc.samplers;
    doc.buffers[0].uri='data:application/octet-stream;base64,'+data.toString('base64');
    return new GLTFLoader().parseAsync(JSON.stringify(doc),'').then(x=>x.scene);
  }
  const original=await parseGLB('assets/reference-rig-fluid.glb');
  const candidate=await parseGLB('assets/candidates/v5-shirt-candidate.glb');
  const proof=verifyV5PlayableRig(THREE,original,candidate);
  assert.equal(proof.replacementMode,'FULL_CHARACTER_RIG');
  const restored=restoreCanonicalBody(THREE,original,candidate);
  const cleanup=require('../assets/legacy-hair-cleanup.json');
  const head=cleanLegacyCharacterHead(THREE,candidate,cleanup);
  assert.equal(head.removedTriangles,cleanup.removedTriangles);
  assert.equal(restored.vertices,cleanup.vertexCount);
  const old=fitCombatWardrobe(THREE,candidate);
  const shorts=fitReferenceOutfit(THREE,candidate);
  const preview=selectV5ShirtForPreview(candidate);
  assert(preview.shirtMeshes===5,'Sewn V5 fabric is missing');
  assert(shorts.shortsTriangles>5000,'Playable gray shorts missing');
  assert(old.accessories>25,'Original wraps and sandals missing');
  assert(candidate.getObjectByName('V5_Shirt_Body').visible);
  assert(!candidate.getObjectByName('ReferenceV8NavyShirt').visible);
  console.log('V5 ACTUAL IN-GAME SKELETON / HEAD / SHIRT / SHORTS READY',JSON.stringify({
    prototypeStatus:preview.status,shirtMeshes:preview.shirtMeshes,
    faceVertices:restored.vertices,remappedIndices:restored.remappedBones,
    shortsTriangles:shorts.shortsTriangles,accessories:old.accessories
  }));
})().catch(e=>{console.error('V5 CHARACTER INTEGRATION BLOCKED',e);process.exit(1)});
