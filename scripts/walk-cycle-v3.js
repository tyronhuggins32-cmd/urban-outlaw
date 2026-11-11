/**
 * Urban Outlaws natural gait, rev 3.
 * One full cycle = left and right step. +Z is forward in this rig.
 *
 * Eight authored biomechanics phases per leg, cubic interpolated:
 * passing -> swing lift -> heel strike -> loading -> passing ->
 * heel rise -> toe-off -> recovery.
 *
 * All movement values are WORLD-oriented before the existing bind-pose
 * converter maps them to the 44 joint-local axes. Never rotate the limbs
 * around arbitrary imported Mixamo local X axes.
 */
const TAU=Math.PI*2;
const sin=t=>Math.sin(TAU*t);
const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t)};
const A=(x=0,y=0,z=0)=>[x,y,z];

// A C1-continuous closed curve (unlike a sin wave, ankle, knee and thigh
// reach different extrema at heel strike, midstance and toe-off).
export function cyclicPose(t, values){
  if(values.length!==8)throw new Error('Eight authored gait phases required');
  const p=((t%1)+1)%1*8,i=Math.floor(p),u=p-i;
  const p0=values[(i+7)%8],p1=values[i],p2=values[(i+1)%8],p3=values[(i+2)%8];
  return .5*((2*p1)+(-p0+p2)*u+
    (2*p0-5*p1+4*p2-p3)*u*u+
    (-p0+3*p1-3*p2+p3)*u*u*u);
}

// Source model has ~.65m upper leg and lower leg combined. Angles remain
// moderate because the character is a compact teen, not marching in place.
// The left foot is forward at t=.25, and the right at t=.75.
const thigh=[0,-.19,-.43,-.26,0,.19,.34,.19];
const knee=[.06,.36,.15,.075,.055,.08,.26,.42];
const ankle=[.025,-.015,.11,-.05,-.025,-.13,-.19,.075];
const toe=[0,-.015,-.03,0,.015,.15,.25,.025];
const shoulderLag=.07;

export function walkPose(t,k){
  const s=sin(t),counter=sin(t-.085);
  const l=((t%1)+1)%1,r=(l+.5)%1;
  if(k==='hips')return A(.011,.014*s,.003*Math.cos(TAU*t));
  if(k==='spine')return A(.008,-.018*counter,-.003*Math.cos(TAU*t));
  if(k==='spine1')return A(.010,-.021*counter,.004*Math.cos(TAU*t));
  if(k==='spine2')return A(-.004,.018*counter,-.004*Math.cos(TAU*t));
  if(k==='chestBreath')return A(.008*Math.sin(TAU*t*2));
  if(k==='neck')return A(-.002,.009*counter);
  if(k==='neckFollow')return A(.005*Math.cos(TAU*t),-.006*counter);
  if(k==='head')return A(-.006,-.010*counter,.003*Math.cos(TAU*t));
  if(k==='leftLeg')return A(cyclicPose(l,thigh));
  if(k==='rightLeg')return A(cyclicPose(r,thigh));
  if(k==='leftKnee')return A(cyclicPose(l,knee));
  if(k==='rightKnee')return A(cyclicPose(r,knee));
  if(k==='leftFoot')return A(cyclicPose(l,ankle));
  if(k==='rightFoot')return A(cyclicPose(r,ankle));
  if(k==='leftToe')return A(cyclicPose(l,toe));
  if(k==='rightToe')return A(cyclicPose(r,toe));
  if(k==='leftThighSoft')return A(.07*cyclicPose(l,thigh));
  if(k==='rightThighSoft')return A(.07*cyclicPose(r,thigh));
  if(k==='leftCalfTwist')return A(-.028*cyclicPose(l,knee));
  if(k==='rightCalfTwist')return A(-.028*cyclicPose(r,knee));

  // Arm counter-swing is delayed behind each leg, and is deliberately
  // under-rotated to keep the wrists clear of the shorts.
  if(k==='leftShoulder')return A(-.011*counter,0,.015);
  if(k==='rightShoulder')return A(.011*counter,0,-.015);
  if(k==='leftArm')return A(.26*sin(t-shoulderLag),0,.185);
  if(k==='rightArm')return A(-.26*sin(t-shoulderLag),0,-.185);
  if(k==='leftUpperArmSoft')return A(.016*counter,0,.007);
  if(k==='rightUpperArmSoft')return A(-.016*counter,0,-.007);
  if(k==='leftForeArm')return A(-.145-.065*Math.max(0,sin(t-shoulderLag)));
  if(k==='rightForeArm')return A(-.145-.065*Math.max(0,-sin(t-shoulderLag)));
  if(k==='leftForeArmTwist')return A(.012*counter,.017*Math.cos(TAU*t));
  if(k==='rightForeArmTwist')return A(-.012*counter,-.017*Math.cos(TAU*t));
  if(k==='leftHand')return A(-.012*counter,.008*Math.cos(TAU*t));
  if(k==='rightHand')return A(.012*counter,-.008*Math.cos(TAU*t));

  // Fingers stay relaxed, moving slightly instead of locking as fists.
  if(k.startsWith('leftFinger')||k.startsWith('rightFinger')){
    const n=Math.max(0,k.charCodeAt(k.length-1)-65);
    return A(-.047-.010*(n%3)-.012*(.5+.5*sin(t+n*.11)));
  }
  return A();
}

// Small vertical weight transfer. Two controlled rises per cycle, almost no
// lateral translation. Avoid the large side-to-side hip bounce that looked
// like waddling in the old sine-wave gait.
export function walkPelvisOffset(t){
  const s=sin(t),doubleStep=Math.cos(2*TAU*t);
  return [.0018*s,.004+.012*(.5+.5*doubleStep),0];
}

// Useful diagnostics for programmatic checks and authored gait previews.
export const walkGaitSpecs={
  cycleSeconds:.98,
  keyframes:8,
  strideAngles:thigh,
  kneeAngles:knee,
  ankleAngles:ankle,
  toeAngles:toe,
  phaseDescriptions:['passing','swing lift','heel strike','loading',
                     'midstance','heel rise','toe off','recovery']
};
