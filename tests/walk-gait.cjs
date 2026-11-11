const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const source=fs.readFileSync('scripts/walk-cycle-v4.js','utf8');
 const {legPose,walkPose,walkPelvisOffset}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const ys=[],zs=[];
 for(let i=0;i<=240;i++){
  const t=i/240,p=legPose(t),[x,hip]=walkPelvisOffset(t);
  const y=-.31*Math.cos(p.thigh)-.31*Math.cos(p.thigh+p.knee)+hip;
  const z=-.31*Math.sin(p.thigh)-.31*Math.sin(p.thigh+p.knee);
  assert(Math.abs(y-(p.y+hip))<1e-8,'IK target vertical mismatch');
  assert(Math.abs(z-p.z)<1e-8,'IK target stride mismatch');
  if(p.stance){ys.push(y);zs.push(z)}
  assert(p.knee>0&&p.knee<1.6,'Knee locked or overbent');
  assert(Math.abs(x)<.002,'Lateral hip waddle');
 }
 assert(Math.max(...ys)-Math.min(...ys)<1e-8,'Support foot is bouncing');
 assert(Math.max(...zs)-Math.min(...zs)>.35,'Stride too short');
 assert(legPose(.05).lift>.07,'Swing foot does not clear ground');
 for(const k of ['leftLeg','rightLeg','leftKnee','rightKnee','leftFoot','rightFoot','hips','leftArm','rightArm']){
  assert(walkPose(0,k).every((v,i)=>Math.abs(v-walkPose(1,k)[i])<1e-8),'Loop snap '+k);
  for(let i=1;i<=240;i++)assert(walkPose(i/240,k).every((v,j)=>Math.abs(v-walkPose((i-1)/240,k)[j])<.08),'Pose jump '+k);
 }
 const html=fs.readFileSync('index.html','utf8');
 const speeds=html.match(/const speed = sprinting \? ([\d.]+) : ([\d.]+)/);
 assert(speeds,'Movement speed declaration missing');assert.equal(Number(speeds[1]),9.5*10);assert.equal(Number(speeds[2]),5.2);
 console.log('WALK AND SPEED VERIFIED: planted support, swing clearance, smooth loops, no hip waddle, sprint 95 (10x), walk 5.2');
})().catch(e=>{console.error(e);process.exit(1)});
