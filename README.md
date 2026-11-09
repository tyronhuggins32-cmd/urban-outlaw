# Urban Outlaw

**Build 1.1: continuous, skinned reference sculpt.** The previous blocky mannequin has been replaced by a more detailed single-mesh 3D ninja with layered black-blue hair, a forehead protector, natural skin coloring, fitted dark-gray shorts, and bare feet. The revised sculpt was generated from the supplied character sheet, then rigged and adapted for this browser game.

[Play Urban Outlaw](https://tyronhuggins32-cmd.github.io/urban-outlaw/) | [Inspect live model against reference](https://tyronhuggins32-cmd.github.io/urban-outlaw/?review=1)

## Model quality and known limitations

- Active model: `assets/reference-rig.glb` (42,727 triangles, one **SkinnedMesh**, humanoid skeleton).
- Actual vertex skin weights and bone deformations, unlike the previous 80-part procedural mannequin.
- Source silhouette is compact with bangs, swept spiky hair, tied back section, teen build, plain fitted shorts and exposed skin.
- Current sculpt is **not an exact replica**. Front comparison shows a small indistinct face, overly muscular limbs and simplified hands; the hair is more jagged than the reference. Keep the reference sheet as the acceptance target.
- Original previous procedural model is retained at `assets/blank-body.glb` as an archive, not the active character.
- The 4 reference angles plus face reference are under `assets/reference/`. Select **FRONT**, **SIDE**, **BACK**, **3/4** inside the review mode to compare genuine rendered mesh with the supplied reference.
- Studio comparison uses a neutral floor and backdrop, while normal game mode retains the grassy world.

## Animation

`scripts/reference-character-animations.js` creates Idle, Walk, Run, Jump clips from the Mixamo-style humanoid bones using sampled quaternion keyframes. Three.js AnimationMixer blends them in response to movement, sprint and jump. The model is **Y-up** and rendered at 4.0 game units tall. Animations deform the single skinned surface rather than rotating material groups.

## Controls

| Device | Move | Camera | Jump | Sprint |
|---|---|---|---|---|
| Keyboard | WASD / arrows | Mouse drag | Space | Shift |
| Mobile | Virtual joystick | Swipe | JUMP | Hold RUN |
| PS5 DualSense | Left stick or D-pad | Right stick | Cross | R2/R1/L3 |

Tap TOUCH to toggle virtual buttons. Tap or click a review angle to rotate the model for comparison.

## Build and verification

Serve the repository from its root with `python3 -m http.server 8000`. No frontend build step. Three.js imports from CDN.

`.github/workflows/import-reference-character.yml` retrieves and validates the source GLB, and `.github/workflows/browser-smoke.yml` runs Playwright checks on mobile viewport, including skinned mesh loading, four animation state transitions and four matching reference views. Review screenshots are saved as CI artifacts.

Previous experimental generators remain in `scripts/` for historical reference and must not overwrite `assets/reference-rig.glb` without an explicit model-quality review.
