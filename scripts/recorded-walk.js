/** Recorded walking motion, retargeted offline to this exact skeleton. */
export function createRecordedWalkClip(THREE,root,data){
 if(!data||data.version!==1||!data.bones||data.times.length<60)throw new Error('Retargeted walking motion missing');
 const tracks=[];let matched=0;
 root.traverse(o=>{
  if(!o.isBone)return;
  const key=o.name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,'');
  const values=data.bones[key];
  if(values){
   if(values.length!==data.times.length*4)throw new Error('Invalid walking rotations: '+key);
   tracks.push(new THREE.QuaternionKeyframeTrack(o.uuid+'.quaternion',data.times,values));matched++;
  }
  if(key==='hips')tracks.push(new THREE.VectorKeyframeTrack(o.uuid+'.position',data.times,data.hips));
 });
 if(matched!==22)throw new Error('Recorded walk mapped '+matched+' of 22 required bones');
 return new THREE.AnimationClip('Walk',data.duration,tracks);
}
