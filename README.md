# Urban Outlaw

A small, playable browser-based 3D game prototype. **Version 0.5** contains a wide, empty grassy field and a real 3D ninja mesh reconstructed from the user-approved artwork. Its 3D GLB model is stored in `assets/ninja-character.glb`. It is a foundation for future game features.

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
- `assets/ninja-character.glb` is real volumetric 3D geometry with separate arm and leg parts, textured from the approved front, side, and back views.
- `assets/approved-ninja-turnaround.png` remains only as a fallback for devices that cannot load the GLB.
- Movement, sprint, jump movement, mobile controls, and DualSense gamepad support are retained. The limbs use simple 3D joint-pivot animation; a full deformable skeletal rig and facial expressions are future improvements.
- Three.js is loaded from jsDelivr with an unpkg fallback. The glTF loader uses the jsDelivr Three.js addon import map; a network connection is required.
- No build step or backend is required.

## GitHub Pages

To make the game playable from a public link: in the repository, open **Settings → Pages**, choose **Deploy from a branch**, then select **main** and **/(root)**, and save. GitHub will provide the playable site URL once deployment succeeds.

This is a starter prototype; additional gameplay and multiplayer are not implemented yet.
