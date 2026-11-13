/**
 * Contract tests for original real-time skinned martial arts animation.
 * Checks all clips on the actual imported 44-joint GLB, not a static drawing.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(require.resolve('three'));
 const {GLTFLoader}=await import(require.resolve('three/examples/jsm/loaders/GLTFLoader.js'));
 const {createFluidCombatClips}=await import(pathToFileURL(path.resolve('scripts/fluid-combat-clips.js')));
 globalThis.ProgressEvent=class{constructor(type,opts){Object.assign(this,opts)}};
 const raw=fs.readFileSync('assets/reference-rig-fluid.glb'),n=raw.readUInt32LE(12);
 const json=JSON.parse(raw.subarray(20,20+n));
 for(const mesh of json.meshes)for(const part of mesh.primitives)delete part.material;
 delete json.materials;delete json.images;delete json.textures;delete json.samplers;
 json.buffers[0].uri='data:application/octet-stream;base64,'+raw.subarray(28+n).toString('base64');
 const root=(await new GLTFLoader().parseAsync(JSON.stringify(json),'')).scene;
 const clips=createFluidCombatClips(THREE,root);
 const expected=['Ready','Light','Cross','Heavy','Kick','Sweep','Guard','Dodge','Slip','Parry','Hit'];
 assert.deepEqual(clips.map(c=>c.name),expected);
 for(const clip of clips){
   assert(clip.duration>.25&&clip.duration<1.2,clip.name+' duration');
   assert(clip.tracks.length>=28,clip.name+' does not animate whole skeleton');
   for(const tr of clip.tracks){
     assert(tr.values.every(Number.isFinite),tr.name+' has non-finite bone');
     assert(tr.times.length>=31,tr.name+' missing animation phases');
     for(let i=0;i<tr.times.length;i++){
       const q=tr.values.slice(i*4,i*4+4);
       assert(Math.abs(Math.hypot(...q)-1)<.002,tr.name+' invalid quaternion');
       if(i){
         const before=tr.values.slice((i-1)*4,(i-1)*4+4);
         const dot=q.reduce((a,v,j)=>a+v*before[j],0);
         assert(dot>.72,tr.name+' snaps suddenly, quaternion dot '+dot);
       }
     }
   }
 }
 const action=(name)=>clips.find(c=>c.name===name);
 const find=(name,term)=>action(name).tracks.find(t=>t.name.includes(term+'.quaternion'));
 const left=find('Light','LeftArm'),crossLeft=find('Cross','LeftArm');
 const right=find('Light','RightArm'),crossRight=find('Cross','RightArm');
 assert(left&&right&&crossLeft&&crossRight,'Missing alternating punch shoulder tracks');
 const range=track=> {
   const first=track.values.slice(0,4);
   let total=0;
   for(let i=1;i<track.times.length;i++){
     const q=track.values.slice(i*4,i*4+4);
     total=Math.max(total,1-Math.abs(q.reduce((a,v,j)=>a+v*first[j],0)));
   }
   return total;
 };
 assert(range(left)>range(right)*1.1,'Lead jab must favor lead arm');
 assert(range(find('Cross','RightArm'))>range(crossLeft)*1.1,'Cross must favor rear arm');
 assert(range(find('Dodge','LeftLeg'))>.001,'Dodge must involve lower-body displacement');
 assert(range(find('Kick','RightUpLeg'))>.003,'Kick must move the thigh, not just shin');
 console.log('FLUID COMBAT VERIFIED',JSON.stringify({
  clips:expected,animatedJointTracks:action('Light').tracks.length,
  jabArmMotion:+range(left).toFixed(3),crossArmMotion:+range(crossRight).toFixed(3),
  actionFrames:action('Light').tracks[0].times.length
 }));
})().catch(e=>{console.error(e);process.exit(1)});
