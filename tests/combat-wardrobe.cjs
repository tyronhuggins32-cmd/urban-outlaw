/** Inspect the actual skinned GLB after the V8 tailored clothing replacement. */
(async()=>{
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
globalThis.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
const THREE=await import(require.resolve('three'));
const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
const {pathToFileURL}=require('node:url');
const {fitCombatWardrobe}=await import(pathToFileURL(path.resolve('scripts/combat-wardrobe.js')));
const {fitReferenceOutfit}=await import(pathToFileURL(path.resolve('scripts/reference-outfit-v8.js')));
const raw=fs.readFileSync('assets/reference-rig-fluid.glb'),n=raw.readUInt32LE(12);
const gltf=JSON.parse(raw.subarray(20,20+n));
for(const mesh of gltf.meshes)for(const primitive of mesh.primitives)delete primitive.material;
delete gltf.materials;delete gltf.images;delete gltf.textures;delete gltf.samplers;
gltf.buffers[0].uri='data:application/octet-stream;base64,'+raw.subarray(28+n).toString('base64');
const root=(await new GLTFLoader().parseAsync(JSON.stringify(gltf),'')).scene;
const wraps=fitCombatWardrobe(THREE,root);
const result=fitReferenceOutfit(THREE,root);
assert.equal(result.style,'reference-v8-ninja-tailored');
assert(result.removedUnderlayerTriangles>200,'Old dark shorts triangles must be trimmed below the new garment');
assert(result.shirtTriangles>5000,'Shirt surface does not have enough smooth fabric topology');
assert(result.shortsTriangles>6000,'Shorts surface does not have smooth geometry');
assert(result.sleeveTriangles>1500,'Short sleeves must be continuous skinned fabric');
assert(result.pieces>=11,'Incomplete cloth modules');
const shirt=root.getObjectByName('ReferenceV8NavyShirt'),
      shorts=root.getObjectByName('ReferenceV8GrayShortsWaist'),
      collar=root.getObjectByName('ReferenceV8RaisedCollar'),
      left=root.getObjectByName('LeftReferenceV8GrayShortLeg'),
      right=root.getObjectByName('RightReferenceV8GrayShortLeg');
assert(shirt?.isSkinnedMesh&&shorts?.isSkinnedMesh&&collar?.isSkinnedMesh);
assert(left?.isSkinnedMesh&&right?.isSkinnedMesh);
assert(shirt.geometry.getAttribute('uv')&&left.geometry.getAttribute('uv'));
for(const mesh of [shirt,shorts,collar,left,right]){
 const skin=mesh.geometry.getAttribute('skinWeight');
 assert.equal(mesh.skeleton.bones.length,44,'Clothing must follow original skeleton');
 for(let i=0;i<skin.count;i+=11){
  const total=skin.getX(i)+skin.getY(i)+skin.getZ(i)+skin.getW(i);
  assert(Math.abs(total-1)<.002,'Unnormalized source bone weights in '+mesh.name);
 }
}
assert.equal(root.getObjectByName('FittedNavyCombatTunic_Skinned44').visible,false,'Old shirt must be hidden');
assert.equal(root.getObjectByName('HighNinjaCollar').visible,false,'Old collar must be hidden');
const shirtBB=new THREE.Box3().setFromBufferAttribute(shirt.geometry.getAttribute('position'));
assert(shirtBB.max.x<.25 && -shirtBB.min.x<.25,'Shirt is still oversized like the old barrel shape');
const collarBB=new THREE.Box3().setFromBufferAttribute(collar.geometry.getAttribute('position'));
assert(collarBB.max.y<1.345,'Collar extends too high and would hide eyes');
assert(result.crest==='fabric-integrated-uchiha-fan','Crest needs to be printed directly onto the cloth');
assert(wraps.accessories>40,'Forearm wraps and sandals must remain present');
console.log('V8 OUTFIT VERIFIED',JSON.stringify({
 style:result.style,shirtTriangles:result.shirtTriangles,shortsTriangles:result.shortsTriangles,
 sleeveTriangles:result.sleeveTriangles,clothMeshes:result.pieces,
 shirtWidth:+(shirtBB.max.x-shirtBB.min.x).toFixed(3),
 collarTop:+collarBB.max.y.toFixed(3),oldShirtHidden:true,removedUnderlayerTriangles:result.removedUnderlayerTriangles
}));
})().catch(e=>{console.error(e);process.exit(1)});
