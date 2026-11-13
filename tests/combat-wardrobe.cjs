/** Validate visible-face collar clearance and rigged combat outfit meshes. */
(async()=>{
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
globalThis.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
const THREE=await import(require.resolve('three'));
const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
const {pathToFileURL}=require('node:url');
const {fitCombatWardrobe}=await import(pathToFileURL(path.resolve('scripts/combat-wardrobe.js')));
const raw=fs.readFileSync('assets/reference-rig-fluid.glb'),n=raw.readUInt32LE(12);
const gltf=JSON.parse(raw.subarray(20,20+n));
for(const mesh of gltf.meshes)for(const primitive of mesh.primitives)delete primitive.material;
delete gltf.materials;delete gltf.images;delete gltf.textures;delete gltf.samplers;
gltf.buffers[0].uri='data:application/octet-stream;base64,'+raw.subarray(28+n).toString('base64');
const root=(await new GLTFLoader().parseAsync(JSON.stringify(gltf),'')).scene;
const details=fitCombatWardrobe(THREE,root);
const collar=root.getObjectByName('HighNinjaCollar'),pouch=root.getObjectByName('ShinobiThighPouch');
const head=[];root.traverse(o=>{if(o.isBone&&/head$/i.test(o.name))head.push(o)});
root.updateMatrixWorld(true);
const headY=head[0].getWorldPosition(new THREE.Vector3()).y;
const collarTop=new THREE.Box3().setFromObject(collar).max.y;
assert.ok(collarTop<headY+.015,'High collar hides eyes/forehead: top '+collarTop+' vs head pivot '+headY);
assert.ok(details.shirtTriangles>500,'Fitted shirt missing');
assert.ok(details.accessories>=45,'Missing wraps/sandals/gear');
assert.ok(pouch?.parent?.isBone,'Thigh pouch must actually follow the leg rig');
console.log('COMBAT COSTUME VERIFIED',JSON.stringify({collarTop,headY,shirtTriangles:details.shirtTriangles,accessories:details.accessories,wraps:details.wrapBands}));
})().catch(e=>{console.error(e);process.exit(1)});
