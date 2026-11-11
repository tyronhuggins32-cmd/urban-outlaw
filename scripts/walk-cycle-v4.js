/** Foot-target gait. +Z forward; solve two leg segments instead of pendulum angles. */
const TAU=Math.PI*2, sin=t=>Math.sin(TAU*t);
const smooth=t=>t*t*(3-2*t);
const A=(x=0,y=0,z=0)=>[x,y,z];
export const walkGaitSpecs={cycleSeconds:1.02,stanceFraction:.60,reach:.205,lift:.085};
export function walkPelvisOffset(t){return [.001*sin(t),.005+.003*Math.cos(2*TAU*t),0];}
export function legPose(t,upper=.31,lower=.31){
 const p=((t-.25)%1+1)%1,stance=p<walkGaitSpecs.stanceFraction;
 const u=stance?p/.6:(p-.6)/.4;
 const reach=Math.min(walkGaitSpecs.reach,(upper+lower)*.32);
 const z=stance?reach*(1-2*u):reach*(-1+2*smooth(u)-(4/3)*(2*u*u*u-3*u*u+u));
 const lift=stance?0:walkGaitSpecs.lift*Math.pow(Math.sin(Math.PI*u),1.4);
 // Leave extension clearance so the knee never locks or snaps through.
 const ground=Math.sqrt((upper+lower-.014)**2-reach**2);
 const y=-ground+lift-walkPelvisOffset(t)[1];
 const d=Math.min(upper+lower-.002,Math.hypot(y,z));
 const clamp=x=>Math.max(-1,Math.min(1,x));
 const knee=Math.PI-Math.acos(clamp((upper*upper+lower*lower-d*d)/(2*upper*lower)));
 const thigh=-Math.atan2(z,-y)-Math.acos(clamp((upper*upper+d*d-lower*lower)/(2*upper*d)));
 // Heel contact -> flat support -> heel rise -> relaxed swing.
 const pitch=stance?(u<.12?.11*(1-smooth(u/.12)):u>.78?-.21*smooth((u-.78)/.22):0):-.21+.32*smooth(u)+.08*Math.sin(Math.PI*u);
 return {thigh,knee,ankle:pitch-thigh-knee,toe:stance?(u>.72?.23*smooth((u-.72)/.28):0):.23*(1-smooth(Math.min(1,u/.25))),z,y,lift,stance};
}
export function createWalkGait(upper=.31,lower=.31,rest={}){
 return function walkPose(t,k){
  const s=sin(t),c=Math.cos(TAU*t),counter=sin(t-.06);
  const left=legPose(t,upper,lower),right=legPose(t+.5,upper,lower);
  for(const [side,leg] of [['left',left],['right',right]]){
   const thighRest=rest[side]?.thigh??0,kneeRest=rest[side]?.knee??0;
   if(k===side+'Leg')return A(leg.thigh-thighRest);
   if(k===side+'Knee')return A(leg.knee-kneeRest);
   if(k===side+'Foot')return A(leg.ankle+thighRest+kneeRest);
   if(k===side+'Toe')return A(leg.toe);
   if(k===side+'ThighSoft')return A(.045*leg.thigh);
   if(k===side+'CalfTwist')return A(-.018*leg.knee);
  }
  if(k==='hips')return A(.005,.009*s,.0015*c);
  if(k==='spine')return A(.006,-.012*counter,-.002*c);
  if(k==='spine1')return A(.008,-.015*counter,.002*c);
  if(k==='spine2')return A(-.003,.012*counter,-.002*c);
  if(k==='chestBreath')return A(.006*sin(t*2));
  if(k==='neck'||k==='neckFollow')return A(0,.004*counter);
  if(k==='head')return A(-.004,-.007*counter);
  if(k==='leftShoulder')return A(-.012*counter,0,.015);
  if(k==='rightShoulder')return A(.012*counter,0,-.015);
  const arm=sin(t-.035);
  if(k==='leftArm')return A(.29*arm,0,.185);
  if(k==='rightArm')return A(-.29*arm,0,-.185);
  if(k==='leftForeArm')return A(-.15-.09*Math.max(0,arm));
  if(k==='rightForeArm')return A(-.15-.09*Math.max(0,-arm));
  if(k==='leftUpperArmSoft')return A(.015*counter,0,.005);
  if(k==='rightUpperArmSoft')return A(-.015*counter,0,-.005);
  if(k==='leftForeArmTwist')return A(.010*counter,.014*c);
  if(k==='rightForeArmTwist')return A(-.010*counter,-.014*c);
  if(k==='leftHand')return A(-.015*counter,.01*c);
  if(k==='rightHand')return A(.015*counter,-.01*c);
  if(k.includes('Finger'))return A(-.06-.012*(.5+.5*sin(t+.1)));
  return A();
 };
}
export const walkPose=createWalkGait();
