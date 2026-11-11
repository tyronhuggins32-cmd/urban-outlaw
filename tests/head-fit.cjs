const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
const THREE=await import(require.resolve('three'));
const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
const {cleanLegacyCharacterHead}=await import(pathToFileURL(path.resolve('scripts/clean-head-v5.js')));
const {installDetachableHair}=await import(pathToFileURL(path.resolve('scripts/install-detachable-hair.js')));
globalThis.ProgressEvent=class{constructor(t,o){Object.assign(this,o)}};
async function load(file){
 const raw=fs.readFileSync(file),n=raw.readUInt32LE(12),g=JSON.parse(raw.subarray(20,20+n));
 for(const m of g.materials||[]){for(const k of Object.keys(m))if(k.endsWith('Texture'))delete m[k];for(const k of Object.keys(m.pbrMetallicRoughness||{}))if(k.endsWith('Texture'))delete m.pbrMetallicRoughness[k];}
 delete g.images;delete g.textures;delete g.samplers;g.buffers[0].uri='data:application/octet-stream;base64,'+raw.subarray(28+n).toString('base64');return (await new GLTFLoader().parseAsync(JSON.stringify(g),'')).scene;
}
const root=await load('assets/reference-rig-fluid.glb'),hair=await load('assets/reference-sculpt-hair-v10.glb');
let mesh,head;root.traverse(o=>{if(o.isSkinnedMesh)mesh=o;if(o.isBone&&/head$/i.test(o.name))head=o});
const g=mesh.geometry,p=g.attributes.position,before=p.array.slice(),uv=g.attributes.uv.array.slice(),weights=g.attributes.skinWeight.array.slice(),normal=g.attributes.normal.array.slice();
const originalIndices=g.index.array.slice();
mesh.material.map=new THREE.Texture();
const cleanup=JSON.parse(fs.readFileSync('assets/legacy-hair-cleanup.json'));
const result=cleanLegacyCharacterHead(THREE,root,cleanup);assert(result.removedTriangles>10000);assert.equal(g.index.count/3,cleanup.triangleCount-result.removedTriangles);
assert.deepEqual(g.attributes.uv.array,uv);assert.deepEqual(g.attributes.skinWeight.array,weights);assert.deepEqual(g.attributes.normal.array,normal);
const triangles=new Set();for(let i=0;i<g.index.count;i+=3)triangles.add([g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)].join(','));
for(let i=0;i<originalIndices.length;i+=3){const face=Array.from(originalIndices.slice(i,i+3));if(face.some(v=>before[v*3+2]>.025&&before[v*3+2]<.142&&Math.abs(before[v*3])<.08&&before[v*3+1]<1.399&&before[v*3+1]>1.2))assert(triangles.has(face.join(',')),'Face or plate triangle was deleted');}
const referenced=new Set(g.index.array);for(const i of referenced)for(let c=0;c<3;c++)assert.equal(p.array[i*3+c],before[i*3+c],'Visible face/body geometry was warped');
const fitted=installDetachableHair(THREE,root,hair);assert.equal(fitted.meshGroups,3);assert.equal(hair.parent,head);
const box=new THREE.Box3().setFromObject(hair);assert(box.min.y>1.20&&box.max.y<1.59,'Hair floats above the skull or hangs below the neck');assert(box.max.z<.21&&box.min.z>-.23,'Hair sits in the wrong depth plane');
let hairSurfaces=0;hair.traverse(o=>{if(o.isMesh&&o.material.name==='REFERENCE SCULPT HAIR')hairSurfaces++});assert.equal(hairSurfaces,1,'Hair is not one surface model');
hair.traverse(o=>{if(o.isMesh&&o.material.name==='REFERENCE SCULPT HAIR')assert.equal(o.material.map,mesh.material.map,'Atlas is duplicated or missing');if(o.isMesh&&o.material.name==='REFERENCE FOREHEAD METAL')assert(!o.material.map,'Skin atlas leaked onto metal plate')});
const local=hair.matrix.clone();head.rotateY(.35);root.updateMatrixWorld(true);assert.deepEqual(hair.matrix.elements,local.elements,'Head movement changed accessory local fit');
console.log('HEAD FIT VERIFIED:',result.removedTriangles,'obsolete hair faces removed;',referenced.size,'visible vertices unchanged; one mounted hair mesh; bounds',box.min.toArray(),box.max.toArray());
})().catch(e=>{console.error(e);process.exit(1)});
