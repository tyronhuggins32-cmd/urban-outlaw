# Urban Outlaw

**Build 3.5: Head and Hair Stabilization.** The playable 44-bone character is retained, with a rebuilt detachable hairstyle and non-destructive facial/ear geometry repairs.

[Play Urban Outlaw](https://tyronhuggins32-cmd.github.io/urban-outlaw/) | [Front/side/back/3/4 model comparison](https://tyronhuggins32-cmd.github.io/urban-outlaw/?review=1&head=1)

## What changed in 3.5

- **One actual detachable hairstyle:** \`assets/sculpted-hair-v5.glb\`, with seven batched PBR material groups. Replaces the visibly broken V4 hair.
- **No double-generated hair:** \`scripts/clean-head-v5.js\` now compacts the older source hair vertices inside the new sculpt instead of generating more spikes on top. It keeps all original head triangles, which avoids holes near the ears and nape.
- **No floating facial eye dots:** the former extra eye-sphere layer is removed. The original model's skin/face texture remains intact.
- **Forehead protector repaired:** the separate metal plate follows the hair asset and is positioned above the eyes. A curved navy strip covers the older low-resolution decal underneath.
- **Better skin lighting:** neutral hemisphere fill replaces the strong green bounce that tinted the character.
- **Rig stays unchanged:** 44 skin-weighted joints, including 10 additional deformation bones. The Idle, Walk, Run, Jump and Land clips remain. iPhone touch and controller support are preserved.

## Known fidelity limits

The screenshot reference remains the visual acceptance target. Build 3.5 **does not yet exactly reproduce** the high-quality face sculpt, individually layered hair, or subtle anatomical surfaces in that reference. The biggest remaining issues are fine facial form, source mesh skin/shorts topology, and hair fiber shapes at close range. Automated tests verify scene loading, geometry presence, animated bone paths and four camera angles, but cannot establish artistic 1:1 likeness.

## Rebuilding the detachable 3D hair

\`\`\`bash
python3 -m pip install numpy scipy trimesh Pillow
python3 scripts/build-sculpted-hair-v5.py assets/sculpted-hair-v5.glb
\`\`\`

The free workflow \`.github/workflows/build-sculpted-hair-v5.yml\` validates its GLB and commits the result. \`scripts/install-detachable-hair.js\` mounts the asset to the humanoid's real head bone. The previous V3/V4 assets and original reference rig remain in the repo for comparison and rollback.

## Verification

\`.github/workflows/browser-smoke.yml\` runs Playwright at a mobile viewport, exercises the 44-bone motion system, and captures both whole-body and head closeups from front, side, back and three-quarter views. The review option is \`?review=1&head=1\`.

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

### Walk overhaul and faster sprint

The walk now uses two-segment leg solving against foot targets, with a 60% support phase, swing-foot lift, heel contact, toe-off and counter-swinging arms. The solver measures the imported rig's leg lengths and resting knee angles. Sprint movement is 95 world units/second (10 times its previous 9.5); walking remains 5.2. The camera follows more tightly during sprinting. Run `node tests/walk-gait.cjs` and, with Three.js 0.166.1 installed, `node tests/walk-rig.cjs` to check the actual skeleton and movement settings.
