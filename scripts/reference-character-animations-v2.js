/**
 * Urban Outlaws V2: fluid motion on the 44-bone skinned ninja.
 * 34 original joints + 10 new, genuinely vertex-weighted corrective joints.
 * World-oriented rotations avoid sideways leg movement in the source rig.
 */
import {createRecordedWalkClip} from './recorded-walk.js';

export function createReferenceClips(THREE,root,walkData){
  root.updateMatrixWorld(true);
  const lookup=new Map();
  root.traverse(o=>{
    if(!o.isBone)return;
    const key=o.name.toLowerCase().replace(/[^a-z0-9]/g,'');
    if(lookup.has(key))throw new Error('Duplicate joint '+key);
    lookup.set(key,o);
  });
  function find(n){
    const key=n.toLowerCase().replace(/[^a-z0-9]/g,'');
    const matches=[...lookup].filter(([k])=>k===key||k.endsWith(key));
    return matches.length===1?matches[0][1]:null;
  }
  const names={
    hips:'Hips',spine:'Spine',spine1:'Spine1',spine2:'Spine2',neck:'Neck',head:'Head',
    leftShoulder:'LeftShoulder',rightShoulder:'RightShoulder',
    leftArm:'LeftArm',rightArm:'RightArm',
    leftForeArm:'LeftForeArm',rightForeArm:'RightForeArm',
    leftHand:'LeftHand',rightHand:'RightHand',
    leftLeg:'LeftUpLeg',rightLeg:'RightUpLeg',
    leftKnee:'LeftLeg',rightKnee:'RightLeg',
    leftFoot:'LeftFoot',rightFoot:'RightFoot',
    leftToe:'LeftToeBase',rightToe:'RightToeBase',
    leftUpperArmSoft:'UO_LeftUpperArmSoft',rightUpperArmSoft:'UO_RightUpperArmSoft',
    leftForeArmTwist:'UO_LeftForeArmTwist',rightForeArmTwist:'UO_RightForeArmTwist',
    leftThighSoft:'UO_LeftThighSoft',rightThighSoft:'UO_RightThighSoft',
    leftCalfTwist:'UO_LeftCalfTwist',rightCalfTwist:'UO_RightCalfTwist',
    chestBreath:'UO_ChestBreath',neckFollow:'UO_NeckFollow',
    leftFingerA:'bone_10',leftFingerB:'bone_11',leftFingerC:'bone_12',
    leftFingerD:'bone_13',leftFingerE:'bone_14',leftFingerF:'bone_15',
    rightFingerA:'bone_20',rightFingerB:'bone_21',rightFingerC:'bone_22',
    rightFingerD:'bone_23',rightFingerE:'bone_24',rightFingerF:'bone_25'
  };
  const bones=Object.fromEntries(Object.entries(names).map(([k,v])=>[k,find(v)]));
  const required=['hips','spine','spine1','spine2','neck','head','leftArm','rightArm',
      'leftForeArm','rightForeArm','leftHand','rightHand','leftLeg','rightLeg',
      'leftKnee','rightKnee','leftFoot','rightFoot','leftToe','rightToe',
      'leftUpperArmSoft','rightUpperArmSoft','leftForeArmTwist','rightForeArmTwist',
      'leftThighSoft','rightThighSoft','leftCalfTwist','rightCalfTwist',
      'chestBreath','neckFollow'];
  const missing=required.filter(k=>!bones[k]);
  if(missing.length||lookup.size<44)
    throw new Error('Character needs the full 44-bone rig: '+missing.join(','));
  const bind={},parentRest={},positionRest={};
  for(const [key,bone] of Object.entries(bones)){
    if(!bone)continue;
    bind[key]=bone.quaternion.clone();
    parentRest[key]=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    positionRest[key]=bone.position.clone();
  }
  const TAU=2*Math.PI;
  const sin=t=>Math.sin(TAU*t);
  const A=(x=0,y=0,z=0)=>[x,y,z];
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
  const finger=(k,t,amp)=>{
    const id=k.charCodeAt(k.length-1)-65;
    return A(-.04-.018*(id%3)-amp*(.5+.5*sin(t+id*.11)));
  };
  function idle(t,k){
    const s=sin(t),c=Math.cos(TAU*t),look=sin(t-.18);
    if(k==='hips')return A(.005*s,.008*c,.007*look);
    if(k==='spine')return A(.009*s,-.012*c,.005*look);
    if(k==='spine1')return A(.018*s,-.014*c,.009*look);
    if(k==='spine2')return A(.012*s,.016*c,-.007*look);
    if(k==='chestBreath')return A(.025*s);
    if(k==='neck')return A(-.010*s,-.010*look);
    if(k==='neckFollow')return A(-.009*s,.008*look);
    if(k==='head')return A(-.015*s,.018*look,.004*c);
    if(k==='leftShoulder')return A(.010*s,0,.023);
    if(k==='rightShoulder')return A(.010*s,0,-.023);
    if(k==='leftArm')return A(.013*s,0,.18);
    if(k==='rightArm')return A(.013*s,0,-.18);
    if(k==='leftForeArm'||k==='rightForeArm')return A(-.055);
    if(k==='leftHand'||k==='rightHand')return A(.009*s,.008*c);
    if(k==='leftUpperArmSoft')return A(.015*s,0,.007);
    if(k==='rightUpperArmSoft')return A(.015*s,0,-.007);
    if(k==='leftForeArmTwist')return A(0,.013*c);
    if(k==='rightForeArmTwist')return A(0,-.013*c);
    if(k.startsWith('leftFinger')||k.startsWith('rightFinger'))return finger(k,t,.011);
    return A();
  }
  function locomotion(t,k,fast){
    const s=sin(t),c=Math.cos(TAU*t);
    const stride=fast?.56:.34, arms=fast?.43:.265;
    if(k==='hips')return A(fast?.04:.014,.020*s,.010*c);
    if(k==='spine')return A(fast?.11:.025,-.021*s,-.015*c);
    if(k==='spine1')return A(fast?.09:.023,-.033*s,-.012*c);
    if(k==='spine2')return A(.010,.028*s,.008*c);
    if(k==='chestBreath')return A((fast?.02:.01)*c,0,.012*s);
    if(k==='neck')return A(fast?-.025:-.008,.008*s);
    if(k==='neckFollow')return A(.010*c,-.007*s);
    if(k==='head')return A(fast?-.036:-.010,-.015*s,.005*c);
    if(k==='leftShoulder')return A(-.020*s,0,.027+.013*c);
    if(k==='rightShoulder')return A(.020*s,0,-.027-.013*c);
    if(k==='leftLeg')return A(-stride*s,0,-.007*c);
    if(k==='rightLeg')return A(stride*s,0,.007*c);
    if(k==='leftThighSoft')return A(-.038*s);
    if(k==='rightThighSoft')return A(.038*s);
    if(k==='leftKnee')return A(Math.max(0,-s)*(fast?.68:.44));
    if(k==='rightKnee')return A(Math.max(0,s)*(fast?.68:.44));
    if(k==='leftCalfTwist')return A(-.024*s);
    if(k==='rightCalfTwist')return A(.024*s);
    if(k==='leftFoot')return A(-.09*Math.max(0,-s));
    if(k==='rightFoot')return A(-.09*Math.max(0,s));
    if(k==='leftToe')return A(.09*Math.max(0,-s));
    if(k==='rightToe')return A(.09*Math.max(0,s));
    if(k==='leftArm')return A(arms*s,0,.19+.012*c);
    if(k==='rightArm')return A(-arms*s,0,-.19-.012*c);
    if(k==='leftUpperArmSoft')return A(.025*s,0,.007*c);
    if(k==='rightUpperArmSoft')return A(-.025*s,0,-.007*c);
    if(k==='leftForeArm')return A(-.13-(fast?.20:.08)*Math.max(0,s));
    if(k==='rightForeArm')return A(-.13-(fast?.20:.08)*Math.max(0,-s));
    if(k==='leftForeArmTwist')return A(.016*s,.025*c);
    if(k==='rightForeArmTwist')return A(-.016*s,-.025*c);
    if(k==='leftHand')return A(-.02*s,.014*c,.012);
    if(k==='rightHand')return A(.02*s,-.014*c,-.012);
    if(k.startsWith('leftFinger')||k.startsWith('rightFinger'))
      return finger(k,t,fast?.025:.014);
    return A();
  }
  function jump(t,k){
    const crouch=1-smooth(t/.16);
    const air=smooth((t-.1)/.24)*(1-smooth((t-.74)/.22));
    if(k==='hips')return A(.035*crouch);
    if(k==='spine')return A(.065*crouch-.088*air);
    if(k==='spine1')return A(.065*crouch-.095*air);
    if(k==='spine2')return A(-.06*air);
    if(k==='chestBreath')return A(.026*air);
    if(k==='head')return A(-.04*crouch+.033*air);
    if(k==='leftLeg'||k==='rightLeg')return A(-.10*air+.13*crouch);
    if(k==='leftKnee'||k==='rightKnee')return A(.43*air+.18*crouch);
    if(k==='leftThighSoft'||k==='rightThighSoft')return A(.034*air);
    if(k==='leftFoot'||k==='rightFoot')return A(-.10*air);
    if(k==='leftToe'||k==='rightToe')return A(.06*air);
    if(k==='leftArm')return A(-.42*air,0,.19+.07*air);
    if(k==='rightArm')return A(-.42*air,0,-.19-.07*air);
    if(k==='leftForeArm'||k==='rightForeArm')return A(-.17*air);
    if(k==='leftUpperArmSoft'||k==='rightUpperArmSoft')return A(-.025*air);
    if(k.startsWith('leftFinger')||k.startsWith('rightFinger'))return A(-.025-.036*air);
    return A();
  }
  function land(t,k){
    const compression=1-smooth(t/.68);
    const recover=Math.sin(Math.PI*t)*(1-smooth(t));
    if(k==='hips')return A(.035*compression);
    if(k==='spine')return A(.075*compression-.014*recover);
    if(k==='spine1')return A(.08*compression-.026*recover);
    if(k==='spine2')return A(-.023*compression);
    if(k==='neck')return A(-.02*compression);
    if(k==='head')return A(-.032*compression+.02*recover);
    if(k==='leftLeg'||k==='rightLeg')return A(.11*compression);
    if(k==='leftKnee'||k==='rightKnee')return A(.25*compression);
    if(k==='leftFoot'||k==='rightFoot')return A(-.04*compression);
    if(k==='leftArm')return A(-.19*compression,0,.18);
    if(k==='rightArm')return A(-.19*compression,0,-.18);
    if(k==='leftForeArm'||k==='rightForeArm')return A(-.10*compression);
    if(k==='leftThighSoft'||k==='rightThighSoft')return A(.025*compression);
    return A();
  }
  const rootMotion={
    Idle:t=>[0,.004*sin(t),0],
    Walk:t=>[0,0,0],
    Run:t=>[.008*sin(t),.023*(.5-.5*Math.cos(2*TAU*t)),0],
    Jump:t=>[0,-.018*(1-smooth(t/.13))+.008*Math.sin(Math.PI*t),0],
    Land:t=>[0,-.024*(1-smooth(t/.7)),0]
  };
  function clip(name,duration,pose){
    const frameCount=name==='Walk'?96:48,times=Array.from({length:frameCount+1},
      (_,i)=>duration*i/frameCount),tracks=[];
    for(const [key,obj] of Object.entries(bones)){
      if(!obj)continue;
      const quats=[];
      for(let i=0;i<=frameCount;i++){
        const t=i/frameCount;
        const world=new THREE.Quaternion().setFromEuler(new THREE.Euler(...pose(t,key),'XYZ'));
        const p=parentRest[key];
        const local=p.clone().invert().multiply(world).multiply(p).multiply(bind[key]).normalize();
        quats.push(...local.toArray());
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(obj.uuid+'.quaternion',times,quats));
      if(key==='hips'){
        const positions=[];
        for(let i=0;i<=frameCount;i++){
          const [x,y,z]=rootMotion[name](i/frameCount),origin=positionRest[key];
          positions.push(origin.x+x,origin.y+y,origin.z+z);
        }
        tracks.push(new THREE.VectorKeyframeTrack(obj.uuid+'.position',times,positions));
      }
    }
    return new THREE.AnimationClip(name,duration,tracks);
  }
  const clips=[
    clip('Idle',2.7,idle),
    createRecordedWalkClip(THREE,root,walkData),
    clip('Run',.62,(t,k)=>locomotion(t,k,true)),
    clip('Jump',.89,jump),
    clip('Land',.30,land)
  ];
  return {clips,boneCount:lookup.size,animatedBones:Object.values(bones).filter(Boolean).length,
    helperBones:10};
}
