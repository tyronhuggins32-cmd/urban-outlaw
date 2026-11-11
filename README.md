# Urban Outlaw

**Build 4.0: Completely Rebuilt Hair V6.** The existing V3-V5 hairstyles are archived, not layered into the new model.

[Play Urban Outlaw](https://tyronhuggins32-cmd.github.io/urban-outlaw/) | [Inspect the actual character from four directions](https://tyronhuggins32-cmd.github.io/urban-outlaw/?review=1&head=1)

## New hairstyle: a different modeling method

- \`assets/hair-volume-v6.glb\` is the active real detachable 3D asset. It is **not** the previous strand-tube, shell, ribbon-stack or cone generator. The hair is sculpted from overlapping anatomical 3D volumes, fused into a **single continuous watertight hair mesh**, with smoothing and a micro-fiber PBR texture.
- The entire asset has **three mesh groups**: continuous blue-black hair, one indigo headband, and tied-back navy cloth. It has **no duplicate forehead plate** and no extra floating eye meshes. The source character keeps its original metal forehead protector.
- 84k triangles including the hair sculpt and attached cloth, separate from the 44-bone body. \`scripts/install-detachable-hair.js\` mounts it to \`mixamorigHead\` and preserves the existing run, walk, jump and landing controls.
- \`scripts/build-hair-volume-v6.py\` is its reproducible open-source Python generator. \`.github/workflows/build-hair-volume-v6.yml\` regenerates, validates and commits the GLB at no cost.
- The old \`assets/sculpted-hair-v5.glb\` is retained for rollback. Previous model/camera and skin assets are unchanged.
- The generator was rendered from front, three-quarter, side and back before integration to catch vertical crown spikes and incorrect rear sweep.

**Important:** This is a new geometry-first sculpt, not a claim of one-to-one likeness with the approved illustration. The exact fine strand arrangement, forehead drape and high-end facial sculpt in the supplied reference are still beyond this procedural reconstruction. Improvements to visual fidelity should use direct polygon sculpting/multiview reconstruction rather than returning to random tapered tubes.

## How to rebuild

\`\`\`bash
python3 -m pip install numpy scipy scikit-image trimesh Pillow
python3 scripts/build-hair-volume-v6.py assets/hair-volume-v6.glb
\`\`\`

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

### Build 3.6: recorded walk

The analytical walk has been replaced with a finished library walking clip retargeted offline onto the character's actual bone axes. The walk now uses the source stride, knee timing, arm swing, heel contact and toe-off. Fit corrections keep hands clear of the shorts and ground the deformed foot surfaces. Walking travel now matches the recorded stride at the character's game scale; sprinting remains 95. The motion source and zero-credit provenance are documented in `assets/animations/README.md`.

Validation includes the actual 44-bone skinned rig, motion-loop continuity, foot spacing, hand clearance and deformed sole contact. Front/side body-rig movement renders are in `docs/walk-review/recorded-walk.gif`.

### Build 4.5: fitted reference hair

The oversized generated hair volume has been replaced with layered geometry extracted and refined from the original character sculpt. It uses the character's actual bind-space coordinates, so the crown, face-framing bangs and tied nape fit the head. Legacy hair surfaces are removed using a source-specific mask while retaining the visible skin, facial triangles, normals, UVs and weights. One hair surface and two forehead-protector material groups form the detachable accessory. `docs/reference-hair-fit/` contains actual assembled-model renders and validation notes. The recorded walking motion and sprint speed of 95 remain active.
