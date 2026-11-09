# Urban Outlaw

**Build 0.9: Animated blank body, stage 1.** A third-person browser game with the neutral-gray, youthful body base as the playable character. This stage intentionally has no hair, eyes, facial details, clothing, or weapons. Proportions can be approved before adding details individually.

## Play

[Launch Urban Outlaw](https://tyronhuggins32-cmd.github.io/urban-outlaw/)

For local play: run **python3 -m http.server 8000** in the repository folder and visit http://localhost:8000. The game needs an internet connection to load Three.js.

## Controls

| Device | Move | Look | Jump | Sprint |
|---|---|---|---|---|
| Keyboard/mouse | WASD / arrows | Drag | Space | Shift |
| Phone/tablet | On-screen joystick | Swipe | JUMP | Hold RUN |
| PS5 DualSense | Left stick / D-pad | Right stick | Cross (×) | R2 / R1 / L3 |

The TOUCH toggle hides or restores mobile controls; the saved setting persists.

## Animated base body

- **Active GLB:** assets/blank-body.glb
- **Editable generator:** scripts/build_blank_body.py
- 30 independently modeled gray anatomical meshes with rounded, smooth normals. Authored height approximately 1.73m and about 6.7 heads tall, with a slender youthful build.
- 19 named articulation joints: root, hips, spine, neck, head, and bilateral shoulders, upper arms, forearms, hands, thighs, lower legs, and feet.
- Four **real glTF animation clips** built into the GLB: Idle, Walk, Run, and Jump. Each clip animates 13 actual nodes. Three.js AnimationMixer blends them based on player motion.
- Y-up, +Z forward. The game scales the model to 4.35 world units and grounds its feet.
- The old clothed ninja is retained as an inactive backup in assets/ninja-character.glb. It no longer appears as the normal playable character.
- This model is articulated using parent-child nodes rather than skin weights, so elbows and knees still need a continuous skinned model for fully seamless deformations. This is an honest early-stage body model, not a finished realistic character.

## Building the asset free

Run **python3 scripts/build_blank_body.py assets/blank-body.glb**. No proprietary programs, subscriptions, or Python dependencies are needed. The GitHub workflow at .github/workflows/build-blank-body.yml generates, validates, and commits the model.

## Tests

The GitHub workflow at .github/workflows/browser-smoke.yml uses Playwright to open the mobile-sized game and check that the correct GLB loaded, it has plausible bounds, the joints and all four clips are present, and the animation changes from Idle to Walk, Run, and Jump when corresponding controls are pressed.

The earlier body-proportion approval image is a reference, not a 3D file. The actual 3D geometry and animation are reproducible from the Python source.
