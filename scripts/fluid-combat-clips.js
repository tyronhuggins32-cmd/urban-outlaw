/**
 * Original, reference-informed fluid ninja hand-to-hand animation.
 * No imported/copyrighted frames. Time-continuous full-body 44-joint motions,
 * defensive slips, steps, jab/cross chaining and readable recovery beats.
 */
export function createFluidCombatClips(THREE,root) {
  root.updateMatrixWorld(true);
  const bones=new Map();
  root.traverse(b=>{if(b.isBone)bones.set(b.name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^mixamorig/,''),b)});
  // Logical movement joints map to the imported skeleton's *true* names.
  // Importantly, the thigh is LeftUpLeg, while LeftLeg is the shin.
  const jointMap={
    hips:'hips',spine:'spine',spine1:'spine1',spine2:'spine2',
    chestBreath:'uochestbreath',neck:'neck',neckFollow:'uoneckfollow',head:'head',
    leftShoulder:'leftshoulder',rightShoulder:'rightshoulder',
    leftArm:'leftarm',rightArm:'rightarm',
    leftUpperArmSoft:'uoleftupperarmsoft',rightUpperArmSoft:'uorightupperarmsoft',
    leftForeArm:'leftforearm',rightForeArm:'rightforearm',
    leftForeArmTwist:'uoleftforearmtwist',rightForeArmTwist:'uorightforearmtwist',
    leftHand:'lefthand',rightHand:'righthand',
    leftLeg:'leftupleg',rightLeg:'rightupleg',
    leftKnee:'leftleg',rightKnee:'rightleg',
    leftCalfTwist:'uoleftcalftwist',rightCalfTwist:'uorightcalftwist',
    leftFoot:'leftfoot',rightFoot:'rightfoot',leftToe:'lefttoebase',rightToe:'righttoebase'
  };
  const bind=[];
  for(const [key,boneKey] of Object.entries(jointMap)){
    const bone=bones.get(boneKey);
    if(!bone)throw Error('Fluid combat requires joint '+key+' → '+boneKey);
    bind.push({
      key,bone,
      rest:bone.quaternion.clone(),
      parent:bone.parent.getWorldQuaternion(new THREE.Quaternion())
    });
  }
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  function curve(t,stops){
    if(t<=stops[0][0])return stops[0][1];
    for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){
      const [a,va]=stops[i-1],[b,vb]=stops[i],u=smooth((t-a)/Math.max(.0001,b-a));
      return va+(vb-va)*u;
    }
    return stops[stops.length-1][1];
  }
  const punch=t=>curve(t,[[0,0],[.10,-.19],[.18,-.12],[.34,1],[.49,1.04],[.60,.83],[.79,.24],[1,0]]);
  const torque=t=>curve(t,[[0,0],[.11,-.28],[.33,.90],[.54,1],[.77,.29],[1,0]]);
  const kick=t=>curve(t,[[0,0],[.11,-.14],[.24,.38],[.38,1],[.52,1],[.69,.45],[.88,.05],[1,0]]);
  const dodge=t=>curve(t,[[0,0],[.12,.30],[.29,1],[.51,1],[.74,.5],[1,0]]);
  const ready=t=>.035*Math.sin(t*Math.PI*2);
  const A=(x=0,y=0,z=0)=>[x,y,z];
  const plus=(obj,key,val)=>{obj[key]=val};
  function pose(name,t){
    const q={};
    const base=t=>({hips:A(.07,ready(t),.012),spine:A(.04),
      spine1:A(.10,.012*Math.sin(t*2*Math.PI),0),
      spine2:A(.04),neck:A(-.045),head:A(-.055,.018*Math.sin(t*2*Math.PI),0),
      leftArm:A(-.57,0,.19),rightArm:A(-.68,0,-.18),
      leftForeArm:A(-.47),rightForeArm:A(-.50),
      leftLeg:A(-.12),rightLeg:A(.17),
      leftKnee:A(.15),rightKnee:A(.15),leftFoot:A(.10),rightFoot:A(-.04)});
    Object.assign(q,base(t));
    const hit=kick(t),snap=punch(t),turn=torque(t),ev=dodge(t);
    const over=(key,value)=>plus(q,key,value);
    if(name==='Ready')return q;
    if(name==='Guard'){
      over('hips',A(.13,0,.02));over('spine',A(.11));
      over('spine1',A(.15));over('head',A(-.04));
      over('leftArm',A(-.92,.08,.15));over('rightArm',A(-.95,-.08,-.15));
      over('leftForeArm',A(-.64));over('rightForeArm',A(-.66));
      over('leftLeg',A(-.16));over('rightLeg',A(.19));
      return q;
    }
    if(name==='Light'||name==='Cross'){
      const right=name==='Cross',s=right?1:-1;
      const lead=right?'rightArm':'leftArm',other=right?'leftArm':'rightArm';
      const leadElbow=right?'rightForeArm':'leftForeArm';
      const otherElbow=right?'leftForeArm':'rightForeArm';
      over('hips',A(.08+.11*turn,s*.22*turn,.035*s*turn));
      over('spine',A(.03-.08*snap,s*.21*turn,0));
      over('spine1',A(.11-.17*snap,s*.24*turn,-s*.06*turn));
      over('spine2',A(.04-.09*snap,s*.12*turn));
      over('head',A(-.035-.04*snap,-s*.09*turn));
      over(lead,A(-.56-1.13*snap,s*.09*turn,s*.19));
      over(other,A(-.68+.06*snap,0,-s*.19));
      over(leadElbow,A(-.49+.35*snap));
      over(otherElbow,A(-.49));
      over(right?'rightLeg':'leftLeg',A((right?.11:-.14)-.22*snap));
      over(right?'leftLeg':'rightLeg',A((right?-.17:.20)+.12*snap));
      over(right?'rightFoot':'leftFoot',A(-.16*snap));
      return q;
    }
    if(name==='Heavy'){
      over('hips',A(.11+.12*turn,-.32*turn,-.08*turn));
      over('spine',A(.04-.13*snap,-.25*turn,.14*turn));
      over('spine1',A(.10-.24*snap,-.48*turn,.15*turn));
      over('spine2',A(.04-.13*snap,-.21*turn));
      over('head',A(-.05+.04*snap,.15*turn));
      over('rightArm',A(-.71-1.05*snap,-.12*snap,-.39*snap));
      over('rightForeArm',A(-.5+.23*snap));
      over('leftArm',A(-.72+.18*snap,0,.22));
      over('leftForeArm',A(-.52));
      over('rightLeg',A(.15-.26*turn));over('leftLeg',A(-.13+.14*turn));
      return q;
    }
    if(name==='Kick'||name==='Sweep'){
      const low=name==='Sweep';
      over('hips',A(.06-.19*hit,-.28*hit,.12*hit));
      over('spine',A(.05-.20*hit,.20*hit,-.08*hit));
      over('spine1',A(.10-.27*hit,.32*hit,-.12*hit));
      over('spine2',A(.06-.11*hit,.10*hit));
      over('head',A(-.045+.07*hit,-.17*hit));
      over('rightLeg',A(.10-(low?.80:1.48)*hit,-.34*hit,.17*hit));
      over('rightKnee',A(.15+(low?.43:.94)*hit));
      over('leftLeg',A(-.13+.20*hit));over('leftKnee',A(.18+.18*hit));
      over('rightFoot',A(-.25*hit));over('rightToe',A(.12*hit));
      over('leftArm',A(-.7-.20*hit,0,.17));over('rightArm',A(-.80-.3*hit,0,-.13));
      return q;
    }
    if(name==='Dodge'||name==='Slip'){
      const slip=name==='Slip';
      over('hips',A(.16+.30*ev,-.17*ev,slip?-.34*ev:.34*ev));
      over('spine',A(.04-.25*ev,.14*ev,slip?.26*ev:-.26*ev));
      over('spine1',A(.12+.22*ev,-.15*ev,slip?.33*ev:-.28*ev));
      over('spine2',A(.03+.10*ev,0,slip?.09*ev:-.09*ev));
      over('head',A(-.05-.14*ev,.10*ev,slip?.10*ev:-.1*ev));
      over('leftLeg',A(-.12+.38*ev));over('rightLeg',A(.16-.49*ev));
      over('leftKnee',A(.15+.58*ev));over('rightKnee',A(.15+.50*ev));
      over('leftArm',A(-.64-.22*ev));over('rightArm',A(-.70-.2*ev));
      return q;
    }
    if(name==='Parry'){
      over('spine1',A(.13,-.25*snap,-.07*snap));
      over('leftArm',A(-.66-.59*snap,0,.37*snap));
      over('leftForeArm',A(-.5-.16*snap));
      over('rightArm',A(-.67,0,-.19));
      return q;
    }
    if(name==='Hit'){
      const recoil=Math.sin(Math.PI*t);
      over('hips',A(.09-.12*recoil));over('spine',A(.04-.21*recoil));
      over('spine1',A(.10-.37*recoil));over('head',A(-.05+.19*recoil));
      over('leftArm',A(-.58+.23*recoil));over('rightArm',A(-.68+.26*recoil));
      return q;
    }
    return q;
  }
  const specs=[
    ['Ready',1.1],['Light',.30],['Cross',.32],['Heavy',.49],
    ['Kick',.55],['Sweep',.52],['Guard',.72],['Dodge',.36],
    ['Slip',.34],['Parry',.33],['Hit',.34]
  ];
  const clips=specs.map(([name,duration])=>{
    const tracks=[],steps=40,times=Array.from({length:steps+1},(_,i)=>duration*i/steps);
    const keys=times.map((_,i)=>pose(name,i/steps));
    for(const bone of bind){
      const vals=[];
      for(let i=0;i<=steps;i++){
        const p=keys[i][bone.key]||A();
        const target=new THREE.Quaternion().setFromEuler(new THREE.Euler(...p,'XYZ'));
        const q=bone.parent.clone().invert().multiply(target).multiply(bone.parent).multiply(bone.rest).normalize();
        // Preserve quaternion hemisphere continuity at high-speed turns.
        if(i&&q.x*vals.at(-4)+q.y*vals.at(-3)+q.z*vals.at(-2)+q.w*vals.at(-1)<0)
          q.set(-q.x,-q.y,-q.z,-q.w);
        vals.push(q.x,q.y,q.z,q.w);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(bone.bone.uuid+'.quaternion',times,vals));
    }
    return new THREE.AnimationClip(name,duration,tracks);
  });
  return clips;
}
