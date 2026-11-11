/** Contract tests for Urban Outlaw's original 44-bone ninja sprint. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const source=fs.readFileSync(path.resolve('scripts/ninja-run.js'),'utf8');
 const {NINJA_RUN_DURATION,ninjaRunPose,ninjaRunRootMotion}=await import(
   'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
 );
 assert.ok(NINJA_RUN_DURATION>=.35&&NINJA_RUN_DURATION<=.65,'Ninja run must be a fast repeating gait');
 const p=(t,k)=>ninjaRunPose(t,k);
 const lean=['hips','spine','spine1','spine2'].reduce((a,k)=>a+p(.25,k)[0],0);
 assert.ok(lean>1.15&&lean<1.45,'Corrected rig requires strong upper-body bend; verify visible angle in ninja-run-rig test: '+lean);
 assert.ok(p(.25,'head')[0]<-.15,'Eyes should counter-rotate forward');
 for(const t of [0,.125,.25,.5,.75,.9]){
   for(const arm of ['leftArm','rightArm']){
     assert.ok(p(t,arm)[0]>1.1,'Arms must stay swept backward, not pump: '+arm+' '+t);
   }
   const left=p(t,'leftArm'),right=p(t,'rightArm');
   assert.ok(Math.abs(left[0]-right[0])<.1,'Arms should remain streamlined together');
   for(const name of ['leftKnee','rightKnee'])
     assert.ok(p(t,name)[0]>=0,'Running knees must flex rather than hyperextend');
   for(const k of ['hips','spine','spine1','spine2','neck','head','leftArm','rightArm',
     'leftLeg','rightLeg','leftKnee','rightKnee','leftFoot','rightFoot',
     'leftToe','rightToe','leftHand','rightHand','leftUpperArmSoft','rightUpperArmSoft',
     'leftCalfTwist','rightCalfTwist','leftFingerA','rightFingerF'])
     assert.ok(p(t,k).every(Number.isFinite),'Non-finite pose '+k);
 }
 assert.ok(p(.25,'leftLeg')[0]<-.5&&p(.25,'rightLeg')[0]>.5,'Legs must move opposite each other');
 assert.ok(p(.75,'leftLeg')[0]>.5&&p(.75,'rightLeg')[0]<-.5,'Stride must switch legs mid-cycle');
 assert.ok(p(.25,'leftKnee')[0]>p(.25,'rightKnee')[0],'Trailing left knee must recover');
 assert.ok(p(.75,'rightKnee')[0]>p(.75,'leftKnee')[0],'Trailing right knee must recover');
 for(const k of ['hips','spine','spine1','spine2','head','leftArm','rightArm',
   'leftLeg','rightLeg','leftKnee','rightKnee','leftFoot','rightFoot','leftToe','rightToe']){
   const start=p(0,k),end=p(1,k);
   for(let i=0;i<3;i++)assert.ok(Math.abs(start[i]-end[i])<1e-9,'Loop seam at '+k);
 }
 for(let i=0;i<3;i++)assert.ok(Math.abs(ninjaRunRootMotion(0)[i]-ninjaRunRootMotion(1)[i])<1e-9);
 const rig=fs.readFileSync(path.resolve('scripts/reference-character-animations-v2.js'),'utf8');
 const html=fs.readFileSync(path.resolve('index.html'),'utf8');
 assert.match(rig,/clip\('Run',NINJA_RUN_DURATION,ninjaRunPose\)/,'Run clip must use ninja cycle');
 assert.match(rig,/Run:ninjaRunRootMotion/,'Run clip must use in-place vertical impulse');
 assert.match(html,/runStyle='ninja-lean-v2'/,'Game must expose ninja sprint state');
 assert.match(html,/sprinting\?'Run':'Walk'/,'Sprint controls must activate ninja clip');
 console.log('NINJA RUN VERIFIED: forward lean, arms-back silhouette, alternating strides, seamless loop, and active game wiring');
})().catch(error=>{console.error(error);process.exit(1)});
