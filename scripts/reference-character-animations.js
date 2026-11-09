/**
 * Urban Outlaw - animation clips for the continuous skinned reference character.
 * These replace the old segmented mannequin animation without touching the GLB.
 * Each track addresses a real skinned bone by UUID, avoiding glTF name sanitization.
 */
export function createReferenceClips(THREE, root) {
  const map = new Map();
  root.traverse((o) => {
    if (!o.isBone) return;
    const name = o.name.toLowerCase().replace(/[^a-z]/g, '');
    map.set(name, o);
  });

  function bone(part) {
    const name = part.toLowerCase().replace(/[^a-z]/g, '');
    return [...map].find(([key]) => key.endsWith(name))?.[1] || null;
  }

  const bones = {
    hips: bone('Hips'), spine: bone('Spine'), spine1: bone('Spine1'),
    spine2: bone('Spine2'), neck: bone('Neck'), head: bone('Head'),
    leftArm: bone('LeftArm'), rightArm: bone('RightArm'),
    leftForeArm: bone('LeftForeArm'), rightForeArm: bone('RightForeArm'),
    leftLeg: bone('LeftUpLeg'), rightLeg: bone('RightUpLeg'),
    leftKnee: bone('LeftLeg'), rightKnee: bone('RightLeg'),
    leftFoot: bone('LeftFoot'), rightFoot: bone('RightFoot')
  };

  const required = ['hips','spine','head','leftArm','rightArm','leftLeg','rightLeg','leftKnee','rightKnee'];
  const missing = required.filter(k => !bones[k]);
  if (missing.length) throw new Error('Skinned humanoid rig is missing bones: ' + missing.join(','));

  const rest = Object.fromEntries(Object.entries(bones)
      .filter(([,bone]) => bone)
      .map(([name,bone]) => [name,bone.quaternion.clone()]));
  const trig = (x) => Math.sin(2*Math.PI*x);
  const angles = (x=0,y=0,z=0) => [x,y,z];
  const idle = (t,k) => {
    const breathe = Math.sin(2*Math.PI*t);
    if (k === 'spine1') return angles(.012*breathe,0,.007*breathe);
    if (k === 'head') return angles(-.008*breathe,.014*Math.sin(Math.PI*t),0);
    if (k === 'leftArm') return angles(.008*breathe,0,-.018);
    if (k === 'rightArm') return angles(.008*breathe,0,.018);
    return angles();
  };
  const locomotion = (t,k,fast) => {
    const s=trig(t), c=Math.cos(2*Math.PI*t);
    const stride=fast?.63:.38, swing=fast?.48:.31;
    if(k==='leftLeg')return angles(-stride*s);
    if(k==='rightLeg')return angles(stride*s);
    if(k==='leftKnee')return angles(Math.max(0,-s)*(fast?.68:.44));
    if(k==='rightKnee')return angles(Math.max(0,s)*(fast?.68:.44));
    if(k==='leftFoot')return angles(-.08*Math.max(0,-s));
    if(k==='rightFoot')return angles(-.08*Math.max(0,s));
    if(k==='leftArm')return angles(swing*s,0,-.035);
    if(k==='rightArm')return angles(-swing*s,0,.035);
    if(k==='leftForeArm')return angles(-.14-(fast?.24:.10)*Math.max(0,s));
    if(k==='rightForeArm')return angles(-.14-(fast?.24:.10)*Math.max(0,-s));
    if(k==='spine1')return angles(fast?.085:.018,.018*s,.018*c);
    if(k==='head')return angles(fast?-.03:-.01,-.014*s);
    return angles();
  };
  const jump = (t,k) => {
    const s=Math.sin(Math.PI*t);
    if(k==='spine1')return angles(-.12*s);
    if(k==='head')return angles(.045*s);
    if(k==='leftLeg')return angles(-.20*s);
    if(k==='rightLeg')return angles(-.17*s);
    if(k==='leftKnee')return angles(.48*s);
    if(k==='rightKnee')return angles(.39*s);
    if(k==='leftArm')return angles(-.61*s,0,-.16*s);
    if(k==='rightArm')return angles(-.61*s,0,.16*s);
    if(k==='leftForeArm'||k==='rightForeArm')return angles(-.20*s);
    return angles();
  };

  function makeClip(name, duration, pose) {
    const frames=32;
    const times=Array.from({length:frames+1},(_,i)=>duration*i/frames);
    const tracks=[];
    for(const [key,obj] of Object.entries(bones)) {
      if(!obj)continue;
      const vals=[];
      for(let i=0;i<=frames;i++) {
        const [x,y,z]=pose(i/frames,key);
        const delta=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'));
        const q=rest[key].clone().multiply(delta).normalize();
        vals.push(q.x,q.y,q.z,q.w);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(obj.uuid+'.quaternion',times,vals));
    }
    return new THREE.AnimationClip(name,duration,tracks);
  }

  return {
    clips:[
      makeClip('Idle',2.4,idle),
      makeClip('Walk',1, (t,k)=>locomotion(t,k,false)),
      makeClip('Run',.67,(t,k)=>locomotion(t,k,true)),
      makeClip('Jump',.90,jump)
    ],
    boneCount: map.size,
    animatedBones: Object.values(bones).filter(Boolean).length
  };
}
