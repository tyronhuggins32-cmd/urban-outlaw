# Urban Outlaw

**Build 2.0: Fluid 44-Bone Ninja.** Playable third-person mobile-friendly browser game using a single reference-sculpted, textured character with a deformable skeleton. The character's face, hair, shorts and body sculpt remain the same. The skeleton and motion have been upgraded so the original model no longer behaves as a rigid action figure.

[Play Urban Outlaw](https://tyronhuggins32-cmd.github.io/urban-outlaw/) | [Inspect the 3D model against the reference](https://tyronhuggins32-cmd.github.io/urban-outlaw/?review=1)

## Actual game assets

- **Playable character:** `assets/reference-rig-fluid.glb`. This is a real skinned GLB with the original PBR material, face, hair and clothing textures.
- **44 real skin-weighted joints:** 34 from the underlying Mixamo-style humanoid skeleton plus 10 new corrective deformation joints: left/right upper-arm soft joints, forearm twists, thigh soft joints, calf twists, chest breathing and neck follow-through.
- **Source model preserved:** `assets/reference-rig-separated.glb` remains the approved body-sculpt input to the rig builder, with the prior hand/shorts intersections corrected. `assets/reference-rig.glb` is the unmodified original source.
- **Model generator:** `scripts/upgrade_fluid_rig.py`. This adjusts the GLB's glTF skin joints, inverse bind matrices and live vertex weights. The helper bones have genuine deforming vertices, not decorative empty transform nodes.
- **Clean shorts seam:** two independently attached thigh-following fabric panels remain separate from the hands.
- The reference turnarounds live at `assets/reference/`, and the four-angle model reviewer shows the actual GLB next to the target artwork.

## New animation system

`scripts/reference-character-animations-v2.js` contains five movement clips:

- **Idle:** subtle chest breathing, shoulder relaxation, hand movement, neck follow-through and head movement.
- **Walk:** coordinated opposing arms and legs, hip sway, soft upper-arm and thigh deformation, toe movement and relaxed finger motion.
- **Run:** stronger stride and arm movement, forward torso lean, recoil, pelvis bounce, elbow flex and calf corrections.
- **Jump:** anticipation crouch, airborne leg tuck, arm counterbalance and foot extension.
- **Land:** knee compression, torso absorption and a short recovery before returning to normal movement.

All animation rotations are converted from the sculpt's original world-oriented rest axes into each local bone space. This avoids the previous sideways leg-swing problem. AnimationMixer blends transitions with shorter fades for jumps and landings. The fifth clip is triggered by the actual gameplay landing.

## Input

| Device | Move | Look | Jump | Sprint |
|---|---|---|---|---|
| Keyboard and mouse | WASD/arrows | Drag | Space | Shift |
| iPhone and Android | Virtual joystick | Swipe | JUMP | Hold RUN |
| PS5 DualSense | Left stick / D-pad | Right stick | Cross | R2/R1/L3 |

The TOUCH toggle enables or hides touch controls.

## Reproduction and QA

The free GitHub Action `.github/workflows/build-fluid-rig.yml` builds the 44-bone GLB from the existing repaired model and runs matrix/joint validation. The browser test `.github/workflows/browser-smoke.yml` opens the mobile-sized game and tests the actual loaded skinned GLB, confirms all 44 bones and at least 10 weighted corrective joints, exercises Idle/Walk/Run/Jump/Land state changes, verifies forward/back foot travel and hand clearance, and captures multi-angle comparison screenshots.

To test locally: `python3 -m http.server 8000` from repository root. Three.js loads through a browser CDN. To rebuild manually, install numpy and run `python3 scripts/upgrade_fluid_rig.py assets/reference-rig-separated.glb assets/reference-rig-fluid.glb`.

## Remaining visual work

This is a significant rig and animation upgrade, **not a claim of exact reference likeness**. The face, haircut and anatomy still need sculpt refinement, and procedural walk cycles may show some foot sliding. No full inverse-kinematics foot-planting or motion-captured animation library is included yet.
