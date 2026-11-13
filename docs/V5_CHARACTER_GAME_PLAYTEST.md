# Urban Outlaw V5 fighter: isolated playable development

**Status:** Development playtest only. **Not visually approved. Not deployed to main.**

This branch adds a real character-in-game integration path for the user-supplied V5 shirt instead of creating another static model approval sheet. The candidate is still subject to the [20-reference-check art gate](../art/v5/SHIRT_APPROVAL_CHECKLIST.md) and must not be merged or advertised as accurate until all checks pass.

## What is playable now

The isolated game mode loads the *full Blender 44-joint candidate armature*, keeping its changed proportions rather than rebinding individual shirt tubes to an incompatible skeleton. The original face geometry is restored and skin joint indices retargeted by name, allowing the established head cleanup and separate hairstyle to work with the sculpted shirt. Existing wraps, sandals and gray shorts remain attached; only obsolete V8 shirt surfaces are hidden inside the prototype.

While the regular main game is unchanged, the sandbox includes:

- **3D V5 model review:** `?review=1&prototype=v5` with front, side, back, and three-quarter cameras.
- **Eight inspection poses:** Idle, Ready, Guard, Jab, Cross, Kick, Dodge, Ninja Run.
- **Playable V5 combat:** `?prototype=v5`, using the game's sprint, dodge, guard, attack, enemy AI and keyboard/touch/controller input.
- **Visible nonapproval warning:** every sandbox view explicitly displays **V5 SCULPT PLAYTEST · NOT APPROVED · NOT RELEASED**.

## How it is tested

The GitHub workflow [V5 Character in Game (Isolated Playtest)](../../.github/workflows/v5-game-playtest.yml) installs Blender, generates the actual shirt GLB, and copies it temporarily to `assets/candidates/v5-shirt-candidate.glb`. It then checks mesh/UV/skin structure, the original face and wrapped outfit, boots the **real Three.js browser game**, and captures front/side/back and combat movement screenshots. The generated model exists only inside the workflow workspace and as a **NOT APPROVED** artifact. It is not committed to `main` or deployed as a public game update.

```bash
# Repeat the playtest from this branch in a Blender-equipped environment:
mkdir -p art/v5/generated assets/candidates
blender -b -t 2 --python tools/blender/build_v5_shirt.py
cp art/v5/generated/v5-shirt-candidate.glb assets/candidates/v5-shirt-candidate.glb
npm install --no-save three@0.166.1 playwright@1.56.0
npx playwright install chromium
python3 -m http.server 8000 &
node tests/v5-character-integration.cjs
node tests/v5-game-preview.cjs
```

## No-release rule

Passing rig tests, game-loading tests and combat smoke tests **does not** mean the physical model matches the close-ups. The [full V5 art approval gate](../art/v5/shirt-approval-criteria.json) remains an independent release blocker. This branch keeps known visual defects visible and measurable until replaced by actually approved shirt and shorts geometry.
