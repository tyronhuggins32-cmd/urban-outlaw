# Urban Outlaw

A small, playable browser-based 3D game prototype. **Version 0.7** contains the wide grassy field and an upgraded, directly playable 3D ninja model built from the user-supplied v5 asset. Its 3D GLB model is stored in `assets/ninja-character.glb`. It is a foundation for future game features.

## Play

Open the site when GitHub Pages is enabled, or serve this repository with a small local HTTP server and visit `index.html`.

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

| Device | Move | Look | Jump | Run |
|---|---|---|---|---|
| Keyboard + mouse | WASD / arrows | Drag | Space | Shift |
| Phone or tablet | On-screen joystick | Swipe the world | JUMP | Hold RUN |
| PS5 DualSense (Bluetooth) | Left stick or D-pad | Right stick | Cross (×) | Hold R2, R1, or L3 |

Mouse wheel zooms in and out. Mobile controls are displayed automatically on touchscreen devices. Tap **TOUCH: ON** at the upper right to hide the joystick, jump/run buttons, and touch camera gestures. Tap **TOUCH: OFF** to restore them. The preference is saved for future visits when browser storage is available. When a gamepad is detected, the game displays a controller-connected indicator. On an iPhone, pair the DualSense in iOS Bluetooth settings and press a button once in Safari to let the browser detect it.

## How it works

- One static `index.html` contains the styles, UI, and game code.
- Three.js renders the 3D scene. The browser automatically loads the GLB model and its embedded textures from this repository; the user does not need to upload assets manually.
- `assets/ninja-character.glb` is the refined **v0.7** model, with a high-collar shirt, softer draped sleeves, irregular fabric shorts, woven wraps, sandals, face, layered black-blue hair, metal forehead protector, and red-and-white back crest. It is grouped by material, not animation bones. The GLB is ~127,248 triangles in ~40 GPU mesh groups.
- `assets/approved-ninja-turnaround.png` remains only as a fallback for devices that cannot load the GLB.
- Movement, sprint, jump movement, mobile controls, and DualSense gamepad support are retained. This refined model has no skeletal rig, so animation uses gentle whole-body walking/idle bob without distorting material groups. Rigged arms, legs, and facial animations are future work.
- Three.js is loaded from jsDelivr with an unpkg fallback. The glTF loader uses the jsDelivr Three.js addon import map; a network connection is required.
- No build step or backend is required.

## GitHub Pages

To make the game playable from a public link: in the repository, open **Settings → Pages**, choose **Deploy from a branch**, then select **main** and **/(root)**, and save. GitHub will provide the playable site URL once deployment succeeds.

This is a starter prototype; additional gameplay and multiplayer are not implemented yet.

### Character details (v0.7)

The original asset was Z-up, facing -Y. The game converts it to Three.js Y-up, faces the character toward +Z, scales it to 4.35 game units tall and puts its feet on the field. When a model load fails, the old 2.5D avatar loads as a fallback. These conversions are applied at runtime; the character asset is edited in-repository by a reproducible free Python script, not a paid generator.

## Rebuilding the character (free)

Run `python3 scripts/upgrade_character.py original.glb refined.glb` after installing `trimesh`, `numpy` and `scipy`. The GitHub workflow `.github/workflows/refine-character.yml` builds and checks the replacement GLB from the original sculpt, then commits the result into `assets/ninja-character.glb` so the browser can load it directly. The model is **not yet an exact match** to the submitted 3D approval sheet and is **not rigged**. Visual fidelity, clean skinned topology, and skeletal animation remain future work. The browser smoke test checks the correct version, loaded mesh count and triangles rather than only the presence of a canvas.
