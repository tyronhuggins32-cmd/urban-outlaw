const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
  const source=fs.readFileSync('scripts/walk-cycle-v3.js','utf8');
  const {walkPose,walkPelvisOffset,cyclicPose,walkGaitSpecs}=await import(
    'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
  );
  assert.equal(walkGaitSpecs.keyframes,8);
  assert(walkGaitSpecs.cycleSeconds>.8 && walkGaitSpecs.cycleSeconds<1.2);
  // Correct leg direction in character-space X pitch (+Z is forward).
  assert(walkPose(.25,'leftLeg')[0]<-.37,'Left heel does not reach forward');
  assert(walkPose(.25,'rightLeg')[0]>.25,'Right stance leg does not extend backward');
  assert(walkPose(.75,'leftLeg')[0]>.25,'Left toe-off missing');
  assert(walkPose(.75,'rightLeg')[0]<-.37,'Right heel strike missing');
  assert(walkPose(.125,'leftKnee')[0]>.25,'Swing-leg knee does not flex');
  assert(walkPose(.375,'leftKnee')[0]<.13,'Stance knee remains overbent');
  assert(walkPose(.75,'leftToe')[0]>.20,'Toe-off roll missing');
  assert(walkPose(.25,'leftFoot')[0]>.07,'Heel strike ankle dorsiflexion missing');
  // Arms must counter-swing rather than swing the same direction as a leg.
  assert(walkPose(.25,'leftArm')[0]>.12,'Left arm is not opposing left leg');
  assert(walkPose(.25,'rightArm')[0]<-.12,'Right arm is not opposing right leg');
  assert(walkPose(.25,'leftArm')[2]>.16,'Left wrist clearance dropped');
  assert(walkPose(.25,'rightArm')[2]<-.16,'Right wrist clearance dropped');
  const keys=['leftLeg','rightLeg','leftKnee','rightKnee','leftFoot',
              'rightFoot','leftToe','rightToe','leftArm','rightArm','hips','spine','head'];
  for(const key of keys){
    const start=walkPose(0,key),end=walkPose(1,key);
    assert(start.every((n,i)=>Math.abs(n-end[i])<1e-8),key+' gait loop snaps at end');
    let last=start;
    for(let frame=1;frame<=96;frame++){
      const next=walkPose(frame/96,key);
      assert(next.every((n,i)=>Number.isFinite(n)&&Math.abs(n-last[i])<.11),
        key+' pose discontinuity on frame '+frame+': '+JSON.stringify(next));
      last=next;
    }
  }
  for(let frame=0;frame<=96;frame++){
    const [x,y,z]=walkPelvisOffset(frame/96);
    assert(Math.abs(x)<.0025,'Hip sway too large');
    assert(y>=0 && y<.018,'Pelvis bounce exceeds threshold');
    assert(Math.abs(z)<.001,'Hip forward/back jerk');
  }
  for(const a of [walkGaitSpecs.strideAngles,walkGaitSpecs.kneeAngles,
                  walkGaitSpecs.ankleAngles,walkGaitSpecs.toeAngles])
    assert.equal(cyclicPose(0,a),cyclicPose(1,a),'Gait curve is not periodic');
  console.log('NATURAL WALK VERIFIED: heel strike, swing knee, midstance, toe-off, opposing arms, smooth 96-frame loop, low lateral sway');
})().catch(e=>{console.error(e);process.exit(1)});
