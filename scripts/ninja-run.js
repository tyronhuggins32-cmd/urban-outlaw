/**
 * Urban Outlaw: grounded ninja-run motion for the existing 44-bone character.
 * +Z is forward. Angles are WORLD-axis deltas in radians; the rig retargeter
 * converts them into each bone's bind-pose local space.
 *
 * This is a seamless in-place sprint loop. Player movement stays in the game
 * controller, so switching directions or changing speed cannot accumulate drift.
 */
export const NINJA_RUN_DURATION = 0.48;
const TAU = Math.PI * 2;
const A = (x = 0, y = 0, z = 0) => [x, y, z];
const positive = value => Math.max(0, value);

export function ninjaRunPose(t, key) {
  const phase = ((t % 1) + 1) % 1;
  const s = Math.sin(TAU * phase);
  const c = Math.cos(TAU * phase);
  const leftBack = positive(s);
  const rightBack = positive(-s);
  const pulse = Math.cos(2 * TAU * phase);

  // The imported sculpt has a strongly pre-rotated spine. Small local angles
  // previously produced just 12 degrees of *visible* forward lean. These
  // retargeted world-axis offsets fold the upper body noticeably forward;
  // the real result is validated from head/hips joint positions on the GLB.
  if (key === 'hips') return A(.18, .010 * s, .007 * c);
  if (key === 'spine') return A(.38, -.013 * s, -.013 * c);
  if (key === 'spine1') return A(.47, -.020 * s, .010 * c);
  if (key === 'spine2') return A(.27, .013 * s, -.008 * c);
  if (key === 'chestBreath') return A(.008 * pulse, 0, .004 * s);
  if (key === 'neck') return A(-.23, .007 * s);
  if (key === 'neckFollow') return A(-.08, -.006 * s);
  if (key === 'head') return A(-.57, -.008 * s, .006 * c);

  // Arms swept behind the torso and almost parallel to the direction of
  // travel, instead of pumping opposite the legs as in a conventional sprint.
  if (key === 'leftShoulder') return A(.035, 0, .018);
  if (key === 'rightShoulder') return A(.035, 0, -.018);
  if (key === 'leftArm') return A(1.26 + .035 * s, .013 * c, .14);
  if (key === 'rightArm') return A(1.26 - .035 * s, -.013 * c, -.14);
  if (key === 'leftUpperArmSoft') return A(.022 + .010 * s, 0, .006);
  if (key === 'rightUpperArmSoft') return A(.022 - .010 * s, 0, -.006);
  if (key === 'leftForeArm') return A(.09 + .025 * c);
  if (key === 'rightForeArm') return A(.09 - .025 * c);
  if (key === 'leftForeArmTwist') return A(.009 * s, .017);
  if (key === 'rightForeArmTwist') return A(-.009 * s, -.017);
  if (key === 'leftHand') return A(-.045, .015, .018);
  if (key === 'rightHand') return A(-.045, -.015, -.018);
  if (key.startsWith('leftFinger') || key.startsWith('rightFinger'))
    return A(-.04 - .015 * (.5 + .5 * c));

  // Opposing long strides. Bent knees recover the airborne foot without
  // snapping a straight leg; toe-off and ankle pitch articulate each step.
  if (key === 'leftLeg') return A(-.88 * s, 0, -.008 * c);
  if (key === 'rightLeg') return A(.88 * s, 0, .008 * c);
  if (key === 'leftThighSoft') return A(-.045 * s);
  if (key === 'rightThighSoft') return A(.045 * s);
  if (key === 'leftKnee') return A(.12 + .90 * leftBack + .33 * rightBack);
  if (key === 'rightKnee') return A(.12 + .90 * rightBack + .33 * leftBack);
  if (key === 'leftCalfTwist') return A(-.025 * s);
  if (key === 'rightCalfTwist') return A(.025 * s);
  if (key === 'leftFoot') return A(-.08 + .21 * leftBack - .25 * rightBack);
  if (key === 'rightFoot') return A(-.08 + .21 * rightBack - .25 * leftBack);
  if (key === 'leftToe') return A(.18 * leftBack);
  if (key === 'rightToe') return A(.18 * rightBack);
  return A();
}

/** Minimal vertical impulse on each toe-off, plus subtle side-to-side balance. */
export function ninjaRunRootMotion(t) {
  const phase = ((t % 1) + 1) % 1;
  return [
    .006 * Math.sin(TAU * phase),
    .018 * (1 - Math.cos(2 * TAU * phase)),
    0
  ];
}
