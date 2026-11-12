/**
 * Urban Outlaw: grounded ninja-run motion for the existing 44-bone character.
 * +Z is forward. Angles are WORLD-axis deltas in radians; the rig retargeter
 * converts them into each bone's bind-pose local space.
 *
 * This is a seamless in-place sprint loop. Player movement stays in the game
 * controller, so switching directions or changing speed cannot accumulate drift.
 */
export const NINJA_RUN_DURATION = 0.52;
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

  // Shape the entire spine, not just the head, into a low speed silhouette.
  // This rig has pre-rotated bind joints: verify actual visible lean from the
  // skinned GLB in tests/ninja-run-rig.cjs, not by adding the Euler angles.
  if (key === 'hips') return A(.20, .006 * s, .005 * c);
  if (key === 'spine') return A(.46, -.008 * s, -.007 * c);
  if (key === 'spine1') return A(.55, -.010 * s, .007 * c);
  if (key === 'spine2') return A(.30, .008 * s, -.005 * c);
  if (key === 'chestBreath') return A(.004 * pulse);
  // Counterbend the neck so the face remains directed down the path.
  if (key === 'neck') return A(-.25, .003 * s);
  if (key === 'neckFollow') return A(-.08, -.003 * s);
  if (key === 'head') return A(-.63, -.004 * s, .002 * c);

  // Both arms trail BEHIND the body for the whole cycle. Keep elbows long and
  // wrists neutral. Large per-frame wrist and twist motions made hands wobble
  // even though the shoulder animation was correct.
  if (key === 'leftShoulder') return A(.032, 0, .018);
  if (key === 'rightShoulder') return A(.032, 0, -.018);
  if (key === 'leftArm') return A(1.08 + .009 * s, .003 * c, .15);
  if (key === 'rightArm') return A(1.08 - .009 * s, -.003 * c, -.15);
  if (key === 'leftUpperArmSoft') return A(.010, 0, .003);
  if (key === 'rightUpperArmSoft') return A(.010, 0, -.003);
  if (key === 'leftForeArm' || key === 'rightForeArm') return A(.09);
  // Freeze twist helper oscillation at neutral to avoid tearing-looking
  // deformation in the weighted forearm/wrist region.
  if (key === 'leftForeArmTwist' || key === 'rightForeArmTwist') return A();
  if (key === 'leftHand' || key === 'rightHand') return A();
  // Fingers stay loosely straight, rather than closing into a pumping fist.
  if (key.startsWith('leftFinger') || key.startsWith('rightFinger'))
    return A(-.008);

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
    .012 * (1 - Math.cos(2 * TAU * phase)),
    0
  ];
}
